import { forwardRef, type ButtonHTMLAttributes, type ComponentType, type ReactNode } from 'react';
import type { IconProps } from '@shared/icons';

export type GradientButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  onClick?: () => void;
  leading?: ComponentType<IconProps>;
  size?: 'sm' | 'md';
  type?: 'button' | 'submit';
  disabled?: boolean;
  loading?: boolean;
  children: ReactNode;
};

const ICON_PX: Record<'sm' | 'md', number> = { sm: 12, md: 14 };

/**
 * The single "AI authoring" affordance. Gradient from `aq-ai-from` to
 * `aq-ai-to` (tokens, never hex). Used by the policy intent chooser AI row
 * and the PolicyStudio header. Distinct on purpose: AI is the only gradient
 * in the system.
 */
export const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
  function GradientButton(
    {
      onClick,
      leading: Leading,
      size = 'sm',
      type = 'button',
      disabled = false,
      loading = false,
      children,
      className,
      ...rest
    },
    ref
  ) {
    const isDisabled = disabled || loading;
    const iconPx = ICON_PX[size];
    const pad = size === 'md' ? 'px-3.5 py-2 text-aq-body' : 'px-3 py-1.5 text-aq-caption';

    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={[
          'aq-ai-gradient shadow-aq-card inline-flex items-center gap-1.5 rounded-md font-semibold',
          'text-aq-ink-on transition-opacity hover:opacity-90',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          pad,
          className ?? '',
        ].join(' ')}
        {...rest}
      >
        {loading ? (
          <Spinner size={iconPx} />
        ) : Leading ? (
          <Leading size={iconPx} stroke={1.8} />
        ) : null}
        {children}
      </button>
    );
  }
);

function Spinner({ size }: { size: number }): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="motion-safe:animate-spin"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default GradientButton;
