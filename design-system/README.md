# ArmorIQ Design System

A **portable, self-contained design system**. Pull this folder into any repo and you have everything needed to design or redesign UI in the ArmorIQ style: the design tokens, the component primitives (source), the agent skills that reason over them, and a browsable showcase site. Zero dependency on any parent app.

One source, two faces:

- **For humans:** the `site/` showcase renders every token, primitive, and pattern live, and builds/runs standalone.
- **For AI agents:** `tokens.json` + `components.json` + `skills/` let an agent discover what exists and build on-brand UI, whether restyling one screen or redesigning a whole app.

---

## Quick start

### 1. Pull it into your repo
Copy or submodule this `design-system/` folder into your working repo.

### 2. Install the agent skills
```bash
node design-system/install.mjs
```
This copies the skills into your repo's `.claude/skills/` so your AI agent can use them. Pass a path to target a different repo root: `node design-system/install.mjs /path/to/repo`.

### 3. Run the showcase site (optional, for humans)
```bash
cd design-system/site
npm install
npm run dev        # http://localhost:5173
```

### 4. Design with it
Tell your agent what you want. The skills route the work:
- "build a settings screen in our style" -> **armoriq-design-system** (discover -> reuse -> extend -> build)
- "which token should this be / add a variant" -> **design-system-usage** (the token + variant rulebook)
- "redesign the whole app" -> **redesign-app** (flow-first, multi-screen redesign pipeline)

---

## What's in here

```
design-system/
  README.md            this file
  package.json         the kit manifest + tech stack + convenience scripts
  install.mjs          installs skills/ into a target repo's .claude/skills/
  tokens.json          all design tokens in W3C DTCG format (machine-readable)
  components.json      the primitive manifest (what exists, props, usage)
  styles/
    tokens.css         the token SOURCE of truth (:root light + dark override)
    globals.css        Tailwind v4 @theme binding every token to a utility class
  primitives/          the vendored component source (self-contained)
    ui/                ~56 primitives (Button, Modal, StatusBadge, FormField, ...)
    icons/  motion/  hooks/
  skills/              the agent skills (install into .claude/skills/)
    armoriq-design-system/    discover -> reuse -> extend -> build loop + routing
    design-system-usage/      token + variant rulebook (which token where, how to vary)
    redesign-app/             flow-first whole-app redesign pipeline
    design-parity/            reconcile a design against existing code
    restyle-to-armoriq/       build a new slice from an external design source
    transitions-dev/          production CSS-transition recipes (motion)
  references/          deep prose docs (tokens, primitives, patterns, pages, animation, assets, toolchain)
  assets/              fonts (Geist, Geist Mono, Sunflower) + logos
  site/                the human-facing showcase (Vite + React, builds standalone)
  sync/ds-sync.mjs     regenerates tokens.json from styles/tokens.css (see Syncing)
```

## The tech stack (what building with this kit uses)

React 19 + Tailwind v4 (CSS-first `@theme` over the `aq-*` tokens). Motion via `framer-motion`/`motion` and the `transitions-dev` recipes; the graph canvas via `@xyflow/react`; icons via the in-house `icons/` set with `lucide-react` for gaps. See `package.json` for exact versions and `references/toolchain.md` for when to reach for what.

## Token discipline (the hard rules)

Enforced wherever these tokens are used:
- No hex literals in JSX or Tailwind arbitrary values. Use `text-aq-accent`, not `text-[#e85a19]`.
- No inline `style={{}}` for color/background/border/fill/stroke. Use a token utility class.
- No arbitrary sizing (`text-[15px]`, `tracking-[0.04em]`). Use `text-aq-md`, `tracking-aq-wide`.
- Need a value with no token? Add the token to `styles/tokens.css` first (and the `@theme` block in `globals.css`), then use it. Never inline.

The full "which token where / how to build a variant / naming grammar" rulebook is the **design-system-usage** skill.

## Using the tokens/primitives in your app

Point Tailwind at the vendored styles and primitives. In your app's CSS:
```css
@import '../design-system/styles/globals.css';   /* Tailwind + tokens + @theme */
@source "../design-system/primitives";           /* so primitive utilities generate */
```
Alias `@shared` to `design-system/primitives` (or import primitives directly), then:
```tsx
import { Button, StatusBadge, FormField } from '@shared/ui';
```

## Syncing (only inside the origin ArmorIQ app)

`sync/ds-sync.mjs` regenerates `tokens.json` from `styles/tokens.css` and validates the manifest. It only fully runs inside the origin `armorIQ-platform-proto` repo (it can cross-check the live app). Once this folder is standalone, `tokens.json` + `components.json` + `primitives/` travel with it and need no regeneration; edit `styles/tokens.css` and re-run sync to update `tokens.json`.

## Portability notes

- The `primitives/` are the real component source, vendored in, so the site and any consumer build with no parent app.
- App-specific product sections (agent cards, MCP cards, the AIQ graph, etc.) are intentionally NOT included: they belong to the ArmorIQ product, not the reusable system. The primitives, tokens, patterns, and skills are what carry to any app.
- `design-parity` and `restyle-to-armoriq` were authored for the origin repo and mention some ArmorIQ paths/conventions; they still document the correct reuse/token decisions and are safe to use as references anywhere.
