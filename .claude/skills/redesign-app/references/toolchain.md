# Toolchain manifest (prune this)

> This is the working list of every **skill**, **subagent**, and **package** the
> `redesign-app` skill can reach for. It's a menu, not a mandate. Strike anything
> you don't want the redesign flow to use, then we lock "how and where to use
> what" into the skill's phase rules.
>
> Three columns matter: **What**, **Where it's installed**, **Used for**.
> The `Keep?` column is for you to mark.

---

## How the three kinds differ (read once)

- **Skills** live per-machine at `~/.claude/skills/` (or ship with the repo under
  `.claude/skills/`). They are NOT `npm install`-able into the repo. A teammate
  gets a user-level skill only by installing it on their own machine. Only skills
  under `.claude/skills/` here travel with a `git clone`.
- **Subagents** are agent *types* (the `subagent_type` param). Some are built in,
  some are project-defined under `.claude/agents/`.
- **Packages** are in `package.json` and install with one `npm install`. These are
  the only truly per-repo, auto-shared items.

So "install the skills here" really means: **(a)** document the exact install
commands as prerequisites, and **(b)** for the few we depend on hard, vendor them
into `.claude/skills/` so they clone with the repo (the way `transitions-dev`
already is, locked in `skills-lock.json`).

---

## A. Skills

### A1. Already in this repo (travel with `git clone`)

| Keep? | Skill | Where | Used for (in redesign) |
| --- | --- | --- | --- |
| âœ… | `transitions-dev` | `.claude/skills/` (locked in `skills-lock.json`) | Phase 5 motion. 18 production CSS-transition recipes. Default motion rung. |
| âœ… | `design-parity` | `.claude/skills/` | Reference pattern. Per-screen reuse-vs-variant-vs-new reconciliation (its decision trees are baked into `redesign-app`). |
| âœ… | `restyle-to-armoriq` | `.claude/skills/` | Reference pattern. The PM -> designer -> engineer -> verify -> signed-commit playbook `redesign-app` mirrors. |
| âœ… | `armoriq-design-system` | `design-system/skills/armoriq-design-system/SKILL.md` | The data layer: `components.json` (what exists) + `tokens.json` (what values). `redesign-app` queries these during the build phase. |

### A2. User-level today (do NOT clone with the repo â€” install per machine)

Install the official ones from the Anthropic plugin marketplace (run in Claude Code):

```
/plugin marketplace add anthropics/claude-code
/plugin install <name>
```

| Keep? | Skill | Used for (in redesign) | Notes |
| --- | --- | --- | --- |
| âœ… | `frontend-design` | Phase 4 net-new screens with no design source: generate a bold structure, THEN recompose onto our tokens/primitives. | Also mirrored as an official plugin (already cached locally). |
| âœ… | `gsap-core` | Phase 5 motion beyond CSS: base tweens, easing, stagger. | Foundation for all other gsap skills. |
| âœ… | `gsap-timeline` | Phase 5: sequenced/choreographed motion. | |
| âœ… | `gsap-scrolltrigger` | Phase 5: scroll-linked reveals, pinning, parallax (landing/marketing surfaces). | |
| âœ… | `gsap-react` | Phase 5: `useGSAP` + cleanup inside React components. | The React entry point for GSAP. |
| âœ… | `gsap-plugins` | Phase 5: Flip, Draggable, SplitText, ScrollSmoother, etc. | |
| âœ… | `gsap-utils` | Phase 5: `clamp`, `mapRange`, `snap`, etc. helpers. | |
| âœ… | `gsap-performance` | Phase 5: 60fps hygiene, avoid layout thrash. | Reference for tuning motion. |
| âœ… | `gsap-frameworks` | Vue/Svelte GSAP lifecycle/cleanup. | Kept for the "new app" scenario if it isn't React. |
| âœ… | `extract-design` | Phase 1/2: pull a design language from a reference URL (tokens, type, color, WCAG). | Useful if the redesign is inspired by an external site. |
| âœ… | `theme-factory` | Phase 2: quick theme exploration for a new visual direction. | |
| âœ… | `brand-guidelines` | Brand styling reference / structure for brand application. | Kept as reference; our own brand tokens take precedence. |
| âœ… | `canvas-design` | Static poster/PDF art (marketing, decks, exported visuals). | Kept for marketing/sales artefacts around the product. |
| âœ… | `webapp-testing` | Phase 4/6 verification: drive the running app with Playwright, screenshot, read console. | The visual-verification workhorse. |
| âœ… | `armoriq-restyle` | Carry our tokens to a *foreign* repo. | Primary tool for the "new app in a different repo" scenario. |

> **Not installed anywhere:** there is no "shimmer" skill. Shimmer/skeleton is done
> via the `Skeleton` primitive + `transitions-dev` recipes, not a dedicated skill.
> (`jakubkrehel/make-interfaces-feel-better` from the original spec was never
> installed.) Don't let the skill reference a skill that doesn't exist.

