# CLAUDE.md — ArmorIQ Agent Red-Teaming

This file is project memory for Claude Code. Read it before doing any work in this
repo. It defines what we're building, the conventions to follow, the commands to
run, and the guardrails that must never be broken.

---

## What this project is

A red-teaming system that runs a maintained library of adversarial probes against
any agent onboarded on ArmorIQ (reached over its HTTP/REST interface), scores each
response, and produces an OWASP-mapped security report.

Framework basis: **OWASP Top 10 for Agentic Applications** (AIUC-1 crosswalk).

Read these before implementing:
- `PRD-Agent-RedTeaming.md` — product requirements, phases, scope, non-goals.
- `TECHNICAL-IMPLEMENTATION-TS.md` — the authoritative technical design. Follow it.
- `README.md` — how the existing POC runs.
- `attacks/attack_library.json` — the probe library (source of truth for attacks).

## Current state (starting point — do not discard)

A working proof-of-concept already exists and is validated:
- `attacks/attack_library.json` — shared, versioned, language-agnostic probes.

The product is a single TypeScript/Node monorepo (`packages/*` + `apps/*`). There is
no Python component.

The productization plan is to **refactor, not rewrite** the TS POC into packages,
then wrap it in services. Reuse the POC's logic (adapter, detectors, scorer,
report builders) — it is correct and tested against golden agents.

## Target architecture (build toward this)

pnpm + turborepo monorepo:

```
apps/
  api/       Fastify API: register targets, trigger/poll/fetch scans
  worker/    BullMQ consumer that runs scan jobs
  web/       (Phase 2) Next.js dashboard
packages/
  schema/    zod schemas + inferred TS types (SINGLE SOURCE OF TRUTH for contracts)
  engine/    library loader, adapter (HTTP), detectors, runner, scorer
  judge/     LLM-judge client + rubric (Tier-2 detection)
  reporting/ JSON / markdown / PDF report builders
  db/        Prisma client + migrations
attacks/
  attack_library.json   shared probe library (data, never code)
```

Stack: Node 20 LTS · TypeScript 5 · ESM · Fastify · BullMQ+Redis · Prisma+Postgres ·
zod · undici · vitest · OpenAI/GPT SDK (`openai`, judge) · Playwright (PDF).

LLM judge uses **OpenAI / GPT**, not Anthropic. Auth via `OPENAI_API_KEY`; model
via `JUDGE_MODEL` env (default `gpt-4o`; `gpt-4o-mini` for cheaper Standard runs).
Use `chat.completions` with `response_format: { type: "json_object" }`. An
OpenAI-compatible `baseURL` (Azure OpenAI, vLLM, OpenRouter) is also fine.

## Build order (implement in this sequence)

1. **Refactor POC → packages** (`schema`, `engine`, `reporting`). Pure refactor,
   no behavior change. Add vitest + the golden-agent smoke test as a regression guard.
2. **Add the LLM judge** (`packages/judge`); wire into the runner for INCONCLUSIVE
   results and the Deep profile. Cache by hash(probeId+responseText).
3. **Add persistence + API + worker** (Prisma, Fastify, BullMQ). Async, stored,
   queryable scans. This is the Phase 1 internal onboarding gate.
4. **Add scan profiles + scheduling** (Quick/Standard/Deep; BullMQ repeatable jobs;
   baseline diffing / regression alerts).
5. **Add dashboard + PDF export** (Next.js over the API; Playwright `page.pdf()`).
6. **Grow the attack library** — mutation variants, multi-turn probes, deeper
   per-category coverage. Data only, no engine changes.

Do one phase at a time. After each, everything must build, lint, and pass tests.

## Conventions (follow these)

- **Language-agnostic attacks.** Never hardcode probes in code. Attacks live
  in `attacks/attack_library.json`. The engine reads data.
- **Schema first.** All cross-boundary types come from `packages/schema` (zod).
  Infer types with `z.infer`; do not hand-write duplicate interfaces.
- **Validate at the edges.** Parse the attack library and all API inputs with zod;
  fail fast on malformed data.
- **Scoring convention (do not invert):** `FAIL` = the agent COMPLIED with the
  attack (the vulnerability). `PASS` = the agent resisted. `INCONCLUSIVE` = unclear,
  route to judge/human. Never count INCONCLUSIVE or ERROR as PASS.
- **Two headline scores:** resilience % (pass rate, higher better) and
  weighted-risk % (severity-weighted fail rate, lower better). Severity weights:
  critical 4, high 3, medium 2, low 1.
- **ESM everywhere.** `"type": "module"`; use `.js` import specifiers in TS ESM.
- **Small, testable modules.** Adapter / detectors / runner / scorer stay separable
  and unit-tested.

## Commands

Monorepo commands:
```bash
pnpm install
pnpm -r build          # build all packages
pnpm -r test           # vitest across packages
pnpm -r lint
pnpm --filter @armoriq/api dev
pnpm --filter @armoriq/worker dev
pnpm --filter @armoriq/engine test
```

## Testing requirements (must exist and pass)

- **Golden agents:** a "safe" mock (always refuses) scores ~100% resilience; a
  "vulnerable" mock (always complies) scores ~0%. This is the primary regression
  guard — never let it break.
- **Detector unit tests:** canned responses → asserted PASS/FAIL/INCONCLUSIVE.
- **Adapter tests:** local HTTP server; verify `{{PROMPT}}` injection into the body
  template and dotted `response_path` extraction (including array indices).
- **Judge tests:** mock the LLM client; assert JSON parsing + fallback on bad output.
- **Library contract test:** `attack_library.json` validates against the zod schema
  in CI so a malformed probe can never merge.

## Guardrails — do not violate

- **Authorization is a hard gate.** Destructive/exfiltration probes must never run
  against a `production` target without explicit, logged sign-off. Enforce in the
  API layer, not just the UI.
- **Never DoS a target.** Cap concurrency (undici Agent), honor `delaySeconds`, set
  per-probe timeouts. We test for resource exhaustion; we must not cause it.
- **Secrets by reference only.** Headers/keys use `${ENV_VAR}` or secret-manager
  references. Never persist raw secrets in the DB or commit them.
- **Store raw responses, treat as sensitive.** Findings keep the agent's verbatim
  response for reproduction — encrypt at rest, apply retention/access controls (a
  leaked-PII response is itself sensitive).
- **Reproducibility.** Every report pins `{ targetConfigHash, libraryVersion,
  engineVersion, judgeModel }`.
- **Judge is advisory, not oracle.** Log its rationale; allow human override.
- **No secrets, tokens, customer data, or `reports/` output committed to git.**

## Definition of done (per phase)

- Everything builds (`pnpm -r build`) and lints clean.
- `pnpm -r test` passes, including the golden-agent smoke test.
- New behavior has tests.
- Docs updated if the contract changed (schema, scoring, library format).

## Do not

- Do not rewrite the POC from scratch — refactor it.
- Do not add heavy dependencies before the phase that needs them (Phase 1 engine
  needs only `zod`; Node's built-in `fetch` already works).
- Do not hardcode attacks in code.
- Do not invert or "simplify" the PASS/FAIL convention.
