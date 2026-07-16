/**
 * ViewToggle — icon-only segmented control for switching a registry between
 * a card grid and a list/table. Two 28px segments (grid · list).
 *
 * Visual language matches <SegmentedControl>: a single rounded container on
 * `bg-aq-zebra`, the active segment lifted onto `bg-aq-surface` with a card
 * shadow. Icon-only by design — it sits next to the page's "Add" CTA where
 * horizontal room is tight, so labels live on `title` + `aria-label`.
 */
import type { ComponentType, ReactElement } from 'react';
import { IconGrid2, IconRows, type IconProps } from '@shared/icons';

export type ViewMode = 'grid' | 'list';

export type ViewToggleProps = {
  /** Currently active view. */
  value: ViewMode;
  /** Called with the next view when a segment is picked. */
  onChange: (next: ViewMode) => void;
  /** Accessible group label. */
  ariaLabel?: string;
};

const OPTIONS: ReadonlyArray<{ value: ViewMode; label: string; Icon: ComponentType<IconProps> }> = [
  { value: 'grid', label: 'Card view', Icon: IconGrid2 },
  { value: 'list', label: 'List view', Icon: IconRows },
];

export function ViewToggle({
  value,
  onChange,
  ariaLabel = 'View mode',
}: ViewToggleProps): ReactElement {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="bg-aq-zebra border-aq-border inline-flex items-center gap-0.5 rounded-md border p-0.5"
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.Icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => onChange(opt.value)}
            className={[
              'inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded',
              'focus-visible:outline-aq-accent focus-visible:outline-2 focus-visible:outline-offset-1',
              active
                ? 'bg-aq-surface text-aq-ink shadow-aq-card'
                : 'text-aq-ink-muted hover:text-aq-ink',
            ].join(' ')}
          >
            <Icon size={15} stroke={1.8} />
          </button>
        );
      })}
    </div>
  );
}
