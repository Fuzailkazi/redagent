/**
 * Report builders — assemble a ScanResult and render it as JSON or Markdown.
 *
 * Every scan pins provenance: { targetConfigHash, libraryVersion, engineVersion,
 * judgeModel }. judgeModel is null in Phase 0 (no LLM judge). targetConfigHash is
 * a sha256 over a canonicalized (key-sorted) view of the target config so reports
 * are reproducible regardless of source key order.
 *
 * SCORING CONVENTION: FAIL = agent complied (vulnerability), PASS = agent resisted.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { score } from "./scorer.js";
import type {
  ProbeResult,
  ScanMetadata,
  ScanResult,
  Score,
  Severity,
  TargetConfig,
  Verdict,
} from "./types.js";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Read the POC package version for the engineVersion provenance pin. */
export function getEngineVersion(): string {
  try {
    const pkgPath = join(HERE, "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
    return pkg.version ?? "0.1.0";
  } catch {
    return "0.1.0";
  }
}

/**
 * Deterministically stringify a value with sorted object keys so the resulting
 * hash is stable regardless of key order in the source config file.
 */
function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys
      .map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/** sha256 hex of the canonicalized target config (reproducibility pin). */
export function hashTargetConfig(target: TargetConfig): string {
  return createHash("sha256").update(canonicalize(target)).digest("hex");
}

export interface BuildScanResultArgs {
  target: TargetConfig;
  results: ProbeResult[];
  libraryVersion: string;
  startedAt: string;
  finishedAt: string;
  /** Defaults to the value read from package.json (fallback '0.1.0'). */
  engineVersion?: string;
  /** null in Phase 0 (no LLM judge). */
  judgeModel?: string | null;
  /** Optional pre-computed score; recomputed from results when omitted. */
  score?: Score;
}

export function buildScanResult(args: BuildScanResultArgs): ScanResult {
  const metadata: ScanMetadata = {
    targetConfigHash: hashTargetConfig(args.target),
    libraryVersion: args.libraryVersion,
    engineVersion: args.engineVersion ?? getEngineVersion(),
    judgeModel: args.judgeModel ?? null,
    startedAt: args.startedAt,
    finishedAt: args.finishedAt,
  };

  return {
    target: {
      name: args.target.name,
      environment: args.target.environment,
    },
    metadata,
    score: args.score ?? score(args.results),
    results: args.results,
  };
}

export function buildJsonReport(scan: ScanResult): string {
  return JSON.stringify(scan, null, 2);
}

// ---- Markdown rendering ----------------------------------------------------

const VERDICT_LABEL: Record<Verdict, string> = {
  PASS: "PASS",
  FAIL: "FAIL",
  INCONCLUSIVE: "INCONCLUSIVE",
  ERROR: "ERROR",
};

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function truncate(text: string | undefined | null, max = 300): string {
  if (!text) return "";
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

/** Sort a set of results by severity (critical first), then by probe id. */
function bySeverityThenId(a: ProbeResult, b: ProbeResult): number {
  const s = SEVERITY_RANK[a.probe.severity] - SEVERITY_RANK[b.probe.severity];
  if (s !== 0) return s;
  return a.probe.id.localeCompare(b.probe.id);
}

function renderFinding(r: ProbeResult): string[] {
  const p = r.probe;
  const lines: string[] = [];
  lines.push(
    `### ${VERDICT_LABEL[r.verdict]} — \`${p.id}\` (${p.owasp} · ${p.category} · ${p.severity})`,
  );
  lines.push("");
  lines.push(`- **Reason:** ${r.reason || "(none)"}`);
  lines.push(`- **Prompt:** ${truncate(p.prompt, 400)}`);
  if (r.error) {
    lines.push(`- **Error:** ${r.error}`);
  }
  lines.push(`- **Response:** ${truncate(r.responseText) || "(empty)"}`);
  lines.push("");
  return lines;
}

export function buildMarkdownReport(scan: ScanResult): string {
  const { score: s, metadata, target, results } = scan;
  const lines: string[] = [];

  lines.push(`# ArmorIQ Red-Team Report — ${target.name}`);
  lines.push("");
  lines.push(
    "> Scoring: **FAIL = agent complied (vulnerability)**, **PASS = agent resisted**, **INCONCLUSIVE = unclear**, **ERROR = transport error**.",
  );
  lines.push("");

  // Headline scores
  lines.push("## Headline scores");
  lines.push("");
  lines.push(
    `- **Resilience:** ${s.resiliencePct}% — pass rate (higher is better)`,
  );
  lines.push(
    `- **Weighted risk:** ${s.weightedRiskPct}% — severity-weighted fail rate (lower is better)`,
  );
  lines.push(
    `- Probes: ${s.total} · Pass ${s.pass} · Fail ${s.fail} · Inconclusive ${s.inconclusive} · Error ${s.error}`,
  );
  lines.push("");

  // Run metadata
  lines.push("## Run metadata");
  lines.push("");
  lines.push(`- Target environment: \`${target.environment}\``);
  lines.push(`- Started: ${metadata.startedAt}`);
  lines.push(`- Finished: ${metadata.finishedAt}`);
  lines.push(`- targetConfigHash: \`${metadata.targetConfigHash}\``);
  lines.push(`- libraryVersion: \`${metadata.libraryVersion}\``);
  lines.push(`- engineVersion: \`${metadata.engineVersion}\``);
  lines.push(`- judgeModel: \`${metadata.judgeModel ?? "null"}\``);
  lines.push("");

  // Per-category table
  lines.push("## By category");
  lines.push("");
  lines.push("| Category | Total | Pass | Fail | Inconclusive | Error |");
  lines.push("| --- | ---: | ---: | ---: | ---: | ---: |");
  for (const c of s.byCategory) {
    lines.push(
      `| ${c.category} | ${c.total} | ${c.pass} | ${c.fail} | ${c.inconclusive} | ${c.error} |`,
    );
  }
  lines.push("");

  // Findings — FAILs first (severity-ordered), then INCONCLUSIVE.
  lines.push("## Findings");
  lines.push("");
  const fails = results
    .filter((r) => r.verdict === "FAIL")
    .sort(bySeverityThenId);
  const inconclusive = results
    .filter((r) => r.verdict === "INCONCLUSIVE")
    .sort(bySeverityThenId);

  if (fails.length === 0 && inconclusive.length === 0) {
    lines.push("_No FAIL or INCONCLUSIVE findings._");
    lines.push("");
  } else {
    for (const r of fails) lines.push(...renderFinding(r));
    for (const r of inconclusive) lines.push(...renderFinding(r));
  }

  return lines.join("\n");
}
