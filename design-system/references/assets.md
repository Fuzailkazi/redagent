# Assets

Logos, fonts, and the icon set.

## Logos

- **`armormark.svg`** - the Armoriq mark (the claw glyph). Lives at `design-system/assets/logos/armormark.svg` (and `src/shared/brand/armormark.svg`), downloadable from the site.
- **React components** in `src/shared/brand/` (import from `@shared/brand`):
- **`ArmoriqMark`** - the mark on its own (favicon, compact rail, loading).
- **`ArmoriqLogo`** - the full lockup (mark + wordmark) used in the auth lockup and headers.

Render the components rather than inlining the SVG so color and sizing track the tokens.

## Fonts

Four faces, loaded via Google Fonts. Each has one job; do not cross them.

| Face                 | Role                                                                                                                                            | Tailwind                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Geist**            | Body and every UI surface (the primary face)                                                                                                    | `font-sans` (and the retained `font-geist` alias) |
| **Geist Mono**       | Code, IDs, versions, YAML                                                                                                                       | `font-mono`                                       |
| **Sunflower**        | Display only: brand wordmark + hero numerals. Ships 3 weights (300/500/700), no 400/italic; rounded display face. Keep OFF body and small text. | `font-display`                                    |
| **Instrument Serif** | Auth hero decorative numeral only                                                                                                               | `font-serif`                                      |

Load URL (from `index.html`):

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link
  rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&family=Sunflower:wght@300;500;700&family=Instrument+Serif:ital@0;1&display=swap"
/>
```

Font families are defined as CSS variables in `src/styles/globals.css` (`--font-sans`, `--font-mono`, `--font-display`, `--font-serif`, plus the `--font-geist` alias), each with a system fallback stack.

## Icons

Two layers:

### The ArmorIQ icon set

80 inline-SVG icons in `src/shared/icons/icons.tsx`, each a thin wrapper over the `Icon` primitive. Color is `currentColor`, so callers set it with a token text class; default size 16, stroke width 1.6, overridable per call site.

```tsx
import { IconSearch, IconShield } from '@shared/icons';

<IconSearch className="text-aq-ink-muted" />
<IconShield className="text-aq-accent" size={14} />
```

Names are `Icon<Name>` (`IconSearch`, `IconBell`, `IconShield`, `IconServer`, `IconBot`, `IconGauge`, `IconNetwork`, `IconKey`, `IconGraph`, `IconSort`, `IconSliders`, and so on through the full set). The complete inventory is in `assets/icons.json` (name + path).

### Brand / provider logos

`BrandIcon` (from `@shared/ui`) renders provider and tool logos from iconify's `simple-icons` set by slug (`github`, `slack`, `openai`), with a 2-letter neutral-square fallback when a slug is missing. Default tint resolves from `--color-aq-ink`.

```tsx
import { BrandIcon } from '@shared/ui';

<BrandIcon slug="slack" />;
```

Use `lucide-react` (a dependency) only for a generic glyph that the ArmorIQ set genuinely lacks; prefer the in-house set first for visual consistency.
