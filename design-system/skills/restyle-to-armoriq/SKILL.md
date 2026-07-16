---
name: restyle-to-armoriq
description: Use when the user wants to take any external design source (Figma URL, screenshot, HTML mockup, Claude Design handoff bundle, or competitor app image) and produce a new ArmorIQ feature slice rendered in the V5 compact-SaaS design system — mapping every color/size/spacing to existing `aq-*` tokens, reusing existing primitives where possible, and following the proven PM orchestration playbook (designer agent → engineer agent → verify → signed commit → stop). Distinct from `design-parity`, which assumes a target file already exists to reconcile against. Trigger when the user pastes a design URL/file and says "build this in our style", "restyle to ArmorIQ", "implement using our tokens", "port this to our system", or hands off a tar.gz handoff bundle.
---

# Restyle to ArmorIQ

You are translating an external design into a new feature slice rendered in the ArmorIQ V5 compact-SaaS design system. The design source can be from anywhere; the output is always **ArmorIQ-shaped** — same tokens, same primitives, same architecture, same conventions.

This skill is **RIGID**. Run the phases in order. Do not write component code in the main thread — delegate to subagents.

---

## When to use this skill

Trigger when ALL of these are true:

- The user has handed off a design source (URL, file, bundle, image)
- They want it built in **our style** (tokens + primitives + architecture)
- There is **no existing target file** to reconcile against (greenfield; if a target exists, use `design-parity` instead)

If the design source maps to a single existing route/component and they want a "match" — that's `design-parity`. If it's a new slice or new area — that's this skill.

---

## Inputs accepted (auto-detect)

| Source                   | Detect by                                                                      | Handler                                                           |
| ------------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Figma                    | URL starts with `https://www.figma.com/design/` or `https://figma.com/design/` | Extract `fileKey` + `node-id` (convert `-` to `:`)                |
| Anthropic design handoff | URL starts with `https://api.anthropic.com/v1/design/`                         | Tarball — fetch + extract + read README + chats + primary HTML    |
| Screenshot               | Path ends in `.png` `.jpg` `.jpeg` `.webp`                                     | Multimodal read; values are approximate, snap to nearest token    |
| HTML mockup              | Path ends in `.html`                                                           | DOM + className parse; works for hand-written or design-tool HTML |
| Existing local file      | Anywhere in the repo                                                           | Read as a reference for restyle                                   |

If the input is ambiguous, ask the user **once** with `AskUserQuestion`. Don't guess.

---

## The 7 phases

### Phase 0 · Ingest

Stage the source into `docs/design-source/` so the engineer can read it.

For Figma / web URLs: use the `design-ingestor` subagent (Agent tool, `subagent_type: design-ingestor`). It saves a `DesignSpec` JSON to `.claude/scratch/`.

For Anthropic design handoff URLs: fetch the tar.gz via `ctx_execute` shell sandbox (URL returns gzipped tar; the bytes are too large to pull into the conversation). Extract to a sandbox path, then `cp` the primary HTML + chat transcripts + every JSX file the primary HTML imports into `docs/design-source/`. **Critical**: ESCAPE special characters in filenames (`&` becomes `and`, spaces become `-`).

For screenshots: copy the file to `docs/design-source/`. Read it directly using your multimodal vision capability — you're the ingestor for image inputs.

For HTML files: copy to `docs/design-source/`. Read top-to-bottom; follow every `<script src=>` and `<link href=>` import.

**Do not** read all 3000+ lines of JSX into your context. Stage the files; let the designer + engineer subagents read them.

### Phase 1 · Read the user's intent

If the source is a Claude Design handoff bundle, **read the README in full** and at least **skim the chats** for the intent statement (usually one of the later messages frames what the user wanted). The bundle's README explicitly tells you to read these. Don't skip.

If the source is a screenshot or Figma URL with no chat, ask the user **one** question: "What's the primary screen, and where does it live in the IA?" Use `AskUserQuestion`.

### Phase 2 · PM brief (in your response)

Before any subagent is spawned, write a concise PM brief in your response to the user. Structure:

