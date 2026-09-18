/**
 * In-process scan runner (server-only).
 *
 * This replaces the old Fastify API + BullMQ worker + Postgres. A scan now runs
 * synchronously inside a Next.js route handler: build the HTTP agent from the
 * posted config, fire the attack library at it, score, and return the result
 * (plus pre-rendered JSON/Markdown reports) in one response. Nothing is stored.
 *
 * The attack library is BUNDLED (imported JSON, validated at module load) so no
 * filesystem read is needed at request time — this is what makes it deploy to a
 * serverless host with zero external services.
 *
 * Scoring convention is preserved: FAIL = the agent complied (the vulnerability),
 * PASS = it resisted, INCONCLUSIVE = unclear (routed to the judge when enabled).
 */

import { createHttpAgent, runScan, score } from '@armoriq/engine';
import { createJudge } from '@armoriq/judge';
import {
  buildScanResult,
  buildJsonReport,
  buildMarkdownReport,
  getEngineVersion,
} from '@armoriq/reporting';
import {
  ConfigSchema,
  validateLibrary,
  type Config,
  type Judge,
  type ProbeResult,
} from '@armoriq/schema';

import libraryData from '../../attacks/attack_library.json';
import type { Finding, RunScanResult, Scan, ScanProfile } from './types';

export type { ScanProfile } from './types';
export type JudgeMode = 'inconclusive' | 'deep';

/** Validate the bundled library once, at module load — fail fast on a bad probe. */
const library = validateLibrary(libraryData);

/** Thrown when a production target is scanned without explicit authorization. */
export class AuthorizationRequiredError extends Error {
  constructor(targetName: string) {
    super(
      `Scanning production target "${targetName}" requires explicit authorization.`,
    );
    this.name = 'AuthorizationRequiredError';
  }
}

/** profile -> judge mode it requests (null = Tier-1 only, no judge). */
function judgeModeForProfile(profile: ScanProfile): JudgeMode | null {
  if (profile === 'deep') return 'deep';
  if (profile === 'standard') return 'inconclusive';
  return null; // 'quick'
}

function assembleRunResult(
  config: Config,
  profile: ScanProfile,
  wantJudge: JudgeMode | null,
  judgeModel: string | null,
  results: ProbeResult[],
  startedAt: string,
  finishedAt: string,
): RunScanResult {
  const scoreResult = score(results);
  const engineVersion = getEngineVersion();

  const scanResult = buildScanResult({
    target: config.target,
    results,
    score: scoreResult,
    libraryVersion: library.version,
    engineVersion,
    judgeModel,
    startedAt,
    finishedAt,
  });

  const findings: Finding[] = results.map((r) => ({
    id: r.probe.id,
    scanId: 'live',
    probeId: r.probe.id,
    category: r.probe.category,
    owasp: r.probe.owasp,
    severity: r.probe.severity,
    verdict: r.verdict,
    tier1Verdict: r.tier1Verdict ?? null,
    reason: r.reason,
    responseText: r.responseText,
    judge: r.judge ?? null,
    createdAt: finishedAt,
  }));

  const scan: Scan = {
    id: 'live',
    targetId: 'live',
    status: 'completed',
    profile,
    judgeMode: wantJudge,
    libraryVersion: library.version,
    engineVersion,
    judgeModel,
    resiliencePct: scoreResult.resiliencePct,
    weightedRiskPct: scoreResult.weightedRiskPct,
    counts: {
      total: scoreResult.total,
      pass: scoreResult.pass,
      fail: scoreResult.fail,
      inconclusive: scoreResult.inconclusive,
      error: scoreResult.error,
    },
    errorMessage: null,
    startedAt,
    finishedAt,
    createdAt: startedAt,
  };

  return {
    scan,
    findings,
    reportJson: buildJsonReport(scanResult),
    reportMd: buildMarkdownReport(scanResult),
  };
}

/**
 * Run every probe in the bundled library against the posted target config.
 *
 * @throws {AuthorizationRequiredError} for a production target without `authorize`.
 * @throws {ZodError} if the config is malformed (surfaced as 400 by the route).
 */
export async function runScanInProcess(
  rawConfig: unknown,
  profile: ScanProfile,
  authorize: boolean,
): Promise<RunScanResult> {
  const config = ConfigSchema.parse(rawConfig);

  // Authorization hard gate — enforced here, not just in the UI.
  if (config.target.environment === 'production' && !authorize) {
    throw new AuthorizationRequiredError(config.target.name);
  }

  const startedAt = new Date().toISOString();

  // Judge is optional: only when the profile asks for it AND a key is present.
  // No key => Tier-1 only, judgeModel = null. We never fail a scan for this.
  const wantJudge = judgeModeForProfile(profile);
  let judge: Judge | undefined;
  let judgeModel: string | null = null;
  if (wantJudge && process.env.OPENAI_API_KEY) {
    judgeModel = process.env.JUDGE_MODEL ?? 'gpt-4o';
    judge = createJudge({ model: judgeModel });
  }

  const agent = createHttpAgent(config.target, { run: config.run });
  const results = await runScan(library, agent, {
    run: config.run,
    judge,
    judgeMode: wantJudge ?? 'inconclusive',
  });

  const finishedAt = new Date().toISOString();
  return assembleRunResult(
    config,
    profile,
    wantJudge,
    judgeModel,
    results,
    startedAt,
    finishedAt,
  );
}

/**
 * Run every probe in the bundled library against the target config, streaming
 * progress events via the provided emit callback.
 */
export async function streamScanInProcess(
  config: Config,
  profile: ScanProfile,
  emit: (event: string, data: unknown) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (signal?.aborted) return;

  const startedAt = new Date().toISOString();

  const wantJudge = judgeModeForProfile(profile);
  let judge: Judge | undefined;
  let judgeModel: string | null = null;
  if (wantJudge && process.env.OPENAI_API_KEY) {
    judgeModel = process.env.JUDGE_MODEL ?? 'gpt-4o';
    judge = createJudge({ model: judgeModel });
  }

  const agent = createHttpAgent(config.target, { run: config.run });

  emit('init', {
    total: library.probes.length,
    targetName: config.target.name,
    profile,
  });

  let completed = 0;
  const results = await runScan(library, agent, {
    run: config.run,
    judge,
    judgeMode: wantJudge ?? 'inconclusive',
    signal,
    onResult(result) {
      completed++;
      emit('probe', {
        index: completed,
        total: library.probes.length,
        probeId: result.probe.id,
        category: result.probe.category,
        owasp: result.probe.owasp,
        severity: result.probe.severity,
        verdict: result.verdict,
        reason: result.reason,
      });
    },
  });

  if (signal?.aborted) return;

  const finishedAt = new Date().toISOString();
  const runResult = assembleRunResult(
    config,
    profile,
    wantJudge,
    judgeModel,
    results,
    startedAt,
    finishedAt,
  );

  emit('complete', {
    scan: { ...runResult.scan, counts: runResult.scan.counts },
    findings: runResult.findings,
    reportJson: runResult.reportJson,
    reportMd: runResult.reportMd,
  });
}
