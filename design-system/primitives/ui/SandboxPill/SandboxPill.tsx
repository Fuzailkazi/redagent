/**
 * SandboxPill — tiny pill that surfaces an org's mode.
 *
 * Variants:
 *   - sandbox     → renders "Demo" in info tone.
 *   - production  → renders nothing (production is the implicit default and
 *                   does not need a pill cluttering the chrome).
 *   - activating  → renders "Activating" in info tone with a spinner.
 *
 * Sizes:
 *   - sm  text-aq-caption px-1.5 py-0.5 rounded-aq-xs
 *   - md  text-aq-xs       px-2   py-0.5 rounded-md
 */
import type { ReactElement } from 'react';
import { IconRefresh } from '@shared/icons';

export type SandboxPillMode = 'sandbox' | 'production' | 'activating';
export type SandboxPillSize = 'sm' | 'md';

export type SandboxPillProps = {
  mode: SandboxPillMode;
  size?: SandboxPillSize;
  /** Override the default label (rarely needed). */
  label?: string;
  className?: string;
};

const TONE_CLS: Record<Exclude<SandboxPillMode, 'production'>, string> = {
  sandbox: 'bg-aq-info-soft text-aq-info border-aq-info/30',
  activating: 'bg-aq-info-soft text-aq-info border-aq-info/30',
};

const DOT_CLS: Record<Exclude<SandboxPillMode, 'production'>, string> = {
  sandbox: 'bg-aq-info',
  activating: 'bg-aq-info',
};

const DEFAULT_LABEL: Record<Exclude<SandboxPillMode, 'production'>, string> = {
  sandbox: 'Demo',
  activating: 'Activating',
};

const SIZE_CLS: Record<SandboxPillSize, string> = {
  sm: 'text-aq-caption px-1.5 py-0.5 rounded-aq-xs gap-1',
  md: 'text-aq-xs px-2 py-0.5 rounded-md gap-1.5',
};

const DOT_SIZE: Record<SandboxPillSize, string> = {
  sm: 'h-1 w-1',
  md: 'h-1.5 w-1.5',
};

export function SandboxPill({
  mode,
  size = 'sm',
  label,
  className,
}: SandboxPillProps): ReactElement | null {
  if (mode === 'production') return null;

  const text = label ?? DEFAULT_LABEL[mode];

  return (
    <span
      className={[
        'inline-flex items-center border font-semibold whitespace-nowrap',
        SIZE_CLS[size],
        TONE_CLS[mode],
        className ?? '',
      ].join(' ')}
    >
      {mode === 'activating' ? (
        <span className="inline-flex shrink-0 items-center motion-safe:animate-spin">
          <IconRefresh size={size === 'sm' ? 9 : 11} stroke={2.2} />
        </span>
      ) : (
        <span
          aria-hidden="true"
          className={['inline-block shrink-0 rounded-full', DOT_SIZE[size], DOT_CLS[mode]].join(
            ' '
          )}
        />
      )}
      <span>{text}</span>
    </span>
  );
}

export default SandboxPill;
