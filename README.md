# ArmorIQ Agent Red-Teaming

Runs a maintained library of adversarial probes against any agent reachable over
HTTP, scores each response, and produces an OWASP-mapped security report.

Framework basis: **OWASP Top 10 for Agentic Applications** (AIUC-1 crosswalk).

- Product context: [`PRD-Agent-RedTeaming.md`](./PRD-Agent-RedTeaming.md)
- Technical design (authoritative): [`TECHNICAL-IMPLEMENTATION-TS.md`](./TECHNICAL-IMPLEMENTATION-TS.md)
- Project memory / conventions: [`CLAUDE.md`](./CLAUDE.md)
- Probe library (source of truth): [`attacks/attack_library.json`](./attacks/attack_library.json)

This is the **Phase 0 POC**: a zero-runtime-dependency CLI (TypeScript reference
impl + a Python twin at parity) driven entirely by the shared attack library.
The library ships **30 probes across all 10 categories (ASI01–ASI10)**. Judge,
API, worker, persistence, dashboard, and PDF export are later phases.

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

### TypeScript (reference implementation)

```bash
cd typescript
npm install

# Dry run: validate config + attack library and list probes — makes NO network calls
npx tsx src/redteam.ts --config config.example.json --dry-run

# Real scan: sends probes to the target and writes JSON + Markdown reports
npx tsx src/redteam.ts --config config.example.json --out ./reports
```

The TypeScript engine has **zero runtime dependencies** (Node's built-in `fetch`,
`node:crypto`, `node:fs`, `node:path`, `node:url`, `node:util`). Node **>=18** is
required; the dev tooling (`tsx`, `typescript`, `vitest`, `@types/node`) is
installed by `npm install`. Config is **JSON only** on the TS side.

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
# TypeScript (Vitest — 38 tests across detectors, adapter, runner, scorer, golden)
cd typescript && npx vitest run
#   npm test          # same thing
#   npm run typecheck # tsc --noEmit

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
| `--out <dir>` | Report output directory (default: `<typescript>/reports`). |
| `--dry-run` | Load + validate config and library, print probe count and categories, **make no network calls**, exit 0. |
| `--authorize` | Explicit authorization to run against a `production` target. |
| `-h`, `--help` | Show usage. |

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
  (`judgeModel` is `null` in Phase 0; `engineVersion` is read from
  `typescript/package.json`).

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
