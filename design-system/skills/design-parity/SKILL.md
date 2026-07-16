---
name: design-parity
description: Use when a design needs to be reconciled against current armorIQ-platform-proto code — supports Figma URLs, screenshot files, standalone HTML files, and Claude Design handoff bundles. Compares design to implementation, decides reuse-vs-variant-vs-new for every component and token, applies the fix with lint + typecheck verification. Trigger whenever the user pastes a figma.com/design URL, points at a .png/.jpg/.html file, or hands off a Claude Design bundle directory and asks to "match the design", "make it look like this", "reconcile", "implement this design", or similar.
---

# Design Parity

You are reconciling a design source against the current armorIQ-platform-proto code.

This skill is **RIGID**. Do the phases in order. Do not write code before Phase 5. Do not decide reuse-vs-new in the main thread — delegate to subagents.

## Inputs accepted (auto-detect from what the user provided)

| Source                | Detect by                                                                      | Notes                                                                              |
| --------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Figma                 | URL starts with `https://www.figma.com/design/` or `https://figma.com/design/` | Extract `fileKey` and `node-id` (convert `-` to `:`)                               |
| Screenshot            | Path ends with `.png` `.jpg` `.jpeg` `.webp`                                   | Read with multimodal vision; values are approximate                                |
| HTML                  | Path ends with `.html`                                                         | Read + DOM/className parse; works for Claude Design prototypes and any HTML mockup |
| Claude Design handoff | Directory containing `README.md` + `chats/` + HTML files                       | Read README + transcripts (for intent) + primary HTML (for layout)                 |

If the input is ambiguous, ask the user once. Do NOT guess.

## The 7 phases

### Phase 0 · Ingest

Launch the `design-ingestor` subagent (Agent tool, `subagent_type: design-ingestor`).

Pass it the source. It returns a path to a `DesignSpec` JSON saved at `.claude/scratch/design-parity-<timestamp>.json`. **Read that JSON yourself** — it's structured and short.

### Phase 1 · Locate target

From the DesignSpec, identify the file(s) in `src/` that currently implement this design (or where new code should live).

- If the design clearly maps to a route → find the route file (e.g. `src/features/agents/routes/AddAgentRoute.tsx`)
- If the design is a primitive (button, input, badge) → target is `src/shared/ui/<Name>/`
- If the design is a composed shell → target is `src/shell/`

If you cannot determine the target, ask the user with `AskUserQuestion`. Do not guess.

### Phase 2 · Diff

For each property in the DesignSpec, compare to the current implementation. Produce a structured gap list.

Categories:

- `token-mismatch` — visual property uses wrong token or arbitrary value
- `missing-state` — component exists but doesn't render the state shown in design
- `prop-divergence` — component takes different props than design needs
- `new-component` — no analogue in `@shared/ui/`
- `layout-divergence` — DOM structure differs

Store the gap list at `.claude/scratch/design-parity-<timestamp>.gaps.json`.

### Phase 3 · Plan reconciliation

Launch `component-matcher` and `token-matcher` subagents **in parallel** (one Agent tool block, two Agent calls).

- `component-matcher` reads the DesignSpec components and the existing `@shared/ui/` library → emits `{ reuse | variant | new }` decisions
- `token-matcher` reads the DesignSpec colors/spacing/radius/type/tracking/shadow + current `tokens.css` → emits `{ reuse | add }` decisions

Combine their outputs into a single reconciliation plan.

### Phase 4 · CHECKPOINT — mandatory

Present the plan via `AskUserQuestion`. Include:

- Counts: N new tokens, N new components, N variants extended, N files edited
- The riskiest decision (e.g. "Adding new colour token `aq-accent-hover` — propose value #c0571e")
- The full file list that will be touched

Do NOT proceed without explicit approval. Accept partial approvals ("only do the token fixes, skip the new component").

### Phase 5 · Apply

Execute the approved plan in this order — do not reorder:

1. **New tokens first** → edit `src/styles/tokens.css`; re-export in `src/styles/globals.css` `@theme`
2. **New / variant components second** → scaffold in `src/shared/ui/<Name>/`; minimum file set: `<Name>.tsx`, `index.ts`. Each component MUST expose the state grid that applies to it (`idle / hover / focus / disabled / loading / error` — render only those that semantically apply).
3. **Code edits last** → replace arbitrary values, swap component imports, change className strings

