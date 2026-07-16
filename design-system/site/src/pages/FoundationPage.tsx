import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { tokenGroups, type Token } from '../data';
import { CopyButton } from '../components/CopyButton';

function cssVar(t: Token): string {
  return t.$extensions?.['armoriq.cssVar'] ?? '';
}

// Curated, role-based grouping of the color tokens. Each group says WHAT it is
// for, so the page reads as guidance ("use this here") rather than a flat dump
// of 60+ swatches. `members` are token keys (without the aq- prefix). The
// everyday groups render up top; specialized palettes collapse behind a toggle.
type ColorGroup = { title: string; use: string; members: string[] };

const CORE_COLOR_GROUPS: ColorGroup[] = [
  {
    title: 'Surfaces',
    use: 'Backgrounds. bg = page, surface = cards/inputs, zebra = subtle row/section fill.',
    members: ['bg', 'surface', 'zebra'],
  },
  {
    title: 'Borders',
    use: 'Hairlines and dividers. border is the default; border-strong on hover / emphasis.',
    members: ['border', 'border-strong'],
  },
  {
    title: 'Text (ink)',
    use: 'The text hierarchy, strongest to faintest. ink = headings/body, ink-soft = secondary, ink-muted = captions, ink-faint = placeholders/chrome.',
    members: ['ink', 'ink-soft', 'ink-muted', 'ink-faint'],
  },
  {
    title: 'Accent',
    use: 'Orange is reserved for the ONE primary action + focus. accent = CTA/focus, accent-soft = grey selection wash, accent-strong = selected text, accent-wash/deep/line = the warm selection grammar.',
    members: [
      'accent',
      'accent-soft',
      'accent-strong',
      'accent-wash',
      'accent-deep',
      'accent-line',
    ],
  },
  {
    title: 'Status',
    use: 'Semantic states. Pair the solid tone (text/icon) with its -soft (tinted background): good/warn/bad/info.',
    members: ['good', 'good-soft', 'warn', 'warn-soft', 'bad', 'bad-soft', 'info', 'info-soft'],
  },
  {
    title: 'On dark',
    use: 'Text and hairlines on dark panels (sign-in pane, wizard cards). ink-panel = the dark surface; ink-on* = text on it.',
    members: [
      'ink-panel',
      'ink-on',
      'ink-on-soft',
      'ink-on-muted',
      'ink-on-tint',
      'ink-on-line',
      'ink-on-wash',
    ],
  },
];

const SPECIALIZED_COLOR_GROUPS: ColorGroup[] = [
  {
    title: 'AI & composer',
    use: 'The only gradient in the system (AI affordances) + the policy-composer card surfaces. Use only for AI authoring UI.',
    members: [
      'ai-from',
      'ai-to',
      'compose-well',
      'compose-send',
      'compose-ink',
      'compose-mention-mcp',
      'compose-mention-tool',
      'iris',
    ],
  },
  {
    title: 'Overlay & toast',
    use: 'Scrim behind modals/drawers and the floating toast surface. Theme-aware; you rarely set these directly.',
    members: ['scrim', 'toast-bg', 'toast-fg', 'toast-border'],
  },
  {
    title: 'Third-party brand',
    use: 'Vendor logo colors for SSO buttons only. Never for app chrome.',
    members: [
      'brand-microsoft',
      'brand-google',
      'brand-google-blue',
      'brand-google-yellow',
      'brand-google-red',
    ],
  },
  {
    title: 'Graph nodes',
    use: 'The AIQ graph encodes node TYPE by hue. Data channel, not decoration — only the graph uses these.',
    members: [
      'node-org',
      'node-framework',
      'node-agent',
      'node-server',
      'node-policy',
      'node-plan',
      'node-tool',
      'node-key',
      'node-bundle',
      'node-invocation',
      'node-governed',
    ],
  },
  {
    title: 'Graph edges',
    use: 'Relationship colors for graph edges (flow / auth / govern / secure / hot).',
    members: ['edge-flow', 'edge-auth', 'edge-govern', 'edge-secure', 'edge-hot'],
  },
];