---

## B. Subagents (agent types the workflow spawns)

| Keep? | Subagent | Used for |
| --- | --- | --- |
| âœ… | `design-ingestor` | Phase 1: turn a Figma URL / screenshot / HTML into a structured DesignSpec JSON without flooding context. |
| âœ… | `component-matcher` | Phase 2/4: for each screen region, decide reuse / variant / new against `@shared/ui`. |
| âœ… | `token-matcher` | Phase 2/4: for each visual value, decide reuse-token / add-token, enforce naming grammar. |
| âœ… | `Explore` | Phase 1: fan-out read of the existing app (features, routes, components) without dumping files into context. |
| âœ… | `feature-dev:code-architect` | Phase 2: architecture blueprint for the new IA. |
| âœ… | `feature-dev:code-explorer` | Phase 1: deep trace of an existing feature's data/flow. |
| âœ… | `feature-dev:code-reviewer` | Phase 6: review the built screens for bugs/convention drift. |
| âœ… | `general-purpose` / `claude` | Phase 2 role agents (PM, UX, Visual, DS-expert, Architecture) and Phase 4 engineers. |

---

## C. Packages (already in `package.json` â€” one `npm install` gets all)

| Job | Package | Redesign phase |
| --- | --- | --- |
| Component model | `react` 19 | all |
| Styling | `tailwindcss` v4 (`@tailwindcss/vite`) over the `aq-*` theme | 4 |
| Routing | `react-router` / `react-router-dom` 7 | 3 (arch) |
| Data fetching | `@tanstack/react-query` 5 (via `@shared/api`) | 3/4 |
| Schema / API boundary | `zod` 4 | 3/4 |
| Forms | `react-hook-form` 7 + `@hookform/resolvers` | 4 |
| Charts | `recharts` 3 | 4 (dashboards) |
| Node/graph canvas | `@xyflow/react` 12 | 4 (AIQ graph, Plans flow) |
| YAML / code editor | `@uiw/react-codemirror` + `@codemirror/lang-yaml` | 4 (policy/config) |
| React motion | `framer-motion` / `motion` 12 | 5 (enter/exit, layout, gesture) |
| Icons | in-house `@shared/icons` first; `lucide-react` for gaps | 4 |
| Dates | `date-fns` 4 | 4 |
| Dials/knobs | `dialkit` | 4 (if used) |

**Quality / build (dev):** `eslint` 9 + `typescript-eslint` (the no-hex / no-inline-color / no-arbitrary-size / no-cross-feature rails), `prettier` + `prettier-plugin-tailwindcss`, `husky` + `lint-staged`, `vitest` + `@testing-library/*` + `msw`, `typescript` 5.9, `vite` 7, `@figma/code-connect`.

**Not yet installed but implied if you keep GSAP:**

```
npm install gsap @gsap/react
```

(The `gsap-*` *skills* teach the API; to actually `import gsap` in code you need the package too.)

---

## D. Decision: keep everything

Per direction, **nothing is dropped** - every skill, subagent, and package above is
part of the toolchain. The whole `gsap-*` family, `brand-guidelines`, `canvas-design`,
`extract-design`, `theme-factory`, and `armoriq-restyle` all stay in. The redesign
skill's job is then to route the RIGHT tool to the RIGHT phase, not to prune the set.

Action items to make "keep everything" real:

- **Vendor into `.claude/skills/`** so they clone with the repo (today only
  `transitions-dev` is vendored; the rest are user-level and won't travel):
  `frontend-design`, the full `gsap-*` family, `extract-design`, `theme-factory`,
  `brand-guidelines`, `canvas-design`, `armoriq-restyle`, `webapp-testing`.
  Until vendored, each teammate installs them per machine via the `/plugin install`
  commands in section A2.
- **Add packages** (GSAP skills teach the API; the runtime needs the library):
  ```
  npm install gsap @gsap/react
  ```
- **Phase routing** (locked into the skill's phase steps so it's not a free-for-all):
  - Phase 1/2 discovery: `extract-design`, `theme-factory`, `feature-dev:code-explorer`, `Explore`
  - Phase 2 planning: PM/UX/Visual/DS-expert role agents + `feature-dev:code-architect` + `component-matcher` + `token-matcher`
  - Phase 4 build: `frontend-design` (net-new), engineer agents, `design-parity` patterns
  - Phase 5 motion: `transitions-dev` first, then `framer-motion`/`motion`, then `gsap-*` for timelines/scroll
  - Phase 4/6 verify: `webapp-testing`, `feature-dev:code-reviewer`
  - Marketing/sales artefacts (adjacent): `canvas-design`, `brand-guidelines`
  - New app in a foreign repo (other scenario): `armoriq-restyle`

