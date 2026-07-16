import { useState, type ComponentType } from 'react';
import * as Icons from '@shared/icons';
import type { IconProps } from '@shared/icons';

export function IconsPage() {
  const [q, setQ] = useState('');
  const entries = Object.entries(Icons).filter(
    ([name, val]) => name.startsWith('Icon') && typeof val === 'function'
  ) as Array<[string, ComponentType<IconProps>]>;
  const filtered = entries.filter(([n]) => n.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <h1 className="text-aq-display tracking-aq-tight text-aq-ink font-semibold">Icons</h1>
      <p className="text-aq-md text-aq-ink-muted mt-2 mb-6 max-w-2xl">
        The {entries.length} monoline icons, consumed via the{' '}
        <code className="text-aq-accent-deep font-mono">Icon</code> primitive. Click any to copy its
        component name.
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`Filter ${entries.length} icons…`}
        className="border-aq-border bg-aq-surface text-aq-sm text-aq-ink focus:border-aq-accent mb-5 h-9 w-64 rounded-md border px-3 outline-none"
      />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
        {filtered.map(([name, Ico]) => (
          <button
            key={name}
            type="button"
            onClick={() => navigator.clipboard?.writeText(name)}
            title={`Copy ${name}`}
            className="border-aq-border bg-aq-surface text-aq-ink-soft hover:border-aq-border-strong hover:text-aq-ink flex flex-col items-center gap-1.5 rounded-lg border p-3 transition"
          >
            <Ico size={18} />
            <span className="text-aq-caption text-aq-ink-faint w-full truncate text-center font-mono">
              {name.replace('Icon', '')}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
