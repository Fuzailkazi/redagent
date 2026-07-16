/**
 * Live-preview registry — one entry per @shared/ui primitive. Every one of the
 * 50 components renders the REAL component, via one of three strategies:
 *   - inline:   rendered directly on the preview stage
 *   - trigger:  a button mounts the real (controlled) component (Modal, Popover…)
 *   - launch:   a button opens the real component in an overlay sandbox (canvas)
 *
 * No component is left as a "see source" placeholder. Each preview is a small
 * self-contained component with its own state where needed.
 */
import { useRef, useState, type ReactNode } from 'react';
import {
  Button,
  Chip,
  StatusBadge,
  StatusChip,
  Banner,
  Toggle,
  SegmentedControl,
  Avatar,
  OrgAvatar,
  // SandboxPill is not re-exported from the @shared/ui barrel; import its subpath.
  Breadcrumb,
  Stepper,
  PageState,
  SearchField,
  FormField,
  SectionHeader,
  Tooltip,
  Tabs,
  TabRail,
  ListRow,
  SettingCard,
  ViewToggle,
  SortControl,
  Collapsible,
  GradientButton,
  UploadTarget,
  OTPInput,
  PasswordStrengthMeter,
  DesktopRecommendedBanner,
  BrandIcon,
  Shimmer,
  AnimatedNumber,
  TextSwap,
  IconSwap,
  MatrixLoader,
  IapCard,
  Modal,
  SideModal,
  Popover,
  Menu,
  MenuItem,
  CommandPalette,
  WelcomeDialog,
  ProductTour,
  BottomSheet,
  DataCard,
  ListToolbar,
  TabToolbar,
  CanvasModal,
  CanvasDetailCard,
  GraphNodeShape,
} from '@shared/ui';
import { IconSearch, IconBell, IconCheck, IconUsers, IconSettings, IconTrash } from '@shared/icons';
import { SandboxPill } from '@shared/ui/SandboxPill';
import { ReactFlowProvider } from '@xyflow/react';

/* ----------------------------- controls ----------------------------- */

