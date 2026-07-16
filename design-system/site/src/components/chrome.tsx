import type { ReactNode } from 'react';
import { CopyButton } from './CopyButton';
import type { PropSpec } from '../data';

/** Page header: large title + lead paragraph. */
export function PageHead({ title, lead }: { title: string; lead?: string }) {
  return (
    <header className="border-aq-border mb-8 border-b pb-6">
      <h1 className="text-aq-display tracking-aq-tight text-aq-ink font-semibold">{title}</h1>
      {lead && <p className="text-aq-md text-aq-ink-muted mt-2 max-w-2xl">{lead}</p>}
    </header>
  );
}

/** A titled section within a page, with an anchor for the sticky sub-nav. */
export function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 py-7">
      <div className="mb-4">
        <h2 className="text-aq-stat tracking-aq-tight text-aq-ink font-semibold">{title}</h2>
        {description && (
          <p className="text-aq-sm text-aq-ink-muted mt-1 max-w-2xl">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

/** A bordered surface card. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`border-aq-border bg-aq-surface shadow-aq-card rounded-lg border ${className}`}>
      {children}
    </div>
  );
}

/** Monospace code block with a copy button. */
export function CodeBlock({ code, lang = 'tsx' }: { code: string; lang?: string }) {
  return (
    <div className="group border-aq-border bg-aq-zebra relative overflow-hidden rounded-lg border">
      <div className="border-aq-border flex items-center justify-between border-b px-3 py-1.5">
        <span className="text-aq-caption tracking-aq-wider text-aq-ink-faint font-medium uppercase">
          {lang}
        </span>
        <CopyButton text={code} />
      </div>
      <pre className="text-aq-xs text-aq-ink-soft overflow-x-auto p-3 leading-relaxed">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}

/** Props table rendered from a component's manifest props. */
export function PropsTable({ props }: { props: PropSpec[] }) {
  if (!props?.length) return <p className="text-aq-sm text-aq-ink-muted">No documented props.</p>;
  return (
    <div className="border-aq-border overflow-x-auto rounded-lg border">
      <table className="text-aq-sm w-full border-collapse text-left">
        <thead>
          <tr className="border-aq-border bg-aq-zebra text-aq-caption tracking-aq-wide text-aq-ink-faint border-b uppercase">
            <th className="px-3 py-2 font-semibold">Prop</th>
            <th className="px-3 py-2 font-semibold">Type</th>
            <th className="px-3 py-2 font-semibold">Default</th>
            <th className="px-3 py-2 font-semibold">Description</th>
          </tr>
        </thead>
        <tbody>
          {props.map((p) => (
            <tr key={p.name} className="border-aq-border border-b align-top last:border-0">
              <td className="text-aq-xs text-aq-ink px-3 py-2 font-mono font-medium whitespace-nowrap">
                {p.name}
              </td>
              <td className="text-aq-xs text-aq-accent-deep px-3 py-2 font-mono">{p.type}</td>
              <td className="text-aq-xs text-aq-ink-muted px-3 py-2 font-mono whitespace-nowrap">
                {p.default ?? '—'}
              </td>
              <td className="text-aq-ink-soft px-3 py-2">{p.description ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Small pill showing a token name; click to copy. */
export function TokenPill({ name }: { name: string }) {
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard?.writeText(name)}
      className="rounded-aq-xs border-aq-border bg-aq-zebra text-aq-caption text-aq-ink-muted hover:border-aq-border-strong hover:text-aq-ink-soft border px-1.5 py-0.5 font-mono transition"
      title="Copy token"
    >
      {name}
    </button>
  );
}

/** Tier badge. */
export function TierBadge({ tier }: { tier: 1 | 2 | 3 }) {
  const map = {
    1: { label: 'Core', cls: 'bg-aq-accent-wash text-aq-accent-deep border-aq-accent-line' },
    2: { label: 'Extended', cls: 'bg-aq-info-soft text-aq-info border-transparent' },
    3: { label: 'Complex', cls: 'bg-aq-zebra text-aq-ink-muted border-aq-border' },
  } as const;
  const t = map[tier];
  return (
    <span className={`rounded-aq-xs text-aq-caption border px-1.5 py-0.5 font-semibold ${t.cls}`}>
      {t.label}
    </span>
  );
}
