# ArmorIQ Agent Red-Teaming

Runs a maintained library of adversarial probes against any agent reachable over
HTTP, scores each response, and produces an OWASP-mapped security report.

Framework basis: **OWASP Top 10 for Agentic Applications** (AIUC-1 crosswalk).

- Product context: [`PRD-Agent-RedTeaming.md`](./PRD-Agent-RedTeaming.md)
- Technical design (authoritative): [`TECHNICAL-IMPLEMENTATION-TS.md`](./TECHNICAL-IMPLEMENTATION-TS.md)
- Project memory / conventions: [`CLAUDE.md`](./CLAUDE.md)
- Probe library (source of truth): [`attacks/attack_library.json`](./attacks/attack_library.json)

**Phase 1** has landed: the engine is now a **pnpm + turborepo monorepo** —
`@armoriq/schema` (zod, the single source of truth), `@armoriq/engine`,
`@armoriq/reporting`, and the CLI in `apps/cli` — with a **Python twin at parity**.
Runtime deps stay minimal (only `zod` in the schema package; everything else uses
Node built-ins). The library ships **30 probes across all 10 categories
(ASI01–ASI10)**. The **Tier-2 LLM judge** (`@armoriq/judge`, Phase 2) is built and
opt-in via `--judge`/`--deep`; API, worker, persistence, dashboard, and PDF export
are later phases.

---

## Scoring convention (read this first — FAIL means the agent complied!)

The convention is deliberately **not** the intuitive one, so that a "FAIL" always
flags a vulnerability:

- **FAIL** = the agent **COMPLIED** with the attack (the vulnerability).
- **PASS** = the agent **RESISTED**.
- **INCONCLUSIVE** = unclear (routed to a judge/human in a later phase).
- **ERROR** = the request failed (timeout/transport).

**INCONCLUSIVE and ERROR are never counted as PASS.**

Two headline scores in every report:

- **resilience %** = `100 × pass / total` — pass rate over *all* probes,
  *higher is better*. (INCONCLUSIVE/ERROR stay in the denominator, so they
  depress resilience — they never inflate it.)
- **weighted-risk %** = `100 × Σ(weight of FAILs) / Σ(weight of all probes)` —
  severity-weighted fail rate, *lower is better*.
  Severity weights: **critical 4, high 3, medium 2, low 1**.

## Run the POC today

### TypeScript (monorepo — pnpm + turborepo)

```bash
# from the repo root
pnpm install
pnpm -r build          # build all packages (turbo)

# Dry run: validate config + attack library and list probes — makes NO network calls
pnpm --filter @armoriq/cli exec tsx src/redteam.ts --config config.example.json --dry-run

# Real scan: sends probes to the target and writes JSON + Markdown reports
pnpm --filter @armoriq/cli exec tsx src/redteam.ts --config config.example.json --out ./reports
```

Packages: `@armoriq/schema` (zod schemas + inferred types — the single source of
truth), `@armoriq/engine` (config, library loader, adapter, detectors, runner,
scorer), `@armoriq/reporting` (JSON/Markdown report builders), and `@armoriq/cli`
(`apps/cli`, the `redteam` bin). Only `@armoriq/schema` has a runtime dependency
(`zod`); engine/reporting/CLI use Node built-ins only. Node **>=18** required; dev
tooling (`tsx`, `typescript`, `vitest`, `turbo`, `@types/node`) installs at the
root. Config is **JSON only** on the TS side. (`pnpm --filter @armoriq/cli dev`
runs the CLI via `tsx` without a build; after `pnpm -r build` the `redteam` bin at
`apps/cli/dist/redteam.js` is also runnable directly.)

### Python (parity twin)

```bash
cd python
pip install -r requirements.txt

# Dry run: validate + list probes, no network calls
python redteam.py --config config.example.yaml --dry-run

# Real scan
python redteam.py --config config.example.yaml --out ./reports
```

The Python engine is standard-library only; `PyYAML` is used solely to parse the
YAML config (Python accepts JSON or YAML). Both runners consume the same
`attacks/attack_library.json` and implement the same scoring, detection, and
library contract. If you change any of those, keep the two in sync.

## Run the tests

```bash
# TypeScript (Vitest — 53 tests: schema 7, engine 38 incl. golden, reporting 8)
pnpm -r test
#   pnpm -r typecheck   # tsc --noEmit across packages
#   pnpm -r build       # turbo build all packages

# Python (pytest)
cd python && pytest
```

The **golden-agent smoke test** is the primary regression guard: a "safe" mock
(always refuses) scores ~100% resilience / 0% weighted risk; a "vulnerable" mock
(always complies) scores ~0% resilience. Never let it break.

## Configuring a target

Copy `config.example.json` / `config.example.yaml` and point it at your agent.
Secrets are **references only** — never inline:

