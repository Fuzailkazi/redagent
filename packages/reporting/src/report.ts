import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ProbeResult, RedTeamConfig, ScoreSummary } from "@armoriq/schema";

export function hashTargetConfig(target: RedTeamConfig["target"]): string {
  const stable = JSON.stringify({
    url: target.url,
    method: target.method,
    headerNames: Object.keys(target.headers).sort(),
    bodyTemplate: target.bodyTemplate,
    responsePath: target.responsePath,
    timeoutMs: target.timeoutMs,
  });
  return `sha256:${createHash("sha256").update(stable).digest("hex")}`;
}

export interface Report {
  meta: {
    generatedAt: string;
    targetConfigHash: string;
    libraryVersion: string;
    engineVersion: string;
  };
  summary: ScoreSummary;
  results: ProbeResult[];
}

export function buildReport(
  config: RedTeamConfig,
  libraryVersion: string,
  engineVersion: string,
  summary: ScoreSummary,
  results: ProbeResult[],
  generatedAt: string,
): Report {
  return {
    meta: {
      generatedAt,
      targetConfigHash: hashTargetConfig(config.target),
      libraryVersion,
      engineVersion,
    },
    summary,
    results,
  };
}

export async function writeReport(report: Report, outDir: string): Promise<string> {
  await mkdir(outDir, { recursive: true });
  const safeTimestamp = report.meta.generatedAt.replace(/[:.]/g, "-");
  const path = join(outDir, `report-${safeTimestamp}.json`);
  await writeFile(path, JSON.stringify(report, null, 2), "utf8");
  return path;
}
