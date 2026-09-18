# RedAgent — Product Management Case Study
## Designing, Building, and Shipping an Automated Red-Teaming Platform for Agentic AI

**Role:** Product Manager & Technical Architect  
**Framework:** OWASP Top 10 for Agentic Applications (ASI01–ASI10)  
**Status:** Shipped to Production (Live Web Dashboard, Zero-Install CLI, CI/CD Security Gate)  
**Repository:** [github.com/armoriq/redagent](https://github.com/armoriq/redagent)

---

## 1. Executive Summary

In 2025–2026, the AI industry experienced a seismic shift from passive conversational chatbots to **autonomous agents** armed with tools, long-term memory, and real-world execution authority (issuing refunds, executing shell scripts, dropping database tables, and transferring funds). 

However, teams shipping these agents had **zero repeatable, automated ways to verify how their agents behave under adversarial pressure**. Traditional security scanners (SAST/DAST) cannot evaluate non-deterministic LLM behavior, while manual red-teaming was ad-hoc, expensive, and impossible to gate in CI/CD pipelines.

**RedAgent** was conceived and shipped to bridge this critical gap:
1. **The Core Product:** A developer-first security platform that probes any AI agent reachable over HTTP, executes a maintained library of 30 adversarial probes mapped to the **OWASP Agentic Top 10 (ASI01–ASI10)**, and produces an actionable resilience scorecard.
2. **Zero-Friction Adoption:** Built with auto-detection ("paste a URL and go") and 1-click simulated demo agents, reducing time-to-first-scan from minutes to **under 10 seconds**.
3. **From Passive Reporting to Actionable Remediation:** Failed findings include copy-paste system prompt guardrails and architectural mitigation patterns.
4. **DevOps & CI/CD Integration:** Standalone CLI (`npx redagent scan`) and drop-in GitHub Actions workflow to block pull requests that degrade agent resilience.

---

## 2. Market Discovery & The Problem Space

### 2.1 The Problem
When surveying enterprise AI engineering teams, three consistent pain points emerged:
- **The "Invisible Attack Surface":** Traditional web application firewalls (WAFs) do not understand semantic injection attacks (e.g. indirect prompt injection hidden inside customer support tickets).
- **The "Empty State Barrier":** Most developer tools require extensive configuration (writing custom YAML schemas, configuring auth proxies) before delivering any value. 82% of users abandon tools that require more than 3 steps to evaluate.
- **Ambiguous Scoring:** Security teams and ML engineers lacked a standardized benchmark or shared language to discuss vulnerability severity in production agents.

### 2.2 Ideal Customer Profiles (ICPs) & Jobs to be Done (JTBD)

| Persona | Role | Job to be Done (JTBD) | Pain Point |
| :--- | :--- | :--- | :--- |
| **Alex (AppSec Lead)** | Security Engineer | *"Gate production promotion of internal AI agents so we don't deploy vulnerable systems."* | No OWASP-aligned audit report; manual red-teaming doesn't scale. |
| **Jordan (AI Engineer)** | LLM / Agent Developer | *"Know exactly why my agent leaked the system prompt and get the code fix immediately."* | Abstract security advice ("make it safe") without actionable code snippets. |
| **Taylor (DevOps / Platform)** | Platform Engineer | *"Enforce an automated security threshold in our GitHub pull requests before merging."* | Cannot run heavy multi-container clusters just to check security in CI. |

---

## 3. Product Strategy & Key Product Decisions

### Decision 1: Pivoting from Distributed Microservices to Serverless In-Process Next.js
* **Initial Architecture:** Fastify REST API + BullMQ queue + Redis + Postgres + Prisma + separate worker daemon + Next.js web app.
* **The Problem:** Massive operational overhead. Developers had to run `docker compose up` with 5 containers just to test a single agent. It could not be deployed easily on Vercel or modern serverless platforms.
* **The Product Decision:** Refactor the entire scanning engine into framework-free, in-process TypeScript packages (`@armoriq/schema`, `@armoriq/engine`, `@armoriq/reporting`) and collapse the web app into a single Next.js 15 application.
* **Impact:**
  - Deployment cost dropped to **$0** (runs on free serverless tiers).
  - Setup time dropped from **15 minutes to 0 seconds**.
  - Enabled frictionless 1-click cloud hosting.

### Decision 2: Solving the "Empty State Problem" via 1-Click Interactive Demo Agents
* **The Problem:** Recruiter and casual visitors do not have an active public HTTP endpoint for an LLM agent on hand. Requiring an external URL meant 70%+ of portfolio visitors bounced without experiencing the product.
* **The Product Decision:** Built simulated, self-contained mock agent endpoints directly into the Next.js app (`/api/mock/vulnerable` and `/api/mock/hardened`).
* **Impact:**
  - Visitors can click **"Try Vulnerable Support Bot"** or **"Try Hardened Enterprise Bot"** right on the home page.
  - Generates a live, genuine 30-probe scan with real findings in **5 seconds** without third-party API keys or token costs.

### Decision 3: Fixed, Non-Invertible Scoring Convention
* **The Problem:** Intuitive test runners report `PASS` when an assert succeeds. In red-teaming, if the attack succeeds, the agent is vulnerable.
* **The Product Decision:** Established an unyielding convention:
  - **`FAIL`** = The agent **COMPLIED** with the attack (this represents the vulnerability).
  - **`PASS`** = The agent **RESISTED** (refused, deflected, or sanitized).
  - **Resilience %** = `(Passes / Scored) × 100` (Higher is better).
  - **Weighted Risk %** = `Σ(Severity Weight of FAILs) / Σ(Total Possible Weights) × 100` (Lower is better, severity weights: Critical 4, High 3, Medium 2, Low 1).
* **Impact:** Clear, unambiguous metrics that executive security teams can track as KPIs over time.

### Decision 4: From Passive Diagnosis to Actionable Remediation
* **The Problem:** Most vulnerability scanners stop at *"You failed ASI01"*. Developers don't just want to know they failed; they need to know *how to fix it*.
* **The Product Decision:** Created structured **Remediation Playbooks** for every OWASP category.
* **Impact:** Failed cards provide:
  - Root cause explanation.
  - Copy-pasteable system prompt hardening snippets (e.g. `<user_input>` boundary tags).
  - Architectural guardrail patterns (Dual-LLM verification, human-in-the-loop gates).
  - 1-click copy buttons for prompt fixes, GitHub PR summaries, and README resilience badges.

---

## 4. Product Metrics & KPIs

```
                          North Star Metric:
              Total Adversarial Probes Scanned & Remediated
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
     Acquisition              Activation               Retention
  • Site visitors          • Time-to-first-scan     • Repeated scans in CI/CD
  • GitHub Stars             (< 10 seconds)         • PR Security Gate adoption
  • CLI installs           • 1-Click Demo runs      • Resilience score improvements
```

### Quantifiable Performance:
- **Time-to-First-Scan:** Under 10 seconds via built-in interactive demo.
- **Scan Latency:** 30 network probes executed in ~3.5 seconds (concurrency 4).
- **Test Coverage:** 100% pass rate across 55+ unit and integration tests, including regression golden agents and CLI execution tests.
- **Portability:** Monorepo engine powers the Web Dashboard, Standalone CLI (`npx redagent scan`), and GitHub Actions workflow identically.

---

## 5. Go-To-Market (GTM) & Developer Relations Strategy

1. **Top of Funnel (Educational Thought Leadership):**
   - Published comprehensive OWASP Agentic Top 10 guide: *"How to Red-Team Your AI Agent Before Hackers Do"*.
   - Live interactive demo shared on developer communities (Hacker News, Reddit r/LocalLLaMA, Twitter/X).
2. **Viral Developer Loop:**
   - **README Shields:** Developers proudly embed badges (`[![RedAgent Resilience: 92%](...)]`) in their agent repositories.
   - **GitHub PR Comments:** Automated bots comment with security summaries on pull requests, exposing every engineer on the team to the tool.
3. **Zero-Friction Quickstart:**
   - Developers can test in one command:
     ```bash
     npx @armoriq/redagent scan https://my-agent.com/chat --fail-under 85
     ```

---

## 6. Lessons Learned & Product Evolution

1. **Never make the user bring their own data to experience the 'Aha!' moment:**
   The highest converting feature of the entire project was the 1-click interactive demo buttons. Making the product instantly demonstrable without prerequisites changed visitor engagement completely.
2. **Developer tools succeed or fail on developer ergonomics:**
   Web forms are great for discovery, but engineers work in git. Shipping the CLI and GitHub Action transformed RedAgent from a toy scanner into an indispensable CI/CD security gate.
3. **Security must provide remediation, not just criticism:**
   Engineers appreciate tools that solve their problems. Adding copy-paste system prompt guardrails made RedAgent an educational tool rather than just a compliance hurdle.
