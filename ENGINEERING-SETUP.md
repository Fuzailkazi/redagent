# ArmorIQ Agent Red-Teaming — Engineering Setup & Handoff

What your engineers need to run, verify, and deploy this project. It is a
pnpm + turborepo monorepo: a red-teaming engine that fires a library of adversarial
probes (OWASP Agentic Top-10, ASI01–ASI10) at any agent reachable over HTTP, scores
the responses (Tier-1 heuristics + optional Tier-2 LLM judge), stores scans, and
serves them via an API and a web dashboard.

---

## 0. FIRST — get the code onto the remote (blocker)

As of this handoff the work is **not yet pushed**. The remote
(`github.com/Fuzailkazi/redagent`) only has the initial empty commit. Phases 0–2 are
committed on local branches; **Phases 3–5 (db/api/worker/web) are uncommitted** in
the working tree. Before an engineer can clone anything:

- [ ] Commit the remaining work (Phases 3–5) and the docs.
- [ ] Push the branch(es) to `origin`.
- [ ] Confirm `.env`, `apps/cli/.env`, `reports/`, `node_modules/`, `dist/`,
      `.turbo/`, `*.tsbuildinfo` are gitignored (they are) — **no secrets in git**.
- [ ] Rotate the OpenAI key that was shared in plaintext during development.

(Claude can do the commit + push on request.)

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | **20 LTS+** (dev tested on 22) | ESM project |
| pnpm | **10.28.2** (pinned via `packageManager`) | `corepack enable` to match |
| PostgreSQL | **16** | one database, e.g. `redagent` |
| Redis | **7** | BullMQ queue backend |
| Docker + Compose | optional | `docker-compose.yml` ships Postgres + Redis |
| OpenAI API key | optional | only for the Tier-2 judge (live judged scans) |

## 2. Repository layout

```
packages/
  schema/     @armoriq/schema   — zod schemas + inferred types (SINGLE SOURCE OF TRUTH)
  engine/     @armoriq/engine   — library loader, HTTP adapter, detectors, runner, scorer
  reporting/  @armoriq/reporting— JSON / Markdown report builders
  judge/      @armoriq/judge    — Tier-2 OpenAI/GPT judge (injectable, mock-testable)
  db/         @armoriq/db       — Prisma client + schema (Target / Scan / Finding)
apps/
  cli/        @armoriq/cli      — the redteam CLI (run a scan from the terminal)
  api/        @armoriq/api      — Fastify API (register targets, trigger/poll/fetch scans)
  worker/     @armoriq/worker   — BullMQ consumer that runs scan jobs
  web/        @armoriq/web      — Next.js 15 dashboard (paste an agent → scan → report)
attacks/attack_library.json     — the probe library (versioned DATA, never code)
docker-compose.yml              — Postgres 16 + Redis 7 for local/CI
```

## 3. First-time setup

```bash
git clone https://github.com/Fuzailkazi/redagent.git
cd redagent
corepack enable && corepack prepare pnpm@10.28.2 --activate
pnpm install

# Infra: either Docker …
docker compose up -d           # starts Postgres:5432 + Redis:6379
# … or point DATABASE_URL/REDIS_URL at existing instances.

# Environment
cp .env.example .env           # then edit DATABASE_URL / REDIS_URL / OPENAI_API_KEY
createdb redagent 2>/dev/null || true   # if using a native Postgres

# Database schema
pnpm --filter @armoriq/db exec prisma generate
pnpm --filter @armoriq/db exec prisma migrate deploy   # or `migrate dev` in dev

# Build + verify
pnpm -r build
pnpm -r test        # 81 tests incl. the golden regression guard
pnpm -r lint
```

## 4. Running it

```bash
# API  (http://localhost:3001)
pnpm --filter @armoriq/api  exec tsx src/server.ts
# Worker (consumes the BullMQ scan queue)
pnpm --filter @armoriq/worker exec tsx src/worker.ts
# Web  (http://localhost:3000)
pnpm --filter @armoriq/web dev            # or: build && next start

# Terminal-only alternative (no API/DB needed):
pnpm --filter @armoriq/cli exec tsx src/redteam.ts --config <config.json> --dry-run
```

