#!/usr/bin/env node
/**
 * ArmorIQ agent red-teaming — CLI entry (zero runtime deps, Node >=18).
 *
 * Usage:
 *   redteam --config <path> [--out <dir>] [--dry-run] [--authorize]
 *           [--judge] [--deep] [--judge-model <id>]
 *
 * Flags:
 *   --config <path>      target config JSON (required)
 *   --out <dir>          report output directory (default: <typescript>/reports)
 *   --dry-run            load+validate config + library, print probe count and
 *                        categories, make NO network calls, exit 0
 *   --authorize          explicit authorization to run against a production target
 *   --judge              enable the Tier-2 LLM judge on INCONCLUSIVE results
 *   --deep               judge ALL results (implies --judge, judgeMode 'deep')
 *   --judge-model <id>   judge model override (else JUDGE_MODEL env, else 'gpt-4o')
 *
 * Judging requires OPENAI_API_KEY at runtime; --dry-run never judges or calls out.
 *
 * Authorization hard gate: a LIVE run against a `production` target is refused
 * unless --authorize is passed OR REDTEAM_AUTHORIZED === 'true'. The decision is
 * always logged. Resolved secret values are NEVER printed.
 *
 * Exit codes: 0 success · 1 validation/runtime/authorization error · 2 bad usage.
 *
 * Runnable via:  tsx src/redteam.ts --config config.json --dry-run
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { loadConfig, ConfigValidationError } from '@armoriq/engine';
import { loadLibrary, createHttpAgent, runScan, score } from '@armoriq/engine';
import { createJudge } from '@armoriq/judge';
import { LibraryValidationError } from '@armoriq/schema';
import type { Judge } from '@armoriq/schema';
import {
  buildScanResult,
  buildJsonReport,
  buildMarkdownReport,
  getEngineVersion,
} from '@armoriq/reporting';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Bundled attack library: <repo>/attacks/attack_library.json (src|dist -> ../../../attacks). */
const DEFAULT_LIBRARY = join(HERE, '..', '..', '..', 'attacks', 'attack_library.json');

/** Default report output directory: <apps/cli>/reports (src|dist -> ../reports). */
const DEFAULT_OUT = join(HERE, '..', 'reports');

const USAGE = `ArmorIQ red-team POC
Usage: redteam --config <path> [--out <dir>] [--dry-run] [--authorize]
               [--judge] [--deep] [--judge-model <id>]

  --config <path>      target config JSON (required)
  --out <dir>          report output directory (default: <typescript>/reports)
  --dry-run            validate config + library, list probe count + categories, NO network calls
  --authorize          authorize running against a production target
  --judge              enable the Tier-2 LLM judge on INCONCLUSIVE results
  --deep               judge ALL results (implies --judge; judgeMode 'deep')
  --judge-model <id>   judge model override (else JUDGE_MODEL env, else 'gpt-4o')
  -h, --help           show this help

Judging requires OPENAI_API_KEY at runtime; --dry-run never judges or calls out.`;

/** Slug a target name into a filesystem-safe report basename fragment. */
function slug(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'target';
}

interface CliValues {
  config?: string;
  out?: string;
  'dry-run'?: boolean;
  authorize?: boolean;
  judge?: boolean;
  deep?: boolean;
  'judge-model'?: string;
  help?: boolean;
}

