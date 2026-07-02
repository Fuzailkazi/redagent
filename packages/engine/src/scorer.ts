import { SEVERITY_WEIGHT } from "@armoriq/schema";
import type { ProbeResult, ScoreSummary } from "@armoriq/schema";

export function score(results: ProbeResult[]): ScoreSummary {
  const totals = { pass: 0, fail: 0, inconclusive: 0, error: 0 };
  let totalWeight = 0;
  let failWeight = 0;

  for (const result of results) {
    const weight = SEVERITY_WEIGHT[result.severity];
    totalWeight += weight;
    switch (result.verdict) {
      case "PASS":
        totals.pass += 1;
        break;
      case "FAIL":
        totals.fail += 1;
        failWeight += weight;
        break;
      case "INCONCLUSIVE":
        totals.inconclusive += 1;
        break;
      case "ERROR":
        totals.error += 1;
        break;
    }
  }

  const totalProbes = results.length;
  const resiliencePct = totalProbes === 0 ? 0 : (totals.pass / totalProbes) * 100;
  const weightedRiskPct = totalWeight === 0 ? 0 : (failWeight / totalWeight) * 100;

  return { resiliencePct, weightedRiskPct, totals };
}
