import { useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  ListToolbar,
  ListRow,
  Avatar,
  StatusBadge,
  FormField,
  Button,
  PageState,
  Banner,
  StatusChip,
} from '@shared/ui';
import { CodeBlock } from '../components/chrome';

function Example({ title, children, code }: { title: string; children: ReactNode; code: string }) {
  const [showCode, setShowCode] = useState(false);
  return (
    <section className="mb-8">
      <h2 className="text-aq-md text-aq-ink mb-3 font-semibold">{title}</h2>
      <div className="border-aq-border bg-aq-surface rounded-lg border p-6">{children}</div>
      <button
        type="button"
        onClick={() => setShowCode((s) => !s)}
        className="text-aq-caption text-aq-ink-muted hover:text-aq-ink-soft mt-2 flex items-center gap-1.5 font-medium"
      >
        <ChevronRight size={12} className={`transition-transform ${showCode ? 'rotate-90' : ''}`} />
        {showCode ? 'Hide code' : 'View code'}
      </button>
      {showCode && (
        <div className="mt-2">
          <CodeBlock code={code} lang="tsx" />
        </div>
      )}
    </section>
  );
}

const PATTERNS: Record<
  string,
  { title: string; lead: string; render: () => ReactNode; code: string }
> = {
  'list-toolbar': {
    title: 'List + toolbar',
    lead: 'The shape of every collection screen: a toolbar (tabs + search + view + count) above a stack of rows.',
    render: () => <ListToolbarPattern />,
    code: `<ListToolbar
  tabs={{ value, onChange, items }}
  search={{ value, onChange }}
  view={{ value, onChange }}
  count={{ shown, total, noun: 'keys' }}
/>
{rows.map((r) => (
  <ListRow key={r.id} title={r.name} meta={r.meta}
    leading={<Avatar name={r.name} />}
    trailing={<StatusBadge tone={r.tone} label={r.status} />} />
))}`,
  },
  forms: {
    title: 'Forms',
    lead: 'Wrap each control in FormField; submit with a primary Button. Validation lives on the field.',
    render: () => <FormPattern />,
    code: `<FormField label="Workspace name" helper="Shown to everyone.">
  <input className="…" />
</FormField>
<FormField label="Slug" error={errors.slug}>
  <input className="…" />
</FormField>
<Button variant="primary">Create workspace</Button>`,
  },
  'page-states': {
    title: 'Page states',
    lead: 'One PageState primitive covers empty, loading, error, and denied — consistent across every screen.',
    render: () => <PageStatePattern />,
    code: `<PageState state="empty" headline="No API keys yet"
  body="Create your first key to start calling the API."
  cta={<Button variant="primary">Create key</Button>} />`,
  },
  modality: {
    title: 'Modality',
    lead: 'Modal for focused confirmation; SideModal for a peek drawer; Popover for anchored menus. Pick by weight.',
    render: () => <ModalityPattern />,
    code: `// focused decision -> Modal
// quick inspection -> SideModal
// anchored actions  -> Popover + Menu`,
  },
  status: {
    title: 'Status & feedback',
    lead: 'StatusBadge for steady state, Banner for page-level notices, StatusChip for transient confirmations.',
    render: () => <StatusPattern />,
    code: `<StatusBadge tone="good" label="Active" />
<Banner tone="warn">Your trial ends in 3 days.</Banner>
<StatusChip message="Changes saved" tone="good" />`,
  },
};

function ListToolbarPattern() {
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('list');
  const rows = [
    {
      id: '1',
      name: 'Production key',
      meta: 'Used 2h ago',
      tone: 'good' as const,
      status: 'Active',
    },
    { id: '2', name: 'Staging key', meta: 'Used 3d ago', tone: 'neutral' as const, status: 'Idle' },
  ];
  return (
    <div>
      <ListToolbar
        tabs={{
          value: tab,
          onChange: setTab,
          items: [
            { key: 'all', label: 'All' },
            { key: 'active', label: 'Active' },
          ],
        }}
        search={{ value: q, onChange: setQ, placeholder: 'Search…' }}
        view={{ value: view, onChange: setView }}
        count={{ shown: 2, total: 2, noun: 'keys' }}
      />
      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <ListRow
            key={r.id}
            title={r.name}
            meta={r.meta}
            leading={<Avatar name={r.name} size={28} />}
            trailing={<StatusBadge tone={r.tone} label={r.status} />}
          />
        ))}
      </div>
    </div>
  );
}

function FormPattern() {
  return (
    <div className="max-w-md space-y-4">
      <FormField label="Workspace name" helper="Shown to everyone in the org.">
        <input
          className="border-aq-border bg-aq-surface text-aq-sm text-aq-ink focus:border-aq-accent h-9 w-full rounded-md border px-3 outline-none"
          defaultValue="Acme Inc."
        />
      </FormField>
      <FormField label="Slug" error="This slug is already taken.">
        <input
          className="border-aq-border bg-aq-surface text-aq-sm text-aq-ink focus:border-aq-accent h-9 w-full rounded-md border px-3 outline-none"
          defaultValue="acme"
        />
      </FormField>
      <Button variant="primary">Create workspace</Button>
    </div>
  );
}

function PageStatePattern() {
  return (
    <PageState
      state="empty"
      headline="No API keys yet"
      body="Create your first key to start calling the API."
      cta={<Button variant="primary">Create key</Button>}
    />
  );
}

function ModalityPattern() {
  return (
    <div className="text-aq-sm text-aq-ink-soft space-y-2">
      <p>Focused decision (delete, confirm) -&gt; Modal.</p>
      <p>Quick inspection without leaving the list -&gt; SideModal peek drawer.</p>
      <p>Anchored actions on a row -&gt; Popover + Menu.</p>
      <p className="text-aq-ink-muted">See the Overlay components for live demos of each.</p>
    </div>
  );
}

function StatusPattern() {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <StatusBadge tone="good" label="Active" />
        <StatusBadge tone="warn" label="Pending" />
        <StatusBadge tone="bad" label="Revoked" />
      </div>
      <Banner tone="warn">Your trial ends in 3 days.</Banner>
      <StatusChip message="Changes saved" tone="good" />
    </div>
  );
}

export function PatternPage({ slug }: { slug: string }) {
  const p = PATTERNS[slug];
  if (!p) return <p className="text-aq-sm text-aq-ink-muted">Unknown pattern: {slug}</p>;
  return (
    <div>
      <h1 className="text-aq-display tracking-aq-tight text-aq-ink font-semibold">{p.title}</h1>
      <p className="text-aq-md text-aq-ink-muted mt-2 mb-8 max-w-2xl">{p.lead}</p>
      <Example title="Example" code={p.code}>
        {p.render()}
      </Example>
    </div>
  );
}
