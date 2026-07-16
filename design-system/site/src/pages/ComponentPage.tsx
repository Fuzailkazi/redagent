import { useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { components } from '../data';
import { PREVIEWS } from '../preview/registry';
import { SECTIONS } from '../preview/sections';
import { PropsTable, CodeBlock, TokenPill, TierBadge } from '../components/chrome';
import { CopyButton } from '../components/CopyButton';

function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-aq-border overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="bg-aq-zebra text-aq-sm text-aq-ink-soft hover:text-aq-ink flex w-full items-center gap-2 px-4 py-2.5 text-left font-medium transition"
      >
        <ChevronRight
          size={14}
          className={`transition-transform ${open ? 'rotate-90' : ''}`}
          strokeWidth={2}
        />
        {title}
      </button>
      {open && <div className="border-aq-border border-t p-4">{children}</div>}
    </div>
  );
}

export function ComponentPage({ name }: { name: string }) {
  const spec = components.find((c) => c.name === name);
  if (!spec) {
    return <p className="text-aq-sm text-aq-ink-muted">Unknown component: {name}</p>;
  }
  // Prefer the real composed product section (verbatim feature code) when one
  // exists; otherwise fall back to the isolated primitive preview.
  const Preview = SECTIONS[spec.name] ?? PREVIEWS[spec.name];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_180px] gap-10">
      <div className="min-w-0">
        {/* breadcrumb */}
        <nav className="text-aq-caption text-aq-ink-faint mb-3 flex items-center gap-1.5">
          <a href="#/intro" className="hover:text-aq-ink-soft">
            Components
          </a>
          <ChevronRight size={11} />
          <span className="capitalize">{spec.category.replace('-', ' ')}</span>
          <ChevronRight size={11} />
          <span className="text-aq-ink-soft">{spec.name}</span>
        </nav>

        {/* title */}
        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-aq-display tracking-aq-tight text-aq-ink font-semibold">
            {spec.name}
          </h1>
          <TierBadge tier={spec.tier} />
        </div>
        <p className="text-aq-md text-aq-ink-muted -mt-4 mb-6 max-w-2xl">{spec.summary}</p>

        {/* hero preview */}
        <section id="preview" className="scroll-mt-20">
          {Preview ? (
            <Preview />
          ) : (
            <div className="border-aq-border bg-aq-zebra text-aq-sm text-aq-ink-muted rounded-lg border border-dashed p-8 text-center">
              Preview unavailable.
            </div>
          )}
        </section>

        {/* import */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <h2 className="text-aq-caption tracking-aq-wide text-aq-ink-faint font-semibold uppercase">
            Import
          </h2>
          <CopyButton text={spec.import} label="Copy import" />
        </div>
        <div className="mt-2">
          <CodeBlock code={spec.import} lang="tsx" />
        </div>

        {/* usage */}
        <section id="usage" className="mt-8 scroll-mt-20">
          <h2 className="text-aq-md text-aq-ink mb-1.5 font-semibold">When to reach for it</h2>
          <p className="text-aq-sm text-aq-ink-soft">{spec.whenToReachFor}</p>
          <p className="text-aq-sm text-aq-ink-muted mt-1.5 max-w-2xl">{spec.usage}</p>
        </section>

        {/* details (progressive disclosure) */}
        <section id="props" className="mt-8 scroll-mt-20 space-y-3">
          <Disclosure title={`Props (${spec.props.length})`}>
            <PropsTable props={spec.props} />
          </Disclosure>
          <Disclosure title={`Tokens (${spec.tokens.length})`}>
            <div className="flex flex-wrap gap-1.5">
              {spec.tokens.map((t) => (
                <TokenPill key={t} name={t} />
              ))}
            </div>
          </Disclosure>
        </section>

        {/* agent footer */}
        <footer className="border-aq-border text-aq-caption text-aq-ink-faint mt-10 border-t pt-4">
          <span className="font-mono">{spec.source}</span>
          <span className="mx-2">·</span>
          In <code className="text-aq-ink-muted font-mono">components.json</code> for agents —{' '}
          <a href="#/skill" className="text-aq-accent-deep hover:text-aq-accent">
            see the skill
          </a>
          .
        </footer>
      </div>

      {/* right rail TOC */}
      <aside className="sticky top-4 hidden h-fit lg:block">
        <div className="text-aq-caption tracking-aq-wider text-aq-ink-faint mb-2 font-semibold uppercase">
          On this page
        </div>
        <nav className="text-aq-sm space-y-1.5">
          <a href="#preview" className="text-aq-ink-muted hover:text-aq-ink-soft block">
            Preview
          </a>
          <a href="#usage" className="text-aq-ink-muted hover:text-aq-ink-soft block">
            Usage
          </a>
          <a href="#props" className="text-aq-ink-muted hover:text-aq-ink-soft block">
            Props &amp; tokens
          </a>
        </nav>
      </aside>
    </div>
  );
}
