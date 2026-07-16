---
name: design-system-usage
description: The practical rulebook for USING the ArmorIQ design system - what tokens and components exist, which token to use where (color/ink/accent/status/spacing/radius/type/shadow/motion), how to build a component variant correctly, and the naming grammar for adding a new token. Use whenever building or styling ArmorIQ UI and you need to decide "which token goes here", "can I reuse this component or do I need a variant", "how do I add a variant without breaking the API", or "what do I name a new token". Complements the armoriq-design-system skill (which runs the discover->reuse->extend->build loop and routes to sibling skills); this skill is the token + variant detail that loop leans on. Trigger on "which token", "what color should this be", "add a variant", "is there a token for", "how do I style this in our system", "new token".
---

# Design System Usage

The hands-on rulebook for building ArmorIQ UI correctly. The sibling `armoriq-design-system` skill decides *whether* to reuse/extend/build; **this** skill tells you *exactly which token goes where and how to build a variant*.

**Source of truth (never guess values):**
- `design-system/styles/tokens.css` - the real token definitions (`:root` = light, `html[data-theme='dark']` = dark). Authoritative.
- `design-system/styles/globals.css` - the `@theme` block that turns each token into a Tailwind utility. A token only produces a utility if it's here too.
- `design-system/tokens.json` - the machine-readable twin (114 tokens).
- `design-system/components.json` - the component + section manifest (what exists).

If code and JSON disagree, the CSS wins; re-run `node design-system/sync/ds-sync.mjs`.

**The three hard rules (ESLint-enforced):** no hex in JSX or Tailwind arbitrary values; no inline `style={{}}` for color/background/border/fill/stroke; no arbitrary sizing (`text-[15px]`, `tracking-[0.04em]`, `rounded-[7px]`). Need a value with no token? Add the token first (see "Adding a new token"), never inline.

---

## 1. What's here (the map)

- **Tokens** by family: color, ink, accent, status, spacing, radius, type, tracking, shadow, motion, z-index, icon size, avatar size. Detailed below.
- **Primitives** (~50, vendored at `design-system/primitives/ui`) imported via `@shared/ui` - `Button`, `Input`, `Select`, `Card`, `StatusBadge`, `Chip`, `Modal`, `SideModal`, `Avatar`, `Tabs`, `Toast`, `Skeleton`, `EmptyState`, `Banner`, `FormField`, `Menu`, etc. Import from the `@shared/ui` barrel.
- **Sections** (ArmorIQ product compositions like AgentCard) are app-specific and NOT part of this portable kit; build your own compositions from the primitives.
- **References** in `design-system/references/*.md` - deep prose on tokens, primitives, patterns, pages, animation, assets.

To answer "do we have an X": search `components.json` first (cheap), read the `.tsx` only if the entry isn't enough.

---

## 2. Color: which token where

### Surfaces (backgrounds), lightest to most-raised
| Token | Use for |
| --- | --- |
| `bg-aq-bg` | The page background (off-white `#fbfbfb`). The canvas everything sits on. |
| `bg-aq-surface` | Raised surfaces: cards, panels, menus, the "paper" a card sits on (`#ffffff`). |
| `bg-aq-zebra` | Subtle fill one step off the page: alternating table rows, hover wash on rows, inset wells. |

Rule: page = `bg`, card = `surface`, quiet fill/hover = `zebra`. Never `bg-white`/`bg-black` (lint-banned) - `surface`/`ink-panel` auto-theme.

### Borders
| Token | Use for |
| --- | --- |
| `border-aq-border` | Default hairline: card edges, dividers, input borders at rest. |
| `border-aq-border-strong` | Emphasis border: hover on interactive borders, scrollbar thumb, stronger separation. |

### Ink (text on light surfaces) - a 4-step hierarchy, use in order
| Token | Use for |
| --- | --- |
| `text-aq-ink` | Primary: headings, emphasized body, key numbers. |
| `text-aq-ink-soft` | Secondary: body copy, form labels. |
| `text-aq-ink-muted` | Tertiary: helper text, captions, metadata. |
| `text-aq-ink-faint` | Faintest: placeholder text, decorative chrome glyphs (search icon, breadcrumb marks). |

Pick the level by role, not by taste. Body text is `ink-soft`, not `ink`. Captions are `ink-muted`.

