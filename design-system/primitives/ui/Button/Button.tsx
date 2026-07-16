/**
 * Button — the canonical button primitive.
 *
 * Mirrors the ArmorIQ Foundations Figma Button component set:
 *   variant: primary | secondary | tertiary | ghost | danger | dangerSoft
 *   size:    sm | md         (the variant matrix is intentionally smaller in
 *                             Figma — sm/md cover every use site today; xs is
 *                             a code-only convenience for tight chrome rows)
 *
 * Boolean knobs the design system needs but the Figma matrix doesn't multiply
 * (kept as React-level props so they stay cheap):
 *   iconOnly: turns the button into a square; label becomes the aria-label
 *   loading:  swaps the leading slot for a spinner, disables interaction
 *   leading / trailing: slot props for an icon component (default: undefined)
 *
 * Replaces 367 ad-hoc `<button>` sites + Modal's bespoke
 * `ModalPrimaryButton` / `ModalSecondaryButton`. Both of those keep working
 * as re-exports for now so existing Modal callers don't churn; the migration
 * sweep folds them in later.
 */
import { forwardRef, type ButtonHTMLAttributes, type ComponentType, type ReactNode } from 'react';
import type { IconProps } from '@shared/icons';
import { MatrixLoader } from '../MatrixLoader';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'ghost'
  | 'danger'
  | 'dangerSoft';

export type ButtonSize = 'xs' | 'sm' | 'md';

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Hides the label, makes the button square. `children` becomes aria-label. */
  iconOnly?: boolean;
  /** Replaces the leading slot with a spinner; disables interaction. */
  loading?: boolean;
  leading?: ComponentType<IconProps>;
  trailing?: ComponentType<IconProps>;
  /** Visible label. With iconOnly, this is read as aria-label only. */
  children?: ReactNode;
};

const VARIANT_CLS: Record<ButtonVariant, string> = {
  primary: 'bg-aq-accent text-aq-ink-on hover:bg-aq-accent-strong',
  secondary: 'bg-aq-surface text-aq-ink-soft border-aq-border border hover:bg-aq-zebra',
  tertiary: 'bg-transparent text-aq-accent-strong hover:bg-aq-accent-soft',
  ghost: 'bg-transparent text-aq-ink-soft hover:bg-aq-zebra',
  danger: 'bg-aq-bad text-aq-ink-on hover:bg-aq-bad/90',
  dangerSoft: 'bg-aq-bad-soft text-aq-bad border-aq-bad/30 border hover:bg-aq-bad-soft/70',
};

const SIZE_CLS: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-aq-caption gap-1',
  sm: 'h-8 px-3 text-aq-xs gap-1.5',
  md: 'h-10 px-3.5 text-aq-sm gap-1.5',
};

const ICON_SIZE: Record<ButtonSize, number> = { xs: 11, sm: 12, md: 13 };

const ICON_ONLY_PAD: Record<ButtonSize, string> = {
  xs: 'h-7 w-7 p-0',
  sm: 'h-8 w-8 p-0',
  md: 'h-10 w-10 p-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    iconOnly = false,
    loading = false,
    leading: LeadingIcon,
    trailing: TrailingIcon,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading;
  const iconPx = ICON_SIZE[size];

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-label={iconOnly && typeof children === 'string' ? children : rest['aria-label']}
      className={[
        // `transition` (not just `-colors`) so the press scale tweens too; the
        // tactile dip on press is what makes every button across the app feel
        // alive. motion-safe-gated and disabled when the button is disabled.
        'inline-flex shrink-0 items-center justify-center rounded-md font-semibold transition duration-150 ease-out',
        'disabled:cursor-not-allowed disabled:opacity-60',
        !isDisabled ? 'motion-safe:active:scale-[0.97]' : '',
        VARIANT_CLS[variant],
        iconOnly ? ICON_ONLY_PAD[size] : SIZE_CLS[size],
        className ?? '',
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        // Inline-action loader (loading-system rule): the orbit MatrixLoader —
        // the brand dot-matrix with a comet spinning around its edge — replaces
        // the old ring spinner so every loading button reads as ArmorIQ.
        <MatrixLoader pattern="orbit" size="sm" />
      ) : LeadingIcon ? (
        <LeadingIcon size={iconPx} stroke={1.8} />
      ) : null}
      {!iconOnly ? <span className="truncate">{children}</span> : null}
      {TrailingIcon && !iconOnly && !loading ? <TrailingIcon size={iconPx} stroke={1.8} /> : null}
    </button>
  );
});

export default Button;
