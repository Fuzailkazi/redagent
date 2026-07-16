# RedAgent — Agent Red-Teaming

RedAgent fires a maintained library of **adversarial probes** at any AI agent reachable over
HTTP, scores how the agent holds up, and returns an **OWASP-mapped resilience report**. It runs
as a service: register a target, trigger a scan, poll for the result — so another product can
drive it entirely over a small REST API.

- **Framework basis:** [OWASP Top 10 for Agentic Applications](https://genai.owasp.org) — the `ASI01`–`ASI10` threat taxonomy (AIUC-1 crosswalk).
- **Stack:** TypeScript · Node 20+ · pnpm + turborepo monorepo · Fastify · BullMQ + Redis · Prisma + Postgres · Next.js 15 · OpenAI (Tier-2 judge).

> **Two-minute mental model:** a *target* is an agent you want to test. A *scan* runs the 30
> probes against it and produces *findings* (one per probe) plus two headline scores. The API
> is the front door; a background worker does the actual scanning.

---

## Scoring convention (read this first — `FAIL` means the agent complied)

Deliberately **not** the intuitive polarity, so a `FAIL` always flags a vulnerability:

| Verdict | Meaning |
| --- | --- |
| **`FAIL`** | The agent **COMPLIED** with the attack — this is the vulnerability. |
| **`PASS`** | The agent **RESISTED** (refused / deflected). |
| **`INCONCLUSIVE`** | Unclear — routed to the LLM judge (or a human). |
| **`ERROR`** | Transport/timeout failure. |

`INCONCLUSIVE` and `ERROR` are **never** counted as `PASS`. Every scan yields two headline numbers:

- **Resilience %** = `pass / total × 100` — *higher is better*.
- **Weighted-risk %** = `Σ(severity-weight of FAILs) / Σ(severity-weight of all) × 100` — *lower is better* (weights: critical 4, high 3, medium 2, low 1).

---

## Architecture

```
 Consumer (your product / the web dashboard / CLI)
        │  HTTP / REST (JSON)
        ▼
   ┌─────────┐   enqueue { scanId }   ┌──────────┐   consumes   ┌──────────┐
   │  API    │ ─────────────────────▶ │  Redis    │ ───────────▶ │  Worker  │
   │ Fastify │                        │  BullMQ   │              │          │
   └────┬────┘ ◀── reads/writes ──────┴──────────┘              └────┬─────┘
        │                                                             │ uses (in-process libs)
        ▼                                                             ▼
   ┌──────────┐                                   ┌─────────────────────────────────┐
   │ Postgres │  Target · Scan · Finding          │ @armoriq/engine  (adapter, detectors,
   │ (Prisma) │                                   │   runner, scorer, autodetect)     │
   └──────────┘                                   │ @armoriq/judge   (Tier-2 LLM)     │
                                                   │ @armoriq/reporting (JSON/MD)      │
   attacks/attack_library.json  (probes = data)   │ @armoriq/schema  (zod types)      │
   External: the target agent (HTTP/SSE) · OpenAI  └─────────────────────────────────┘
```

**Why this shape:** a scan is slow (30 network round-trips + optional LLM calls), so the **API
answers instantly with a `scanId`** and a **worker** does the work — scale by adding workers.
The scan logic lives in framework-free **libraries** (`packages/*`), so the API, worker, and CLI
all reuse the exact same engine. `@armoriq/schema` (zod) is the single source of truth for every
type crossing a boundary.

### Repo layout
```
packages/
  schema/     @armoriq/schema    — zod schemas + inferred types (SINGLE SOURCE OF TRUTH)
  engine/     @armoriq/engine    — library loader, HTTP/SSE adapter, detectors, runner, scorer, autodetect
  judge/      @armoriq/judge     — Tier-2 OpenAI judge (injectable, mock-testable, cached)
  reporting/  @armoriq/reporting — JSON / Markdown report builders + config hashing
  db/         @armoriq/db        — Prisma client + schema (Target / Scan / Finding)
apps/
  api/        @armoriq/api       — Fastify REST API (the integration surface)
  worker/     @armoriq/worker    — BullMQ consumer that runs scans + persists results
  web/        @armoriq/web       — Next.js dashboard (built on the ArmorIQ design system)
  cli/        @armoriq/cli       — terminal scanner (also usable in CI)
attacks/attack_library.json      — the probe library (versioned DATA, never code)
design-system/                   — the vendored ArmorIQ UI kit (tokens, primitives, fonts, skills)
```

---

## Using it as an API (integrate into another product)

Your product talks to **`@armoriq/api`** (default `http://localhost:3001`). Language doesn't
matter — it's plain REST/JSON. The recommended flow is **detect → register → scan → poll →
fetch**:

| # | Call | Purpose |
| - | --- | --- |
| 1 | `POST /detect` | *(optional)* From just a URL, infer the request shape + where the reply lives (JSON or SSE). |
| 2 | `POST /targets` | Register an agent (its config). Returns `{ id }`. |
| 3 | `POST /targets/:id/scans` | Start a scan. Returns `{ scanId, status: "queued" }` immediately (202). |
| 4 | `GET /scans/:id` | Poll status + live counts + scores. |
| 5 | `GET /scans/:id/findings` | Per-probe findings once complete. |
| — | `GET /scans` · `GET /scans/:id/report.json` · `.../report.md` | List scans · download a report. |
| — | `GET /healthz` | Liveness. |

### 1. Auto-detect (optional, powers "paste a URL")
```bash
curl -s -X POST http://localhost:3001/detect \
  -H 'content-type: application/json' \
  -d '{ "url": "https://your-agent.example.com/chat" }'
# → { "ok": true, "target": { "url", "method", "bodyTemplate", "responsePath",
#      "responseMode": "json"|"sse", "sseEvent"? }, "bodyShape": "message", "sample": "…" }
```

### 2. Register a target
```bash
curl -s -X POST http://localhost:3001/targets -H 'content-type: application/json' -d '{
  "name": "my-agent",
  "config": {
    "target": {
      "name": "my-agent",
      "environment": "development",
      "url": "https://your-agent.example.com/chat",
      "method": "POST",
      "headers": { "Authorization": "Bearer ${AGENT_TOKEN}" },
      "bodyTemplate": { "messages": [{ "role": "user", "content": "{{PROMPT}}" }] },
      "responsePath": "choices.0.message.content"
    },
    "run": { "concurrency": 4, "delaySeconds": 0.3, "timeoutMs": 30000 }
  }
}'
# → { "id": "<targetId>" }
```
- `{{PROMPT}}` is where each probe is injected into `bodyTemplate` (deep string replace).
- `responsePath` is a dotted path to the reply text (array indices allowed). For streaming
  agents set `responseMode: "sse"` + `sseEvent` (e.g. `"content"`) and `responsePath` = the
  field inside each event's data.
- **Secrets by reference only:** header values use `${ENV_VAR}`, resolved at request time — raw
  secrets are never stored.

### 3. Trigger a scan
```bash
curl -s -X POST http://localhost:3001/targets/<targetId>/scans \
  -H 'content-type: application/json' -d '{ "profile": "standard" }'
# → 202 { "scanId": "<scanId>", "status": "queued" }
```
**Profiles:** `quick` (Tier-1 heuristics only) · `standard` (judge on INCONCLUSIVE) · `deep`
(judge on every response, most accurate). The judge runs only if `OPENAI_API_KEY` is set;
otherwise it silently falls back to Tier-1 (never fails the scan).

**Production authorization hard gate:** scanning a target whose `environment` is `production`
is **refused (403)** unless explicitly authorized — send header `x-redteam-authorize: true` or
body `{ "authorize": true }`. Every decision is logged. Enforced in the API, not just the UI.

### 4. Poll for status + scores
```bash
curl -s http://localhost:3001/scans/<scanId>
# → { id, status: "queued"|"running"|"completed"|"failed", profile, judgeModel,
#     resiliencePct, weightedRiskPct,
#     counts: { total, pass, fail, inconclusive, error },   // updates live while running
#     libraryVersion, engineVersion, errorMessage, startedAt, finishedAt }
```

### 5. Fetch findings / reports
```bash
curl -s http://localhost:3001/scans/<scanId>/findings
# → [ { probeId, category, owasp, severity, verdict, tier1Verdict, reason,
#       responseText, judge } , … ]           # responseText is SENSITIVE (verbatim agent output)
curl -s http://localhost:3001/scans/<scanId>/report.json   # full reproducible report
curl -s http://localhost:3001/scans/<scanId>/report.md     # human-readable Markdown
```

**Errors** are `{ "error": "<Code>", "message"?, "issues"? }` with standard status codes
(`400` validation · `403` authorization · `404` not found). **CORS**: the API allows the web
origin via `CORS_ORIGIN` (default `http://localhost:3000`; comma-separated for multiple).

---

## The main logic (how a scan actually works)

The worker (`apps/worker/src/runScanJob.ts`) is the whole lifecycle in ~120 readable lines:

1. **Load** the `Scan` + `Target` from Postgres; mark it `running`.
2. **Library** — `@armoriq/engine` `loadLibrary()` reads + validates `attacks/attack_library.json` (zod).
3. **Adapter** — `createHttpAgent(target)` builds a one-method `Agent { send(prompt) }`: it injects
   `{{PROMPT}}`, resolves `${ENV_VAR}` headers, POSTs via `fetch`, and extracts the reply (JSON
   path *or* SSE stream) with a per-probe timeout.
4. **Runner** — `runScan(library, agent, { run, judge, judgeMode, onResult })` fires probes at
   bounded concurrency with a delay (never DoS), and for each: Tier-1 `detect()` → verdict.
5. **Judge (Tier-2)** — for `standard`/`deep`, `@armoriq/judge` adjudicates via OpenAI
   (`chat.completions`, `response_format: json_object`), cached by `hash(probeId+responseText)`;
   advisory (the Tier-1 verdict is preserved), fail-safe to `INCONCLUSIVE`.
6. **Score** — `score(results)` computes resilience % + weighted-risk % + per-category rollups.
7. **Persist** — write `Finding` rows + scores; set `completed` (or `failed` with a message —
   a scan is never left stuck `running`).

Each engine module is small, single-purpose, and unit-tested (see `packages/engine/test/`). The
**golden-agent test** is the primary regression guard: a mock that always refuses scores ~100%
resilience; one that always complies scores ~0%.

### Attack library (`attacks/attack_library.json`)
Probes are **data, not code** — versioned JSON validated against the schema in CI, so coverage
grows without touching the engine. 30 seed probes cover all ten OWASP Agentic categories
(`ASI01`–`ASI10`), 3 each. Each probe carries `id`, `category`, `owasp`, `severity`, `prompt`,
and a `detection.tier1` matcher.

---

## Run it locally

**Prerequisites:** Node 20+ · pnpm 10 (`corepack enable`) · Postgres 16 · Redis 7 (a
`docker-compose.yml` provides both). OpenAI key optional (only for the judge).

```bash
pnpm install
docker compose up -d                 # Postgres :5432 + Redis :6379  (or use existing instances)
cp .env.example .env                 # set DATABASE_URL / REDIS_URL / OPENAI_API_KEY
pnpm --filter @armoriq/db exec prisma migrate deploy
pnpm -r build && pnpm -r test        # 81 tests, incl. the golden guard

# run the services (each stays up in its own terminal):
set -a; . ./.env; set +a
pnpm --filter @armoriq/api    exec tsx src/server.ts   # API  :3001
pnpm --filter @armoriq/worker exec tsx src/worker.ts   # worker
pnpm --filter @armoriq/web    dev                       # dashboard :3000

# or terminal-only, no DB/queue needed:
pnpm --filter @armoriq/cli exec tsx src/redteam.ts --config <config.json> --dry-run
```
Ports: web `3000` · API `3001` · Postgres `5432` · Redis `6379`. Full setup + env reference:
[`ENGINEERING-SETUP.md`](./ENGINEERING-SETUP.md).

---

## Guardrails & production hardening

Built-in: **production-authorization hard gate** (API layer) · **never DoS** (capped concurrency,
`delaySeconds`, per-probe timeouts) · **secrets by reference** (`${ENV_VAR}`, never stored raw) ·
**reproducibility** (every report pins `targetConfigHash`, `libraryVersion`, `engineVersion`,
`judgeModel`) · the judge is **advisory** (human-overridable).

Before exposing publicly, add: **API authentication + tenancy**, a **secret vault** (so users'
agent keys aren't stored raw), **encryption-at-rest** for `Finding.responseText` (verbatim agent
output is sensitive), and **rate limiting**. See `ENGINEERING-SETUP.md` §8.

## More docs
- [`ENGINEERING-SETUP.md`](./ENGINEERING-SETUP.md) — full setup, env vars, deploy, backlog.
- [`PRD-Agent-RedTeaming.md`](./PRD-Agent-RedTeaming.md) — product scope + OWASP mapping.
- [`TECHNICAL-IMPLEMENTATION-TS.md`](./TECHNICAL-IMPLEMENTATION-TS.md) — authoritative technical design.
- [`CLAUDE.md`](./CLAUDE.md) — conventions & guardrails.
- [`design-system/`](./design-system) — the vendored ArmorIQ UI kit powering `apps/web`.
