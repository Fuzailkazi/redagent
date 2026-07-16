/**
 * runScanJob — the full lifecycle of a single scan, driven off a { scanId } job.
 *
 * The DB is the source of truth. Given only a scan id, this:
 *   1. loads the Scan + its Target from Postgres,
 *   2. marks the scan 'running' (startedAt = now),
 *   3. builds the HTTP agent from the target config,
 *   4. maps the scan profile -> judge / judgeMode,
 *   5. runs the attack library via the engine and scores the results,
 *   6. persists Findings + scores + provenance metadata, sets status 'completed'.
 *
 * On ANY failure after the scan has been claimed, the scan is set to 'failed'
 * with an errorMessage and finishedAt — a scan is NEVER left stuck 'running'.
 *
 * SCAN PROFILES (profile -> judge behavior):
 *   quick    -> Tier-1 only, no judge.
 *   standard -> judge adjudicates INCONCLUSIVE Tier-1 results.
 *   deep     -> judge adjudicates ALL non-ERROR results.
 * The judge is only constructed when OPENAI_API_KEY is set. If a profile asks
 * for the judge but no key is present we run Tier-1 only and record
 * judgeModel = null — we do NOT fail the scan.
 *
 * Secrets stay by reference: the target config persisted in the DB carries
 * ${ENV_VAR} refs only; they are resolved from the environment at request time
 * inside the adapter and never written back.
 */

import { prisma, Prisma } from '@armoriq/db';
import {
  createHttpAgent,
  loadLibrary,
  runScan,
  score,
  type HttpAgentOptions,
} from '@armoriq/engine';
import { createJudge } from '@armoriq/judge';
import { getEngineVersion } from '@armoriq/reporting';
import {
  ConfigSchema,
  type Agent,
  type AttackLibrary,
  type Judge,
  type ProbeResult,
  type TargetConfig,
} from '@armoriq/schema';

/** Default on-disk attack library (overridable via ATTACK_LIBRARY_PATH or deps). */
const DEFAULT_LIBRARY_PATH =
  process.env.ATTACK_LIBRARY_PATH ??
  '/Users/fu2ail/projects/redagent/redagent/attacks/attack_library.json';

const DEFAULT_JUDGE_MODEL = 'gpt-4o';

type JudgeMode = 'inconclusive' | 'deep';

/**
 * Injectable seams so the job can be unit-tested with NO Postgres/Redis/network.
 * All default to the real implementations; tests override `createAgent` (and/or
 * `loadLibrary`) to inject an in-memory agent and a tiny library.
 */
export interface RunScanJobDeps {
  loadLibrary?: (path: string) => AttackLibrary;
  libraryPath?: string;
  createAgent?: (target: TargetConfig, options: HttpAgentOptions) => Agent;
  createJudge?: (opts: { model: string }) => Judge;
  env?: NodeJS.ProcessEnv;
}

/** Map a scan profile to the judge mode it requests (null = no judge). */
function judgeModeForProfile(profile: string): JudgeMode | null {
  if (profile === 'deep') return 'deep';
  if (profile === 'standard') return 'inconclusive';
  return null; // 'quick' and anything unrecognized => Tier-1 only
}

/**
 * Run the scan identified by `scanId`. Resolves when the scan reaches a terminal
 * state ('completed' or 'failed'). A recorded 'failed' scan is a normal business
 * outcome and does NOT reject — only infrastructure failures that prevent us from
 * even claiming the scan (e.g. the DB being unreachable) propagate.
 */
export async function runScanJob(
  scanId: string,
  deps: RunScanJobDeps = {},
): Promise<void> {
  const env = deps.env ?? process.env;
  const loadLibraryFn = deps.loadLibrary ?? loadLibrary;
  const createAgentFn = deps.createAgent ?? createHttpAgent;
  const createJudgeFn = deps.createJudge ?? createJudge;
  const libraryPath = deps.libraryPath ?? DEFAULT_LIBRARY_PATH;

  // Load scan + target up front. If it does not exist there is nothing to mark
  // failed, so let this throw (the job infra can retry / dead-letter it).
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { target: true },
  });
  if (!scan) {
    throw new Error(`scan ${scanId} not found`);
  }

  // Claim the scan: running + startedAt. From here on, any failure is recorded.
  await prisma.scan.update({
    where: { id: scanId },
    data: { status: 'running', startedAt: new Date() },
  });

  try {
    // Validate the persisted target config at the edge (zod).
    const config = ConfigSchema.parse(scan.target.config);

    const library = loadLibraryFn(libraryPath);
    const agent = createAgentFn(config.target, { run: config.run, env });

    // Profile -> judge / judgeMode. Construct the judge only if a key is present.
    const requestedMode = judgeModeForProfile(scan.profile);
    let judge: Judge | undefined;
    let judgeMode: JudgeMode | null = null;
    let judgeModel: string | null = null;
    if (requestedMode && env.OPENAI_API_KEY) {
      const model = env.JUDGE_MODEL ?? DEFAULT_JUDGE_MODEL;
      judge = createJudgeFn({ model });
      judgeMode = requestedMode;
      judgeModel = model;
    }
    // requestedMode set but no key => Tier-1 only; judgeModel stays null (no fail).

    // Live progress: total is known now; reset running counts to 0.
    await prisma.scan.update({
      where: { id: scanId },
      data: { total: library.probes.length, pass: 0, fail: 0, inconclusive: 0, error: 0 },
    });
    const VERDICT_FIELD: Record<string, 'pass' | 'fail' | 'inconclusive' | 'error'> = {
      PASS: 'pass',
      FAIL: 'fail',
      INCONCLUSIVE: 'inconclusive',
      ERROR: 'error',
    };

    const results = await runScan(library, agent, {
      run: config.run,
      judge,
      judgeMode: judgeMode ?? 'inconclusive',
      onResult: (r: ProbeResult) => {
        const field = VERDICT_FIELD[r.verdict];
        if (!field) return;
        // Best-effort live progress — a progress write must never fail the scan.
        void prisma.scan
          .update({
            where: { id: scanId },
            data: { [field]: { increment: 1 } } as Prisma.ScanUpdateInput,
          })
          .catch(() => {});
      },
    });

    const s = score(results);
    const engineVersion = getEngineVersion();

    // Persist findings. deleteMany first makes a retry idempotent (no dupes).
    await prisma.finding.deleteMany({ where: { scanId } });
    if (results.length > 0) {
      await prisma.finding.createMany({
        data: results.map((r: ProbeResult) => ({
          scanId,
          probeId: r.probe.id,
          category: r.probe.category,
          owasp: r.probe.owasp,
          severity: r.probe.severity,
          verdict: r.verdict,
          tier1Verdict: r.tier1Verdict ?? null,
          reason: r.reason,
          responseText: r.responseText,
          judge: r.judge
            ? (r.judge as unknown as Prisma.InputJsonValue)
            : Prisma.DbNull,
        })),
      });
    }

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: 'completed',
        finishedAt: new Date(),
        judgeMode,
        judgeModel,
        libraryVersion: library.version,
        engineVersion,
        resiliencePct: s.resiliencePct,
        weightedRiskPct: s.weightedRiskPct,
        total: s.total,
        pass: s.pass,
        fail: s.fail,
        inconclusive: s.inconclusive,
        error: s.error,
      },
    });
  } catch (err) {
    // Any failure past claiming the scan is recorded — never leave it 'running'.
    const message = err instanceof Error ? err.message : String(err);
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: 'failed',
        errorMessage: message,
        finishedAt: new Date(),
      },
    });
  }
}
