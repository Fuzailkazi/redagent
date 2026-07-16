---
name: armoriq-design-system
description: Use when building, extending, or restyling any UI in the ArmorIQ V5 visual style, whether inside armorIQ-platform-proto or in any other repo that carries this design-system/ folder. Runs the discover -> reuse -> extend -> build loop against tokens.json (114 design values) and components.json (51 @shared/ui primitive entries), enforces token discipline (no hex, no inline color, no arbitrary text-[Npx], token-first), and routes motion/porting/parity work to the restyle-to-armoriq, design-parity, transitions-dev, and gsap-* skills instead of duplicating them. Trigger when someone wants a component, screen, or restyle in ArmorIQ style, asks "do we have a X component", or wants to add to the design system.
---

# ArmorIQ Design System

The portable home of the ArmorIQ V5 design language. One source, two faces:

- **Human face**: the static `site/` (rendered from the JSON) is a browsable catalog of tokens, components, patterns, pages, motion, and assets.
- **Agent face** (you): `tokens.json` (values), `components.json` (the primitive manifest), `SKILL.md` (this reasoning layer), and `references/*.md` (deep detail). All read from the same JSON, so they cannot drift.

Your job: produce UI that looks like it was already in ArmorIQ. Do not invent a parallel visual style. Follow the loop below.

## The core loop: DISCOVER -> REUSE -> EXTEND -> BUILD

Run it in order. Stop at the first step that satisfies the need.

### 1. DISCOVER (read the manifest, not 50 files)

Before writing anything, read the cheap structured sources:

- `components.json` - every primitive AND every real product section: `name`, `category`, `tier`, `import`, `props`, `tokens`, `usage`, `whenToReachFor`. Search this to answer "do we have a X".
- `tokens.json` - every design value in DTCG format (the machine-readable twin of `src/styles/tokens.css`). Use it for colors, spacing, type, radius, motion.

The manifest has two kinds of entry, distinguished by `category`:

- **Primitives** (`category`: actions, inputs, data-display, feedback, navigation, overlay, layout, motion, brand) - the ~50 reusable `@shared/ui` building blocks. Import from `@shared/ui`.
- **Sections** (`category: "sections"`) - real composed product pieces (e.g. `AgentCard`, `McpServerCard`, `MemberCard`, `EventRow`, `ComplianceCard`, `HeldActionsCard`, `AgentsServersCard`, `StatStrip`, `CrossPageHeader`, `MetricCard`, `SessionRow`, `AIQGraph`). These are feature code, imported from `@features/<slice>/...` (the `import` field gives the exact path). When building a screen, prefer reusing or mirroring an existing section over assembling primitives from scratch - the section already encodes the correct layout, spacing, and data shape the product uses.

Prefer the manifest over reading the `.tsx` files. Read a primitive's or section's source only when the manifest entry is not enough.

### 2. REUSE (exact match -> use it)

If a primitive in the manifest matches the need, use it as-is with its documented props:

```tsx
import { Button, StatusBadge, FormField } from '@shared/ui';
```

All ~50 primitives export from the `@shared/ui` barrel. Pass props per the manifest (`variant`, `size`, `tone`, etc.). Do not re-create a `<button>`, a chip shape, or a status pill by hand. That is exactly the drift this system exists to prevent.

For a whole screen region (an agent card, a KPI strip, a settings card, a feed row), check the `category: "sections"` manifest entries first - reuse the real feature section instead of re-deriving its layout.

### 3. EXTEND (close-but-not-exact -> compose or add a variant)

If a primitive almost fits:

- **Compose** existing primitives (a `Card` + `SectionHeader` + `ListRow`s, a `FormField` wrapping an input, a `Menu` inside a `Popover`).
- **Add a variant** to the existing primitive, mirroring its current API shape (a new `tone` on `StatusBadge`, a new `variant` on `Button`). Token-first: the variant references `aq-*` tokens, never raw values.

Keep the API consistent with siblings. A new variant should read the same way the existing ones do.

### 4. BUILD NEW (nothing fits AND the need recurs)

Only build a new primitive when nothing composes cleanly AND the shape recurs across two or more screens (CLAUDE.md rule 11). A one-off goes inline in the feature, not into the system. When you do build:

1. **Token-first.** Add any new value to `src/styles/tokens.css` first (and re-export it in `src/styles/globals.css` `@theme`). Never hardcode a hex or pixel value in the component.
2. **One folder per primitive** under `src/shared/ui/<Name>/`.
3. **Add to the barrel** (`src/shared/ui/index.ts`).
4. **Register it**: add an entry to `components.json` and an example to `site/examples/<Name>.html`.
5. Follow the authoring rules in CLAUDE.md (no `src/components/`, no `*.styles.ts`, no other UI library, feature isolation).

