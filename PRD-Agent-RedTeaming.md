# PRD — ArmorIQ Agent Red-Teaming

## Problem

Teams onboarding an AI agent onto ArmorIQ have no automated way to check whether
that agent is vulnerable to common adversarial techniques (prompt injection,
jailbreaks, tool misuse, data exfiltration, excessive agency, etc.) before it
goes live. Manual red-teaming is slow, inconsistent, and doesn't scale across
every onboarded agent or every release.

## Goal

Give ArmorIQ an automated red-teaming capability: point it at any agent's
HTTP/REST interface, run a maintained library of adversarial probes against it,
score the responses, and produce a report mapped to the OWASP Top 10 for
Agentic Applications (AIUC-1 crosswalk).

## Users

- **Security/AppSec engineers** onboarding a new agent — need a pass/fail gate
  before production sign-off.
- **Agent developers** — need to know which categories their agent fails so
  they can fix prompts/guardrails.
- **ArmorIQ platform** (future) — needs scan results as structured data to
  drive dashboards, scheduling, and regression alerts.

## Scope — Phase 0 (this POC)

- Single-shot CLI (`typescript/src/redteam.ts`) that:
  - Loads a target config (HTTP endpoint, request template, response path).
  - Loads the shared attack library (`attacks/attack_library.json`).
  - Sends each probe to the target, applies Tier-1 (pattern-based) detection.
  - Computes two headline scores: **resilience %** and **weighted-risk %**.
  - Writes a JSON report with reproducibility metadata.
  - Supports `--dry-run` (validate config + library, no network calls).
- Two mock target agents (always-refuses / always-complies) used both as
  usage examples and as the golden-agent regression test.
- No persistence, no API, no scheduling, no LLM judge, no dashboard — those
  are later phases (see `CLAUDE.md` build order).

## Out of scope (for this POC)

- Running probes against a target without the operator's own authorization —
  this tool assumes the caller already has permission to test the target.
- Multi-turn conversations (single-turn probes only for now).
- LLM-judge disambiguation of INCONCLUSIVE results (Tier-2, Phase 2 of the
  monorepo build).
- Any persistence layer, web UI, or scheduling.

## Success criteria

- Running the CLI against the safe mock agent yields ~100% resilience, ~0%
  weighted-risk.
- Running it against the vulnerable mock agent yields ~0% resilience, ~100%
  weighted-risk.
- All CLAUDE.md testing requirements pass (`npm test` in `typescript/`).
- A new engineer can go from `git clone` to a report in under 5 minutes using
  only the README.

## Non-goals

- This is not a general-purpose LLM evaluation framework — it is scoped to
  adversarial security probes mapped to the OWASP Agentic Top 10.
- This is not a WAF or runtime firewall — it's an offline/pre-production
  scanning tool.

## Future phases

See `CLAUDE.md` → "Target architecture" and "Build order" for the path from
this POC to the full pnpm/turborepo monorepo (schema/engine/judge/reporting
packages, Fastify API, BullMQ worker, Next.js dashboard, PDF export).
