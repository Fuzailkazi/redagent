import { useEffect, useRef, useState, type ComponentType } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  IconRocket,
  IconLayout,
  IconClipboard,
  IconZap,
  IconFile,
  IconBell,
  IconShield,
  IconBoxes,
  IconGraph,
  type IconProps,
} from '@shared/icons';
import { navTrees, groupOfRoute, type NavGroup } from '../nav';

// Icons for SOME group headers (not all) — the foundational/utility groups read
// faster with a glyph; leaf component categories stay text-only to avoid noise.
const GROUP_ICON: Record<string, ComponentType<IconProps>> = {
  'getting-started': IconRocket,
  patterns: IconLayout,
  actions: IconZap,
  inputs: IconClipboard,
  feedback: IconBell,
  overlay: IconShield,
  navigation: IconFile,
  'data-display': IconBoxes,
  sections: IconGraph,
};

/**
 * Collapsible, grouped sidebar.
 *
 * - Groups expand/collapse with a smooth height transition (token-driven,
 *   motion-safe). The active item's group auto-opens on navigation.
 * - Each group header shows a count and is sticky while its body scrolls.
 * - The active link scrolls itself into view on route change.
 * - Three trees: Getting started / Primitives / Sections, each with a quiet
 *   tree title so the 50 building blocks don't blur into the product sections.
 */
export function Sidebar({ route }: { route: string }) {
  const trees = navTrees();
  const activeGroup = groupOfRoute(route);

  // Open state per group. Default: getting-started + the active group open.
  const [open, setOpen] = useState<Record<string, boolean>>(() => ({
    'getting-started': true,
    patterns: false,
  }));

  // Auto-open the active item's group when the route changes.
  useEffect(() => {
    if (activeGroup) setOpen((o) => (o[activeGroup] ? o : { ...o, [activeGroup]: true }));
  }, [activeGroup]);

  return (
    <aside className="bg-aq-surface h-full w-[var(--ds-sidebar-w)] shrink-0 overflow-y-auto pb-8">
      {trees.map((tree) => (
        <div key={tree.id} className="px-3 pt-4">
          {tree.title &&
            (tree.id === 'primitives' ? (
              <a
                href="#/components"
                className={`text-aq-caption tracking-aq-widest mb-1 flex items-center justify-between rounded-md px-3 py-1 font-semibold uppercase transition ${
                  route === '#/components'
                    ? 'text-aq-accent-strong'
                    : 'text-aq-ink-faint hover:text-aq-ink-soft'
                }`}
              >
                {tree.title}
                <span className="tracking-aq-wide normal-case">index →</span>
              </a>
            ) : (
              <div className="text-aq-caption text-aq-ink-faint tracking-aq-widest mb-1 px-3 font-semibold uppercase">
                {tree.title}
              </div>
            ))}
          {tree.groups.map((g) => (
            <Group
              key={g.key}
              group={g}
              route={route}
              open={open[g.key] ?? false}
              onToggle={() => setOpen((o) => ({ ...o, [g.key]: !o[g.key] }))}
            />
          ))}
        </div>
      ))}
    </aside>
  );
}

function Group({
  group,
  route,
  open,
  onToggle,
}: {
  group: NavGroup;
  route: string;
  open: boolean;
  onToggle: () => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [maxH, setMaxH] = useState<number | undefined>(undefined);
  const Icon = GROUP_ICON[group.key];

  // Animate height: measure content, set max-height so the transition runs.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    setMaxH(open ? el.scrollHeight : 0);
  }, [open, group.links.length]);

  return (
    <div className="mb-0.5">
      <button
        type="button"
        onClick={onToggle}
        className="text-aq-caption text-aq-ink-faint hover:text-aq-ink-soft bg-aq-surface tracking-aq-wider sticky top-0 z-10 flex w-full items-center gap-1.5 rounded-md px-3 py-1.5 font-semibold uppercase transition"
      >
        <ChevronRight
          size={11}
          strokeWidth={2.4}
          className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          style={{ transitionTimingFunction: 'var(--ease-aq-out)' }}
        />
        {Icon && <Icon size={12} className="shrink-0" />}
        <span className="flex-1 text-left">{group.title}</span>
        <span className="text-aq-ink-faint/70 font-medium tabular-nums">{group.links.length}</span>
      </button>

      <div
        ref={bodyRef}
        className="overflow-hidden"
        style={{
          maxHeight: maxH === undefined ? (open ? undefined : 0) : maxH,
          transition: 'max-height var(--duration-aq-base) var(--ease-aq-out)',
        }}
      >
        <div className="pt-0.5 pb-1">
          {group.links.map((l) => (
            <NavItem key={l.route} label={l.label} route={l.route} active={route === l.route} />
          ))}
        </div>
      </div>
    </div>
  );
}

function NavItem({ label, route, active }: { label: string; route: string; active: boolean }) {
  const ref = useRef<HTMLAnchorElement>(null);
  // Scroll the active item into view when it becomes active.
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [active]);
  return (
    <a
      ref={ref}
      href={route}
      className={`text-aq-sm ml-3 block rounded-md px-3 py-1.5 transition ${
        active
          ? 'bg-aq-accent-soft text-aq-accent-strong font-medium'
          : 'text-aq-ink-soft hover:bg-aq-zebra hover:text-aq-ink'
      }`}
    >
      {label}
    </a>
  );
}