Open **http://localhost:3000**, click **Load example** (or fill in your agent), pick a
depth, and Scan.

## 5. Environment variables

| Var | Required | Default | Used by | Purpose |
|-----|----------|---------|---------|---------|
| `DATABASE_URL` | **yes** | — | db, api, worker | Postgres connection (Prisma) |
| `REDIS_URL` | **yes** | `redis://localhost:6379` | api, worker | BullMQ queue |
| `OPENAI_API_KEY` | no | — | worker, cli, judge | Tier-2 judge; unset = Tier-1 only (never fails) |
| `JUDGE_MODEL` | no | `gpt-4o` | judge | judge model (`gpt-4o-mini` is cheaper) |
| `OPENAI_BASE_URL` | no | OpenAI | judge | OpenAI-compatible endpoint (Azure/vLLM/OpenRouter) |
| `PORT` | no | `3001` | api | API listen port |
| `CORS_ORIGIN` | no | `http://localhost:3000` | api | allowed web origin(s), comma-separated |
| `NEXT_PUBLIC_API_URL` | no | `http://localhost:3001` | web | API base URL (baked at build time) |
| `ATTACK_LIBRARY_PATH` | no | repo `attacks/…` | engine | override probe library path |
| `REDTEAM_AUTHORIZED` | no | — | cli | `true` authorizes CLI production scans |

**Secrets are by reference only.** Target auth headers use `${ENV_VAR}` (e.g.
`Authorization: "Bearer ${OPENAI_API_KEY}"`), resolved at request time — raw secrets
are never stored in the DB or committed.

## 6. Ports

| Port | Service |
|------|---------|
| 3000 | Web (Next.js) |
| 3001 | API (Fastify) |
| 5432 | Postgres |
| 6379 | Redis |

## 7. Verification checklist

- [ ] `pnpm -r build` green (8 projects)
- [ ] `pnpm -r test` green (81 tests, incl. golden: safe mock ≈100% resilience, vulnerable ≈0%)
- [ ] `curl localhost:3001/healthz` → `{"ok":true}`
- [ ] Web loads at `localhost:3000`; a scan against a test agent completes and shows findings
- [ ] Production target scan without authorization → **403** (auth hard gate)

## 8. Known gaps / hardening before production (backlog)

These are deliberate MVP shortcuts, not bugs — worth an engineer's attention:

1. **Secret management.** Web users can only reference server-side `${ENV_VAR}`s; a
   real multi-tenant product needs a secret vault (never accept/persist raw keys).
2. **Findings at rest.** `Finding.responseText` stores the agent's verbatim response
   (potentially sensitive/PII) in plaintext — add encryption-at-rest + access controls.
3. **AuthN/AuthZ.** The API and web are currently open — add authentication, tenancy,
   and rate limiting before exposing publicly.
4. **Tier-1 detector false positives.** Some seed probes' `failIfMatches` regexes match
   trigger words inside refusals (the judge corrects this in `--deep`/standard). Tighten
   the detectors or make refusals outrank loose compliance matches (Phase 6).
5. **Judge cost/latency.** `deep` calls the model on every probe; add caching TTLs and
   budget controls (adjudications are already cached by `hash(probeId+responseText)`).
6. **Phasing not yet built.** Phase 4 (scan profiles/scheduling/baseline diffing) and PDF
   export are not implemented.

## 9. Testing

- `pnpm -r test` — unit tests across all packages (vitest); the **golden-agent** test in
  `@armoriq/engine` is the primary regression guard — never let it break.
- API/worker unit tests mock Postgres/Redis (no infra needed). The Phase 3 e2e test
  exercises the real API→worker→DB path against local Postgres/Redis.
- Library contract: `attacks/attack_library.json` validates against the zod schema.

See `CLAUDE.md` for conventions and guardrails, `PRD-Agent-RedTeaming.md` for product
scope, and `TECHNICAL-IMPLEMENTATION-TS.md` for the authoritative design.
