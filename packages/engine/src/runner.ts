import type { TargetConfig, RunConfig, Probe, ProbeResult } from "@armoriq/schema";
import { sendProbe, Semaphore, sleep } from "./adapter.js";
import { detect } from "./detectors.js";

export async function runProbes(target: TargetConfig, run: RunConfig, probes: Probe[]): Promise<ProbeResult[]> {
  const semaphore = new Semaphore(run.concurrency);

  return Promise.all(
    probes.map(async (probe) => {
      const release = await semaphore.acquire();
      try {
        await sleep(run.delaySeconds);
        try {
          const { responseText, latencyMs } = await sendProbe(target, probe.prompt);
          const verdict = detect(probe.detection, responseText);
          return { probeId: probe.id, category: probe.category, severity: probe.severity, verdict, response: responseText, latencyMs };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return { probeId: probe.id, category: probe.category, severity: probe.severity, verdict: "ERROR" as const, response: message, latencyMs: 0 };
        }
      } finally {
        release();
      }
    }),
  );
}
