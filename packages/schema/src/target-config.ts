import { z } from "zod";

export const targetConfigSchema = z.object({
  url: z.string().min(1),
  method: z.string().min(1).default("POST"),
  headers: z.record(z.string(), z.string()).default({}),
  bodyTemplate: z.unknown().default({ message: "{{PROMPT}}" }),
  responsePath: z.string().min(1),
  timeoutMs: z.number().positive().default(10000),
});
export type TargetConfig = z.infer<typeof targetConfigSchema>;

export const runConfigSchema = z.object({
  concurrency: z.number().int().positive().default(4),
  delaySeconds: z.number().min(0).default(0),
});
export type RunConfig = z.infer<typeof runConfigSchema>;

export const redTeamConfigSchema = z.object({
  target: targetConfigSchema,
  run: runConfigSchema.default({}),
  library: z.string().min(1),
});
export type RedTeamConfig = z.infer<typeof redTeamConfigSchema>;

function formatZodError(prefix: string, error: z.ZodError): Error {
  const issues = error.issues.map((i) => `"${i.path.join(".") || "(root)"}" ${i.message}`).join("; ");
  return new Error(`${prefix}: ${issues}`);
}

export function parseRedTeamConfig(raw: unknown): RedTeamConfig {
  const result = redTeamConfigSchema.safeParse(raw);
  if (!result.success) {
    throw formatZodError("Config error", result.error);
  }
  return result.data;
}
