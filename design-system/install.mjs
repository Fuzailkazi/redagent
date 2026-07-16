#!/usr/bin/env node
/**
 * install.mjs - install the ArmorIQ design-system skills into a target repo.
 *
 * When you pull this design-system/ folder into your working repo, run this to
 * copy the agent skills into the repo's `.claude/skills/` so your AI agent can
 * use them (armoriq-design-system, design-system-usage, redesign-app, and the
 * vendored sibling skills: design-parity, restyle-to-armoriq, transitions-dev).
 *
 * Usage:
 *   node design-system/install.mjs                # installs into the repo that
 *                                                 # CONTAINS design-system/
 *   node design-system/install.mjs <targetRepo>   # installs into a chosen repo root
 *
 * Idempotent: re-running overwrites the installed copies with the folder's
 * canonical versions. No dependencies, no network.
 */
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DS_ROOT = __dirname;
const SKILLS_SRC = resolve(DS_ROOT, 'skills');

// Target repo root: explicit arg, else the parent folder that contains
// design-system/ (i.e. the working repo you pulled this into).
const target = process.argv[2] ? resolve(process.argv[2]) : resolve(DS_ROOT, '..');
const SKILLS_DEST = join(target, '.claude', 'skills');

function log(msg) {
  process.stdout.write(`[ds-install] ${msg}\n`);
}

if (!existsSync(SKILLS_SRC)) {
  log(`ERROR: ${SKILLS_SRC} not found. Run from inside the design-system folder.`);
  process.exit(1);
}

mkdirSync(SKILLS_DEST, { recursive: true });

const skills = readdirSync(SKILLS_SRC, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

for (const name of skills) {
  const from = join(SKILLS_SRC, name);
  const to = join(SKILLS_DEST, name);
  cpSync(from, to, { recursive: true, force: true });
  log(`installed skill: ${name}`);
}

log(`done. ${skills.length} skills installed into ${SKILLS_DEST}`);
log('Your agent can now use: armoriq-design-system, design-system-usage, redesign-app.');
