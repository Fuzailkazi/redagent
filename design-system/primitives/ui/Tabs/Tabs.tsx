/**
 * Tabs — horizontal, page-level tab strip with an underline indicator.
 *
 * Fills the gap between `TabRail` (vertical left-nav) and `SegmentedControl`
 * (compact pill group): a row of tabs under a hairline, the active one marked
 * by a 2px accent underline. Used for object-detail pages (member detail, and
 * any "header + tabbed body" route). Pair with a `?tab=` query param for
 * deep-linkable, URL-synced tabs.
 *
 * Status/counts ride along via an optional `count` badge per tab.
 */
import { useId, type ComponentType, type CSSProperties, type ReactElement } from 'react';
import { motion, useReducedMotion, type Transition } from 'framer-motion';
import type { IconProps } from '@shared/icons';

/* Tab-strip motion + geometry, dialled in at /playground/tab-strip and frozen
 * here as the single source for every tab strip in the app. Values are inline
 * (non-colour) so the production strip matches the verified sandbox exactly:
 *   - underline slides between tabs on this spring (layoutId interpolation),
 *   - a soft selection-wash pill fades in under the cursor,
 *   - the hairline baseline sits BASELINE_OFFSET below the tabs so the
 *     underline reads as its own marker, not the bottom edge of the pill. */
const UNDERLINE_SPRING: Transition = { type: 'spring', stiffness: 460, damping: 30, mass: 1 };
const UNDERLINE_HEIGHT = 2.5; // px
const UNDERLINE_INSET = 10; // px — horizontal inset from each tab edge
const BASELINE_OFFSET = 9; // px — gap between the tabs and the hairline baseline
const HOVER_FADE = 0.29; // s — hover wash + text-colour cross-fade

export type TabItem = {
  key: string;
  label: string;
  icon?: ComponentType<IconProps>;
  /** Optional trailing count badge. */
  count?: number;
  /** Marks a destructive tab (e.g. Danger zone) — label tints aq-bad. */
  danger?: boolean;
};

export type TabsProps = {
  value: string;
  onChange: (next: string) => void;
  items: ReadonlyArray<TabItem>;
  ariaLabel?: string;
};

export function Tabs({ value, onChange, items, ariaLabel }: TabsProps): ReactElement {
  // Per-instance id so the sliding underline never animates across two
  // separate tab strips that happen to share the page.
  const underlineId = useId();
  const reduce = useReducedMotion();

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      // The strip scrolls horizontally when its tabs exceed the width (common on
      // phones with 5-6 lifecycle tabs); only the strip scrolls, never the page.
      // `pb` reserves room for the underline marker (which sits below the row) so
      // overflow-x clipping doesn't eat it; `aq-scrollbar-none` hides the bar.
      className="border-aq-border aq-scrollbar-none flex items-center gap-0.5 overflow-x-auto border-b"
      style={{ paddingBottom: BASELINE_OFFSET + UNDERLINE_HEIGHT }}
    >
      {items.map((item) => {
        const active = item.key === value;
        const Icon = item.icon;
        // Inline timing only — the wash/text colours come from the token
        // utility classes below; this just sets the cross-fade duration.
        const hoverStyle: CSSProperties = { transitionDuration: `${HOVER_FADE}s` };
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            style={hoverStyle}
            className={[
              'text-aq-sm hover:bg-aq-accent-soft relative inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 font-medium whitespace-nowrap transition-colors',
              // Pressed — the wash holds (so keyboard/touch presses show it too)
              // and the tab dips with a small tactile shrink. Theme-agnostic.
              'active:bg-aq-accent-soft active:scale-[0.97]',
              'focus-visible:outline-aq-accent focus-visible:outline-2 focus-visible:outline-offset-1',
              active
                ? item.danger
                  ? 'text-aq-bad'
                  : 'text-aq-ink'
                : item.danger
                  ? 'text-aq-bad/70 hover:text-aq-bad'
                  : 'text-aq-ink-muted hover:text-aq-ink',
            ].join(' ')}
          >
            {Icon ? <Icon size={14} stroke={1.8} /> : null}
            {item.label}
            {typeof item.count === 'number' ? (
              <span className="bg-aq-zebra text-aq-ink-muted text-aq-caption ml-0.5 rounded-full px-1.5 py-0.5 font-semibold tabular-nums">
                {item.count}
              </span>
            ) : null}
            {active ? (
              <motion.span
                layoutId={underlineId}
                aria-hidden="true"
                className={`absolute rounded-full ${item.danger ? 'bg-aq-bad' : 'bg-aq-accent'}`}
                style={{
                  height: UNDERLINE_HEIGHT,
                  left: UNDERLINE_INSET,
                  right: UNDERLINE_INSET,
                  bottom: -(BASELINE_OFFSET + UNDERLINE_HEIGHT / 2),
                }}
                transition={reduce ? { duration: 0 } : UNDERLINE_SPRING}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
