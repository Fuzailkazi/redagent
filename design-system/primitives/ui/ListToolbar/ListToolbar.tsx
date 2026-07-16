/**
 * ListToolbar — the single, unified controls row for every list / registry /
 * table page. Replaces the per-page mix of ad-hoc chip rows, raw <input>
 * searches, custom popovers, and one-off sort buttons.
 *
 * Two presentations, chosen with `variant`:
 *
 *   standard (default) — labelled controls, tabs (if any) sit above the row:
 *     [ tabs ]
 *     [ Filter ▾ ] [ Sort: … ↕ ]  ……  [ 🔍 Search ]  12 of 40 agents  [ ⊞ ☰ ]
 *
 *   ghost — compact, tab-led. The tab strip fills the left; a borderless
 *     Filter / Sort / Search icon trio docks to its right on the same baseline:
 *     Needs you 4   Active 12   Resolved 38        ⚙  ↕  🔍
 *     ─────────────
 *
 * Either way the active-filter chips render on a thin row beneath, only when set.
 *
 * Presentational and controlled: the route owns the tab/filter/search/sort/view
 * state and performs the actual filtering.
 */
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ComponentType,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { motion } from 'framer-motion';
import { Popover } from '../Popover';
import { SearchField } from '../SearchField';
import { Tabs, type TabItem } from '../Tabs';
import { ViewToggle, type ViewMode } from '../ViewToggle';
import { SortControl, type SortControlProps } from '../SortControl';
import {
  IconCheck,
  IconFilter,
  IconSearch,
  IconSortAsc,
  IconSortDesc,
  IconX,
  type IconProps,
} from '@shared/icons';
import type { FilterFacet, FilterToggle } from './filter-types';

export type ListToolbarTabs = {
  items: ReadonlyArray<TabItem>;
  value: string;
  onChange: (next: string) => void;
  ariaLabel?: string;
};

export type ListToolbarFilter = {
  facets: ReadonlyArray<FilterFacet>;
  toggles?: ReadonlyArray<FilterToggle>;
  /** Wipes every facet selection + toggle. Owner-supplied so the route keeps the truth. */
  onClearAll: () => void;
};

export type ListToolbarSearch = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
};

export type ListToolbarView = {
  value: ViewMode;
  onChange: (next: ViewMode) => void;
  ariaLabel?: string;
};

export type ListToolbarCount = {
  shown: number;
  total: number;
  /** Plural noun, e.g. "agents". Singular is derived by trimming a trailing 's'. */
  noun?: string;
};

export type ListToolbarProps = {
  /** Visual presentation. 'ghost' docks an icon trio beside the tab strip. */
  variant?: 'standard' | 'ghost';
  /** Ghost-trio size. 'lg' reads heavier to balance a tab strip. Default 'md'. */
  ghostScale?: GhostScale;
  /** First-class tab strip. In 'ghost' it sits left of the trio; in 'standard', above the row. */
  tabs?: ListToolbarTabs;
  filter?: ListToolbarFilter;
  sort?: SortControlProps;
  search?: ListToolbarSearch;
  view?: ListToolbarView;
  count?: ListToolbarCount;
  /** Page-specific controls pinned to the far left (e.g. a group-by select). */
  leading?: ReactNode;
  /** Page-specific controls pinned to the right, before the view toggle (e.g. date-range pills). */
  trailing?: ReactNode;
  className?: string;
};

function chipNoun(count: ListToolbarCount): string {
  if (!count.noun) return '';
  const singular = count.noun.endsWith('s') ? count.noun.slice(0, -1) : count.noun;
  return ` ${count.total === 1 ? singular : count.noun}`;
}