const TITLES: Record<string, { title: string; lead: string }> = {
  color: {
    title: 'Color',
    lead: 'Grouped by role, with a note on where each set is used. Each swatch shows light (left) and dark (right) — click to copy the aq-* class. Orange accent is reserved for the single primary action; grey carries selection.',
  },
  typography: {
    title: 'Typography',
    lead: 'The V5 type scale in Geist. Size and line-height are paired so leading is locked.',
  },
  spacing: { title: 'Spacing', lead: "Half-step rungs added to Tailwind's 4px scale." },
  radius: { title: 'Radius', lead: 'Named corner radii beyond the Tailwind defaults.' },
  shadow: { title: 'Shadow', lead: 'Elevation tokens. Soft and restrained.' },
  motion: {
    title: 'Motion',
    lead: 'Durations and easings. Every animation uses these, never a raw value. Hover a card.',
  },
};

export function FoundationPage({ topic }: { topic: string }) {
  const groups = Object.fromEntries(tokenGroups());
  const entries = (groups[topic] ?? {}) as Record<string, Token>;
  const meta = TITLES[topic] ?? { title: topic, lead: '' };

  return (
    <div>
      <h1 className="text-aq-display tracking-aq-tight text-aq-ink font-semibold">{meta.title}</h1>
      <p className="text-aq-md text-aq-ink-muted mt-2 mb-8 max-w-2xl">{meta.lead}</p>

      {topic === 'color' && <ColorTopic entries={entries} />}

      {topic === 'typography' && <TypographyTopic entries={entries} />}

      {topic === 'spacing' && (
        <div className="space-y-2">
          {Object.entries(entries).map(([name, t]) => (
            <div key={name} className="flex items-center gap-4">
              <span className="text-aq-xs text-aq-ink-muted w-16 font-mono">{name}</span>
              <div className="rounded-aq-xs bg-aq-accent h-4" style={{ width: t.$value }} />
              <span className="text-aq-caption text-aq-ink-faint font-mono">{t.$value}</span>
            </div>
          ))}
        </div>
      )}

      {topic === 'radius' && (
        <div className="flex flex-wrap gap-4">
          {Object.entries(entries).map(([name, t]) => (
            <div key={name} className="text-center">
              <div
                className="border-aq-accent bg-aq-accent-wash h-16 w-16 border-2"
                style={{ borderRadius: t.$value }}
              />
              <div className="text-aq-caption text-aq-ink-muted mt-1.5 font-mono">{name}</div>
              <div className="text-aq-caption text-aq-ink-faint font-mono">{t.$value}</div>
            </div>
          ))}
        </div>
      )}

      {topic === 'shadow' && (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {Object.entries(entries).map(([name, t]) => (
            <div key={name} className="text-center">
              <div
                className="bg-aq-surface mx-auto h-20 w-full rounded-lg"
                style={{ boxShadow: t.$value }}
              />
              <div className="text-aq-caption text-aq-ink-muted mt-2 font-mono">aq-{name}</div>
            </div>
          ))}
        </div>
      )}

      {topic === 'motion' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Object.entries(entries).map(([name, t]) => {
            const isDuration = t.$type === 'duration';
            return (
              <div
                key={name}
                className="group border-aq-border bg-aq-surface rounded-lg border p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-aq-xs text-aq-ink font-mono font-medium">aq-{name}</span>
                  <span className="text-aq-caption text-aq-ink-faint font-mono">{t.$value}</span>
                </div>
                <div className="bg-aq-zebra h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-aq-accent h-full w-1/3 rounded-full transition-transform group-hover:translate-x-[200%]"
                    style={{
                      transitionDuration: isDuration ? t.$value : '320ms',
                      transitionTimingFunction: isDuration ? undefined : t.$value,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- color topic ----------------------------- */

function ColorSwatch({ name, token }: { name: string; token: Token }) {
  const dark = token.$extensions?.['armoriq.dark'];
  return (
    <div className="border-aq-border bg-aq-surface overflow-hidden rounded-lg border">
      <div className="flex h-14">
        <div className="flex-1" style={{ background: `var(${cssVar(token)})` }} title="light" />
        {dark && (
          <div
            className="border-aq-border flex-1 border-l"
            style={{ background: dark }}
            title="dark"
          />
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-2.5 py-2">
        <div className="min-w-0">
          <div className="text-aq-xs text-aq-ink truncate font-mono font-medium">aq-{name}</div>
          <div className="text-aq-caption text-aq-ink-muted truncate font-mono">{token.$value}</div>
        </div>
        <CopyButton text={`aq-${name}`} label="" />
      </div>
    </div>
  );
}

function ColorGroupBlock({
  group,
  entries,
}: {
  group: ColorGroup;
  entries: Record<string, Token>;
}) {
  const members = group.members.filter((m) => entries[m]);
  if (!members.length) return null;
  return (
    <section className="mb-9">
      <h2 className="text-aq-md text-aq-ink font-semibold">{group.title}</h2>
      <p className="text-aq-sm text-aq-ink-muted mt-0.5 mb-3 max-w-2xl">{group.use}</p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {members.map((m) => (
          <ColorSwatch key={m} name={m} token={entries[m]} />
        ))}
      </div>
    </section>
  );
}

/* ----------------------------- typography topic ----------------------------- */

function TypographyTopic({ entries }: { entries: Record<string, Token> }) {
  return (
    <div>
      <section className="mb-9">
        <h2 className="text-aq-md text-aq-ink font-semibold">Geist — body &amp; UI scale</h2>
        <p className="text-aq-sm text-aq-ink-muted mt-0.5 mb-4 max-w-2xl">
          Every text size in the product. Size and line-height are paired so leading is locked. Use
          the <code className="text-aq-accent-deep font-mono">text-aq-*</code> aliases, never raw
          pixel sizes.
        </p>
        <div className="space-y-3">
          {Object.entries(entries).map(([name, t]) => {
            const lh = t.$extensions?.['armoriq.lineHeight'];
            return (
              <div
                key={name}
                className="border-aq-border flex items-baseline justify-between gap-4 border-b pb-3"
              >
                <span
                  className="text-aq-ink truncate"
                  style={{ fontSize: t.$value, lineHeight: lh ?? undefined }}
                >
                  The quick brown fox
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-aq-caption text-aq-ink-muted font-mono">
                    text-aq-{name} · {t.$value}
                    {lh ? ` / ${lh}` : ''}
                  </span>
                  <CopyButton text={`text-aq-${name}`} label="" />
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-9">
        <h2 className="text-aq-md text-aq-ink font-semibold">Sunflower — display numerals</h2>
        <p className="text-aq-sm text-aq-ink-muted mt-0.5 mb-4 max-w-2xl">
          The display face (<code className="text-aq-accent-deep font-mono">font-display</code>) is
          reserved for large hero numerals only — KPI readouts, the compliance gauge score, and the
          identity strip. It is NOT used for body, labels, or anything small. Pattern:{' '}
          <code className="text-aq-accent-deep font-mono">
            font-display text-aq-display tracking-aq-tight font-bold
          </code>
          .
        </p>
        <div className="border-aq-border bg-aq-surface flex flex-wrap items-end gap-10 rounded-lg border p-6">
          {[
            { n: '84', cap: 'gauge score' },
            { n: '1.28M', cap: 'KPI value' },
            { n: '99.9%', cap: 'identity stat' },
          ].map((d) => (
            <div key={d.cap} className="text-center">
              <div
                className="text-aq-ink leading-none font-bold"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-aq-hero)',
                  letterSpacing: 'var(--tracking-aq-tight)',
                }}
              >
                {d.n}
              </div>
              <div className="text-aq-caption text-aq-ink-muted mt-2">{d.cap}</div>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <CopyButton text="font-display" label="Copy font-display" />
        </div>
      </section>
    </div>
  );
}

function ColorTopic({ entries }: { entries: Record<string, Token> }) {
  const [showSpecialized, setShowSpecialized] = useState(false);
  return (
    <div>
      {CORE_COLOR_GROUPS.map((g) => (
        <ColorGroupBlock key={g.title} group={g} entries={entries} />
      ))}

      <button
        type="button"
        onClick={() => setShowSpecialized((s) => !s)}
        className="border-aq-border text-aq-sm text-aq-ink-soft hover:border-aq-border-strong mt-2 mb-6 flex items-center gap-1.5 rounded-md border px-3 py-2 font-medium transition"
      >
        <ChevronRight
          size={14}
          className={`transition-transform ${showSpecialized ? 'rotate-90' : ''}`}
        />
        {showSpecialized ? 'Hide' : 'Show'} specialized palettes (AI, graph, brand, overlay)
      </button>

      {showSpecialized && (
        <div>
          {SPECIALIZED_COLOR_GROUPS.map((g) => (
            <ColorGroupBlock key={g.title} group={g} entries={entries} />
          ))}
        </div>
      )}
    </div>
  );
}
