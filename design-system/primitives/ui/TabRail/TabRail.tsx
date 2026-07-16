/**
 * TabRail — vertical tab rail used for left-side navigation within a page.
 *
 * Variant on horizontal Tabs: a column of rows, each ~36px tall, with an
 * accent strip on the LEFT edge of the active row. Designed for the /account
 * settings layout but reusable in any "single page, left nav, right detail"
 * surface.
 *
 * Visual:
 *   - Active row: bg-aq-accent-soft text-aq-accent-strong font-semibold,
 *     plus a 2px-wide bg-aq-accent strip flush against the row's left edge.
 *   - Inactive row: text-aq-ink-soft, hover:bg-aq-zebra.
 *   - Optional leading icon, size 14, matches text color via currentColor.
 */
import { useId, type ComponentType, type ReactElement } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { aqSpring } from '@shared/motion';
import type { IconProps } from '@shared/icons';

export type TabRailItem = {
  key: string;
  label: string;
  icon?: ComponentType<IconProps>;
};

export type TabRailProps = {
  /** Active item key. Must match an `items[].key`. */
  value: string;
  /** Called with the next key when the user picks a row. */
  onChange: (next: string) => void;
  /** The rows in their display order. */
  items: ReadonlyArray<TabRailItem>;
  /** Accessible label for the nav region. */
  ariaLabel?: string;
};

export function TabRail({ value, onChange, items, ariaLabel }: TabRailProps): ReactElement {
  // Per-instance id keeps the active strip sliding within this rail only.
  const stripId = useId();
  const reduce = useReducedMotion();

  return (
    <nav aria-label={ariaLabel} className="flex w-full max-w-[220px] flex-col gap-0.5">
      {items.map((item) => {
        const active = item.key === value;
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => onChange(item.key)}
            className={[
              'text-aq-sm relative flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-left',
              'focus-visible:outline-aq-accent focus-visible:outline-2 focus-visible:outline-offset-1',
              active
                ? 'bg-aq-accent-soft text-aq-accent-strong font-semibold'
                : 'text-aq-ink-soft hover:bg-aq-zebra',
            ].join(' ')}
          >
            {active ? (
              <motion.span
                layoutId={stripId}
                aria-hidden="true"
                className="bg-aq-accent absolute top-1 bottom-1 left-0 w-0.5 rounded-full"
                transition={reduce ? { duration: 0 } : aqSpring}
              />
            ) : null}
            {Icon ? <Icon size={14} /> : null}
            <span className="flex-1">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
