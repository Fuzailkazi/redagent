/**
 * SegmentedControl — compact tab-strip for mutually exclusive choices.
 *
 * Used for picker-style controls in dense surfaces: theme (system/light/dark),
 * density (comfortable/compact), MFA method, etc. Visually behaves like a
 * lifted tab indicator inside a single rounded container.
 *
 * Active button: bg-aq-surface text-aq-ink shadow-aq-card.
 * Inactive: text-aq-ink-soft hover:text-aq-ink.
 *
 * Optional per-option icon. Compact padding so it fits next to a card title.
 */
import { useId, type ComponentType, type ReactElement } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { aqSpring } from '@shared/motion';
import type { IconProps } from '@shared/icons';

export type SegmentedOption = {
  value: string;
  label: string;
  icon?: ComponentType<IconProps>;
};

export type SegmentedControlProps = {
  /** Current selected value (matches one of `options[].value`). */
  value: string;
  /** Called with the next value when the user picks a segment. */
  onChange: (next: string) => void;
  /** Options in the order they appear. */
  options: ReadonlyArray<SegmentedOption>;
  /** Visual size. Currently both sizes use compact padding; `md` adds a touch more horizontal padding. */
  size?: 'sm' | 'md';
  /** Accessible group label. */
  ariaLabel?: string;
};

export function SegmentedControl({
  value,
  onChange,
  options,
  size = 'sm',
  ariaLabel,
}: SegmentedControlProps): ReactElement {
  const padding = size === 'md' ? 'px-3 py-1' : 'px-2.5 py-1';
  // Per-instance id so each control owns its own sliding pill — a shared
  // layoutId would make pills animate between separate controls on the page.
  const pillId = useId();
  const reduce = useReducedMotion();

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="bg-aq-zebra border-aq-border inline-flex items-center gap-0.5 rounded-md border p-0.5"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={[
              'text-aq-xs relative inline-flex cursor-pointer items-center gap-1.5 rounded-md font-medium',
              'focus-visible:outline-aq-accent focus-visible:outline-2 focus-visible:outline-offset-1',
              padding,
              active ? 'text-aq-ink' : 'text-aq-ink-soft hover:text-aq-ink',
            ].join(' ')}
          >
            {active ? (
              <motion.span
                layoutId={pillId}
                aria-hidden="true"
                className="bg-aq-surface shadow-aq-card absolute inset-0 rounded-md"
                transition={reduce ? { duration: 0 } : aqSpring}
              />
            ) : null}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {Icon ? <Icon size={12} /> : null}
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
