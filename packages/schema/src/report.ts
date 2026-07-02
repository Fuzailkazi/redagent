import { z } from "zod";
import { probeResultSchema, scoreSummarySchema } from "./results.js";

export const reportMetaSchema = z.object({
  generatedAt: z.string(),
  targetConfigHash: z.string(),
  libraryVersion: z.string(),
  engineVersion: z.string(),
});
export type ReportMeta = z.infer<typeof reportMetaSchema>;

export const reportSchema = z.object({
  meta: reportMetaSchema,
  summary: scoreSummarySchema,
  results: z.array(probeResultSchema),
});
export type Report = z.infer<typeof reportSchema>;