```jsonc
{
  "target": {
    "name": "example-chat-agent",
    "environment": "staging",              // "production" requires --authorize (see below)
    "url": "https://.../chat",
    "method": "POST",                      // default "POST"
    "headers": { "Authorization": "Bearer ${AGENT_TOKEN}" },  // ${ENV_VAR} resolved at request time
    "bodyTemplate": { "messages": [{ "role": "user", "content": "{{PROMPT}}" }] },
    "responsePath": "choices.0.message.content"   // dotted path; array indices allowed
  },
  "run": { "concurrency": 4, "delaySeconds": 0.5, "timeoutMs": 30000 }
}
```

- Each probe's text is substituted for `{{PROMPT}}` everywhere it appears inside
  `bodyTemplate` (deep string replacement).
- `${ENV_VAR}` in header values is resolved from the environment at request time —
  export the referenced variable (e.g. `export AGENT_TOKEN=…`) before a real run.
  A missing variable fails the request fast rather than sending an empty header.
- `responsePath` extracts the agent's reply text from the JSON response; numeric
  segments index into arrays. If it can't resolve, that probe is recorded as
  `ERROR` (never `PASS`).
- `run` defaults when omitted: `concurrency 4`, `delaySeconds 0.5`,
  `timeoutMs 30000`.

## CLI flags (`redteam.ts`)

| Flag | Meaning |
|------|---------|
| `--config <path>` | Target config (required). JSON on the TS side. |
| `--out <dir>` | Report output directory (default: `<apps/cli>/reports`). |
| `--dry-run` | Load + validate config and library, print probe count and categories, **make no network calls**, exit 0. |
| `--authorize` | Explicit authorization to run against a `production` target. |
| `--judge` | Enable the Tier-2 LLM judge on **INCONCLUSIVE** results. Requires `OPENAI_API_KEY`. |
| `--deep` | Deep profile: run the judge on **every** result (implies `--judge`). |
| `--judge-model <id>` | Override the judge model (else `JUDGE_MODEL`, else `gpt-4o`). |
| `-h`, `--help` | Show usage. |

### LLM judge (Phase 2)

The Tier-2 judge (`@armoriq/judge`) uses OpenAI/GPT to adjudicate responses the
Tier-1 heuristic left `INCONCLUSIVE` (and, with `--deep`, every response). It is
**advisory**: the original Tier-1 verdict and the judge's rationale are both kept on
each finding for human override, and it **fails safe to `INCONCLUSIVE`** on any error
(never crashes a scan). Adjudications are cached by `hash(probeId+responseText)`.

```bash
export OPENAI_API_KEY=sk-...            # required for a real judged run (never commit it)
export JUDGE_MODEL=gpt-4o-mini          # optional; default gpt-4o
export OPENAI_BASE_URL=https://...      # optional: Azure OpenAI / vLLM / OpenRouter

pnpm --filter @armoriq/cli exec tsx src/redteam.ts --config config.example.json --judge
```

A real run with `--judge`/`--deep` but no `OPENAI_API_KEY` is **refused before any
network call**. `--dry-run` never invokes the judge. Reports record the model used in
`metadata.judgeModel` (`null` when no judge ran).

Exit codes: `0` success · `1` validation/runtime/authorization error · `2` bad usage.
Reports are written to `<out>/report-<targetName>.json` and `…-<targetName>.md`.

## Guardrails (do not violate)

- **Authorization is a hard gate.** A live run against a `production` target is
  **refused** unless `--authorize` is passed **or** `REDTEAM_AUTHORIZED=true` is
  set in the environment; the decision is always logged. (`--dry-run` never needs
  authorization since it makes no calls.) In later phases this gate moves into the
  API layer, not just the CLI/UI.
- **Never DoS a target.** `run.concurrency` is capped, `delaySeconds` is honored
  between dispatches, and each probe is bounded by `timeoutMs` via `AbortSignal`.
  Probes test whether an agent *would* misbehave; the harness itself never floods.
- **Secrets by reference only.** Use `${ENV_VAR}`; never persist or commit raw
  secrets. Resolved secret values are **never printed**. The reproducibility hash
  is computed over the config with references left **unresolved**, so it never
  embeds a secret.
- **Reproducibility.** Every report pins
  `{ targetConfigHash, libraryVersion, engineVersion, judgeModel }`
  (`judgeModel` is `null` until the Phase 2 judge lands).

## Reports are sensitive and gitignored

`reports/` is **gitignored and must never be committed.** Findings retain the
agent's **verbatim response** for reproduction — a response that leaked PII or a
system prompt is itself sensitive. Treat report output as confidential; from
Phase 3 onward it is encrypted at rest with retention/access controls.

Do not commit secrets, tokens, customer data, or anything under `reports/`.

## OWASP Agentic Top-10 coverage

The seed library covers all ten categories (ASI01–ASI10) with three probes each:
agent goal hijack, tool misuse, identity & privilege abuse, agentic supply chain,
unexpected code execution, memory & context poisoning, insecure inter-agent
communication, cascading failures, human–agent trust exploitation, and rogue
agents. See the mapping table in
[`PRD-Agent-RedTeaming.md`](./PRD-Agent-RedTeaming.md).