### Text/surfaces on the DARK ink panel (sign-in pane, dark cert cards)
On `bg-aq-ink-panel` use the `ink-on` family, mirroring the light hierarchy: `text-aq-ink-on` (primary), `text-aq-ink-on-soft` (secondary), `text-aq-ink-on-muted` (tertiary), `border-aq-ink-on-tint` / `border-aq-ink-on-line` (dividers), `bg-aq-ink-on-wash` (subtle fill).

### Accent - the most misused family, read carefully
ArmorIQ uses **two** selection grammars. Do not mix them.

**Neutral-grey selection (the default, Supabase grammar):**
| Token | Meaning | Use for |
| --- | --- | --- |
| `aq-accent` | Brand **orange** `#e85a19` | Reserved punctuation: the ONE primary CTA on a screen, focus rings, status dots, the brand glyph. Stays orange in dark mode. Do NOT paint large areas with it. |
| `aq-accent-soft` | Neutral grey wash | The selection/hover surface: selected nav pill background, tertiary hover surface, accent chip background. NOT orange. |
| `aq-accent-strong` | Dark slate (near-white in dark) | The selected-item TEXT color sitting on `accent-soft`. |

**Orange selection (the chrome/graph grammar - only where the design already uses orange selection):**
`aq-accent-wash` (orange surface wash behind an active rail button / nav row / plan badge), `aq-accent-deep` (deep orange text on the wash), `aq-accent-line` (accent-tinted hairline, e.g. active plan badge border).

Rule of thumb: a selected list/nav item uses **neutral** `accent-soft`/`accent-strong`. The active sidebar-rail button / active plan badge (the chrome that the design deliberately tints orange) uses **`accent-wash`/`accent-deep`/`accent-line`**. When unsure, default to the neutral grammar. `aq-accent` orange itself is a single punctuation mark per screen (the primary action), never a fill.

### Status / semantic - always a pair (foreground + soft background)
| Meaning | Foreground | Soft background |
| --- | --- | --- |
| Success / healthy / verified | `text-aq-good` | `bg-aq-good-soft` |
| Warning / needs attention | `text-aq-warn` | `bg-aq-warn-soft` |
| Danger / error / critical | `text-aq-bad` | `bg-aq-bad-soft` |
| Informational / view-only / neutral-active | `text-aq-info` | `bg-aq-info-soft` |

Use the `-soft` background behind the foreground for chips/badges/banners. Never invent a status color; these four cover every state. For alpha tints use existing tokens with Tailwind alpha (`bg-aq-bad-soft/60`), never `rgba()`.

