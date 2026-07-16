/**
 * Chip — the canonical chip primitive.
 *
 * Mirrors the ArmorIQ Foundations Figma Chip component set:
 *   tone:      neutral | accent | good | warn | bad | info
 *   selected:  false | true
 *   removable: false | true   (renders an x button trailing)
 *
 * Plus an optional leading icon slot. The boundary between "passive label
 * chip" (selected=false), "active filter chip" (selected=true, removable),
 * and "status pill" (selected=false, tone=good/warn/bad) is one component
 * with three props — replaces RoleBadge, LevelChip, MemberStatusPill, and
 * every ad-hoc "rounded-full border px-2 py-0.5" copy in the codebase.
 */
import {
  forwardRef,
  type ComponentType,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { IconX, type IconProps } from '@shared/icons';

export type ChipTone = 'neutral' | 'accent' | 'good' | 'warn' | 'bad' | 'info';
export type ChipSize = 'sm' | 'md';

export type ChipProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children' | 'onClick'> & {
  tone?: ChipTone;
  size?: ChipSize;
  selected?: boolean;
  removable?: boolean;
  /** Optional leading icon. */
  leading?: ComponentType<IconProps>;
  /** Called when the user clicks the chip itself. If provided, the chip
   *  becomes a button. */
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  /** Called when the user clicks the trailing x. Required when removable. */
  onRemove?: (e: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
};

/* Tone × Selected matrix matches the Figma variant table exactly. */
const TONE_REST: Record<ChipTone, string> = {
  neutral: 'bg-aq-surface text-aq-ink-soft border-aq-border',
  accent: 'bg-aq-accent-soft text-aq-accent-strong border-transparent',
  good: 'bg-aq-good-soft text-aq-good border-transparent',
  warn: 'bg-aq-warn-soft text-aq-warn border-transparent',
  bad: 'bg-aq-bad-soft text-aq-bad border-transparent',
  info: 'bg-aq-info-soft text-aq-info border-transparent',
};

const TONE_SELECTED: Record<ChipTone, string> = {
  neutral: 'bg-aq-surface text-aq-ink border-aq-border-strong',
  accent: 'bg-aq-accent-soft text-aq-accent-strong border-aq-accent',
  good: 'bg-aq-good-soft text-aq-good border-aq-good',
  warn: 'bg-aq-warn-soft text-aq-warn border-aq-warn',
  bad: 'bg-aq-bad-soft text-aq-bad border-aq-bad',
  info: 'bg-aq-info-soft text-aq-info border-aq-info',
};

const SIZE_CLS: Record<ChipSize, string> = {
  sm: 'h-5 px-2 gap-1 text-aq-caption',
  md: 'h-6 px-2.5 gap-1.5 text-aq-xs',
};

const ICON_PX: Record<ChipSize, number> = { sm: 10, md: 11 };

export const Chip = forwardRef<HTMLElement, ChipProps>(function Chip(
  {
    tone = 'neutral',
    size = 'md',
    selected = false,
    removable = false,
    leading: LeadingIcon,
    onClick,
    onRemove,
    children,
    className,
    ...rest
  },
  ref
) {
  const ToneClass = selected ? TONE_SELECTED[tone] : TONE_REST[tone];
  const iconPx = ICON_PX[size];

  const content = (
    <>
      {LeadingIcon ? <LeadingIcon size={iconPx} stroke={1.8} /> : null}
      <span className="truncate font-medium">{children}</span>
      {removable ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.(e);
          }}
          aria-label="Remove"
          className="-mr-0.5 inline-flex items-center text-current/70 hover:text-current"
        >
          <IconX size={iconPx} stroke={2.2} />
        </button>
      ) : null}
    </>
  );

  const base = [
    'inline-flex shrink-0 items-center rounded-full border transition-colors',
    SIZE_CLS[size],
    ToneClass,
    className ?? '',
  ].join(' ');

  if (onClick) {
    return (
      <button
        ref={ref as unknown as React.Ref<HTMLButtonElement>}
        type="button"
        onClick={onClick}
        aria-pressed={selected || undefined}
        className={base + ' cursor-pointer hover:brightness-95'}
        {...(rest as HTMLAttributes<HTMLButtonElement>)}
      >
        {content}
      </button>
    );
  }

  return (
    <span ref={ref} className={base} {...rest}>
      {content}
    </span>
  );
});

export default Chip;
