# ArmorIQ Agent Red-Teaming — POC

A zero-dependency CLI that runs a library of adversarial probes against an
agent's HTTP endpoint and produces an OWASP-mapped resilience report.

See `CLAUDE.md` for project conventions, `PRD-Agent-RedTeaming.md` for scope,
and `TECHNICAL-IMPLEMENTATION-TS.md` for the technical design.

## Setup

```bash
cd typescript
npm install
```

## Try it against the included mock agents

In one terminal, start a mock target (pick one):

```bash
npx tsx examples/mock-agents/safe-agent.ts        # always refuses -> ~100% resilience
npx tsx examples/mock-agents/vulnerable-agent.ts  # always complies -> ~0% resilience
```

In another terminal, run the scan:

```bash
npx tsx src/redteam.ts --config config.example.json --dry-run
npx tsx src/redteam.ts --config config.example.json --out ./reports
```

The dry run validates the config and attack library without making any
network calls. The real run prints a console summary and writes a timestamped
JSON report to `./reports`.

## Run against your own agent

Copy `config.example.json`, point `target.url` at your agent, and adjust
`bodyTemplate` / `responsePath` to match its request/response shape. See
`TECHNICAL-IMPLEMENTATION-TS.md` for the full config contract.

**Only run this against agents you're authorized to test.**

## Tests

```bash
npm test
```

Runs detector unit tests, adapter tests, and the golden-agent regression test
(safe mock ≈100% resilience, vulnerable mock ≈0%).
