/**
 * Toggle — accessible pill switch primitive.
 *
 * Renders a real <button role="switch"> so screen readers announce state and
 * keyboards (Space / Enter) flip it. Click flips. The visual is a standard
 * pill: track recolors based on `checked`; knob slides 150ms with a
 * motion-safe transition so reduced-motion users see an instant flip.
 *
 * Two sizes:
 *   sm: 32x18 track, 14px knob — used in dense rows.
 *   md (default): 38x22 track, 16px knob — used in card bodies.
 *
 * Zero dependencies beyond React. Color is driven by aq-* tokens.
 */
import type { ReactElement } from 'react';

export type ToggleProps = {
  /** Current state. */
  checked: boolean;
  /** Called with the next state when the user toggles. */
  onChange: (next: boolean) => void;
  /** When true, the switch is non-interactive and rendered at 50% opacity. */
  disabled?: boolean;
  /** Size variant. Defaults to `md`. */
  size?: 'sm' | 'md';
  /** Accessible label for screen readers. */
  ariaLabel?: string;
};

type Geometry = {
  trackWidth: number;
  trackHeight: number;
  knobSize: number;
  knobOffsetOff: number;
  knobOffsetOn: number;
};

const SIZES: Record<'sm' | 'md', Geometry> = {
  sm: {
    trackWidth: 32,
    trackHeight: 18,
    knobSize: 14,
    knobOffsetOff: 2,
    knobOffsetOn: 16, // 32 - 14 - 2
  },
  md: {
    trackWidth: 38,
    trackHeight: 22,
    knobSize: 16,
    knobOffsetOff: 3,
    knobOffsetOn: 19, // 38 - 16 - 3
  },
};

export function Toggle({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  ariaLabel,
}: ToggleProps): ReactElement {
  const g = SIZES[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex shrink-0 cursor-pointer items-center rounded-full',
        'focus-visible:outline-aq-accent focus-visible:outline-2 focus-visible:outline-offset-2',
        checked ? 'bg-aq-accent' : 'bg-aq-border',
        disabled ? 'cursor-not-allowed opacity-50' : '',
      ].join(' ')}
      style={{ width: g.trackWidth, height: g.trackHeight }}
    >
      <span
        aria-hidden="true"
        className="bg-aq-surface shadow-aq-card absolute rounded-full motion-safe:transition-[left] motion-safe:duration-150"
        style={{
          width: g.knobSize,
          height: g.knobSize,
          top: (g.trackHeight - g.knobSize) / 2,
          left: checked ? g.knobOffsetOn : g.knobOffsetOff,
        }}
      />
    </button>
  );
}
