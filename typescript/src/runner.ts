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
  Probe,
  ProbeResult,
  RunConfig,
} from './types.js';

export interface RunScanOptions {
  run?: RunConfig;
  onResult?: (result: ProbeResult) => void;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Run one probe, mapping any failure to an ERROR verdict (never PASS). */
async function runProbe(probe: Probe, agent: Agent): Promise<ProbeResult> {
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
    return {
      probe,
      responseText: response.responseText,
      verdict,
      reason,
      raw: response.raw,
    };
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
      const index = nextIndex++;
      if (index >= probes.length) return;

      const probe = probes[index];
      if (probe === undefined) return;

      // Honor the inter-dispatch delay before every request beyond the initial
      // concurrent burst, so we never hammer the target.
      if (delayMs > 0 && index >= concurrency) {
        await sleep(delayMs);
      }

      const result = await runProbe(probe, agent);
      results[index] = result;
      opts.onResult?.(result);
    }
  }

  const workerCount = Math.min(concurrency, probes.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);

  return results;
}