### Specialized (scoped - don't reach for these unless you're in that surface)
- **Graph:** `aq-node-*` (node type by hue) + `aq-edge-*` (relationship by color). Semantic data channels for the AIQ graph only.
- **AI affordances:** `aq-ai-from` / `aq-ai-to` - the only gradient in the system, reserved for AI features.
- **AI policy composer:** `aq-compose-*` - scoped to that one card.
- **Org tiles:** `aq-iris` (purple) joins info-blue/good-green for org avatars.
- **Third-party brand:** `aq-brand-microsoft`, `aq-brand-google` (+ Google's blue/yellow/red) for SSO buttons/vendor logos. Add new brand colors on the `aq-brand-<name>` pattern rather than inlining a hex.
- **Overlay/floating:** `aq-scrim` (modal/drawer backdrop), `aq-toast-bg/-fg/-border` (toasts).

---

## 3. Type: which size for which role
`text-aq-*`; `text-[Npx]` is lint-banned. Sizes (px, line-height paired in tokens.css):

| Token | px | Role |
| --- | --- | --- |
| `text-aq-caption` | 11 | Tiny labels, table column heads, chip text, timestamps. |
| `text-aq-xs` | 12.5 | Dense metadata, secondary chips. |
| `text-aq-sm` | 13.5 | Secondary body, compact UI text. |
| `text-aq-base` | 14 | Default body text. The workhorse. |
| `text-aq-md` | 15 | Slightly emphasized body, card titles. |
| `text-aq-lg` | 16 | Larger input/prompt text (AI composer). |
| `text-aq-stat` | 20 | Large mono readouts (graph numbers, empty-state headings). |
| `text-aq-h2` | 24 | Section / page headings. |
| `text-aq-display` | 30 | Big display headings. |
| `text-aq-hero` | 43 | The single lead KPI / hero number. |

Round to the nearest step; between two steps, round DOWN. Add a size only if a value recurs across 3+ surfaces (grammar below).

**Sunflower display font:** the system pairs Geist (UI) + Geist Mono (numerals/code) + **Sunflower** (a display face for select large headings). Use Sunflower only where the design system's typography page shows it (display/hero brand moments), not for body or UI chrome.

---

## 4. Spacing, radius, tracking, shadow, motion

**Spacing:** Tailwind's 4px scale plus half-steps `4.5`(18) `5.5`(22) `6.5`(26) `7.5`(30) - use `p-4.5`, `gap-5.5`, etc. These half-steps exist because the compact-SaaS density needs rungs between 16 and 24. (Compact density mode tightens 4.5/5.5 further via `data-density`.)

**Radius:** `rounded-aq-xs`(3px, chips) Â· Tailwind `rounded`/`rounded-md`/`rounded-lg`/`rounded-xl` (4/6/8/12) for chips->cards->panels Â· `rounded-aq-2xl`(14, floating dropdown panels) Â· `rounded-aq-3xl`(16, graph detail panel). Chip = xs; card = lg; floating panel = 2xl/3xl.

**Tracking:** `tracking-aq-tight`(-0.02em, big headings/numerals) Â· `tracking-aq-wide`(0.04) Â· `tracking-aq-wider`(0.06) Â· `tracking-aq-widest`(0.12, uppercase micro-labels).

**Shadow (by intent, never by size):** `shadow-aq-card` (resting card) Â· `shadow-aq-popover` (menus/popovers) Â· `shadow-aq-modal` (modals) Â· `shadow-aq-button` (the orange CTA lift) Â· `shadow-aq-flyout` (org-switcher dropdown) Â· `shadow-aq-float` (graph glass chrome) Â· `shadow-aq-panel` (deep layered graph panels). Pick by what the element IS, not how big the shadow looks.

**Motion:** durations `--duration-aq-fast|base|slow` (120/200/320ms), eases `--ease-aq-out` (most UI) / `--ease-aq-inout` (symmetric). Never a raw `300ms` or ad-hoc bezier. Gate on `motion-safe:`.

**Z-index (grammar, stepped by 5):** `--z-aq-sticky`(30) `drawer`(40) `overlay|modal`(50) `popover`(55) `toast`(60). Use these, not magic numbers.

**Icon sizes:** `--icon-aq-xs|sm|md|lg` (10/12/14/16) instead of raw `size={13}`. **Avatar:** `--avatar-aq-xs..xl` (20/28/32/40/56).

---

## 5. How to build a component variant (the recipe)

When a primitive *almost* fits (role matches, 1-2 prop divergences), add a variant - do NOT fork a new component or hand-roll the shape inline.

1. **Find the variant axis.** Read the primitive's props (or its `components.json` entry). Most take a `variant` / `tone` / `size` union. You're adding one member to that union, not a new prop shape.
2. **Mirror the existing API.** The new variant must read exactly like its siblings. If `Button` has `variant="primary" | "secondary" | "ghost"`, add `"danger"` the same way; don't add a separate `isDanger` boolean.
3. **Token-first, always.** The variant's visuals reference `aq-*` tokens only. A `danger` button uses `bg-aq-bad` / `text-aq-ink-on`, never a new hex. If the variant needs a value with no token, add the token first (section 6).
4. **Cover the state grid.** The variant must render every state the primitive supports that applies: idle / hover / focus / disabled / loading / error. A variant that only styles idle is incomplete.
5. **Keep it a variant, not a mutant.** If the divergence is structural (different DOM, different layout, different interaction) - that's a NEW component, not a variant. Adding structural variants bloats a primitive until it's unmaintainable. Rule: 1-2 visual prop differences = variant; structural difference = new.
6. **Register it.** Update the `components.json` entry (add the variant to `variantClasses`/props) and the `site/examples/<Name>.html` so the catalog and agents both see it.

---

## 6. Adding a new token (only when nothing maps)

Add a token when a needed value genuinely has no existing token AND the role recurs (not a one-off). Steps:

1. **Check it doesn't already exist** (search `tokens.css` + `tokens.json`). Most "new" values are an existing token you didn't find.
2. **Add in BOTH places or the utility won't generate:** the value in `src/styles/tokens.css` (`:root`, plus a `html[data-theme='dark']` override if it's a color), AND the mapping in `src/styles/globals.css` `@theme`.
3. **Follow the naming grammar** (reject and re-propose if a name doesn't fit):

| Family | Grammar |
| --- | --- |
| Color | `aq-<family>` default Â· `-soft` lighter Â· `-strong` deeper Â· `-muted` lightest Â· `-tint` surface wash (not text). e.g. `aq-ink-soft`, `aq-accent-strong`. |
| Spacing | `--spacing-<n>` or half-step `--spacing-<n>_5`. Never pixel-named. |
| Radius | `--radius-aq-<t-shirt>` (xs/2xl/3xl style). Never `--radius-7`. |
| Type | `--text-aq-<name>` + paired `--text-aq-<name>--line-height`. Extend the ramp only with strong justification. |
| Tracking | `--tracking-aq-<semantic>` (tight/wide/wider/widest). |
| Shadow | `--shadow-aq-<intent>` (card/popover/modal/button/flyout/float/panel/<new-intent>). NEVER sm/md/lg. |
| Motion | `--duration-aq-<fast|base|slow>`, `--ease-aq-<out|inout>`. |

4. **Provide a dark value** for any color token (the `html[data-theme='dark']` block) - a light-only color breaks dark mode.
5. **Sync:** run `node design-system/sync/ds-sync.mjs` to regenerate `tokens.json` + the site's tokens.

---

## 7. The token-selection decision tree (mapping a design value)

```
Given a raw value from a design:
  is it a COLOR?
    -> match by semantic role first (surface / border / ink-level / status / accent), then brightness
    -> exact token-name match required (no "close enough"); if none AND role is genuinely new -> add token
  is it a FONT SIZE?
    -> nearest text-aq-* step; between two steps round DOWN; add only if recurs across 3+ surfaces
  is it SPACING?
    -> nearest 4px step or existing half-step (4.5/5.5/6.5/7.5); add a half-step only if >=2px from any rung
  is it a RADIUS?    -> exact match to xs / 4-6-8-12 / 2xl / 3xl; radii are not interpolated
  is it a SHADOW?    -> pick by intent (card/popover/modal/...), never by visual size
  is it TRACKING?    -> nearest tight/wide/wider/widest
  is it OPACITY on a token? -> Tailwind alpha syntax (bg-aq-ink/40), never rgba()
```

---

## 8. Do / Don't quick reference

**Do:** body text `text-aq-ink-soft`; captions `text-aq-ink-muted`; card `bg-aq-surface` on page `bg-aq-bg`; row hover `bg-aq-zebra`; primary action `bg-aq-accent` (one per screen); selected nav `bg-aq-accent-soft text-aq-accent-strong`; status chip `text-aq-bad bg-aq-bad-soft`; card shadow `shadow-aq-card`; transitions with `--duration-aq-base --ease-aq-out` under `motion-safe:`.

**Don't:** `bg-white`/`text-black`; `text-[15px]`/`tracking-[0.04em]`/`rounded-[7px]`; hex anywhere in JSX or `bg-[#...]`; inline `style={{ color }}`; orange (`aq-accent`) as a fill or on more than the one primary action; a new component when a variant would do; a new token when an existing one maps; `rgba()` for tints; raw `size={13}` on icons.

---

## 9. Relationship to the other DS files

- **`armoriq-design-system`** (in `design-system/skills/armoriq-design-system/SKILL.md`): the reasoning loop (discover -> reuse -> extend -> build) and routing to `restyle-to-armoriq` / `design-parity` / `transitions-dev` / `gsap-*`. Invoke it to decide *whether and what*.
- **this skill (`design-system-usage`)**: the token + variant detail - *which token, where, and how to build the variant*. The loop leans on this for every concrete styling decision.
- **`design-parity` / `restyle-to-armoriq`**: apply a design to code / build a new slice from a design. Both use the rules here for their token/component decisions.

Both DS skills read the same `tokens.css` / `tokens.json` / `components.json`, so they cannot drift from each other or from the app.