export function ListToolbar({
  variant = 'standard',
  ghostScale = 'md',
  tabs,
  filter,
  sort,
  search,
  view,
  count,
  leading,
  trailing,
  className,
}: ListToolbarProps): ReactElement {
  const activeChips = filter ? collectActiveChips(filter) : [];

  const chipRow =
    filter && activeChips.length > 0 ? (
      <div className="flex flex-wrap items-center gap-1.5">
        {activeChips.map((c) => (
          <ActiveChip key={c.key} label={c.label} onRemove={c.onRemove} />
        ))}
        <button
          type="button"
          onClick={filter.onClearAll}
          className="text-aq-ink-soft hover:text-aq-ink text-aq-caption inline-flex items-center gap-1 font-semibold"
        >
          <IconX size={11} stroke={2} />
          Clear all
        </button>
      </div>
    ) : null;

  if (variant === 'ghost') {
    return (
      <div className={['flex flex-col gap-2', className ?? ''].join(' ')}>
        <div className="flex items-center gap-3">
          {tabs ? (
            <div className="min-w-0 flex-1">
              <Tabs
                items={tabs.items}
                value={tabs.value}
                onChange={tabs.onChange}
                ariaLabel={tabs.ariaLabel}
              />
            </div>
          ) : (
            <div className="min-w-0 flex-1" />
          )}
          <GhostCluster
            scale={ghostScale}
            filter={filter}
            sort={sort}
            search={search}
            view={view}
            count={count}
            leading={leading}
            trailing={trailing}
          />
        </div>
        {chipRow}
      </div>
    );
  }

  return (
    <div className={['flex flex-col gap-2', className ?? ''].join(' ')}>
      {tabs ? (
        <Tabs
          items={tabs.items}
          value={tabs.value}
          onChange={tabs.onChange}
          ariaLabel={tabs.ariaLabel}
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {leading}
        {filter ? <FilterControl filter={filter} /> : null}
        {sort ? <SortControl {...sort} /> : null}

        <div className="ml-auto flex flex-wrap items-center gap-3">
          {search ? (
            <SearchField
              value={search.value}
              onChange={search.onChange}
              placeholder={search.placeholder ?? 'Search…'}
              className="w-64"
            />
          ) : null}
          {count ? (
            <span className="text-aq-ink-muted text-aq-caption shrink-0 font-mono">
              {count.shown} of {count.total}
              {chipNoun(count)}
            </span>
          ) : null}
          {trailing}
          {view ? (
            <ViewToggle
              value={view.value}
              onChange={view.onChange}
              ariaLabel={view.ariaLabel ?? 'View mode'}
            />
          ) : null}
        </div>
      </div>
      {chipRow}
    </div>
  );
}

/* ─────────────────────────── Filter panel (shared) ──────────────────────────
 * The popover body behind both the standard "Filter ▾" button and the ghost
 * filter icon. Identical UI; only the trigger differs. */

function FilterPanel({
  filter,
  onDone,
}: {
  filter: ListToolbarFilter;
  onDone: () => void;
}): ReactElement {
  const toggles = filter.toggles ?? [];
  const activeCount =
    filter.facets.reduce((n, f) => n + f.selected.length, 0) + toggles.filter((t) => t.on).length;

  return (
    <div className="flex max-h-[60vh] flex-col">
      <div className="border-aq-border flex items-center gap-1.5 border-b px-3.5 py-2.5">
        <IconFilter size={13} stroke={1.8} className="text-aq-ink-soft" />
        <span className="text-aq-caption tracking-aq-wider text-aq-ink-soft font-semibold uppercase">
          Filters
        </span>
        {activeCount > 0 ? (
          <button
            type="button"
            onClick={() => {
              filter.onClearAll();
              onDone();
            }}
            className="text-aq-ink-soft hover:text-aq-ink text-aq-caption ml-auto font-semibold"
          >
            Clear all
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 overflow-auto px-3.5 py-3">
        {filter.facets.map((f) => (
          <FacetGroup key={f.key} facet={f} />
        ))}
        {toggles.length > 0 ? (
          <div className="border-aq-border flex flex-col gap-2 border-t pt-3">
            {toggles.map((t) => (
              <label
                key={t.key}
                className="text-aq-sm text-aq-ink-soft inline-flex items-center gap-2 font-medium"
              >
                <input
                  type="checkbox"
                  checked={t.on}
                  onChange={t.onToggle}
                  className="accent-aq-accent h-3.5 w-3.5"
                />
                {t.label}
              </label>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FilterControl({ filter }: { filter: ListToolbarFilter }): ReactElement {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement | null>(null);
  const toggles = filter.toggles ?? [];
  const activeCount =
    filter.facets.reduce((n, f) => n + f.selected.length, 0) + toggles.filter((t) => t.on).length;
  const isActive = activeCount > 0;

  return (
    <>
      <button
        ref={anchor}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={[
          'text-aq-caption tracking-aq-wider inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-semibold uppercase',
          isActive
            ? 'border-aq-accent bg-aq-accent-soft text-aq-accent-strong'
            : 'border-aq-border bg-aq-surface text-aq-ink-soft hover:bg-aq-zebra',
        ].join(' ')}
      >
        <IconFilter size={12} stroke={1.8} />
        Filter
        {isActive ? <span className="font-mono">· {activeCount}</span> : null}
      </button>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchor}
        placement="bottom-start"
        width={340}
        ariaLabel="Filter options"
      >
        <FilterPanel filter={filter} onDone={() => setOpen(false)} />
      </Popover>
    </>
  );
}

function toggleValue<T>(arr: ReadonlyArray<T>, value: T): T[] {
  return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
}

function FacetGroup({ facet }: { facet: FilterFacet }): ReactElement {
  const allOff = facet.selected.length === 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-aq-caption text-aq-ink-muted tracking-aq-wider font-semibold uppercase">
          {facet.label}
        </span>
        {!allOff ? (
          <button
            type="button"
            onClick={() => facet.onChange([])}
            className="text-aq-ink-muted hover:text-aq-ink text-aq-caption font-semibold"
          >
            Reset
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {facet.options.map((o) => {
          const on = facet.selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => facet.onChange(toggleValue(facet.selected, o.value))}
              aria-pressed={on}
              className={[
                'text-aq-caption rounded-full border px-2 py-0.5 font-medium transition-colors',
                on
                  ? 'border-aq-accent bg-aq-accent-soft text-aq-accent-strong'
                  : 'border-aq-border bg-aq-surface text-aq-ink-soft hover:bg-aq-zebra',
              ].join(' ')}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────── Ghost cluster ───────────────────────────────
 * Borderless Filter / Sort / Search trio. Reuses FilterPanel; the sort menu and
 * the expanding search are dialled-in from the toolbar playground. */

const SEARCH_SPRING = { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 } as const;

/** Ghost-trio geometry. `lg` reads heavier so the cluster balances a tab strip. */
export type GhostScale = 'md' | 'lg';
type GhostCfg = {
  size: number;
  icon: number;
  stroke: number;
  radius: number;
  gap: string;
  searchCollapsed: number;
  searchExpanded: number;
};
const GHOST_SCALE: Record<GhostScale, GhostCfg> = {
  md: {
    size: 32,
    icon: 16,
    stroke: 1.7,
    radius: 8,
    gap: 'gap-1',
    searchCollapsed: 32,
    searchExpanded: 220,
  },
  // lg — the dialled-in Plans size: a touch larger than md to sit beside a
  // page-level tab strip, with a light 1.7 stroke and muted resting glyphs.
  lg: {
    size: 38,
    icon: 19,
    stroke: 1.7,
    radius: 7,
    gap: 'gap-1',
    searchCollapsed: 38,
    searchExpanded: 220,
  },
};

function GhostButton({
  cfg,
  icon: Icon,
  label,
  open,
  active,
  anchorRef,
  onClick,
}: {
  cfg: GhostCfg;
  icon: ComponentType<IconProps>;
  label: string;
  open: boolean;
  active?: boolean;
  anchorRef: RefObject<HTMLButtonElement | null>;
  onClick: () => void;
}): ReactElement {
  const style: CSSProperties = {
    width: cfg.size,
    height: cfg.size,
    borderRadius: cfg.radius,
    transitionProperty: 'background-color, color',
    transitionDuration: '0.14s',
  };
  return (
    <motion.button
      ref={anchorRef}
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-expanded={open}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30, mass: 0.6 }}
      style={style}
      className={[
        'relative flex items-center justify-center',
        open || active
          ? 'bg-aq-accent-soft text-aq-accent-strong'
          : 'text-aq-ink-muted hover:text-aq-ink-soft hover:bg-aq-zebra',
      ].join(' ')}
    >
      <Icon size={cfg.icon} stroke={cfg.stroke} />
      {active && !open ? (
        <span
          className="bg-aq-accent absolute top-1 right-1 h-1.5 w-1.5 rounded-full"
          aria-hidden="true"
        />
      ) : null}
    </motion.button>
  );
}

function GhostSearch({
  cfg,
  value,
  onChange,
  expanded,
  onExpand,
  inputRef,
  placeholder,
}: {
  cfg: GhostCfg;
  value: string;
  onChange: (s: string) => void;
  expanded: boolean;
  onExpand: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  placeholder?: string;
}): ReactElement {
  return (
    <motion.div
      initial={false}
      animate={{ width: expanded ? cfg.searchExpanded : cfg.searchCollapsed }}
      transition={SEARCH_SPRING}
      className={[
        'relative flex shrink-0 items-center overflow-hidden border transition-colors',
        expanded
          ? 'border-aq-border bg-aq-surface focus-within:border-aq-accent'
          : 'border-transparent',
      ].join(' ')}
      style={{ height: cfg.size, borderRadius: cfg.radius }}
    >
      <motion.button
        type="button"
        onClick={() => {
          if (!expanded) onExpand();
        }}
        title="Search"
        aria-label="Search"
        tabIndex={expanded ? -1 : 0}
        whileTap={expanded ? undefined : { scale: 0.96 }}
        style={{
          width: cfg.searchCollapsed,
          height: cfg.size,
          borderRadius: cfg.radius,
          transitionProperty: 'background-color, color',
          transitionDuration: '0.14s',
        }}
        className={[
          'relative flex shrink-0 items-center justify-center',
          expanded ? 'text-aq-ink-muted' : 'text-aq-ink-soft hover:bg-aq-zebra',
        ].join(' ')}
      >
        <IconSearch size={cfg.icon} stroke={cfg.stroke} />
        {!expanded && value.length > 0 ? (
          <span
            className="bg-aq-accent absolute top-1 right-1 h-1.5 w-1.5 rounded-full"
            aria-hidden="true"
          />
        ) : null}
      </motion.button>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Search…'}
        tabIndex={expanded ? 0 : -1}
        style={{ opacity: expanded ? 1 : 0 }}
        className="text-aq-sm placeholder:text-aq-ink-muted min-w-0 flex-1 bg-transparent pr-2.5 transition-opacity outline-none"
      />
      {expanded && value.length > 0 ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="text-aq-ink-muted hover:text-aq-ink mr-2.5 shrink-0"
        >
          <IconX size={Math.round(cfg.icon * 0.7)} stroke={2} />
        </button>
      ) : null}
    </motion.div>
  );
}

function GhostSortPanel({ sort }: { sort: SortControlProps }): ReactElement {
  const DirIcon = sort.direction === 'asc' ? IconSortAsc : IconSortDesc;
  return (
    <div className="p-1">
      {sort.options.map((o) => {
        const active = o.value === sort.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => {
              if (active) sort.onChange(sort.value, sort.direction === 'asc' ? 'desc' : 'asc');
              else sort.onChange(o.value, sort.direction);
            }}
            className={[
              'text-aq-sm flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-medium transition-colors',
              active ? 'text-aq-ink' : 'text-aq-ink-soft hover:bg-aq-zebra',
            ].join(' ')}
          >
            <span className="flex w-4 shrink-0 justify-center">
              {active ? <IconCheck size={14} stroke={2} className="text-aq-accent-strong" /> : null}
            </span>
            <span className="flex-1">{o.label}</span>
            {active ? <DirIcon size={15} stroke={1.8} className="text-aq-accent-strong" /> : null}
          </button>
        );
      })}
      <div className="border-aq-border text-aq-caption text-aq-ink-faint mt-1 border-t px-2 pt-1.5">
        Tap the active row to flip direction.
      </div>
    </div>
  );
}

type GhostOpen = null | 'filter' | 'sort';

function GhostCluster({
  scale,
  filter,
  sort,
  search,
  view,
  count,
  leading,
  trailing,
}: {
  scale: GhostScale;
  filter?: ListToolbarFilter;
  sort?: SortControlProps;
  search?: ListToolbarSearch;
  view?: ListToolbarView;
  count?: ListToolbarCount;
  leading?: ReactNode;
  trailing?: ReactNode;
}): ReactElement {
  const cfg = GHOST_SCALE[scale];
  const [open, setOpen] = useState<GhostOpen>(null);
  const [expanded, setExpanded] = useState(false);
  const clusterRef = useRef<HTMLDivElement | null>(null);
  const filterRef = useRef<HTMLButtonElement | null>(null);
  const sortRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filterActive = filter
    ? filter.facets.reduce((n, f) => n + f.selected.length, 0) +
      (filter.toggles ?? []).filter((t) => t.on).length
    : 0;

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  // Ghost search closes only on an outside click; an open popover absorbs the first.
  useEffect(() => {
    if (!expanded) return;
    const onDown = (e: MouseEvent): void => {
      const node = e.target as Node | null;
      if (!node) return;
      if (clusterRef.current?.contains(node)) return;
      const el = node instanceof Element ? node : node.parentElement;
      if (el?.closest('[role="dialog"]')) return;
      if (open !== null) return;
      setExpanded(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [expanded, open]);

  const toggle = (k: Exclude<GhostOpen, null>): void => setOpen((cur) => (cur === k ? null : k));

  return (
    <div ref={clusterRef} className={['flex shrink-0 items-center pb-2', cfg.gap].join(' ')}>
      {leading}
      {count ? (
        <span className="text-aq-ink-muted text-aq-caption mr-1 shrink-0 font-mono">
          {count.shown} of {count.total}
        </span>
      ) : null}
      {filter ? (
        <>
          <GhostButton
            cfg={cfg}
            icon={IconFilter}
            label="Filter"
            open={open === 'filter'}
            active={filterActive > 0}
            anchorRef={filterRef}
            onClick={() => toggle('filter')}
          />
          <Popover
            open={open === 'filter'}
            onClose={() => setOpen(null)}
            anchorRef={filterRef}
            placement="bottom-end"
            width={300}
            ariaLabel="Filter options"
          >
            <FilterPanel filter={filter} onDone={() => setOpen(null)} />
          </Popover>
        </>
      ) : null}
      {sort ? (
        <>
          <GhostButton
            cfg={cfg}
            icon={IconSortDesc}
            label="Sort"
            open={open === 'sort'}
            anchorRef={sortRef}
            onClick={() => toggle('sort')}
          />
          <Popover
            open={open === 'sort'}
            onClose={() => setOpen(null)}
            anchorRef={sortRef}
            placement="bottom-end"
            width={200}
            ariaLabel={sort.ariaLabel ?? 'Sort'}
          >
            <GhostSortPanel sort={sort} />
          </Popover>
        </>
      ) : null}
      {search ? (
        <GhostSearch
          cfg={cfg}
          value={search.value}
          onChange={search.onChange}
          expanded={expanded}
          onExpand={() => setExpanded(true)}
          inputRef={inputRef}
          placeholder={search.placeholder}
        />
      ) : null}
      {trailing}
      {view ? (
        <ViewToggle
          value={view.value}
          onChange={view.onChange}
          ariaLabel={view.ariaLabel ?? 'View mode'}
        />
      ) : null}
    </div>
  );
}

/* ───────────────────────────── Active filter chips ───────────────────────────── */

type ActiveChipDescriptor = { key: string; label: string; onRemove: () => void };

function collectActiveChips(filter: ListToolbarFilter): ActiveChipDescriptor[] {
  const chips: ActiveChipDescriptor[] = [];
  for (const f of filter.facets) {
    for (const v of f.selected) {
      const opt = f.options.find((o) => o.value === v);
      chips.push({
        key: `${f.key}:${v}`,
        label: `${f.label}: ${opt ? opt.label : String(v)}`,
        onRemove: () => f.onChange(f.selected.filter((x) => x !== v)),
      });
    }
  }
  for (const t of filter.toggles ?? []) {
    if (t.on) chips.push({ key: `tg:${t.key}`, label: t.label, onRemove: t.onToggle });
  }
  return chips;
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }): ReactElement {
  return (
    <span className="border-aq-accent bg-aq-accent-soft text-aq-accent-strong text-aq-caption inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="hover:text-aq-bad -mr-0.5"
      >
        <IconX size={10} stroke={2.2} />
      </button>
    </span>
  );
}

export default ListToolbar;