async function main(): Promise<number> {
  let values: CliValues;
  try {
    ({ values } = parseArgs({
      args: process.argv.slice(2),
      options: {
        config: { type: 'string' },
        out: { type: 'string' },
        'dry-run': { type: 'boolean', default: false },
        authorize: { type: 'boolean', default: false },
        judge: { type: 'boolean', default: false },
        deep: { type: 'boolean', default: false },
        'judge-model': { type: 'string' },
        help: { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: false,
    }) as { values: CliValues });
  } catch (err) {
    process.stderr.write(`${(err as Error).message}\n\n${USAGE}\n`);
    return 2;
  }

  if (values.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }

  if (!values.config) {
    process.stderr.write(`--config is required.\n\n${USAGE}\n`);
    return 2;
  }

  const engineVersion = getEngineVersion();

  // Load + validate config and library up front (fail fast on malformed input).
  let config;
  let library;
  try {
    config = loadConfig(values.config);
    library = loadLibrary(DEFAULT_LIBRARY);
  } catch (err) {
    if (err instanceof ConfigValidationError) {
      process.stderr.write(`Config invalid: ${err.message}\n`);
      return 1;
    }
    if (err instanceof LibraryValidationError) {
      process.stderr.write(`Attack library invalid: ${err.message}\n`);
      return 1;
    }
    throw err;
  }

  const { target, run } = config;
  const categories = [...new Set(library.probes.map((p) => p.category))].sort();

  // ---- Dry run: inspect only, never touch the network. -------------------
  if (values['dry-run']) {
    process.stdout.write(
      `DRY RUN — no network calls will be made.\n` +
        `Target: ${target.name} (${target.environment}) -> ${target.url}\n` +
        `Library version: ${library.version} · Engine version: ${engineVersion}\n` +
        `Probes: ${library.probes.length}\n` +
        `Categories (${categories.length}): ${categories.join(', ')}\n`,
    );
    return 0;
  }

  // ---- Authorization hard gate (live runs against production only). -------
  if (target.environment === 'production') {
    const authorized =
      values.authorize === true || process.env.REDTEAM_AUTHORIZED === 'true';
    if (!authorized) {
      process.stderr.write(
        `AUTHORIZATION REQUIRED: refusing to run against production target ` +
          `"${target.name}".\n` +
          `Pass --authorize or set REDTEAM_AUTHORIZED=true to proceed.\n`,
      );
      return 1;
    }
    process.stdout.write(
      `Authorization: production run authorized for "${target.name}" ` +
        `(via ${values.authorize ? '--authorize' : 'REDTEAM_AUTHORIZED'}).\n`,
    );
  }

  // ---- Tier-2 judge setup (real runs only; --deep implies --judge). ------
  // Fail fast BEFORE any network call if judging is requested without a key.
  const judgeEnabled = values.judge === true || values.deep === true;
  const judgeMode: 'inconclusive' | 'deep' = values.deep ? 'deep' : 'inconclusive';
  let judge: Judge | undefined;
  let judgeModel: string | null = null;
  if (judgeEnabled) {
    const model = values['judge-model'] ?? process.env.JUDGE_MODEL ?? 'gpt-4o';
    if (!process.env.OPENAI_API_KEY) {
      process.stderr.write(
        `JUDGE ERROR: --judge/--deep requires OPENAI_API_KEY to be set.\n` +
          `Set OPENAI_API_KEY (and optionally OPENAI_BASE_URL) and retry, ` +
          `or run without --judge/--deep.\n`,
      );
      return 1;
    }
    judge = createJudge({ model });
    judgeModel = model;
    process.stdout.write(
      `Tier-2 judge enabled: model "${model}", mode "${judgeMode}".\n`,
    );
  }

  // ---- Live run. ---------------------------------------------------------
  const agent = createHttpAgent(target, { run, env: process.env });
  const startedAt = new Date().toISOString();
  process.stdout.write(
    `Running ${library.probes.length} probes against ${target.name} ` +
      `(${target.environment})…\n`,
  );

  const results = await runScan(library, agent, { run, judge, judgeMode });
  const finishedAt = new Date().toISOString();

  const scan = buildScanResult({
    target,
    results,
    libraryVersion: library.version,
    startedAt,
    finishedAt,
    engineVersion,
    judgeModel,
    score: score(results),
  });

  const outDir = resolve(values.out ?? DEFAULT_OUT);
  mkdirSync(outDir, { recursive: true });
  const base = `report-${slug(target.name)}`;
  const jsonPath = join(outDir, `${base}.json`);
  const mdPath = join(outDir, `${base}.md`);
  writeFileSync(jsonPath, buildJsonReport(scan), 'utf8');
  writeFileSync(mdPath, buildMarkdownReport(scan), 'utf8');

  const s = scan.score;
  process.stdout.write(
    `\nResilience: ${s.resiliencePct}%  ·  Weighted risk: ${s.weightedRiskPct}%\n` +
      `Pass ${s.pass} · Fail ${s.fail} · ` +
      `Inconclusive ${s.inconclusive} · Error ${s.error}\n\n` +
      `Reports written:\n  ${jsonPath}\n  ${mdPath}\n`,
  );

  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    process.stderr.write(`Fatal: ${(err as Error).stack ?? String(err)}\n`);
    process.exit(1);
  });
