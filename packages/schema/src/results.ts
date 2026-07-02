import { z } from "zod";
import { severitySchema, verdictSchema } from "./attack-library.js";

export const probeResultSchema = z.object({
  probeId: z.string(),
  category: z.string(),
  severity: severitySchema,
  verdict: verdictSchema,
  response: z.string(),
  latencyMs: z.number(),
});
export type ProbeResult = z.infer<typeof probeResultSchema>;

export const scoreSummarySchema = z.object({
  resiliencePct: z.number(),
  weightedRiskPct: z.number(),
  totals: z.object({
    pass: z.number(),
    fail: z.number(),
    inconclusive: z.number(),
    error: z.number(),
  }),
});
export type ScoreSummary = z.infer<typeof scoreSummarySchema>;
