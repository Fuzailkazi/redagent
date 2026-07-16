# Overview

The ArmorIQ design system is a compact, restrained SaaS visual language (Supabase / Vercel lineage): muted neutrals, a single orange accent used as punctuation, a grey selection wash, and dense, legible type. This folder is its portable home. It has two faces over one source: a human-browsable site and an agent-readable JSON + Markdown interface. Both render from the same `tokens.json` and `components.json`, so they cannot drift.

## The rules

These are the design-relevant rules from the project `CLAUDE.md`. They are enforced by ESLint in the app.

1. **No hex literals in JSX.** Use a token utility (`text-aq-accent`), never `text-[#e85a19]`.
2. **No inline color or background `style={{}}`.** Use token classes, never `style={{ color: '#...' }}`.
3. **No arbitrary sizing.** Use `text-aq-md` / `tracking-aq-wide`, never `text-[15px]` or `tracking-[0.04em]`.
4. **Token-first.** If a value has no token, add it to `src/styles/tokens.css` (and the `globals.css` `@theme`) first, then reference it.
5. **Compose from the system.** Build every screen from `@shared/ui` primitives and `@shell/*` shells. Do not introduce visual style that lives outside the system.
6. **Extend, do not fork.** When a needed shape does not exist AND it recurs across two or more screens, extend the system (new primitive, variant, pattern, or token) rather than inlining a one-off.
7. **No other UI libraries.** No DaisyUI, Radix, MUI, Chakra, shadcn, Quill. Primitives are hand-built on purpose.
8. **No `*.styles.ts` files.** Tailwind utilities or proper primitives only.
9. **Primitives live in one place.** `src/shared/ui/<Name>/`, exported from the barrel. No top-level `src/components/`.
10. **Features cannot import from other features.** Cross-cutting UI is `@shared/` or `@shell/`.
11. **No dead routes / placeholders.** A screen ships real content or it does not ship.

## The decision tree: reuse -> extend -> build

When you need a piece of UI, walk these steps in order and stop at the first that fits.

### Discover

Read `components.json` to see what already exists and `tokens.json` for the values. This is far cheaper than reading the primitive source files, and it is the answer to "do we already have a X".

### Reuse

If a primitive matches, use it with its documented props:

```tsx
import { Button } from '@shared/ui';

<Button variant="primary" size="md">
  Save
</Button>;
```

The 50 primitives cover most needs. A raw `<button>`, a hand-rolled chip, or an ad-hoc status pill is a mistake, not a shortcut.

### Extend

If a primitive is close but not exact, compose existing primitives or add a variant that mirrors the existing API shape. A new `Button` variant or `StatusBadge` tone references `aq-*` tokens, never raw values, and reads the same way its siblings do.

### Build new

Only when nothing composes AND the shape recurs. Then: add the token first, create one folder under `src/shared/ui/<Name>/`, export it from the barrel, and register it in `components.json` with an example. A truly one-off shape stays inline in the feature.

## How to contribute

Anyone can extend the system without a build toolchain:

- **Add a token**: edit `src/styles/tokens.css`, re-export in `globals.css` `@theme`, then run `node design-system/sync/ds-sync.mjs` to regenerate `tokens.json` and the synced `site/tokens.css`.
- **Add or change a primitive**: build it under `src/shared/ui/<Name>/`, export it, then add an entry to `components.json` and an example HTML fragment under `site/examples/`.
- **Add a pattern**: document the recipe in `references/patterns.md`.

The site reads these files directly, so an accurate JSON entry plus an example is all a new contribution needs.