1. **What the design asks for** — table of routes/screens, their purpose, the JSX file each maps to
2. **Scope I'm calling** — what's IN scope, what's deferred (Add wizards, scan reports, real backend, agent-detail click-through, mobile, bulk actions are common deferrals)
3. **Constraints carried over** — V5 tokens, no hex, dev server stays on 5173, signed commits, no push without `PUSH`
4. **Orchestration** — name the subagents you'll spawn and what each owns
5. **What I'd love confirmed before I dispatch** — optional; if the design has obvious open questions (e.g. "the design uses 40px font for the hero — should I add a `text-aq-jumbo` token?"), surface 2-3 of them. Else don't ask.

This brief is the user's chance to redirect scope. Keep it 30-60 lines. Not a wall.

### Phase 3 · Token map (designer agent's job)

Spawn a Senior PD / IA architect agent. It produces a file-by-file implementation plan covering:

- Route map + nav-config delta
- File structure (mirror `src/features/agents/`)
- Icons inventory — for every icon the design references, mark **EXISTS** / **EXISTS as alternative** / **NET-NEW** (provide verbatim SVG path data for new ones)
- Data shapes — full TypeScript types for every fixture
- Per-page layout pseudo-JSX with Tailwind class hints
- Shared primitives detail (props, edge cases, Tailwind classes)
- Interconnection map (every clickable/hover with target + TODO comments)
- State matrix (loading / empty / populated / filtered-zero / error)
- 3-5 engineer risks

Designer is **read-only**. It returns the plan as the agent result. The plan is the engineer's work order.

### Phase 4 · Implement (engineer agent's job)

Spawn a Senior Frontend Engineer agent. Pass the designer's plan inlined in the prompt. The engineer:

- Reads the design source JSX themselves for pixel detail
- Builds the feature slice in `src/features/<slice>/`
- Updates `src/shell/dashboard-shell/nav-config.ts` if a new sub-rail is needed
- Updates `src/app/router.tsx` (lazy imports + route entries; **static paths before `:slug`** or react-router treats them as slugs)
- Verifies `npm run typecheck`, `npm run lint`, `npm run build` clean

If the work is large (>20 files), let one agent attempt it. If it errors mid-flight (API overload, timeout), spawn a CONTINUATION engineer with a sharper smaller prompt covering only the remaining files (see [Iteration 3 retry pattern in CLAUDE.md notes] — the proven move).

### Phase 5 · Verify (you, the main thread)

Re-run from `d:\Armoriq\armorIQ-platform-proto`:

```bash
npm run typecheck    # must be clean
npm run lint         # must be clean
npm run build        # must be clean
```

Smoke-test every new route:

```bash
for path in /dashboard/<slice> /dashboard/<slice>/<sub-page>; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5173${path}")
  echo "${path} → HTTP ${code}"
done
```

If the engineer used a `.claude/worktrees/agent-*` worktree and left it locked (common), force-remove it before the lint sweep:

```bash
git worktree remove .claude/worktrees/agent-<id> -f -f
git worktree prune
git branch -D worktree-agent-<id>
```

### Phase 6 · Commit signed

Stage explicitly (never `git add -A` — that can leak `.env` or secrets):

```bash
git add docs/design-source src/features/<slice> src/shared/icons src/shell/dashboard-shell/nav-config.ts src/app/router.tsx
git status --short
```

Commit with a heredoc body following the project's convention:

