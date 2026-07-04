import { describe, expect, it } from "vitest";
import type {
  Probe,
  ProbeResult,
  ScanResult,
  Score,
} from "@armoriq/schema";
import {
  buildJsonReport,
  buildMarkdownReport,
  buildScanResult,
  getEngineVersion,
  hashTargetConfig,
} from "../src/index.js";

/* ---- Fixtures -------------------------------------------------------------- */

function probe(id: string, category: string, overrides: Partial<Probe> = {}): Probe {
  return {
    id,
    category,
    owasp: "ASI01",
    severity: "high",
    prompt: `prompt for ${id}`,
    detection: { tier1: { mode: "contains", failIfMatches: ["boom"] } },
    ...overrides,
  };
}

const results: ProbeResult[] = [
  {
    probe: probe("p1", "prompt-injection", { severity: "critical" }),
    responseText: "sure, boom",
    verdict: "FAIL",
    reason: "matched failIfMatches",
  },
  {
    probe: probe("p2", "prompt-injection"),
    responseText: "I cannot help with that",
    verdict: "PASS",
    reason: "refused",
  },
  {
    probe: probe("p3", "data-exfiltration", { severity: "low" }),
    responseText: "hmm",
    verdict: "INCONCLUSIVE",
    reason: "unclear",
  },
];

// Score built by hand (reporting does not depend on the engine's scorer).
const score: Score = {
  total: 3,
  pass: 1,
  fail: 1,
  inconclusive: 1,
  error: 0,
  resiliencePct: 33.33,
  weightedRiskPct: 50,
  byCategory: [
    {
      category: "data-exfiltration",
      total: 1,
      pass: 0,
      fail: 0,
      inconclusive: 1,
      error: 0,
    },
    {
      category: "prompt-injection",
      total: 2,
      pass: 1,
      fail: 1,
      inconclusive: 0,
      error: 0,
    },
  ],
};

function buildFixture(): ScanResult {
  return buildScanResult({
    target: {
      name: "Acme Bot",
      environment: "staging",
      url: "https://example.test/agent",
      bodyTemplate: { input: "{{PROMPT}}" },
      responsePath: "output",
    },
    results,
    libraryVersion: "0.1.0",
    startedAt: "2026-07-02T00:00:00.000Z",
    finishedAt: "2026-07-02T00:01:00.000Z",
    engineVersion: "0.1.0",
    judgeModel: null,
    score,
  });
}

/* ---- Tests ----------------------------------------------------------------- */

describe("getEngineVersion", () => {
  it("defaults to 0.1.0", () => {
    expect(getEngineVersion()).toBe("0.1.0");
  });
  it("uses the supplied version", () => {
    expect(getEngineVersion("1.2.3")).toBe("1.2.3");
  });
});

describe("hashTargetConfig", () => {
  it("is stable regardless of source key order", () => {
    const a = hashTargetConfig({
      name: "x",
      environment: "staging",
      url: "u",
      bodyTemplate: { a: 1, b: 2 },
      responsePath: "r",
    });
    const b = hashTargetConfig({
      responsePath: "r",
      bodyTemplate: { b: 2, a: 1 },
      url: "u",
      environment: "staging",
      name: "x",
    });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("buildScanResult", () => {
  it("pins provenance metadata and carries the score/results", () => {
    const scan = buildFixture();
    expect(scan.target).toEqual({ name: "Acme Bot", environment: "staging" });
    expect(scan.metadata.libraryVersion).toBe("0.1.0");
    expect(scan.metadata.engineVersion).toBe("0.1.0");
    expect(scan.metadata.judgeModel).toBeNull();
    expect(scan.metadata.targetConfigHash).toMatch(/^[0-9a-f]{64}$/);
    expect(scan.score).toBe(score);
    expect(scan.results).toBe(results);
  });
});

describe("buildJsonReport", () => {
  it("produces parseable JSON containing the two headline scores and per-category section", () => {
    const json = buildJsonReport(buildFixture());
    const parsed = JSON.parse(json) as ScanResult;
    expect(parsed.score.resiliencePct).toBe(33.33);
    expect(parsed.score.weightedRiskPct).toBe(50);
    expect(parsed.score.byCategory.map((c) => c.category)).toEqual([
      "data-exfiltration",
      "prompt-injection",
    ]);
  });
});

describe("buildMarkdownReport", () => {
  const md = buildMarkdownReport(buildFixture());

  it("renders both headline scores", () => {
    expect(md).toContain("**Resilience:** 33.33%");
    expect(md).toContain("**Weighted risk:** 50%");
  });

  it("renders a per-category section with a row per category", () => {
    expect(md).toContain("## By category");
    expect(md).toContain("| data-exfiltration | 1 | 0 | 0 | 1 | 0 |");
    expect(md).toContain("| prompt-injection | 2 | 1 | 1 | 0 | 0 |");
  });

  it("lists FAIL findings before INCONCLUSIVE findings", () => {
    const failIdx = md.indexOf("`p1`");
    const inconclusiveIdx = md.indexOf("`p3`");
    expect(failIdx).toBeGreaterThan(-1);
    expect(inconclusiveIdx).toBeGreaterThan(-1);
    expect(failIdx).toBeLessThan(inconclusiveIdx);
  });
});
