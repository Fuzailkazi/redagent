---
name: redesign-app
description: Use to plan and drive a WHOLE-APP redesign of an existing application (armorIQ-platform-proto) end to end. Works FLOW-FIRST, not screen-first - it identifies the jobs users are trying to get done and the tasks/flows they perform, redesigns those flows, and treats screens as where the steps of a flow happen. Produces an approved redesign.md plan (jobs-to-be-done, target flows, sitemap, feature-to-page mapping, architecture + UX changes with user-benefit rationale, engagement/UX-psychology design), then builds architecture, then builds UI flow by flow (reusing the ArmorIQ design system), then motion, verifying each whole flow. Sits ABOVE design-parity and restyle-to-armoriq (those handle one screen). Three depth tiers (full redesign of arch+UX+UI+motion / UX+UI+motion improvements / same-arch new-visual-style-only). Trigger when the user says "redesign the app", "overhaul the UI", "rework the whole product", "redo the flows", "redo the information architecture", "modernize the app", or asks to plan and execute a multi-screen redesign.
---

# Redesign App

You are planning and driving a **whole-app redesign** of an existing application. This is bigger than any single screen.

## The one principle that governs everything: redesign FLOWS, not screens

A screen is not the unit of work. The unit of work is a **job the user is trying to get done** and the **flow** (the sequence of tasks) they move through to get it done. Screens are just where the steps of a flow happen. If you redesign screen by screen, you get a beautiful app where the user still can't finish what they came to do. So:

1. First find the **jobs and tasks** (what does the user actually want to accomplish here).
2. Then design the **flows** that get each job done with the least friction.
3. Screens, states, and components **fall out of** the flows - they are never the starting point.
4. You **build flow by flow** and verify each **whole flow end to end** (can the user complete the task?), not screen by screen in isolation.

This skill is **RIGID on process, flexible on design**. Do the phases in order. Never write product code before the plan is approved. The two approval gates are mandatory. Heavy reasoning (component/token decisions, flow modeling) is delegated to subagents, not done by feel in the main thread.

---

## Prerequisites (check once, at start)

See `references/toolchain.md` for the full tool menu + install commands. At minimum:

- Design-system data layer current: `design-system/components.json` + `design-system/tokens.json` (run `node design-system/sync/ds-sync.mjs` if unsure).
- Sibling skills present: `transitions-dev` (motion), `design-system-usage` (token/variant rulebook), and `design-system/skills/armoriq-design-system/SKILL.md` (the DS reasoning layer).
- Dev server runs on 5173.

If a tool a phase needs is missing, give the user the exact install command from `references/toolchain.md`. Do NOT silently proceed without it.

---

## Working mode (how the whole redesign is committed)

A whole-app redesign is NEVER one giant diff. Work incrementally:

- **Branch:** all work on a `redesign/<scope>` branch, never `main`.
- **Isolation:** build in a git worktree so the current app stays runnable side by side (compare old vs new live). Use `using-git-worktrees` or `git worktree add`.
- **Commit per flow (and per screen within it):** each screen that passes verification gets its own signed commit; each completed flow is a natural checkpoint. If something goes wrong you drop that commit, not the redesign.
- **Never push** until the user types `PUSH` (memory rule). Never `git add -A` (stage exact files).

**Pre-flight (before Phase 0):** confirm the working tree is clean or that every uncommitted change is intentionally part of this work. If unrelated in-flight changes exist, branch from a clean point or stash them first - do NOT sweep them in. Confirm you're on a fresh `redesign/*` branch.

---

## Phase 0 Â· Scope the redesign (pick the tier)