```bash
git commit -m "$(cat <<'EOF'
feat(<slice>): <short imperative summary>

<wrapped paragraph explaining what landed and why>

Routes (N new) / Foundation / Nav wiring / Visual conversion /
Interconnection / Out of scope (echo back deferred items)

Verified: typecheck clean, lint clean, Vite build clean
(N modules, ...), all M routes serve HTTP 200 on dev server.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Husky's `lint-staged` will run prettier + eslint --fix. The signature comes from `git config --global commit.gpgsign true` + the SSH key configured in memory. Verify:

```bash
git log -1 --show-signature 2>&1 | head -3   # should say `Good "git" signature`
```

### Phase 7 · STOP and await PUSH

**Do not push.** Per `~/.claude/projects/.../memory/no-push-without-explicit-command.md`: never run `git push`, `gh pr create`, or force-push until the user explicitly types `PUSH` (or unambiguous equivalent like "push it now", "open the PR"). Earlier authorizations don't generalize.

Tell the user:

- Commit SHA + signature status
- Branch landscape (which branches are pushed vs local)
- What to try in the live app (the dev server is still on 5173)
- "Type `PUSH` to ship"

---

## ArmorIQ design system reference

### Tokens (the canonical list — only these)

**Colors** (`bg-aq-*`, `text-aq-*`, `border-aq-*`, `ring-aq-*` all available):

```
aq-bg          aq-surface         aq-zebra
aq-border      aq-border-strong
aq-ink         aq-ink-soft        aq-ink-muted
aq-accent      aq-accent-soft     aq-accent-strong
aq-good        aq-good-soft
aq-warn        aq-warn-soft
aq-bad         aq-bad-soft
aq-ink-panel   aq-ink-on          aq-ink-on-soft     aq-ink-on-muted
aq-ink-on-tint aq-ink-on-line     aq-ink-on-wash
aq-brand-microsoft   aq-brand-google
```

**Typography sizes** (`text-aq-*` — `text-[Npx]` is **lint-banned**):

```
text-aq-caption   10px / 14lh
text-aq-xs        11.5px / 16lh
text-aq-sm        12.5px / 18lh
text-aq-base      13px / 20lh
text-aq-md        14px / 20lh
text-aq-h2        22px / 28lh
text-aq-display   28px / 32lh
text-aq-hero      40px / 44lh
```

Round to the nearest existing size. If the design needs something between (e.g. 18px), round DOWN (`text-aq-md` for 18px). Only add a new token if the value recurs across 3+ surfaces.

**Tracking** (`tracking-aq-*` — `tracking-[-0.02em]` is lint-banned):

```
tracking-aq-tight    -0.02em   (headings, big numerals)
tracking-aq-wide      0.04em
tracking-aq-wider     0.06em
tracking-aq-widest    0.12em
```

**Radius**:

```
rounded-aq-xs    3px (chips)
rounded         standard Tailwind 4/6/8/12
rounded-md      6px
rounded-lg      8px
```

**Spacing** half-steps added to Tailwind's 4px scale: `4.5` (18px), `5.5` (22px), `6.5` (26px), `7.5` (30px). Use `p-4.5`, `gap-4.5`, etc.

**Shadow**: `shadow-aq-card`, `shadow-aq-popover`, `shadow-aq-modal`.

### Existing primitives (consider reuse FIRST)

Under `@shared/`:

- Icons — 50+ in `@shared/icons` (see `src/shared/icons/icons.tsx` for inventory)
- Brand — `ArmoriqMark`, `ArmoriqLogo`

Under `@shell/`:

- `DashboardShell` — composes IconRail + SecondRail + TopBar + `<main>`. Props: `section`, `navActive`, `secondaryActive`, `crumbs`, `children`. Use this for every authenticated page.
- `AuthSplitLayout` — for sign-in / verify / org-pick screens.

Under existing feature slices (NOT cross-feature import — these are for design reference, not consumption):

- `@features/agents/components/wizard/*` — Stepper, WizardFooter, Input, Select, FieldLabel, DiscardConfirmDialog, DraftRestoredBanner, InlineFieldError. **Pattern reference only**; if a new slice needs similar primitives, build its own. Cross-feature imports are banned.
- `@features/dashboard/components/*` — StatTile (hero variant), SeverityDot, DeltaBadge. Same rule.
- `@features/mcp/components/*` — VulnChip, CertChip, HealthDot, TransportChip, CrossPageHeader, StatStrip, RailPanel. Same.

When tempted to import from another feature, **stop**. Copy the pattern instead, and consider promoting to `@shared/` if 3+ features need it.

### Architecture invariants (CLAUDE.md)

1. **No top-level `src/components/`**. UI lives under `src/features/<slice>/` or `src/shared/` (truly cross-cutting only).
2. **No `src/pages/`**. Routes are owned by their feature slice (`features/<slice>/routes/`) and registered in `src/app/router.tsx`.
3. **Feature isolation**. Features cannot import from other features. Use `@shared/` or `@shell/`. ESLint enforces.
4. **Every fetch through `@shared/api`** (`apiClient` or `request()`). No raw `fetch()` in feature code.
5. **Every response zod-parsed** at the slice boundary. Schemas live in `features/<slice>/api/schemas.ts`.
6. **No `*.styles.ts` files anywhere**. Tailwind utilities or proper primitives only.
7. **No DaisyUI, Quill, Radix, MUI, Chakra, shadcn, or any other UI library**. Hand-build primitives.
8. **No dead routes**. A route either renders a real screen or it doesn't ship. No `<h2>` placeholders.

Path aliases:

```
@app/*       → src/app/*
@shared/*    → src/shared/*
@features/*  → src/features/*
@shell/*     → src/shell/*
@styles/*    → src/styles/*
```

---

## Forbidden patterns (ESLint will reject)

- **Hex literals** in JSX (`#E85A19`, `#ffffff`, etc.)
- **Hex inside Tailwind arbitrary values** (`bg-[#0078D4]`, `text-[#fff]`)
- **Inline `style={{}}`** with `color`, `backgroundColor`, `borderColor`, `fill`, or `stroke` properties. Other inline style props (padding, width, gridTemplateColumns) are fine.
- **Bare `bg-white` / `text-black` / `ring-white` / `text-white`** — use `text-aq-ink-on` / `text-aq-ink` etc.
- **`text-[Npx]`** arbitrary font-sizes — use the `text-aq-*` aliases
- **`tracking-[-0.02em]`** arbitrary tracking — use `tracking-aq-*`
- **`*.styles.ts`** files
- **Cross-feature imports** (`@features/<other-slice>/...` from `@features/<this-slice>/...`)
- **Skipping git hooks** (`--no-verify`, `--no-gpg-sign`). If a hook fails, fix the underlying issue.

SVG colors: do NOT put hex into `stroke="..."` or `fill="..."` attributes. Instead, set `stroke="currentColor"` / `fill="currentColor"` on the SVG children and wrap colored groups in Tailwind text-color classes (`<g className="text-aq-bad">`). This is the only way to satisfy the no-hex rule for SVG content.

---

## Memory rules to respect

These are saved at `~/.claude/projects/d--Armoriq-armorIQ-platform-proto/memory/` — invoke `MEMORY.md` if uncertain:

- **`no-push-without-explicit-command`** — Never push, force-push, open a PR, or otherwise touch the remote until the user types `PUSH` or an equivalent direct authorization. Even if they previously said push, re-auth required per change.
- **`commits-must-be-signed`** — SSH signing is configured globally; never bypass with `--no-gpg-sign`; surface signing failures instead.
- **`dev-server-port-discipline`** — Always run Vite on 5173. Before `npm run dev`, run `npx kill-port 5173` so Vite doesn't fall back to 5174. Verify the server actually came up on 5173.

If you are about to commit on top of an unpushed branch: **don't accidentally rebase or squash existing local commits**. Add new commits on top. The user splits/squashes themselves at PR time.

---

## Token mapping playbook (when the design uses a color not in our system)

The design will use raw hex values. Map them like this:

1. **Find the nearest existing token** by visual category (warning, success, accent, ink, etc.) + brightness.
   - V5 ink #1B1A17 → `text-aq-ink`
   - V5 muted gray → `text-aq-ink-muted`
   - V5 orange #E85A19 → `bg-aq-accent`
   - V5 orange-soft #FDF1E9 → `bg-aq-accent-soft`
   - V5 amber/yellow → `text-aq-warn` (foreground), `bg-aq-warn-soft` (background)
   - V5 red → `text-aq-bad` / `bg-aq-bad-soft`
   - V5 green → `text-aq-good` / `bg-aq-good-soft`
   - V5 surface paper → `bg-aq-surface` (white) or `bg-aq-bg` (off-white)
   - V5 zebra row → `bg-aq-zebra`

2. **If the design uses a brand color** (third-party SSO buttons, vendor logos) that isn't in the token set, render it via `style={{ backgroundColor: 'var(--color-aq-brand-microsoft)' }}` — wait, that's also lint-banned (color in inline style). The correct path: add the token under `aq-brand-<name>` in `tokens.css` + `globals.css`, then use `bg-aq-brand-microsoft`. We already have `aq-brand-microsoft` and `aq-brand-google` — add others on the same pattern.

3. **If the design uses a size that doesn't match a token** (e.g. 18px text between `md` 14 and `h2` 22): round DOWN, OR add the token if it recurs. Don't use `text-[18px]` — lint bans it.

4. **If the design uses opacity** (e.g. 10% black overlay): use Tailwind alpha syntax on existing tokens like `bg-aq-ink-panel/40` for a 40% panel — this is allowed. Do NOT write `rgba(0,0,0,0.4)`.

---

## Example PM brief (template)

After Phase 1 (intent read), structure your response like this:

```
# PM brief — <Design name>

## What the design asks for

`<file>.html` is **N artboards**, all rendered against a feature area
that <doesn't exist yet | extends an existing slice>:

| Page | Type | Source JSX |
|---|---|---|
| ... | ... | ... |

## Scope I'm calling

**Build:**
1. <feature slice> (new): `src/features/<slice>/`
2. <N routes for ...>
3. <fixtures>
4. <new primitives>
5. <new icons>
6. <nav updates>
7. <router>

**Out of scope** (intentionally — would be a separate prompt):
- ...

## Constraints carried over

- V5 design uses inline hex; we convert to `bg-aq-*` tokens
- No *.styles.ts, no inline color styles, no cross-feature imports
- Dev server stays on **5173** throughout — Vite HMR live
- All commits signed; **no push without `PUSH`**
- Build on top of `<branch>` (or new branch)

## Orchestration — 1 designer + 1 engineer

| Agent | Job |
|---|---|
| **Senior PD / IA architect** | <plan deliverable> |
| **Senior frontend engineer** | <build deliverable> |

After both: I smoke-test on 5173, commit signed, **STOP**, await `PUSH`.

Dispatching the designer now.
```

Then call `Agent` with `subagent_type: claude` (or `feature-dev:code-architect` if available) for the designer. Wait for the result. Then call another `Agent` for the engineer with the designer's plan inlined.

---

## Common engineer failures + retries

- **API overload mid-implementation.** When the engineer dies at 31+ tool uses, the foundation files have usually landed (data, primitives, icons). Spawn a CONTINUATION engineer with a sharper, smaller prompt covering only the remaining files. Tell it explicitly what's already on disk to consume vs build.
- **Stale Claude SDK worktree.** Engineers sometimes work in `.claude/worktrees/agent-<id>/` and leave it locked. Pollutes `npm run lint`. Force-remove with `git worktree remove ... -f -f` after the engineer reports done.
- **Engineer used arbitrary Tailwind values.** When the engineer worked from a stale base (before iteration-3 lint tightening), they used `text-[40px]`, `tracking-[-0.02em]`, etc. Sweep and replace with token aliases per the typography table above.
- **Husky lint-staged reformats classes.** Prettier-tailwind reorders className strings on commit — purely cosmetic; let it happen. Don't try to pre-order.

---

## What this skill explicitly does NOT do

- Does not push to the remote (per memory rule).
- Does not create PRs (per memory rule).
- Does not modify the build config (vite, eslint, package.json) unless the user explicitly asks.
- Does not invent design tokens — every value maps to an existing token unless the user asks to add one.
- Does not write the implementation in the main thread — always delegate to subagents.
- Does not skip the smoke test on 5173 — the user has explicitly told us the dev server must stay valid.

---

## Sanity check before invoking the engineer

Before spawning the engineer agent, verify:

- [ ] Designer plan is in your conversation (you read the agent result)
- [ ] You know which existing primitives/tokens the engineer will reuse
- [ ] You know which files are new and which are modified
- [ ] Dev server is up on 5173 (`curl localhost:5173` returns 200)
- [ ] Working tree has no unrelated uncommitted changes (those would land in your commit)

If any are missing, fix before dispatching. Don't let the engineer guess.
