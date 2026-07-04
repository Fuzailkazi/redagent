/**
 * @armoriq/schema — SINGLE SOURCE OF TRUTH for the ArmorIQ red-teaming contract.
 *
 * All cross-boundary types are defined here as zod schemas; the TS types are
 * derived with z.infer so there is exactly one definition per shape. This is a
 * pure refactor of the Phase 0 hand-written interfaces (typescript/src/types.ts)
 * and hand-rolled validator (typescript/src/library.ts) — shapes and validation
 * semantics are preserved verbatim; only the mechanism (zod) changed.
 */

import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* Primitive contract enums                                                   */
/* -------------------------------------------------------------------------- */

export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low']);
export type Severity = z.infer<typeof SeveritySchema>;

export const VerdictSchema = z.enum(['PASS', 'FAIL', 'INCONCLUSIVE', 'ERROR']);
export type Verdict = z.infer<typeof VerdictSchema>;

/* -------------------------------------------------------------------------- */
/* Detection + Probe + AttackLibrary                                          */
/* -------------------------------------------------------------------------- */

export const Tier1DetectionModeSchema = z.enum([
  'regex',
  'contains',
  'refusal-heuristic',
]);
export type Tier1DetectionMode = z.infer<typeof Tier1DetectionModeSchema>;

export const Tier1DetectionSchema = z
  .object({
    mode: Tier1DetectionModeSchema,
    // if any matches responseText -> agent complied -> FAIL
    failIfMatches: z.array(z.string()).optional(),
    // if any matches responseText -> agent resisted -> PASS
    passIfMatches: z.array(z.string()).optional(),
  })
  .superRefine((tier1, ctx) => {
    // Regex patterns must compile (engine adds the case-insensitive "i" flag).
    if (tier1.mode !== 'regex') return;
    for (const bucket of ['failIfMatches', 'passIfMatches'] as const) {
      for (const pattern of tier1[bucket] ?? []) {
        try {
          void new RegExp(pattern, 'i');
        } catch (err) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [bucket],
            message: `contains an invalid regex ${JSON.stringify(pattern)}: ${(err as Error).message}`,
          });
        }
      }
    }
  });
export type Tier1Detection = z.infer<typeof Tier1DetectionSchema>;

export const DetectionSchema = z.object({
  tier1: Tier1DetectionSchema,
});
export type Detection = z.infer<typeof DetectionSchema>;

// OWASP Top 10 for Agentic Applications ids, 01..10. The contract documents the
// "ASI" prefix; the source-of-truth attack_library.json historically used "AAI",
// so accept both while still rejecting malformed ids.
const OWASP_RE = /^A[AS]I(0[1-9]|10)$/;

export const ProbeSchema = z.object({
  id: z.string().min(1), // stable unique, e.g. "asi01-001"
  category: z.string().min(1), // snake_case, e.g. "agent_goal_hijack"
  owasp: z.string().regex(OWASP_RE, 'must be one of ASI01..ASI10'), // "ASI01".."ASI10"
  severity: SeveritySchema,
  prompt: z.string().min(1),
  detection: DetectionSchema,
  tags: z.array(z.string()).optional(),
});
export type Probe = z.infer<typeof ProbeSchema>;

export const AttackLibrarySchema = z
  .object({
    version: z.string().min(1),
    probes: z.array(ProbeSchema).min(1, 'library.probes must not be empty'),
  })
  .superRefine((lib, ctx) => {
    const seen = new Set<string>();
    for (let i = 0; i < lib.probes.length; i++) {
      const id = lib.probes[i]!.id;
      if (seen.has(id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['probes', i, 'id'],
          message: `duplicate probe id "${id}"`,
        });
      }
      seen.add(id);
    }
  });
export type AttackLibrary = z.infer<typeof AttackLibrarySchema>;

/* -------------------------------------------------------------------------- */
/* Target + run configuration                                                 */
/* -------------------------------------------------------------------------- */

export const TargetConfigSchema = z.object({
  name: z.string(),
  environment: z.enum(['production', 'staging', 'development']),
  url: z.string(),
  method: z.string().optional(), // default 'POST'
  headers: z.record(z.string()).optional(), // values may contain the literal ${ENV_VAR}
  bodyTemplate: z.unknown(), // JSON with the literal string "{{PROMPT}}" somewhere
  responsePath: z.string(), // dotted path w/ array indices, e.g. "choices.0.message.content"
});
export type TargetConfig = z.infer<typeof TargetConfigSchema>;

export const RunConfigSchema = z.object({
  concurrency: z.number().optional(),
  delaySeconds: z.number().optional(),
  timeoutMs: z.number().optional(),
});
export type RunConfig = z.infer<typeof RunConfigSchema>;

export const ConfigSchema = z.object({
  target: TargetConfigSchema,
  run: RunConfigSchema.optional(),
});
export type Config = z.infer<typeof ConfigSchema>;

/* -------------------------------------------------------------------------- */
/* Runtime results + scoring                                                  */
/* -------------------------------------------------------------------------- */

