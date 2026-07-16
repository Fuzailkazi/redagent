# ArmorIQ Design System — site

The browsable, deployable catalog for the ArmorIQ V5 design system. It renders
the **real** `@shared/ui` primitives and the **real** `tokens.css`, so what you
see is what ships. Nothing here is a copy that can drift.

## View it

- **Deployed:** open the deployed URL. Vercel builds it from source on every
  push, so the live site is always current. No build output is committed.
- **Locally:** `npm install && npm run dev` (see Edit), or `npm run build &&
npx serve dist` to preview a production build.

## Edit it

```bash
cd design-system/site
npm install      # one-time
npm run dev      # http://localhost:5173
```

The site imports from the parent app via Vite aliases (`@shared`, `@styles`,
etc. resolve to `../../src/*`). So editing the site needs the app present.
Viewers and the deployed build do not.

## Build + deploy (Vercel)

```bash
npm run build    # -> dist/
npm run preview  # serve the build locally to check it
```

`vercel.json` is configured: point Vercel at `design-system/site` and it builds
with `npm run build`, serves `dist/`, and SPA-rewrites to `index.html`. For
GitHub Pages under a subpath, set `base` in `vite.config.ts` to `/<repo>/`.

## How it stays honest

- **Tokens** come from `../../tokens.json` (DTCG) + the real `tokens.css` import.
- **Components** are the real primitives; previews are live React, not snippets.
- **Metadata** (props, usage, tokens) comes from `../../components.json`.

When a primitive or token changes in the app, run `node ../sync/ds-sync.mjs`
from the repo root to regenerate `tokens.json` + the synced `tokens.css`, then
update the matching `components.json` entry. The live previews update
automatically because they import the real component.

## Notes

- A single React instance is forced in `vite.config.ts` (`dedupe` + aliasing
  `react`/`react-dom` to this folder's copy). Without it, the app's React and
  the site's React both load and hooks crash. Do not remove that.
- The agent-facing layer (`SKILL.md`, `references/*.md`, `tokens.json`,
  `components.json`) lives one level up and is what AI agents read. This site is
  the human face of the same source.
