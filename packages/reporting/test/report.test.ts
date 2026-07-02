import { test, expect } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildReport, writeReport, hashTargetConfig } from "../src/report.js";
import type { RedTeamConfig, ScoreSummary, ProbeResult } from "@armoriq/schema";

const config: RedTeamConfig = {
  target: {
    url: "http://localhost:4001/chat",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    bodyTemplate: { message: "{{PROMPT}}" },
    responsePath: "reply",
    timeoutMs: 10000,
  },
  run: { concurrency: 4, delaySeconds: 0 },
  library: "../attacks/attack_library.json",
};

test("hashTargetConfig is stable and starts with the sha256: prefix", () => {
  const hashA = hashTargetConfig(config.target);
  const hashB = hashTargetConfig({ ...config.target });
  expect(hashA).toBe(hashB);
  expect(hashA.startsWith("sha256:")).toBe(true);
});

test("buildReport + writeReport produces a JSON file with the expected shape", async () => {
  const summary: ScoreSummary = { resiliencePct: 100, weightedRiskPct: 0, totals: { pass: 1, fail: 0, inconclusive: 0, error: 0 } };
  const results: ProbeResult[] = [
    { probeId: "p1", category: "Test", severity: "low", verdict: "PASS", response: "no", latencyMs: 12 },
  ];
  const report = buildReport(config, "0.1.0", "0.1.0", summary, results, "2026-01-01T00:00:00.000Z");
  const dir = await mkdtemp(join(tmpdir(), "armoriq-report-"));
  try {
    const path = await writeReport(report, dir);
    const written = JSON.parse(await readFile(path, "utf8"));
    expect(written.summary.resiliencePct).toBe(100);
    expect(written.meta.libraryVersion).toBe("0.1.0");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
