/**
 * Menu / MenuItem — overflow-menu / dropdown primitives.
 *
 * <Menu> is just a vertical auto-layout container; you compose <MenuItem>
 * inside. Pair with <Popover> for an anchored overlay menu (the X-symbol
 * overflow that lives on member header, role card, settings rows, etc).
 *
 * Mirrors the Figma MenuItem variant set (State: default / hover / danger).
 * Replaces OverflowMenu (in roles/), the ad-hoc menu in MemberDetailHeader,
 * and inline scope-picker menus.
 *
 * Hover state is CSS-driven (the variant in Figma is illustrative); in code
 * the `state` prop is reserved for `danger` to red-tint destructive items.
 */
import { type ComponentType, type ReactElement, type ReactNode } from 'react';
import type { IconProps } from '@shared/icons';

export type MenuItemTone = 'default' | 'danger';

export type MenuItemProps = {
  icon?: ComponentType<IconProps>;
  tone?: MenuItemTone;
  disabled?: boolean;
  shortcut?: string;
  onClick?: () => void;
  children: ReactNode;
};

const TONE_CLS: Record<MenuItemTone, string> = {
  default: 'text-aq-ink-soft hover:bg-aq-zebra hover:text-aq-ink',
  danger: 'text-aq-bad hover:bg-aq-bad-soft',
};

export function MenuItem({
  icon: Icon,
  tone = 'default',
  disabled = false,
  shortcut,
  onClick,
  children,
}: MenuItemProps): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'text-aq-sm flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        TONE_CLS[tone],
      ].join(' ')}
    >
      {Icon ? <Icon size={13} stroke={1.8} className="shrink-0" /> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut ? (
        <span className="text-aq-ink-muted text-aq-caption shrink-0 font-mono">{shortcut}</span>
      ) : null}
    </button>
  );
}

export type MenuProps = {
  /** ARIA label for screen readers when the menu has no visible heading. */
  ariaLabel?: string;
  /** Optional width in px. Default: auto (fits content, min 180). */
  width?: number;
  children: ReactNode;
  className?: string;
};

export function Menu({ ariaLabel, width, children, className }: MenuProps): ReactElement {
  return (
    <div
      role="menu"
      aria-label={ariaLabel}
      className={[
        'border-aq-border bg-aq-surface shadow-aq-popover flex flex-col gap-0.5 rounded-md border p-1',
        className ?? '',
      ].join(' ')}
      style={{ minWidth: width ?? 180 }}
    >
      {children}
    </div>
  );
}

export default Menu;