Why this order: later steps reference earlier additions. Reverse order = dangling refs.

### Phase 6 · Verify

Run, in order:

1. `npm run typecheck` — must be clean
2. `npm run lint` — must be clean

If either fails, FIX before reporting done. A lint failure on `"text-[12px]"` etc. means the codemod didn't reach a usage — find it and replace.

**Visual diff is deferred to v2.** v1 relies on the user eye-balling the result in the dev server.

## Component-reuse decision tree (component-matcher encodes this)

```
For each design-spec component:
  candidate ← search @shared/ui/* + features/*/components/wizard/* by role
  if no candidate at all:
    → NEW
  elif role matches AND all visual props within tolerance:
    → REUSE
  elif role matches AND 1–2 prop divergences:
    → VARIANT (add prop to existing or add to a variant enum)
  elif role matches AND deep visual/state divergence:
    → NEW (don't pollute existing component with too many variants)
  else:
    → NEW
```

Tolerances:

- Color: must be an exact token-name match (no "close enough")
- Spacing: ±1 step on the 4px scale is OK
- Radius: exact

## Token-reuse decision tree (token-matcher encodes this)

| Property | Reuse if                                                          | Add if                                                      |
| -------- | ----------------------------------------------------------------- | ----------------------------------------------------------- |
| Color    | exact hex matches a token in `tokens.css`                         | no token matches AND the role is genuinely new              |
| Spacing  | maps to Tailwind 4px scale OR a V5 half-step that already exists  | gap ≥2px from any existing step                             |
| Radius   | matches one of `xs/sm/md/lg/xl`                                   | new value fits semantically between existing steps          |
| Type     | matches one of the 7-step ramp (caption/xs/sm/base/md/h2/display) | new size >2px from any existing step                        |
| Tracking | matches `tight/wide/wider/widest`                                 | required only if rounding to nearest 0.02em changes meaning |
| Shadow   | matches `card/popover/modal` intent                               | new elevation intent (not new visual level)                 |

## Naming policy enforced when adding new tokens

| Family   | Required grammar                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------ |
| Color    | `aq-<family>` default; `aq-<family>-soft` lighter; `aq-<family>-strong` darker; `aq-<family>-muted` tertiary |
| Spacing  | `--spacing-<n>` for Tailwind class; `--spacing-<n>_5` for half-steps. NEVER pixel-named.                     |
| Radius   | `--radius-aq-<t-shirt>` — xs/sm/md/lg/xl only                                                                |
| Type     | `--text-aq-<name>` — pick from existing ramp first, only extend the ramp with a strong justification         |
| Tracking | `--tracking-aq-<semantic>` — tight/wide/wider/widest                                                         |
| Shadow   | `--shadow-aq-<intent>` — card/popover/modal/<new-intent>. NEVER sm/md/lg.                                    |

If a proposed name doesn't fit its family's grammar, REJECT and re-propose.

## When adding new components

- Location: `src/shared/ui/<Name>/` (never inside a feature per project Rule 3)
- File set: `<Name>.tsx` + `index.ts`
- Props: typed; no `any`; default state values explicit
- Visuals: zero hex literals, zero inline color styles, every spacing/radius/type value is a token utility — existing ESLint enforces this
- File naming: `PascalCase.tsx`, hooks `use-kebab.ts`, data `kebab.ts`

## Do not

- Do not skip Phase 4 checkpoint
- Do not run any `use_figma` / Edit / Write call before plan approval
- Do not propose a new token before the matcher subagent has scanned existing ones
- Do not add a component variant when the divergence is structural — that path leads to bloated primitives
- Do not exit the skill with a failing typecheck or lint

## Pitfalls observed in this codebase

- **Wizard primitives still live in `features/agents/components/wizard/`** — not yet promoted to `@shared/ui/`. When matching, search BOTH locations. If a wizard primitive matches and the design is for a non-agents flow, propose promoting it (move to `@shared/ui/`) as part of the plan.
- **Tailwind v4 `@theme`** is in `globals.css`. New tokens MUST be added in BOTH `tokens.css` (the `:root` block) AND `globals.css` (the `@theme` block) — otherwise the utility class won't generate.
- **ESLint rules ban arbitrary values for color, font-size, radius, tracking.** A new design that genuinely needs a one-off value (rare) requires adding a token first — never paper over with `text-[Npx]`.