## Token discipline (the hard rules)

These are enforced by ESLint in the app and are non-negotiable here:

- **No hex literals in JSX.** `text-[#e85a19]` is wrong. Use `text-aq-accent`.
- **No inline color/background `style={{}}`.** `style={{ color: '#...' }}` is wrong. Use a token utility class.
- **No arbitrary sizing.** `text-[15px]`, `tracking-[0.04em]` are wrong. Use `text-aq-md`, `tracking-aq-wide`.
- **Token-first.** Need a value that has no token? Add the token to `tokens.css` first, then reference it. Never inline.

**Naming grammar:** `aq-<family>[-<variant>]`. Families: `bg`, `surface`, `zebra`, `border`, `ink`, `accent`, `good`/`warn`/`bad`/`info`, plus `node-*`/`edge-*` for the graph. Variants follow the Supabase grammar: `accent` = orange CTA, `accent-soft` = the grey selection wash, `accent-strong` = selected text, `*-soft` = tinted status backgrounds, `*-muted`/`*-faint` = de-emphasized ink. See `references/tokens.md`.

## Animation framework (the ladder)

Pick the lowest rung that does the job:

1. **Motion tokens** - durations `--duration-aq-fast|base|slow` (120/200/320ms), eases `--ease-aq-out`, `--ease-aq-inout`. Every animation uses these, never a raw `300ms` or ad-hoc bezier.
2. **CSS transitions** - for UI micro-interactions (dropdowns, modals, badges, swaps). Use the `transitions-dev` skill (18 production recipes). This is the default rung.
3. **GSAP** - for timelines, scroll-driven sequences, pinning, and complex choreography. Use the `gsap-*` skills (gsap-core, gsap-timeline, gsap-scrolltrigger, gsap-react, gsap-plugins).
4. **framer-motion / motion** - already a dependency. For React component-level enter/exit, layout, and gesture animation that wants a declarative API.

Always gate motion on `prefers-reduced-motion`; the app uses `motion-safe:` Tailwind variants for this. See `references/animation.md`.

## Toolchain (what's installed, when to reach for it)

| Need               | Reach for                                                                                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Icons              | `src/shared/icons` (80-icon set via the `Icon` primitive) + `BrandIcon` (iconify simple-icons for provider logos). `lucide-react` is available for gaps. |
| Charts             | `recharts`                                                                                                                                               |
| Node/graph canvas  | `@xyflow/react` (the AIQ graph, Plans flow)                                                                                                              |
| YAML / code editor | `@uiw/react-codemirror` + `@codemirror/lang-yaml`                                                                                                        |
| Forms + validation | `react-hook-form` + `zod` (wrap inputs in `FormField`)                                                                                                   |
| Data fetching      | `@tanstack/react-query` (every fetch via `@shared/api`)                                                                                                  |
| Styling            | `tailwindcss` v4 over the `aq-*` theme                                                                                                                   |
| React animation    | `framer-motion` / `motion`                                                                                                                               |

Which **skills** to invoke (do not re-implement them here):

| Task                                                                     | Skill                                                                            |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Port an external design (Figma/screenshot/HTML) into a new ArmorIQ slice | `restyle-to-armoriq`                                                             |
| Reconcile a design against existing code (reuse vs variant vs new)       | `design-parity`                                                                  |
| UI micro-interaction transitions                                         | `transitions-dev`                                                                |
| GSAP timelines / scroll / plugins                                        | `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-react`, `gsap-plugins` |
| Net-new creative UI from scratch                                         | `frontend-design`                                                                |
| Apply ArmorIQ tokens+primitives to a non-ArmorIQ repo                    | `armoriq-restyle` (user-level)                                                   |

## Routing summary

- Building/extending UI in this style -> stay here, run the loop.
- External design to port -> `restyle-to-armoriq`.
- Match a design to existing code -> `design-parity`.
- Transitions -> `transitions-dev`. GSAP -> `gsap-*`. Net-new creative -> `frontend-design`.

## Contribution loop

Changed a primitive, added a variant, or added a token? Keep the system honest:

1. Update the entry in `components.json` (props, tokens, usage) and its `site/examples/<Name>.html`.
2. If you touched tokens, edit `src/styles/tokens.css` (and `globals.css` `@theme`).
3. Run `node design-system/sync/ds-sync.mjs` to regenerate `tokens.json` + the synced `site/tokens.css` from the live app.

## Portability

When this folder lives in **another repo without the live app**, treat `tokens.json` + `components.json` + `references/*` as self-contained ground truth; the `@shared/ui` imports document the canonical API shape to mirror.

When the **app is present**, the live `src/styles/tokens.css` and `src/shared/ui/*.tsx` are ground truth; the JSON is their generated twin. If they disagree, re-run `ds-sync.mjs`.
