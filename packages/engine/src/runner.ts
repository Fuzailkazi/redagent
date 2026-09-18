/**
 * Runner: dispatches every probe in a library against an Agent with a bounded
 * concurrency cap and an optional inter-dispatch delay, then applies the Tier-1
 * detector to each response.
 *
 * Guardrails:
 *  - Never DoS a target: workers are capped by run.concurrency and a delay is
 *    honored between dispatches.
 *  - Never mis-score transport failures: a thrown send() (or an AdapterResponse
 *    carrying an error) becomes verdict 'ERROR', never PASS.
 */

import { detect } from './detectors.js';
import type {
  Agent,
  AttackLibrary,
  Judge,
  Probe,
  ProbeResult,
  RunConfig,
} from '@armoriq/schema';

export interface RunScanOptions {
  run?: RunConfig;
  onResult?: (result: ProbeResult) => void;
  /**
   * Optional Tier-2 LLM judge. When set, adjudicates results per `judgeMode`.
   * Advisory only: a throwing judge never crashes a scan and the Tier-1 verdict
   * is preserved for human override.
   */
  judge?: Judge;
  /**
   * 'inconclusive' (default): only adjudicate Tier-1 INCONCLUSIVE results.
   * 'deep': adjudicate every non-ERROR result (PASS/FAIL/INCONCLUSIVE).
   */
  judgeMode?: 'inconclusive' | 'deep';
  signal?: AbortSignal;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Optionally run the Tier-2 judge over a computed Tier-1 result.
 *
 * The judge is advisory: it runs only for non-ERROR results, and only when
 * `judgeMode === 'deep'` or the Tier-1 verdict is INCONCLUSIVE. On success we
 * preserve the original Tier-1 verdict (`tier1Verdict`), attach the assessment,
 * promote the judge's verdict to the effective `verdict`, and append its
 * rationale to `reason`. A throwing judge leaves the Tier-1 verdict intact and
 * records the error in `reason` — it must never crash a scan.
 */
async function adjudicate(
  result: ProbeResult,
  judge: Judge,
  judgeMode: 'inconclusive' | 'deep',
): Promise<ProbeResult> {
  // Never adjudicate transport/send failures.
  if (result.verdict === 'ERROR') return result;
  if (judgeMode !== 'deep' && result.verdict !== 'INCONCLUSIVE') return result;

  const tier1Verdict = result.verdict;
  try {
    const assessment = await judge.adjudicate({
      probe: result.probe,
      responseText: result.responseText,
      tier1: { verdict: tier1Verdict, reason: result.reason },
    });
    return {
      ...result,
      tier1Verdict,
      judge: assessment,
      verdict: assessment.verdict,
      reason: `${result.reason} [judge:${assessment.model}] ${assessment.rationale}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Advisory failure: keep the Tier-1 verdict, note the error, do not throw.
    return {
      ...result,
      reason: `${result.reason} [judge error: ${message}]`,
    };
  }
}

/** Run one probe, mapping any failure to an ERROR verdict (never PASS). */
async function runProbe(
  probe: Probe,
  agent: Agent,
  judge?: Judge,
  judgeMode: 'inconclusive' | 'deep' = 'inconclusive',
): Promise<ProbeResult> {
  try {
    const response = await agent.send(probe.prompt);

    // A transport-level error surfaced on the response is still an error.
    if (response.error) {
      return {
        probe,
        responseText: response.responseText ?? '',
        verdict: 'ERROR',
        reason: `transport error: ${response.error}`,
        error: response.error,
        raw: response.raw,
      };
    }

    const { verdict, reason } = detect(probe, response.responseText);
    const result: ProbeResult = {
      probe,
      responseText: response.responseText,
      verdict,
      reason,
      raw: response.raw,
    };
    return judge ? adjudicate(result, judge, judgeMode) : result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      probe,
      responseText: '',
      verdict: 'ERROR',
      reason: `send failed: ${message}`,
      error: message,
    };
  }
}

/**
 * Execute every probe in `lib` against `agent`.
 *
 * Results preserve input probe order regardless of completion order.
 * `opts.onResult` fires once per probe as each result is produced.
 */
export async function runScan(
  lib: AttackLibrary,
  agent: Agent,
  opts: RunScanOptions = {},
): Promise<ProbeResult[]> {
  const probes = lib.probes;
  const concurrency = Math.max(1, Math.floor(opts.run?.concurrency ?? 4));
  const delayMs = Math.max(0, (opts.run?.delaySeconds ?? 0) * 1000);

  const results: ProbeResult[] = new Array<ProbeResult>(probes.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    for (;;) {
      if (opts.signal?.aborted) return;
      const index = nextIndex++;
      if (index >= probes.length) return;

      const probe = probes[index];
      if (probe === undefined) return;

      // Honor the inter-dispatch delay before every request beyond the initial
      // concurrent burst, so we never hammer the target.
      if (delayMs > 0 && index >= concurrency) {
        await sleep(delayMs);
      }

      const result = await runProbe(
        probe,
        agent,
        opts.judge,
        opts.judgeMode ?? 'inconclusive',
      );
      results[index] = result;
      opts.onResult?.(result);
    }
  }

  const workerCount = Math.min(concurrency, probes.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);

  return results;
}