export function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="border-aq-border bg-aq-bg inline-flex flex-wrap gap-1 rounded-md border p-1">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`rounded-aq-xs text-aq-caption px-2 py-0.5 font-medium transition ${
            value === o
              ? 'bg-aq-accent-soft text-aq-accent-strong'
              : 'text-aq-ink-muted hover:text-aq-ink-soft'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

export function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="text-aq-caption text-aq-ink-soft inline-flex cursor-pointer items-center gap-1.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-aq-accent"
      />
      {label}
    </label>
  );
}

function Controls({ children }: { children: ReactNode }) {
  return <div className="mt-3 flex flex-wrap items-center gap-3">{children}</div>;
}

function TriggerNote({ children }: { children: ReactNode }) {
  return <div className="flex min-h-28 items-center justify-center">{children}</div>;
}

/* ----------------------------- actions ----------------------------- */

function ButtonPreview() {
  const [variant, setVariant] = useState<
    'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger' | 'dangerSoft'
  >('primary');
  const [size, setSize] = useState<'xs' | 'sm' | 'md'>('md');
  const [loading, setLoading] = useState(false);
  return (
    <div>
      <Stage>
        <Button variant={variant} size={size} loading={loading}>
          Button label
        </Button>
      </Stage>
      <Controls>
        <Seg
          value={variant}
          onChange={setVariant}
          options={['primary', 'secondary', 'tertiary', 'ghost', 'danger', 'dangerSoft']}
        />
        <Seg value={size} onChange={setSize} options={['xs', 'sm', 'md']} />
        <Check label="loading" checked={loading} onChange={setLoading} />
      </Controls>
    </div>
  );
}

function GradientButtonPreview() {
  const [loading, setLoading] = useState(false);
  return (
    <div>
      <Stage>
        <GradientButton loading={loading}>Generate with AI</GradientButton>
      </Stage>
      <Controls>
        <Check label="loading" checked={loading} onChange={setLoading} />
      </Controls>
    </div>
  );
}

/* ----------------------------- inputs ----------------------------- */

function SearchFieldPreview() {
  const [v, setV] = useState('');
  return (
    <Stage block>
      <SearchField value={v} onChange={setV} placeholder="Search members…" />
    </Stage>
  );
}

function FormFieldPreview() {
  const [err, setErr] = useState(false);
  return (
    <div>
      <Stage block>
        <FormField
          label="Workspace name"
          helper="Shown to everyone in the org."
          error={err ? 'This name is already taken.' : undefined}
        >
          <input
            className="border-aq-border bg-aq-surface text-aq-sm text-aq-ink focus:border-aq-accent h-9 w-full rounded-md border px-3 outline-none"
            placeholder="Acme Inc."
          />
        </FormField>
      </Stage>
      <Controls>
        <Check label="error state" checked={err} onChange={setErr} />
      </Controls>
    </div>
  );
}

function TogglePreview() {
  const [on, setOn] = useState(true);
  return (
    <Stage>
      <div className="flex items-center gap-4">
        <Toggle checked={on} onChange={setOn} size="sm" />
        <Toggle checked={on} onChange={setOn} size="md" />
      </div>
    </Stage>
  );
}

function SegmentedPreview() {
  const [val, setVal] = useState('list');
  return (
    <Stage>
      <SegmentedControl
        value={val}
        onChange={setVal}
        options={[
          { value: 'list', label: 'List' },
          { value: 'grid', label: 'Grid' },
          { value: 'graph', label: 'Graph' },
        ]}
      />
    </Stage>
  );
}

function ViewTogglePreview() {
  const [v, setV] = useState<'grid' | 'list'>('list');
  return (
    <Stage>
      <ViewToggle value={v} onChange={setV} />
    </Stage>
  );
}

function SortControlPreview() {
  const [key, setKey] = useState('name');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  return (
    <Stage>
      <SortControl
        value={key}
        direction={dir}
        onChange={(k, d) => {
          setKey(k);
          setDir(d);
        }}
        options={[
          { value: 'name', label: 'Name' },
          { value: 'created', label: 'Created' },
          { value: 'risk', label: 'Risk' },
        ]}
      />
    </Stage>
  );
}

function OTPInputPreview() {
  const [v, setV] = useState('');
  return (
    <Stage>
      <OTPInput value={v} onChange={setV} length={6} />
    </Stage>
  );
}

function PasswordStrengthPreview() {
  const [pw, setPw] = useState('Tr0ub4dour&3');
  return (
    <div>
      <Stage block>
        <input
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="border-aq-border bg-aq-surface text-aq-sm text-aq-ink focus:border-aq-accent mb-3 h-9 w-full rounded-md border px-3 outline-none"
          placeholder="Type a password…"
        />
        <PasswordStrengthMeter password={pw} />
      </Stage>
    </div>
  );
}

function UploadTargetPreview() {
  return (
    <Stage>
      <UploadTarget name="Ada Lovelace" helperText="PNG or JPG, up to 2MB" />
    </Stage>
  );
}

/* ----------------------------- data display ----------------------------- */

function ChipPreview() {
  const [tone, setTone] = useState<'neutral' | 'accent' | 'good' | 'warn' | 'bad' | 'info'>(
    'neutral'
  );
  const [selected, setSelected] = useState(false);
  return (
    <div>
      <Stage>
        <Chip tone={tone} selected={selected}>
          Chip label
        </Chip>
      </Stage>
      <Controls>
        <Seg
          value={tone}
          onChange={setTone}
          options={['neutral', 'accent', 'good', 'warn', 'bad', 'info']}
        />
        <Check label="selected" checked={selected} onChange={setSelected} />
      </Controls>
    </div>
  );
}

function StatusBadgePreview() {
  return (
    <Stage>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <StatusBadge tone="good" label="Active" />
        <StatusBadge tone="warn" label="Pending" />
        <StatusBadge tone="bad" label="Revoked" />
        <StatusBadge tone="neutral" label="Draft" />
        <StatusBadge tone="info" label="View only" />
      </div>
    </Stage>
  );
}

function StatusChipPreview() {
  const [tone, setTone] = useState<'good' | 'warn' | 'bad'>('good');
  return (
    <div>
      <Stage>
        <StatusChip message="Changes saved" tone={tone} />
      </Stage>
      <Controls>
        <Seg value={tone} onChange={setTone} options={['good', 'warn', 'bad']} />
      </Controls>
    </div>
  );
}

function AvatarPreview() {
  return (
    <Stage>
      <div className="flex items-center gap-3">
        <Avatar name="Ada Lovelace" size={20} />
        <Avatar name="Lin Chen" size={28} />
        <Avatar name="Rey Diaz" size={32} />
        <Avatar name="Jun Park" size={40} />
      </div>
    </Stage>
  );
}

function OrgAvatarPreview() {
  return (
    <Stage>
      <div className="flex items-center gap-3">
        <OrgAvatar org={{ initials: 'AQ', color: 'accent' }} size={32} />
        <OrgAvatar org={{ initials: 'IN', color: 'info' }} size={32} />
        <OrgAvatar org={{ initials: 'GD', color: 'good' }} size={32} />
        <OrgAvatar org={{ initials: 'WN', color: 'warn' }} size={32} />
      </div>
    </Stage>
  );
}

function ListRowPreview() {
  return (
    <Stage block>
      <div className="space-y-2">
        <ListRow
          title="Production API key"
          meta="Created 3 days ago · last used 2h ago"
          leading={<Avatar name="Prod Key" size={28} />}
          trailing={<StatusBadge tone="good" label="Active" />}
        />
        <ListRow
          title="Staging API key"
          meta="Created 1 month ago"
          leading={<Avatar name="Stg Key" size={28} />}
          onClick={() => {}}
        />
      </div>
    </Stage>
  );
}

function SectionHeaderPreview() {
  return (
    <Stage block>
      <SectionHeader title="Relationships" count={12} action="View all" onAction={() => {}} />
    </Stage>
  );
}

function SettingCardPreview() {
  // Mirrors AppearanceRoute: `immediate` (no footer/Save bar), body is a
  // flex-col holding the control. The canonical account-settings usage.
  const [theme, setTheme] = useState('light');
  return (
    <Stage block pad="md">
      <SettingCard
        immediate
        title="Theme"
        description="Light is the default. Switch to Dark when you want to."
      >
        <div className="flex flex-col gap-2">
          <SegmentedControl
            ariaLabel="Theme"
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </div>
      </SettingCard>
    </Stage>
  );
}

function IapCardPreview() {
  return (
    <Stage block>
      <IapCard
        verdict="pending"
        iap={{
          id: 'iap_8f21',
          agent: 'Billing Agent',
          tool: 'create_invoice',
          mcp: 'Stripe',
          mcpSlug: 'stripe',
          risk: 'medium',
          trustScore: 72,
          riskNote: 'Writes to a payment provider with org-level scope.',
          arguments: [
            { key: 'amount', value: '$4,200.00' },
            { key: 'customer', value: 'cus_4f9' },
          ],
        }}
        onApprove={() => {}}
        onReject={() => {}}
      />
    </Stage>
  );
}

/* ----------------------------- feedback ----------------------------- */

function BannerPreview() {
  const [tone, setTone] = useState<'info' | 'good' | 'warn' | 'bad'>('info');
  return (
    <div>
      <Stage block>
        <Banner tone={tone}>This is a {tone} banner with an inline message.</Banner>
      </Stage>
      <Controls>
        <Seg value={tone} onChange={setTone} options={['info', 'good', 'warn', 'bad']} />
      </Controls>
    </div>
  );
}

function PageStatePreview() {
  const [state, setState] = useState<'empty' | 'loading' | 'error' | 'denied'>('empty');
  return (
    <div>
      <Stage block>
        <PageState
          state={state}
          headline={`${state[0].toUpperCase()}${state.slice(1)} state`}
          body="A consistent state card used across the app."
        />
      </Stage>
      <Controls>
        <Seg value={state} onChange={setState} options={['empty', 'loading', 'error', 'denied']} />
      </Controls>
    </div>
  );
}

function DesktopRecommendedBannerPreview() {
  return (
    <Stage block>
      <DesktopRecommendedBanner id="ds-preview">
        This editor works best on a larger screen.
      </DesktopRecommendedBanner>
    </Stage>
  );
}

function MatrixLoaderPreview() {
  return (
    <Stage>
      <MatrixLoader />
    </Stage>
  );
}

function ShimmerPreview() {
  return (
    <Stage>
      <Shimmer>Analyzing trust graph…</Shimmer>
    </Stage>
  );
}

/* ----------------------------- navigation ----------------------------- */

function TabsPreview() {
  const [v, setV] = useState('overview');
  return (
    <Stage block>
      <Tabs
        value={v}
        onChange={setV}
        items={[
          { key: 'overview', label: 'Overview' },
          { key: 'tools', label: 'Tools', count: 8 },
          { key: 'security', label: 'Security' },
          { key: 'danger', label: 'Danger zone', danger: true },
        ]}
      />
    </Stage>
  );
}

function TabRailPreview() {
  const [v, setV] = useState('general');
  return (
    <Stage block>
      <div className="max-w-52">
        <TabRail
          value={v}
          onChange={setV}
          items={[
            { key: 'general', label: 'General', icon: IconSettings },
            { key: 'members', label: 'Members', icon: IconUsers },
            { key: 'alerts', label: 'Alerts', icon: IconBell },
          ]}
        />
      </div>
    </Stage>
  );
}

function BreadcrumbPreview() {
  return (
    <Stage block>
      <Breadcrumb
        items={[
          { key: 'org', label: 'Organization' },
          { key: 'members', label: 'Members' },
          { key: 'ada', label: 'Ada Lovelace', active: true },
        ]}
      />
    </Stage>
  );
}

function StepperPreview() {
  return (
    <Stage block>
      <Stepper
        currentIndex={1}
        steps={[
          { key: 'details', label: 'Details' },
          { key: 'scopes', label: 'Scopes' },
          { key: 'review', label: 'Review' },
        ]}
      />
    </Stage>
  );
}

function SandboxPillPreview() {
  return (
    <Stage>
      <div className="flex items-center gap-3">
        <SandboxPill mode="sandbox" />
        <SandboxPill mode="production" />
        <SandboxPill mode="activating" />
      </div>
    </Stage>
  );
}

/* ----------------------------- overlay (trigger) ----------------------------- */

function ModalPreview() {
  const [open, setOpen] = useState(false);
  return (
    <TriggerNote>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open modal
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete API key"
        subtitle="This action cannot be undone."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="tertiary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => setOpen(false)}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-aq-sm text-aq-ink-soft">
          The key <span className="font-mono">prod_4f9…</span> will be revoked immediately.
        </p>
      </Modal>
    </TriggerNote>
  );
}

function SideModalPreview() {
  const [open, setOpen] = useState(false);
  return (
    <TriggerNote>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open side drawer
      </Button>
      <SideModal open={open} onClose={() => setOpen(false)} title="Member details">
        <div className="space-y-3">
          <ListRow title="Ada Lovelace" meta="Owner · ada@armoriq.io" asCard={false} />
          <p className="text-aq-sm text-aq-ink-soft">A peek drawer for quick inspection.</p>
        </div>
      </SideModal>
    </TriggerNote>
  );
}

function PopoverPreview() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <TriggerNote>
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="border-aq-border bg-aq-surface text-aq-sm text-aq-ink-soft rounded-md border px-3 py-1.5"
      >
        Toggle popover
      </button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} width={220}>
        <div className="text-aq-sm text-aq-ink-soft p-3">
          Anchored floating panel. Closes on Esc or outside click.
        </div>
      </Popover>
    </TriggerNote>
  );
}

function MenuPreview() {
  return (
    <Stage>
      <Menu>
        <MenuItem icon={IconCheck} onClick={() => {}}>
          Approve
        </MenuItem>
        <MenuItem icon={IconSettings} shortcut="⌘E" onClick={() => {}}>
          Edit
        </MenuItem>
        <MenuItem icon={IconTrash} tone="danger" onClick={() => {}}>
          Delete
        </MenuItem>
      </Menu>
    </Stage>
  );
}

function TooltipPreview() {
  return (
    <Stage>
      <Tooltip label="Tokens never lie">
        <Button variant="secondary" size="sm">
          Hover me
        </Button>
      </Tooltip>
    </Stage>
  );
}

function CommandPalettePreview() {
  const [open, setOpen] = useState(false);
  return (
    <TriggerNote>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open command palette
      </Button>
      <CommandPalette open={open} onClose={() => setOpen(false)}>
        <div className="p-2">
          <input
            autoFocus
            placeholder="Type a command…"
            className="border-aq-border bg-aq-surface text-aq-sm text-aq-ink focus:border-aq-accent mb-2 h-9 w-full rounded-md border px-3 outline-none"
          />
          <Menu>
            <MenuItem icon={IconUsers} onClick={() => setOpen(false)}>
              Go to Members
            </MenuItem>
            <MenuItem icon={IconSettings} onClick={() => setOpen(false)}>
              Open Settings
            </MenuItem>
            <MenuItem icon={IconCheck} onClick={() => setOpen(false)}>
              Create API key
            </MenuItem>
          </Menu>
        </div>
      </CommandPalette>
    </TriggerNote>
  );
}

function WelcomeDialogPreview() {
  const [open, setOpen] = useState(false);
  return (
    <TriggerNote>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open welcome dialog
      </Button>
      {open && (
        <WelcomeDialog
          open={open}
          orgName="ArmorIQ"
          onTakeTour={() => setOpen(false)}
          onDismiss={() => setOpen(false)}
        />
      )}
    </TriggerNote>
  );
}

function ProductTourPreview() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  return (
    <TriggerNote>
      <Button
        data-tour="ds-tour-target"
        variant="secondary"
        onClick={() => {
          setStep(0);
          setOpen(true);
        }}
      >
        Start product tour
      </Button>
      {open && (
        <ProductTour
          open={open}
          stepIndex={step}
          onStepChange={setStep}
          onFinish={() => setOpen(false)}
          onSkip={() => setOpen(false)}
          steps={[
            {
              anchor: 'ds-tour-target',
              title: 'Guided tour',
              body: 'ProductTour spotlights real elements by their data-tour value and walks the user through them.',
            },
          ]}
        />
      )}
    </TriggerNote>
  );
}

/* ----------------------------- motion ----------------------------- */

function AnimatedNumberPreview() {
  const [n, setN] = useState(1280);
  return (
    <div>
      <Stage>
        <span className="text-aq-display text-aq-ink font-semibold tabular-nums">
          <AnimatedNumber value={n} format={(x) => x.toLocaleString()} />
        </span>
      </Stage>
      <Controls>
        <Button size="xs" variant="secondary" onClick={() => setN((v) => v + 137)}>
          +137
        </Button>
        <Button size="xs" variant="secondary" onClick={() => setN((v) => Math.max(0, v - 137))}>
          -137
        </Button>
      </Controls>
    </div>
  );
}

function TextSwapPreview() {
  const opts = ['Active', 'Pending', 'Revoked'];
  const [i, setI] = useState(0);
  return (
    <div>
      <Stage>
        <span className="text-aq-h2 text-aq-ink font-semibold">
          <TextSwap text={opts[i]} />
        </span>
      </Stage>
      <Controls>
        <Button size="xs" variant="secondary" onClick={() => setI((v) => (v + 1) % opts.length)}>
          Swap text
        </Button>
      </Controls>
    </div>
  );
}

function IconSwapPreview() {
  const icons = [IconBell, IconCheck, IconSearch];
  const [i, setI] = useState(0);
  return (
    <div>
      <Stage>
        <span className="text-aq-ink">
          <IconSwap swapKey={String(i)} icon={icons[i]} size={28} />
        </span>
      </Stage>
      <Controls>
        <Button size="xs" variant="secondary" onClick={() => setI((v) => (v + 1) % icons.length)}>
          Swap icon
        </Button>
      </Controls>
    </div>
  );
}

function CollapsiblePreview() {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <Stage block>
        <Collapsible open={open}>
          <div className="bg-aq-zebra text-aq-sm text-aq-ink-soft rounded-lg p-4">
            This content animates open and closed with a token-driven height transition.
          </div>
        </Collapsible>
      </Stage>
      <Controls>
        <Check label="open" checked={open} onChange={setOpen} />
      </Controls>
    </div>
  );
}

/* ----------------------------- brand ----------------------------- */

function BrandIconPreview() {
  return (
    <Stage>
      <div className="text-aq-ink flex items-center gap-4">
        <BrandIcon slug="github" size={24} />
        <BrandIcon slug="slack" size={24} />
        <BrandIcon slug="openai" size={24} />
        <BrandIcon slug="stripe" size={24} />
      </div>
    </Stage>
  );
}

/* ----------------------------- toolbars ----------------------------- */

function ListToolbarPreview() {
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('list');
  return (
    <Stage block>
      <ListToolbar
        tabs={{
          value: tab,
          onChange: setTab,
          items: [
            { key: 'all', label: 'All' },
            { key: 'active', label: 'Active' },
            { key: 'revoked', label: 'Revoked' },
          ],
        }}
        search={{ value: q, onChange: setQ, placeholder: 'Search…' }}
        view={{ value: view, onChange: setView }}
        count={{ shown: 24, total: 24, noun: 'keys' }}
      />
    </Stage>
  );
}

function TabToolbarPreview() {
  const [tab, setTab] = useState('overview');
  const [view, setView] = useState<'grid' | 'list'>('list');
  return (
    <Stage block>
      <TabToolbar
        tabs={{
          value: tab,
          onChange: setTab,
          items: [
            { key: 'overview', label: 'Overview' },
            { key: 'tools', label: 'Tools' },
            { key: 'logs', label: 'Logs' },
          ],
        }}
        view={{ value: view, onChange: setView }}
      />
    </Stage>
  );
}

/* ----------------------------- canvas (trigger) ----------------------------- */

function CanvasModalPreview() {
  const [open, setOpen] = useState(false);
  return (
    <TriggerNote>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open canvas modal
      </Button>
      <CanvasModal
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Trust graph"
        title="Blast radius"
      >
        <div className="ds-checker text-aq-sm text-aq-ink-muted flex h-64 items-center justify-center">
          A full-bleed canvas fills the modal body (graph, map, diagram).
        </div>
      </CanvasModal>
    </TriggerNote>
  );
}

function CanvasDetailCardPreview() {
  const [open, setOpen] = useState(false);
  return (
    <TriggerNote>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open detail card
      </Button>
      <CanvasDetailCard
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Agent"
        title="Billing Agent"
      >
        <div className="text-aq-sm text-aq-ink-soft space-y-2">
          <p>Floating detail card anchored over a canvas.</p>
          <ListRow title="Trust score" meta="72 / 100" asCard={false} />
        </div>
      </CanvasDetailCard>
    </TriggerNote>
  );
}

/* ----------------------------- graph ----------------------------- */

function GraphNodePreview() {
  // GraphNodeShape is a self-sizing element that renders @xyflow/react <Handle>s,
  // so it needs a ReactFlow context. Render it directly (as the app does), inside
  // a provider. Do NOT wrap it in a hand-rolled <svg> — it draws its own.
  return (
    <Stage>
      <ReactFlowProvider>
        <GraphNodeShape
          radius={34}
          name="Billing Agent"
          sublabel="AGENT"
          ringStrokeClass="stroke-aq-node-agent/55"
          glyphTextClass="text-aq-node-agent"
          isHero
          fillSoftClass="fill-aq-node-agent/6"
          statusDotFillClass="fill-aq-good"
          glyph={
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="3.2" />
              <path d="M5 19c0-3.5 3-6 7-6s7 2.5 7 6" />
            </g>
          }
        />
      </ReactFlowProvider>
    </Stage>
  );
}

/* ----------------------------- mobile ----------------------------- */

function DataCardPreview() {
  return (
    <Stage block pad="md">
      <DataCard
        title="claims-triage-bot"
        subtitle="Automation · REST"
        status={<StatusBadge tone="good" label="Verified" />}
        fields={[
          { label: 'Uptime', value: '99.94%' },
          { label: 'p50', value: '142ms' },
          { label: 'Owner', value: 'aniket' },
          { label: 'Vulns', value: 'None' },
        ]}
      />
    </Stage>
  );
}

function BottomSheetPreview() {
  const [open, setOpen] = useState(false);
  return (
    <TriggerNote>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open bottom sheet
      </Button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Filter agents"
        footer={
          <Button variant="primary" onClick={() => setOpen(false)}>
            Apply
          </Button>
        }
      >
        <p className="text-aq-sm text-aq-ink-soft">
          The mobile counterpart to Modal/SideModal: a bottom-anchored sheet with a grab handle and
          a thumb-zone footer.
        </p>
      </BottomSheet>
    </TriggerNote>
  );
}

/* ----------------------------- stage wrapper ----------------------------- */

/**
 * The preview canvas. A neutral, dotted-grid surface (NOT a bordered card) so
 * components that are themselves surfaces (cards, banners, rows) don't get
 * double-boxed. `block` left-aligns full-width content (forms, rows, banners);
 * default centers a small atom (button, chip, toggle).
 *
 * `pad` controls inner breathing room: 'lg' (default) for atoms, 'md' for
 * full-width layout components so they fill the width like in the app.
 */
function Stage({
  children,
  block = false,
  pad = 'lg',
}: {
  children: ReactNode;
  block?: boolean;
  pad?: 'md' | 'lg';
}) {
  return (
    <div
      className={`ds-stage flex min-h-32 rounded-xl ${pad === 'lg' ? 'p-8' : 'p-6'} ${
        block ? 'flex-col' : 'items-center justify-center'
      }`}
    >
      {block ? <div className="w-full">{children}</div> : children}
    </div>
  );
}

/* ----------------------------- registry ----------------------------- */

export const PREVIEWS: Record<string, () => ReactNode> = {
  // actions
  Button: ButtonPreview,
  GradientButton: GradientButtonPreview,
  // inputs
  SearchField: SearchFieldPreview,
  FormField: FormFieldPreview,
  Toggle: TogglePreview,
  SegmentedControl: SegmentedPreview,
  ViewToggle: ViewTogglePreview,
  SortControl: SortControlPreview,
  OTPInput: OTPInputPreview,
  PasswordStrengthMeter: PasswordStrengthPreview,
  UploadTarget: UploadTargetPreview,
  // data display
  Chip: ChipPreview,
  StatusBadge: StatusBadgePreview,
  StatusChip: StatusChipPreview,
  Avatar: AvatarPreview,
  OrgAvatar: OrgAvatarPreview,
  ListRow: ListRowPreview,
  SectionHeader: SectionHeaderPreview,
  SettingCard: SettingCardPreview,
  IapCard: IapCardPreview,
  // feedback
  Banner: BannerPreview,
  PageState: PageStatePreview,
  DesktopRecommendedBanner: DesktopRecommendedBannerPreview,
  MatrixLoader: MatrixLoaderPreview,
  Loader: MatrixLoaderPreview,
  Shimmer: ShimmerPreview,
  // navigation
  Tabs: TabsPreview,
  TabRail: TabRailPreview,
  Breadcrumb: BreadcrumbPreview,
  Stepper: StepperPreview,
  SandboxPill: SandboxPillPreview,
  // overlay
  Modal: ModalPreview,
  SideModal: SideModalPreview,
  Popover: PopoverPreview,
  Menu: MenuPreview,
  Tooltip: TooltipPreview,
  CommandPalette: CommandPalettePreview,
  WelcomeDialog: WelcomeDialogPreview,
  ProductTour: ProductTourPreview,
  // motion
  AnimatedNumber: AnimatedNumberPreview,
  TextSwap: TextSwapPreview,
  IconSwap: IconSwapPreview,
  Collapsible: CollapsiblePreview,
  // brand
  BrandIcon: BrandIconPreview,
  // mobile
  DataCard: DataCardPreview,
  BottomSheet: BottomSheetPreview,
  // layout / toolbars
  ListToolbar: ListToolbarPreview,
  TabToolbar: TabToolbarPreview,
  // canvas
  CanvasModal: CanvasModalPreview,
  CanvasDetailCard: CanvasDetailCardPreview,
  // graph
  GraphNode: GraphNodePreview,
};
