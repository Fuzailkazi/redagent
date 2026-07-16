import { useMemo, useState } from 'react';
import { components, CATEGORY_ORDER, CATEGORY_LABEL, type ComponentSpec } from '../data';
import { PREVIEWS } from '../preview/registry';
import { SECTIONS } from '../preview/sections';
import { TierBadge } from '../components/chrome';

/**
 * Components index — a filterable gallery of every component, grouped by
 * category, each tile a mini live preview that links to the full page. The
 * visual browse the sidebar can't give.
 *
 * Tiles render the real preview scaled down and clipped (pointer-events off) so
 * the grid reads as a contact sheet without 60 interactive widgets fighting for
 * focus. Click anything to open its page.
 */
export function ComponentsIndex() {
  const [q, setQ] = useState('');

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const match = (c: ComponentSpec) =>
      !needle || `${c.name} ${c.summary} ${c.category}`.toLowerCase().includes(needle);
    return CATEGORY_ORDER.map((cat) => ({
      cat,
      label: CATEGORY_LABEL[cat] ?? cat,
      items: components.filter((c) => c.category === cat && match(c)),
    })).filter((g) => g.items.length > 0);
  }, [q]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div>
      <h1 className="text-aq-display text-aq-ink tracking-aq-tight font-semibold">Components</h1>
      <p className="text-aq-md text-aq-ink-muted mt-2 mb-6 max-w-2xl">
        Every primitive and product section, rendered live. Filter, then click any tile to open its
        page with props, tokens, and copyable import.
      </p>

      <div className="bg-aq-bg/85 border-aq-border sticky top-0 z-20 -mx-10 mb-8 border-b px-10 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter components…"
            className="border-aq-border bg-aq-surface text-aq-sm text-aq-ink focus:border-aq-accent h-9 w-72 rounded-md border px-3 transition outline-none"
          />
          <span className="text-aq-caption text-aq-ink-muted tabular-nums">{total} shown</span>
        </div>
      </div>

      {groups.length === 0 && (
        <p className="text-aq-sm text-aq-ink-muted py-10 text-center">No components match “{q}”.</p>
      )}

      <div className="space-y-10">
        {groups.map((g) => (
          <section key={g.cat}>
            <div className="mb-3 flex items-baseline gap-2">
              <h2 className="text-aq-md text-aq-ink font-semibold">{g.label}</h2>
              <span className="text-aq-caption text-aq-ink-faint tabular-nums">
                {g.items.length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((c) => (
                <IndexTile key={c.name} spec={c} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function IndexTile({ spec }: { spec: ComponentSpec }) {
  const Preview = SECTIONS[spec.name] ?? PREVIEWS[spec.name];
  return (
    <a
      href={`#/c/${spec.name}`}
      className="group border-aq-border bg-aq-surface hover:border-aq-border-strong hover:shadow-aq-card block overflow-hidden rounded-lg border transition"
    >
      {/* mini preview: scaled, clipped, non-interactive */}
      <div className="bg-aq-bg relative h-32 overflow-hidden">
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 origin-center"
          style={{ transform: 'translate(-50%, -50%) scale(0.62)', width: '150%' }}
        >
          <div className="flex items-center justify-center">{Preview ? <Preview /> : null}</div>
        </div>
      </div>
      <div className="border-aq-border flex items-center justify-between gap-2 border-t px-3.5 py-2.5">
        <span className="text-aq-sm text-aq-ink truncate font-medium">{spec.name}</span>
        <TierBadge tier={spec.tier} />
      </div>
    </a>
  );
}