"Redesign" means three very different amounts of work. Establish which before anything else (`AskUserQuestion` if the user hasn't said):

| Tier | What changes | Held fixed |
| --- | --- | --- |
| **T1 Â· Full redesign** | Jobs/flows, Architecture (IA, routes, nav), UX, UI, Motion | Only the product's *purpose* |
| **T2 Â· UX + UI + Motion** | Flows, states, visual style, motion | Information architecture and routes |
| **T3 Â· New skin only** | Visual style + motion | Flows, UX, architecture - nothing moves |

**Flow/task analysis and planning happen in ALL three tiers** - the tier only controls how deep the changes cut. T1 may re-cut flows and IA; T2 improves flows within the existing IA; T3 keeps flows identical and only reskins. The body below describes **T1** in full. For T2, skip the architecture parts of Phase 2 and all of Phase 3. For T3, skip flow/UX redesign; the plan is a per-screen visual-conversion table and you go straight to Phase 4 (still verifying flows still work).

State the chosen tier back to the user in one line.

---

## Phase 1 Â· Understand: jobs, tasks, flows (read first, rediscover never)

Goal: know **what the app is, who it's for, and - above all - what jobs users come here to do and what flows they move through**. Do NOT re-derive facts the repo already records.

1. **Read what exists.** Start here, do not skip:
   - `docs/prototype-context/00_START_HERE.md` + numbered docs (product, audience, UX learnings).
   - `CLAUDE.md` (architecture rules, slice shape, invariants).
   - `design-system/components.json` (what the UI is built from).
   - `src/app/router.tsx` + `src/shell/dashboard-shell/nav-config.ts` (current route map + IA).

2. **Map the live app** via the `Explore` subagent (read-only, structured result, not file dumps): feature slices + routes + purpose, current sitemap, component/section inventory per feature.

3. **Build the Jobs & Flows inventory** at `docs/redesign/jobs-and-flows.md` - THE primary artefact of this skill:
   - **Jobs-to-be-done:** the outcomes users hire this app for (e.g. "know my agents are safe", "onboard a new MCP server safely", "prove compliance to an auditor", "stop a risky action fast"). Frame as outcomes, not features.
   - **Tasks:** the concrete things users do toward each job (e.g. "add an agent", "review a held action", "revoke a session", "author a policy").
   - **Flows:** for each task, the current step-by-step path (entry -> steps -> decision points -> exit), which screens/states each step touches, and where the friction is (dead ends, extra steps, unclear state, backtracking).
   - **Frequency & criticality:** mark each flow primary / secondary / rare and high / low stakes. This drives build order later.

4. **Freeze a "before" baseline** at `docs/redesign/baseline/`: screenshot every current route on 5173 via `webapp-testing`; snapshot the route map + inventory to `baseline/inventory.md`. The highest-value artefact for judging "is it better" and for Phase 6 regression checks. Do not skip.

5. **Emit a flat feature inventory** at `docs/redesign/feature-inventory.md` - every capability (not just routes). The parity checklist Phase 6 verifies against.

6. **Ask the user only the gaps.** What's the redesign FOR (aesthetic refresh / new capability / mobile / enterprise readiness), which flows are painful today, which jobs matter most, what must not change. Ask 3-6 sharp questions with `AskUserQuestion`. Do NOT ask what the docs answer.

Emit a short app profile + top jobs/flows in your response. The detailed inventories live on disk.

---

## Phase 2 Â· Plan (flow-first: model flows -> screens fall out -> component plan)

Output is ONE `docs/redesign/redesign.md`. Not six agent reports.

### 2a. Fan out perspectives (parallel agents, distinct lenses)

Read-only agents, each returns a focused brief (not code):

| Role | Owns | Returns |
| --- | --- | --- |
| **PM** | Jobs, priorities, success criteria, scope | Ranked jobs + non-goals + success metrics + risks |
| **UX architect** | Flows, tasks, friction, states, journey | Current-vs-target flow diagrams, friction list, state matrices |
| **Behavioral / engagement designer** | Motivation, engagement, persuasion, onboarding | Engagement plan per the UX-depth rules below |
| **App architecture** | Routes, slices, shells, data flow | Route map + slice moves/merges/splits + migration order that SERVES the flows |
| **Visual design** | Look, hierarchy, density, tone within the system | Visual direction + per-surface treatment |
| **Design-system expert** | Reuse discipline, token/primitive deltas | Which components/sections cover which steps; expected new work |

Use `feature-dev:code-architect` for architecture depth; the DS-expert reads `design-system/components.json` + `design-system-usage` skill.

### 2b. Model the TARGET flows (this is the core of the plan)

For each job, design the ideal flow BEFORE thinking about screens:

- **Steps:** the minimum sequence to complete the task. Actively cut steps vs the current flow (fewer screens, fewer decisions, fewer fields).
- **Entry & exit points:** how the user gets in, and where they land on success (and on error/cancel).
- **Decision points & branches:** what the user chooses and what each choice leads to.
- **States per step:** loading / empty / populated / filtered-to-zero / error / success - named, not assumed.
- **Then, and only then, map steps to screens/regions.** A step may be a screen, a panel, a modal, or an inline expansion - pick the lightest surface that fits. Screens are an OUTPUT of this step, never the input.

Record each target flow as: `Job -> Task -> [Step: surface + state set] -> success exit`. Show the step-count delta vs the baseline flow (fewer is the goal).

### 2c. UX depth: engagement and behavioral design (honest, never dark)

A redesign is a chance to make flows not just shorter but more motivating and clearer. Design the behavioral layer deliberately:

**Use these (honest, in the user's interest):**
- **Friction reduction:** smart defaults, pre-filled known values, progressive disclosure (hide advanced options until asked), inline validation, sensible autofocus, keyboard paths for power users.
- **Feedback & progress:** clear system status at every step, progress indicators for multi-step flows, meaningful success states (a real confirmation, not a shrug), optimistic UI where safe.
- **Gamification where it genuinely helps:** setup/onboarding checklists ("3 of 5 steps to secure your estate"), completion meters for security posture, milestone acknowledgement - ONLY when the metric reflects real user value (e.g. real coverage %), never a vanity number invented to nudge.
- **Guidance:** empty states that teach the next action, first-run onboarding for a new flow, contextual help at the point of confusion.
- **Persuasion used truthfully:** social proof, recommended defaults, and highlighting the safe/recommended path - only when the claim is true and the recommendation serves the user.

**Never use these (banned dark patterns - a security product lives on trust; manipulation is self-defeating):**
- Confirmshaming ("No, I don't want to be secure"), forced continuity, roach-motel (easy in, hard out), hidden costs/steps, bait-and-switch, nagging/repeated interruption, pre-checked consent, disguised ads, obstruction of cancel/delete/downgrade, fake urgency or fake scarcity, sneaking items into a flow.
- Rule of thumb: if a pattern benefits the business at the user's expense or relies on the user NOT noticing, it is banned. Every engagement device must survive the question "would we be comfortable explaining this to the user out loud?"

Record the engagement plan per flow in `redesign.md` (what device, at which step, why it serves the user).

### 2d. Synthesize into ONE plan, then critique

- A synthesis agent (or you) merges the briefs + target flows + engagement plan into `docs/redesign/redesign.md` (template at the end). One coherent plan; conflicts resolved.
- An **adversarial critic agent** tries to break it: flows that got longer, steps with no clear surface, jobs with no flow, arch changes with weak user rationale, missing states, over-invented components, any banned dark pattern that crept in. Revise until the critic finds nothing material.

### 2e. Per-flow -> screen -> component plan (buildable)

For every step-surface in every target flow, run `component-matcher` + `token-matcher` subagents (parallel) to fill a component inventory using the decision trees in Phase 4. Each row: flow, step, surface, region, decision (reuse / variant / new), source (`components.json` entry or `@shared/ui`), new tokens. Include an **icon inventory** (EXISTS / EXISTS-as-alternative / NET-NEW with SVG path data).

### GATE A - Flows + Architecture + UX (mandatory)

Present in chat (`AskUserQuestion` for the decision, prose for rationale):

- The **target flows** and their step-count deltas vs today (this is the headline: "adding an agent goes from 6 steps to 3").
- The proposed **sitemap** and IA, and every **architecture change** with a one-line **why it's better from the user's perspective** (framed as "makes task X faster/clearer", not file layout).
- The **engagement devices** you're adding and why each serves the user.
- The riskiest change and its cost.

Do NOT proceed without approval. Accept partial approval.

### GATE B - Design + component plan (mandatory)

- Counts: N jobs, N flows, N step-surfaces, N reusing existing sections, N variants, N new components, N new tokens.
- **Net-new ratio (HARD gate for T1):** report NEW / (REUSE + VARIANT + NEW) for BOTH components and layouts. Both must be **>= 50% NEW** in the plan. If the plan is below the floor, do NOT present it for approval - redesign the over-reused areas as net-new first. State both ratios explicitly in the gate.
- The per-flow component inventory (2e) + icon inventory.
- New tokens proposed with values, checked against the naming grammar (see `design-system-usage`).
- The build/migration order (by flow priority + dependency).

Do NOT write product code before Gate B approval. Save the approved plan at `docs/redesign/redesign.md`.

---

## Phase 3 Â· Build the architecture (T1 only) - to serve the flows

Structure before skin, built to make the approved flows possible, in order:

1. **Routes** - `src/app/router.tsx` (lazy imports; static paths BEFORE `:slug`).
2. **Shells / nav** - `src/shell/dashboard-shell/nav-config.ts` + shell composition for the new IA.
3. **Feature-slice scaffolding** - create/move slices per the plan, canonical shape (`api/ components/ hooks/ routes/`). Move, don't rewrite, what survives.
4. **Wire data** - fetches through `@shared/api`, responses zod-parsed at the slice boundary. No raw `fetch`.

No dead routes (CLAUDE.md rule 10). Verify: `npm run typecheck` clean, every new route serves HTTP 200 on 5173.

---

## Phase 4 Â· Build the UI - FLOW BY FLOW

Build one whole flow at a time, in the migration order from the plan (**primary/high-stakes jobs first**, shared shells and nav before the flows that depend on them, rare flows last). For each flow, build every step-surface and every state it touches, then verify the FLOW, then move on. Delegate implementation to engineer subagents; do NOT write large component code in the main thread.

For every region, apply the **component decision tree** (self-contained here):

```
For each region in a step-surface:
  candidate <- search design-system/components.json (primitives AND sections)
               + @shared/ui + features/*/components/wizard/* by ROLE
  if a section (category:"sections") matches the whole region:
    -> REUSE the real feature section (it already encodes layout/spacing/data shape)
  elif a primitive matches AND all visual props within tolerance:
    -> REUSE the primitive as-is with documented props
  elif role matches AND 1-2 prop divergences:
    -> VARIANT (add a prop/variant, token-first, same API shape - see design-system-usage)
  elif role matches AND deep visual/state/structural divergence:
    -> NEW (don't bloat a primitive with a structural variant)
  else (no candidate):
    -> NEW
```

Tolerances: color = exact token-name match; spacing = +/-1 step on the 4px scale OK; radius = exact.

**Content realism (not happy-path mockups).** Build every step with the app's real fixtures and data shapes (extend them, never lorem). Render every state the flow model named: loading (skeletons), empty, error, filtered-to-zero, populated, success. Microcopy is real product copy.

**The 50% net-new rule (HARD - enforced, not advisory):** a real redesign must genuinely reinvent, not reskin an existing kit. Therefore, for a T1 full redesign:

- **At least 50% of the components used must be NET-NEW** (built for this redesign on the tokens), and **at least 50% of the page layouts must be NET-NEW** (a layout is a page/region's structural composition, not a restyle of an existing one).
- Counting: bucket every component and every layout as **REUSE** (used as-is from the design system), **VARIANT** (existing primitive extended), or **NEW** (net-new). Only **NEW** counts toward the 50% floor. REUSE + VARIANT together may be **at most 50%**.
- This is checked at **Gate B** (planned ratio) and again at **Phase 6** (built ratio). If the built app is below the floor (i.e. you leaned on existing components/layouts for more than half), the redesign **does not pass** - go back and design net-new components/layouts for the over-reused areas. Do not ship under the floor.
- Foundation is exempt from the denominator: **tokens** and the base shells are always reused (that is the system); the 50% applies to components and page layouts, not to tokens. Every net-new component is still **token-first** and still follows the rule-of-two for promotion (shared primitive if it recurs across 2+ screens, else inline in the feature).
- Tier scope: **T1 hard-enforces** this floor. **T2** treats it as a target (report the ratio, don't block). **T3 (new skin only) is exempt** - it is a reskin by definition.

When building NEW:
1. **Token-first.** New value goes into `src/styles/tokens.css` first AND re-exported in `globals.css` `@theme`. Never inline a hex/px. (Token selection + naming: `design-system-usage`.)
2. Shared primitive -> `src/shared/ui/<Name>/` (`<Name>.tsx` + `index.ts`), add to barrel, add `components.json` entry + `site/examples/<Name>.html`. One-off -> inline.
3. Expose the state grid that applies: idle / hover / focus / disabled / loading / error.

**Per-step verification (do NOT move on until ALL pass):**
- `npm run typecheck` clean.
- `npm run lint` clean (a `text-[Npx]`/hex failure = a value wasn't tokenized; fix it, don't suppress).
- **Visual check** on 5173 via `webapp-testing`: screenshot beside its baseline pair; read console for errors.
- **Responsive check** at ~390 / ~768 / ~1280 (lg=1024 boundary, off-canvas nav below it, dense tables scroll, authoring screens may show a "best on desktop" banner). No horizontal body scroll.
- **Accessibility check** via `a11y-enforcer`: contrast, focus order, visible focus, keyboard nav, touch targets, labels/roles. Fix before moving on.

**Per-FLOW verification (the point of building flow-first):** once a flow's steps are built, drive the WHOLE flow on 5173 with `webapp-testing` as a user would - start to success exit, including one error/cancel branch. Confirm the user can actually complete the job in the intended step count. A flow whose screens are each perfect but that can't be completed is NOT done.

Then **commit** (signed, exact files) - per screen as they land, and mark the flow complete when it verifies end to end.

---

## Phase 4b Â· Cross-flow & cross-screen consistency audit (before motion)

Per-step checks can't catch drift BETWEEN steps and flows. After the flows are built, one dedicated pass (reviewer agent with all screenshots + the flow list):

- Same action labeled and placed consistently everywhere (one word per concept - not "Remove" here, "Delete" there).
- The same task feels the same across entry points (a job reachable two ways behaves identically).
- Nav, headers, breadcrumbs, page scaffolding identical in structure across screens.
- Spacing rhythm, density, type hierarchy consistent; status/tone tokens used uniformly.

Fix drift before motion. This is what stops the redesign from looking like many designers built it.

---

## Phase 5 Â· Motion (last, over settled flows)

Lowest rung that does the job (the DS animation ladder). Motion should reinforce the flow (guide the eye to the next step, confirm success), never decorate:

1. **Motion tokens** - `--duration-aq-fast|base|slow` (120/200/320ms), `--ease-aq-out|inout`. Never a raw `300ms`/ad-hoc bezier.
2. **CSS transitions** - default rung. `transitions-dev` skill (dropdowns, modals, badges, swaps, skeletons, shimmer, tabs, tooltips, staggered reveals, accordions).
3. **framer-motion / motion** - React enter/exit, shared-layout, gestures (already a dependency).
4. **GSAP** - timelines, scroll-driven, pinning, complex choreography. `gsap-core|timeline|scrolltrigger|react|plugins|utils|performance`. Needs the `gsap` + `@gsap/react` packages.

Always gate motion on `prefers-reduced-motion` via `motion-safe:`. Verify on 5173.

---

## Phase 6 Â· Verify, task-parity, drift-check, commit

1. **Full-app pass:** `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:run` all clean. Redesigned components break co-located Vitest/MSW tests - update the tests to match (don't delete to go green). Every route serves HTTP 200 on 5173. Confirm **perf hygiene**: routes lazy-imported/code-split; no ballooned bundle (glance at Vite build output).
2. **Task/flow-parity check (mandatory):** walk `docs/redesign/jobs-and-flows.md` and `feature-inventory.md` - confirm every job can still be completed and every capability still exists (unless explicitly retired under "out of scope"). A silently dropped job or capability is a failure; restore it. Report the checklist.
3. **Before/after check:** each route's new screenshot beside its baseline. No lost states, no dead routes, no regressed density.
4. **Design-system drift check:** if tokens/components changed, run `node design-system/sync/ds-sync.mjs`; confirm `components.json` coverage passes.
5. **Net-new ratio (HARD gate for T1) + adoption diff:** count the AS-BUILT components and layouts into REUSE / VARIANT / NEW and compute NEW / total for each. **Both must be >= 50% NEW.** If either is below the floor, the redesign **fails Phase 6** - identify the over-reused components/layouts and design net-new replacements before reporting done. Also report: new tokens added (why each), new shared primitives promoted (rule-of-two each). State both as-built ratios explicitly.
6. **Review pass (recommended):** `feature-dev:code-reviewer` over changed screens.
7. **Commit + STOP.** Screens committed per-flow in Phase 4; final scoped signed commit for remaining wiring, then STOP and await `PUSH`. Stage explicitly (never `git add -A`). No push/PR until the user types `PUSH`.

---

## Canonical token reference (map every value to these; full rulebook: `design-system-usage`)

Values are authoritative from `src/styles/tokens.css` / `design-system/tokens.json`.

**Colors** (`bg-aq-* text-aq-* border-aq-* ring-aq-*`): surfaces `aq-bg aq-surface aq-zebra`; borders `aq-border aq-border-strong`; ink `aq-ink aq-ink-soft aq-ink-muted aq-ink-faint`; accent `aq-accent`(orange CTA) `aq-accent-soft`(grey selection wash) `aq-accent-strong`(selected text); orange selection family `aq-accent-wash aq-accent-deep aq-accent-line`; status `aq-good/-soft aq-warn/-soft aq-bad/-soft aq-info/-soft`; dark panel `aq-ink-panel` + `aq-ink-on{,-soft,-muted,-tint,-line,-wash}`; graph `aq-node-* aq-edge-*`; AI `aq-ai-from/to`; composer `aq-compose-*`; brand `aq-brand-*`.

**Type** (`text-aq-*`; `text-[Npx]` lint-banned): `caption`11 `xs`12.5 `sm`13.5 `base`14 `md`15 `lg`16 `stat`20 `h2`24 `display`30 `hero`43 (px; line-heights paired in tokens.css). Round to nearest; DOWN between steps.

**Tracking** (`tracking-aq-*`): `tight`-0.02em `wide`0.04 `wider`0.06 `widest`0.12.
**Radius** (`rounded-aq-*`): `xs`3px, plus Tailwind 4/6/8/12, `2xl`14 `3xl`16.
**Spacing half-steps** (4px scale): `4.5`18 `5.5`22 `6.5`26 `7.5`30 (`p-4.5`, `gap-4.5`).
**Shadow** (`shadow-aq-*`): `card popover modal button flyout float panel`.
**Motion:** `--duration-aq-fast|base|slow`, `--ease-aq-out|inout`. **Z-index:** `--z-aq-sticky|drawer|overlay|modal|popover|toast`. **Icon:** `--icon-aq-xs|sm|md|lg` (10/12/14/16). **Avatar:** `--avatar-aq-xs..xl`.

## Architecture invariants (CLAUDE.md - non-negotiable)

1. No top-level `src/components/`. UI under `src/features/<slice>/` or `src/shared/`.
2. No `src/pages/`. Routes owned by the slice, registered in `router.tsx`.
3. Feature isolation - no cross-feature imports. Cross-cutting -> `@shared/`/`@shell/`. ESLint enforces.
4. Every fetch through `@shared/api`. Every response zod-parsed at the slice boundary.
5. No `*.styles.ts`. No DaisyUI/Quill/Radix/MUI/Chakra/shadcn/any other UI library.
6. No dead routes. No `<h2>` placeholders.
7. Compose from `@shared/ui` + `@shell/*`; extend the system (primitive/shell/pattern/token) only on rule-of-two; never inline a parallel visual style.

Aliases: `@app/* @shared/* @features/* @shell/* @styles/*`.

## Forbidden patterns (ESLint rejects)

Hex in JSX; hex in Tailwind arbitrary values (`bg-[#...]`); inline `style={{}}` with color/background/border/fill/stroke; bare `bg-white`/`text-black`; `text-[Npx]`; `tracking-[Nem]`; `*.styles.ts`; cross-feature imports; skipping hooks (`--no-verify`, `--no-gpg-sign`). SVG color = `currentColor` + a Tailwind text-color class on the group, never hex in `fill`/`stroke`.

## Memory rules (always)

- **no-push-without-explicit-command** - no push/force-push/PR until the user types `PUSH`. Prior auth doesn't generalize.
- **commits-must-be-signed** - SSH signing global; never bypass; surface failures.
- **dev-server-port-discipline** - Vite on 5173; kill the port holder first; verify it came up on 5173.
- **concurrent-session-commit-hazard** - stage exact files; never `git add -A`; expect ref-lock races.

---

## redesign.md template

```markdown
# Redesign plan - <app> (Tier: T1 | T2 | T3)

## 1. App profile & jobs
- What it is / who / what (from docs/prototype-context, verified)
- Jobs-to-be-done (ranked): the outcomes users hire the app for
- Baseline at docs/redesign/baseline/ ; feature inventory at feature-inventory.md ;
  jobs & flows at jobs-and-flows.md

## 2. Goals & non-goals (PM)
- Ranked goals Â· non-goals Â· success metrics Â· risks

## 3. Target flows (the core)
For each job:
| Job | Task | Steps (surface + states) | Old step count | New step count | Entry/exit |
- Friction removed vs baseline; decision points/branches

## 4. Engagement / UX-psychology plan
| Flow | Step | Device (default/progress/checklist/onboarding/social-proof) | Why it serves the user |
- Confirm: zero banned dark patterns

## 5. Information architecture (T1/T2)
- New sitemap (route -> page -> sub-sections); diff vs today (moved/merged/split/killed/added)
- Each change: WHY it's better from the user's perspective (as task speed/clarity)

## 6. UX states
- State matrix per step-surface (loading/empty/populated/filtered-zero/error/success)

## 7. Visual direction
- Tone, density, hierarchy within the ArmorIQ system; where it stretches/holds

## 8. Per-flow component plan (buildable)
| Flow | Step | Surface | Region | Decision (reuse/variant/new) | Source | New tokens |

## 9. New components, tokens & icons
- New shared primitives (name, why, rule-of-two)
- New tokens (name, value, grammar check)
- Icon inventory: EXISTS / EXISTS-as-alternative / NET-NEW (SVG path data)
- **Net-new ratio (HARD gate, T1):** components NEW/(REUSE+VARIANT+NEW) and layouts NEW/total. Both MUST be >= 50%.

## 10. Build / migration order
- Ordered by job priority + dependency (shells/nav -> primary flows -> secondary -> rare)

## 11. Risks & 12. Out of scope
- Top risks + mitigations ; deferred items (echo back so nothing silently expands)
```

---

## What this skill does NOT do

- Does not redesign screen by screen - flows are the unit; screens fall out of flows.
- Does not write product code before Gate B approval.
- Does not decide reuse/new or token deltas by feel - decision trees + subagents.
- Does not ship a T1 redesign below the 50% net-new floor for components OR layouts - it is a hard gate at Gate B and Phase 6, not advisory.
- Does not use manipulative dark patterns - engagement must be honest (Phase 2c).
- Does not skip the Phase 1 baseline/jobs-and-flows, either gate, per-step verification, the per-FLOW end-to-end check, or the Phase 6 task-parity check.
- Does not land the redesign as one monolithic commit - branch + worktree + per-flow/screen signed commits.
- Does not build motion before flows and UI are stable.
- Does not push, open PRs, or modify build config unless the user explicitly asks.

