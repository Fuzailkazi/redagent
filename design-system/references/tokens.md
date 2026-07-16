# Tokens

Tokens are the design values: colors, sizes, type, motion. They live in `src/styles/tokens.css` as CSS custom properties and are mirrored into `design-system/tokens.json` (W3C DTCG format, v2025.10) by `sync/ds-sync.mjs`. The CSS is ground truth in this repo; the JSON is the portable, machine-readable twin.

## Naming grammar

Every token follows `aq-<family>[-<variant>]`. The CSS variable carries a layer prefix that Tailwind v4 maps to a utility:

| CSS variable prefix              | Tailwind utility                      | Example                               |
| -------------------------------- | ------------------------------------- | ------------------------------------- |
| `--color-aq-*`                   | `text-aq-*`, `bg-aq-*`, `border-aq-*` | `--color-aq-accent` -> `bg-aq-accent` |
| `--text-aq-*`                    | `text-aq-*` (size)                    | `--text-aq-md` -> `text-aq-md`        |
| `--tracking-aq-*`                | `tracking-aq-*`                       | `--tracking-aq-wide`                  |
| `--radius-aq-*`                  | `rounded-aq-*`                        | `--radius-aq-2xl`                     |
| `--shadow-aq-*`                  | `shadow-aq-*`                         | `--shadow-aq-card`                    |
| `--duration-aq-*`, `--ease-aq-*` | motion utilities / inline transition  | `--duration-aq-base`                  |
| `--z-aq-*`                       | `z-aq-*`                              | `--z-aq-modal`                        |
| `--icon-aq-*`, `--avatar-aq-*`   | sizing                                | `--icon-aq-md`                        |
| `--focus-aq-*`                   | focus ring                            | `--focus-aq-ring-color`               |

**Variant suffixes** follow the Supabase grammar: `soft` (tinted / washed background), `strong` (heavier weight or selected text), `muted` / `faint` (de-emphasized ink), `deep` / `wash` / `line` (accent gradations). Read a token name as "family, then how loud".

## How to read tokens.json

Each leaf is a DTCG token: a `$value` (light mode), a `$type`, and `$extensions` carrying the dark value and the CSS var:

```jsonc
"accent": {
  "$value": "#e85a19",
  "$type": "color",
  "$extensions": {
    "armoriq.dark": "#ff7a3a",
    "armoriq.cssVar": "--color-aq-accent"
  }
}
```

To find the utility for a token, take the `armoriq.cssVar` and drop the layer prefix: `--color-aq-accent` -> `aq-accent`.

## Color families

### Surfaces

`aq-bg` (app background), `aq-surface` (cards / panels), `aq-zebra` (alternating rows / subtle fills), `aq-compose-well` (input wells).

### Borders

`aq-border` (default hairline), `aq-border-strong` (emphasized divider).

### Ink (text)

`aq-ink` (primary), `aq-ink-soft`, `aq-ink-muted`, `aq-ink-faint` (descending emphasis). On dark panels: `aq-ink-on`, `aq-ink-on-soft`, `aq-ink-on-muted`, `aq-ink-on-tint`, plus `aq-ink-on-line` / `aq-ink-on-wash` for hairlines and washes over dark. `aq-ink-panel` is the dark panel fill itself.

### Accent (the Supabase grammar)

`aq-accent` = the orange CTA (`#e85a19`). `aq-accent-soft` = the neutral grey **selection wash** (not orange). `aq-accent-strong` = the near-black **selected text** color. `aq-accent-wash` (warm tint), `aq-accent-deep` (pressed), `aq-accent-line` (warm hairline). Orange is punctuation: one CTA per view, selection states use the grey wash, not more orange.

### Status

`aq-good` / `aq-good-soft`, `aq-warn` / `aq-warn-soft`, `aq-bad` / `aq-bad-soft`, `aq-info` / `aq-info-soft`. The `-soft` variant is the tinted background; the base is the foreground/icon.

### AI + brand accents

`aq-iris`, `aq-ai-from` / `aq-ai-to` (the AI gradient), the `aq-compose-*` family (composer chrome + mention chips), and provider brand colors (`aq-brand-microsoft`, `aq-brand-google*`).

### Graph palette

Node fills `aq-node-org|framework|agent|server|policy|plan|tool|key|bundle|invocation|governed` and edge colors `aq-edge-flow|auth|govern|secure|hot`, defined in OKLCH for perceptual evenness across the graph canvas.

### Overlay

`aq-scrim` (modal backdrop), `aq-toast-bg` / `aq-toast-fg` / `aq-toast-border`.

## Radius

`aq-xs` (3px), `aq-2xl` (14px), `aq-3xl` (16px). Smaller steps (sm/md/lg) come from Tailwind defaults; the named `aq-*` radii are the system's deliberate large-corner values.

## Typography scale

`text-aq-caption` (11px), `xs` (12.5px), `sm` (13.5px), `base` (14px), `md` (15px), `lg` (16px), `stat` (20px), `h2` (24px), `display` (30px), `hero` (43px). Each carries a paired line-height. UI text is dense by design; `base` is 14px, not 16px.

## Tracking

`tracking-aq-tight` (-0.02em, large headings), `wide` (0.04em), `wider` (0.06em), `widest` (0.12em, all-caps labels).

## Spacing half-steps

`spacing-4_5` (1.125rem), `5_5` (1.375rem), `6_5` (1.625rem), `7_5` (1.875rem) extend Tailwind's integer scale for the in-between gaps the dense layouts need.

## Shadow

`aq-card` (resting card), `aq-popover`, `aq-modal`, `aq-button` (warm CTA shadow), `aq-flyout`, `aq-float`, `aq-panel` (the heavy dark-panel lift).

## Motion

Durations `aq-fast` (120ms), `aq-base` (200ms), `aq-slow` (320ms). Eases `aq-out` (`cubic-bezier(0.16,1,0.3,1)`, the standard enter ease) and `aq-inout`. See `references/animation.md`.

## Z-index

`aq-sticky` (30), `aq-drawer` (40), `aq-overlay` / `aq-modal` (50), `aq-popover` (55), `aq-toast` (60).

## Icon + avatar sizes

Icons `aq-xs|sm|md|lg` (10/12/14/16px). Avatars `aq-xs|sm|md|lg|xl` (20/28/32/40/56px).

## Focus

`focus-aq-ring-color` (the accent), `focus-aq-ring-width` (2px), `focus-aq-ring-offset` (2px). One consistent focus ring across every interactive primitive.

## Light / dark + density

**Theme** is driven by `data-theme="dark"` on `<html>`. Every color token carries an `armoriq.dark` value in `tokens.json`; `tokens.css` applies them under `html[data-theme='dark']`. Tokens without a dark value (e.g. graph OKLCH colors) are theme-stable by design.

**Density** is driven by `data-density="compact"` on `<html>`. Comfortable is the default and needs no override; compact tightens spacing under `html[data-density='compact']`.
