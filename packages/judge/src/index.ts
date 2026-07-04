/**
 * @armoriq/judge — public entry point.
 *
 * Re-exports the Tier-2 judge implementation. The concrete symbols
 * (LlmClient, Cache, InMemoryCache, buildRubric, createJudge, OpenAiLlmClient)
 * are defined in ./judge.ts, which is owned by the implementation agent.
 *
 * NOTE: seam types (Judge, JudgeInput, JudgeAssessment) live in @armoriq/schema
 * and should be imported from there, not re-declared here.
 */
export * from './judge.js';