export const AdapterResponseSchema = z.object({
  responseText: z.string(),
  raw: z.unknown().optional(),
  error: z.string().optional(),
});
export type AdapterResponse = z.infer<typeof AdapterResponseSchema>;

/**
 * Tier-2 LLM-judge assessment. The judge is ADVISORY: its verdict is one of
 * PASS | FAIL | INCONCLUSIVE (never ERROR — the judge never manufactures an
 * ERROR verdict; on its own failure it fails safe to INCONCLUSIVE). The type is
 * kept as `Verdict` for seam simplicity; the judge implementation validates the
 * PASS|FAIL|INCONCLUSIVE subset and falls back to INCONCLUSIVE otherwise.
 */
export const JudgeAssessmentSchema = z.object({
  verdict: VerdictSchema, // judge's verdict (PASS|FAIL|INCONCLUSIVE)
  rationale: z.string(), // why (logged; shown to humans)
  confidence: z.number().optional(), // 0..1 if the model gave one
  model: z.string(), // model id used, e.g. 'gpt-4o'
  cached: z.boolean(), // true if served from cache
});
export type JudgeAssessment = z.infer<typeof JudgeAssessmentSchema>;

export const ProbeResultSchema = z.object({
  probe: ProbeSchema,
  responseText: z.string(),
  // Effective verdict used for scoring: the judge's if it ran, else Tier-1's.
  verdict: VerdictSchema,
  reason: z.string(),
  error: z.string().optional(),
  raw: z.unknown().optional(),
  // Optional Tier-2 fields — omitted (undefined) when no judge runs, so this is
  // fully backward-compatible with Phase-1 results.
  tier1Verdict: VerdictSchema.optional(), // original Tier-1 verdict, preserved for human override
  judge: JudgeAssessmentSchema.optional(), // the judge's assessment, if it ran
});
export type ProbeResult = z.infer<typeof ProbeResultSchema>;

export const CategoryScoreSchema = z.object({
  category: z.string(),
  total: z.number(),
  pass: z.number(),
  fail: z.number(),
  inconclusive: z.number(),
  error: z.number(),
});
export type CategoryScore = z.infer<typeof CategoryScoreSchema>;

export const ScoreSchema = z.object({
  total: z.number(),
  pass: z.number(),
  fail: z.number(),
  inconclusive: z.number(),
  error: z.number(),
  resiliencePct: z.number(),
  weightedRiskPct: z.number(),
  byCategory: z.array(CategoryScoreSchema),
});
export type Score = z.infer<typeof ScoreSchema>;

export const ScanMetadataSchema = z.object({
  targetConfigHash: z.string(),
  libraryVersion: z.string(),
  engineVersion: z.string(),
  judgeModel: z.string().nullable(),
  startedAt: z.string(),
  finishedAt: z.string(),
});
export type ScanMetadata = z.infer<typeof ScanMetadataSchema>;

export const ScanResultSchema = z.object({
  target: z.object({
    name: z.string(),
    environment: z.string(),
  }),
  metadata: ScanMetadataSchema,
  score: ScoreSchema,
  results: z.array(ProbeResultSchema),
});
export type ScanResult = z.infer<typeof ScanResultSchema>;

/* -------------------------------------------------------------------------- */
/* Agent seam — lets golden mocks stand in for the HTTP adapter               */
/* -------------------------------------------------------------------------- */

export interface Agent {
  send(prompt: string): Promise<AdapterResponse>;
}

/* -------------------------------------------------------------------------- */
/* Judge seam — Tier-2 LLM adjudication (advisory)                            */
/* -------------------------------------------------------------------------- */

/**
 * Input handed to the judge for a single probe adjudication. `tier1` carries the
 * heuristic verdict + reason so the judge can see (but must not blindly trust)
 * what Tier-1 concluded.
 */
export interface JudgeInput {
  probe: Probe;
  responseText: string;
  tier1: { verdict: Verdict; reason: string };
}

/**
 * The Tier-2 judge seam. Implemented in @armoriq/judge against an injectable
 * LLM client; the engine depends only on this interface (never on `openai`).
 */
export interface Judge {
  adjudicate(input: JudgeInput): Promise<JudgeAssessment>;
}

/* -------------------------------------------------------------------------- */
/* Attack-library validation                                                  */
/* -------------------------------------------------------------------------- */

export class LibraryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LibraryValidationError';
  }
}

/**
 * Validate an already-parsed attack-library object via zod. Throws a
 * LibraryValidationError on the first problem found. Preserves the Phase 0
 * semantics: non-empty version, non-empty probes, unique ids, and regex-mode
 * patterns must compile.
 */
export function validateLibrary(data: unknown): AttackLibrary {
  const result = AttackLibrarySchema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const where = issue && issue.path.length > 0 ? issue.path.join('.') : 'library';
    const message = issue ? `${where}: ${issue.message}` : 'invalid attack library';
    throw new LibraryValidationError(message);
  }
  return result.data;
}
