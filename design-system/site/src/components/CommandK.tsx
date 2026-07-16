import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { components, tokenGroups } from '../data';

type HitKind = 'component' | 'section' | 'token';
type Hit = { kind: HitKind; label: string; sub: string; href: string };

const KIND_LABEL: Record<HitKind, string> = {
  component: 'Component',
  section: 'Section',
  token: 'Token',
};
const KIND_RANK: Record<HitKind, number> = { component: 0, section: 1, token: 2 };

/** Cmd/Ctrl-K command palette: search components + tokens, Enter to jump. */
export function CommandK({ onNavigate }: { onNavigate: (href: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Map a token group to its foundations route topic. Groups the catalog has a
  // dedicated page for jump there; everything else falls back to color.
  const FOUNDATION_TOPIC: Record<string, string> = {
    color: 'color',
    typography: 'typography',
    spacing: 'spacing',
    radius: 'radius',
    shadow: 'shadow',
    motion: 'motion',
  };

  const index = useMemo<Hit[]>(() => {
    const out: Hit[] = components.map((c) => ({
      kind: c.category === 'sections' ? 'section' : 'component',
      label: c.name,
      sub: c.summary,
      // current per-component route scheme
      href: `#/c/${c.name}`,
    }));
    for (const [group, entries] of tokenGroups()) {
      const topic = FOUNDATION_TOPIC[group] ?? 'color';
      for (const [key, t] of Object.entries(entries)) {
        out.push({
          kind: 'token',
          label: `${group}.${key}`,
          sub: t.$value,
          href: `#/foundations/${topic}`,
        });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const results = useMemo(() => {
    if (!q.trim()) return index.slice(0, 8);
    const needle = q.toLowerCase();
    // Rank by relevance: exact name (0) < name prefix (1) < name substring (2)
    // < summary/value substring (3). Components outrank tokens at equal rank so
    // a search for "Button" lands on the Button component first.
    const scored = index
      .map((h) => {
        const label = h.label.toLowerCase();
        let score = 99;
        if (label === needle) score = 0;
        else if (label.startsWith(needle)) score = 1;
        else if (label.includes(needle)) score = 2;
        else if (h.sub.toLowerCase().includes(needle)) score = 3;
        // Tie-break by kind: components, then sections, then tokens.
        return { h, score: score + KIND_RANK[h.kind] * 0.2 };
      })
      .filter((s) => s.score < 99)
      .sort((a, b) => a.score - b.score);
    return scored.slice(0, 20).map((s) => s.h);
  }, [q, index]);

  // Reset selection to the top result whenever the query changes, so Enter
  // always picks the best-ranked match unless the user has arrowed down since.
  useEffect(() => {
    setActive(0);
  }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      window.setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="bg-aq-scrim fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="ds-fade-in rounded-aq-2xl border-aq-border bg-aq-surface shadow-aq-panel w-full max-w-xl overflow-hidden border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-aq-border flex items-center gap-2 border-b px-3.5">
          <Search size={16} className="text-aq-ink-faint" strokeWidth={1.8} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, results.length - 1));
              if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0));
              if (e.key === 'Enter') {
                const pick = results[active] ?? results[0];
                if (pick) {
                  onNavigate(pick.href);
                  setOpen(false);
                }
              }
            }}
            placeholder="Search components, sections, and tokens…"
            className="text-aq-md text-aq-ink placeholder:text-aq-ink-faint h-12 w-full bg-transparent outline-none"
          />
          <kbd className="rounded-aq-xs border-aq-border text-aq-caption text-aq-ink-faint border px-1.5 py-0.5">
            esc
          </kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-1.5">
          {results.length === 0 && (
            <p className="text-aq-sm text-aq-ink-muted px-3 py-6 text-center">No matches.</p>
          )}
          {results.map((h, i) => (
            <button
              key={h.kind + h.label}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => {
                onNavigate(h.href);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition ${
                i === active ? 'bg-aq-accent-soft' : ''
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="text-aq-sm text-aq-ink block truncate font-medium">{h.label}</span>
                <span className="text-aq-caption text-aq-ink-muted block truncate">{h.sub}</span>
              </span>
              <span
                className={`rounded-aq-xs text-aq-caption shrink-0 border px-1.5 py-0.5 font-medium ${
                  h.kind === 'section'
                    ? 'border-aq-accent-line bg-aq-accent-wash text-aq-accent-deep'
                    : h.kind === 'token'
                      ? 'border-aq-border bg-aq-zebra text-aq-ink-faint'
                      : 'border-aq-border bg-aq-surface text-aq-ink-muted'
                }`}
              >
                {KIND_LABEL[h.kind]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
