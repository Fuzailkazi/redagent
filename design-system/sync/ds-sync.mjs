#!/usr/bin/env node
/**
 * ds-sync — regenerate the portable design-system folder from the live app.
 *
 * What it does (all idempotent, no network, no deps):
 *   1. Copies the app's   src/styles/tokens.css   ->  design-system/styles/tokens.css
 *      (the vendored, standalone token source the site + primitives build from)
 *   2. Parses tokens.css into DTCG-format         ->  design-system/tokens.json
 *      (W3C Design Tokens Community Group, v2025.10 shape: { $value, $type, $description })
 *
 * The components.json manifest is hand-maintained (it carries prose usage +
 * variant class maps lifted from each *.tsx). This script does NOT overwrite it;
 * it only validates that every @shared/ui export appears in the manifest and
 * warns about any that are missing, so contributors notice drift.
 *
 * Run from the repo root:   node design-system/sync/ds-sync.mjs
 * Or via package.json:      npm run ds:sync   (see "scripts")
 *
 * PORTABILITY: this script only runs INSIDE the armorIQ-platform-proto repo,
 * because it reads the live source. Once the folder is moved/published, the
 * generated tokens.json + tokens.css + components.json travel with it and the
 * site needs no regeneration. Re-run this only when syncing against new app code.
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');
const DS_ROOT = resolve(__dirname, '..');

const TOKENS_CSS_SRC = resolve(REPO_ROOT, 'src/styles/tokens.css');
const TOKENS_CSS_DEST = resolve(DS_ROOT, 'styles/tokens.css');
const TOKENS_JSON_DEST = resolve(DS_ROOT, 'tokens.json');
const UI_BARREL = resolve(DS_ROOT, 'primitives/ui/index.ts');
const MANIFEST = resolve(DS_ROOT, 'components.json');

function log(msg) {
  process.stdout.write(`[ds-sync] ${msg}\n`);
}

// ── 1. copy tokens.css ──────────────────────────────────────────────────────
if (!existsSync(TOKENS_CSS_SRC)) {
  log(`ERROR: ${TOKENS_CSS_SRC} not found. Run from the armorIQ repo.`);
  process.exit(1);
}
copyFileSync(TOKENS_CSS_SRC, TOKENS_CSS_DEST);
log(`copied tokens.css -> site/tokens.css`);

const css = readFileSync(TOKENS_CSS_SRC, 'utf8');

// ── 2. parse :root { --x: y; } declarations from the light-mode block ─────────
// We only parse the first :root block (light mode). Dark-mode overrides are
// recorded per-token under $extensions["armoriq.dark"] when present.
function extractBlock(source, selector) {
  const start = source.indexOf(selector);
  if (start === -1) return '';
  const braceStart = source.indexOf('{', start);
  let depth = 0;
  let i = braceStart;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  return source.slice(braceStart + 1, i);
}

function parseDecls(block) {
  const out = {};
  // match  --name: value;   (value may contain parens for oklch/rgb)
  const re = /--([a-z0-9-_]+)\s*:\s*([^;]+);/gi;
  let m;
  while ((m = re.exec(block)) !== null) {
    out[m[1].trim()] = m[2].trim();
  }
  return out;
}

const lightVars = parseDecls(extractBlock(css, ':root'));
const darkVars = parseDecls(extractBlock(css, "html[data-theme='dark']"));

// ── classify a CSS var name into a DTCG group + $type ─────────────────────────
function classify(name) {
  if (name.startsWith('color-aq-')) return { group: 'color', type: 'color', key: name.slice('color-aq-'.length) };
  if (name.startsWith('text-aq-') && name.endsWith('--line-height')) return null; // folded into the size token
  if (name.startsWith('text-aq-')) return { group: 'typography', type: 'dimension', key: name.slice('text-aq-'.length) };
  if (name.startsWith('tracking-aq-')) return { group: 'tracking', type: 'dimension', key: name.slice('tracking-aq-'.length) };
  if (name.startsWith('radius-aq-')) return { group: 'radius', type: 'dimension', key: name.slice('radius-aq-'.length) };
  if (name.startsWith('shadow-aq-')) return { group: 'shadow', type: 'shadow', key: name.slice('shadow-aq-'.length) };
  if (name.startsWith('duration-aq-')) return { group: 'motion', type: 'duration', key: name.slice('duration-aq-'.length) };
  if (name.startsWith('ease-aq-')) return { group: 'motion', type: 'cubicBezier', key: name.slice('ease-aq-'.length) };
  if (name.startsWith('z-aq-')) return { group: 'zIndex', type: 'number', key: name.slice('z-aq-'.length) };
  if (name.startsWith('icon-aq-')) return { group: 'iconSize', type: 'dimension', key: name.slice('icon-aq-'.length) };
  if (name.startsWith('avatar-aq-')) return { group: 'avatarSize', type: 'dimension', key: name.slice('avatar-aq-'.length) };
  if (name.startsWith('focus-aq-')) return { group: 'focus', type: 'dimension', key: name.slice('focus-aq-'.length) };
  if (name.startsWith('spacing-')) return { group: 'spacing', type: 'dimension', key: name.slice('spacing-'.length) };
  return null; // skip non-token vars
}

// ── build the DTCG tree ───────────────────────────────────────────────────────
const dtcg = {
  $description:
    'ArmorIQ design tokens in W3C DTCG format (v2025.10). Generated from src/styles/tokens.css by design-system/sync/ds-sync.mjs. Do not edit by hand — edit tokens.css and re-run sync.',
};

for (const [name, value] of Object.entries(lightVars)) {
  const c = classify(name);
  if (!c) continue;
  dtcg[c.group] ??= { $description: c.group };
  const token = { $value: value, $type: c.type };
  // pair typography sizes with their line-height
  if (c.group === 'typography') {
    const lh = lightVars[`text-aq-${c.key}--line-height`];
    if (lh) token.$extensions = { 'armoriq.lineHeight': lh };
  }
  // record dark-mode override if it differs
  if (darkVars[name] && darkVars[name] !== value) {
    token.$extensions = { ...(token.$extensions ?? {}), 'armoriq.dark': darkVars[name] };
  }
  token.$extensions = { ...(token.$extensions ?? {}), 'armoriq.cssVar': `--${name}` };
  dtcg[c.group][c.key] = token;
}

writeFileSync(TOKENS_JSON_DEST, JSON.stringify(dtcg, null, 2) + '\n');
const tokenCount = Object.values(dtcg).reduce(
  (n, g) => n + (typeof g === 'object' ? Object.keys(g).filter((k) => !k.startsWith('$')).length : 0),
  0
);
log(`wrote tokens.json (${tokenCount} tokens, DTCG format)`);

// ── 3. validate components.json covers every @shared/ui export ────────────────
if (existsSync(UI_BARREL) && existsSync(MANIFEST)) {
  const barrel = readFileSync(UI_BARREL, 'utf8');
  const exported = new Set();
  const re = /export\s*\{\s*([^}]+)\}\s*from\s*'\.\/([A-Za-z0-9]+)'/g;
  let m;
  while ((m = re.exec(barrel)) !== null) {
    // the folder name is the canonical primitive name
    exported.add(m[2]);
  }
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const all = manifest.components ?? [];
  // Sections (category "sections") are feature code, NOT @shared/ui barrel
  // exports, so the coverage check only applies to the primitive entries.
  const documented = new Set(all.filter((c) => c.category !== 'sections').map((c) => c.name));
  const sectionCount = all.filter((c) => c.category === 'sections').length;
  const missing = [...exported].filter((x) => !documented.has(x));
  if (missing.length) {
    log(`WARN: ${missing.length} primitives missing from components.json: ${missing.join(', ')}`);
  } else {
    log(`components.json covers all ${exported.size} @shared/ui primitives ✓`);
  }
  log(`manifest: ${all.length} entries (${documented.size} primitives + ${sectionCount} product sections)`);
} else {
  log('skipped manifest coverage check (barrel or components.json not found yet)');
}

log('done.');
