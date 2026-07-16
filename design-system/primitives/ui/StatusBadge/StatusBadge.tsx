/**
 * StatusBadge — a small status pill: tone + icon + label.
 *
 * The repo had this pattern hand-rolled inline in several routes (policy
 * status chips, enforcement chips, validation marks). This is the one shared
 * primitive promoted out of the policy revamp: a tone maps onto the `aq-*`
 * semantic tokens, and status is always shown with colour PLUS an icon PLUS a
 * label (never colour alone) per the design principles.
 */
import type { ComponentType, ReactElement } from 'react';
import type { IconProps } from '@shared/icons';
import { Shimmer } from '../Shimmer';

export type StatusTone = 'good' | 'warn' | 'bad' | 'info' | 'neutral' | 'accent';

export type StatusBadgeProps = {
  tone: StatusTone;
  label: string;
  /** Optional leading icon (recommended: status is never colour-only). */
  icon?: ComponentType<IconProps>;
  /** Pill (rounded-full, default) or tag (rounded-md). */
  shape?: 'pill' | 'tag';
  /** When true, the label shimmers — use for in-progress states (Running…). */
  shimmer?: boolean;
  /** Extra classes on the wrapper. */
  className?: string;
};

const TONE_CLASS: Record<StatusTone, string> = {
  good: 'bg-aq-good-soft text-aq-good',
  warn: 'bg-aq-warn-soft text-aq-warn',
  bad: 'bg-aq-bad-soft text-aq-bad',
  info: 'bg-aq-info-soft text-aq-info',
  neutral: 'bg-aq-zebra text-aq-ink-soft',
  accent: 'bg-aq-accent-soft text-aq-accent-strong',
};

export function StatusBadge({
  tone,
  label,
  icon: Icon,
  shape = 'pill',
  shimmer = false,
  className,
}: StatusBadgeProps): ReactElement {
  return (
    <span
      className={[
        'text-aq-caption inline-flex items-center gap-1 self-start px-2 py-0.5 font-semibold',
        shape === 'pill' ? 'rounded-full' : 'rounded-md',
        TONE_CLASS[tone],
        className ?? '',
      ].join(' ')}
    >
      {Icon ? <Icon size={10} stroke={2.2} /> : null}
      {shimmer ? <Shimmer>{label}</Shimmer> : label}
    </span>
  );
}
