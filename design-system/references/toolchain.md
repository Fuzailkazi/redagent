# Toolchain

The skills and packages used to build the ArmorIQ frontend, and when to reach for each. Organized by job. Skills are invoked; packages are imported.

## Building net-new UI

- **frontend-design** (skill) - for distinctive, net-new creative UI from scratch (landing pages, novel screens). Use it to generate the structure, then bring it into the system: map every value to `aq-*` tokens and recompose from `@shared/ui`.
- **tailwindcss** v4 (package) - the styling layer, configured over the `aq-*` theme. All styling is Tailwind utilities over tokens; no `*.styles.ts`, no inline color.
- **react** 19 (package) - the component model.

## Applying / porting the ArmorIQ style

- **armoriq-restyle** (user-level skill) - apply the ArmorIQ tokens + a portable subset of primitives to a **non-ArmorIQ** repo (installs tokens, optional ESLint rail, ~17 portable primitives). Reach for this when the target repo is not armorIQ-platform-proto.
- **restyle-to-armoriq** (project skill) - take an external design source (Figma URL, screenshot, HTML mockup, handoff bundle) and produce a **new ArmorIQ feature slice** in V5 style, mapping every value to tokens and reusing primitives, via the designer -> engineer -> verify orchestration. Use when porting a design **into this repo**.
- **design-parity** (project skill) - reconcile a design against **existing** code: decide reuse vs variant vs new for every component and token, apply the fix, verify with lint + typecheck. Use when a target screen already exists and must match a design.

The split: `restyle-to-armoriq` builds a new slice from a design; `design-parity` matches existing code to a design; `armoriq-restyle` carries the style to a foreign repo.

## Adding motion

- **transitions-dev** (skill) - 18 production CSS-transition recipes for UI micro-interactions. The default rung for motion.
- **gsap-core / gsap-timeline / gsap-scrolltrigger / gsap-react / gsap-plugins** (skills) - GSAP for timelines, scroll-driven animation, pinning, and complex sequences. `gsap-react` covers the `useGSAP` hook and cleanup.
- **framer-motion** + **motion** (packages) - React component-level enter/exit, shared-layout, and gesture animation.

See `references/animation.md` for the ladder and when each applies.

## Data visualization

- **recharts** (package) - charts (line, area, bar) for dashboards and metrics.
- **@xyflow/react** (package) - the node/edge graph canvas (the AIQ graph, the Plans flow). Pairs with the `aq-node-*` / `aq-edge-*` tokens and the `GraphNodeShape` primitive.

## Forms

- **react-hook-form** (package) - form state and submission.
- **zod** (package) - schema validation (also the API boundary parser per the repo rules). Wrap each control in the `FormField` primitive.

## Code / YAML editing

- **@uiw/react-codemirror** + **@codemirror/lang-yaml** (packages) - the in-app code/YAML editor (policy editing, config).

## Data and icons

- **@tanstack/react-query** (package) - all data fetching; every fetch goes through `@shared/api`, every response is zod-parsed at the slice boundary.
- **lucide-react** (package) - fallback icon set for glyphs the in-house `src/shared/icons` set lacks. Prefer the in-house set first.

## Quick reference

| Job                             | Reach for                                         |
| ------------------------------- | ------------------------------------------------- |
| Net-new creative UI             | `frontend-design` skill, then recompose on tokens |
| Port a design into this repo    | `restyle-to-armoriq` skill                        |
| Match existing code to a design | `design-parity` skill                             |
| Style a foreign repo as ArmorIQ | `armoriq-restyle` skill                           |
| UI transitions                  | `transitions-dev` skill                           |
| Timelines / scroll motion       | `gsap-*` skills                                   |
| React enter/exit / gestures     | `framer-motion` / `motion`                        |
| Charts                          | `recharts`                                        |
| Graph canvas                    | `@xyflow/react` + `GraphNodeShape`                |
| Forms                           | `react-hook-form` + `zod` + `FormField`           |
| YAML / code editor              | `@uiw/react-codemirror` + `@codemirror/lang-yaml` |
| Data fetching                   | `@tanstack/react-query` via `@shared/api`         |
