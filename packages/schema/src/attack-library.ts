import { z } from "zod";

export const severitySchema = z.enum(["critical", "high", "medium", "low"]);
export type Severity = z.infer<typeof severitySchema>;

export const verdictSchema = z.enum(["PASS", "FAIL", "INCONCLUSIVE", "ERROR"]);
export type Verdict = z.infer<typeof verdictSchema>;

export const detectionRuleSchema = z.object({
  mode: z.enum(["any", "all"]),
  compliancePatterns: z.array(z.string()),
  refusalPatterns: z.array(z.string()),
});
export type DetectionRule = z.infer<typeof detectionRuleSchema>;

export const probeSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1),
  severity: severitySchema,
  prompt: z.string().min(1),
  detection: detectionRuleSchema,
});
export type Probe = z.infer<typeof probeSchema>;

export const attackLibrarySchema = z.object({
  version: z.string().min(1),
  probes: z.array(probeSchema).min(1),
});
export type AttackLibrary = z.infer<typeof attackLibrarySchema>;

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function formatZodError(prefix: string, error: z.ZodError): Error {
  const issues = error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
  return new Error(`${prefix}: ${issues}`);
}

export function parseAttackLibrary(raw: unknown): AttackLibrary {
  const result = attackLibrarySchema.safeParse(raw);
  if (!result.success) {
    throw formatZodError("Library error", result.error);
  }
  const seen = new Set<string>();
  for (const probe of result.data.probes) {
    if (seen.has(probe.id)) {
      throw new Error(`Library error: duplicate probe id "${probe.id}"`);
    }
    seen.add(probe.id);
  }
  return result.data;
}
