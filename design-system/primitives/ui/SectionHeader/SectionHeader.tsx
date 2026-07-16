/**
 * SectionHeader — colored icon chip + title + count chip + optional action
 * affordance. Used to head a logical block of content (Relationships
 * groups, Roles distribution, Access section, etc.).
 *
 * Mirrors the Figma SectionHeader component.
 *
 *   <SectionHeader icon={IconBot} tone="accent" title="Agents they own"
 *                  count={3} action="View all" onAction={...} />
 */
import { type ComponentType, type ReactElement } from 'react';
import { IconArrowUpRight, type IconProps } from '@shared/icons';

export type SectionHeaderTone = 'accent' | 'good' | 'warn' | 'bad' | 'info' | 'neutral';

const TONE_CHIP: Record<SectionHeaderTone, string> = {
  accent: 'bg-aq-accent-soft text-aq-accent',
  good: 'bg-aq-good-soft text-aq-good',
  warn: 'bg-aq-warn-soft text-aq-warn',
  bad: 'bg-aq-bad-soft text-aq-bad',
  info: 'bg-aq-info-soft text-aq-info',
  neutral: 'bg-aq-zebra text-aq-ink-soft',
};

export type SectionHeaderProps = {
  icon?: ComponentType<IconProps>;
  tone?: SectionHeaderTone;
  title: string;
  /** Numeric count rendered as a small pill. Omit to hide. */
  count?: number;
  /** Action label, shown trailing. Omit to hide. */
  action?: string;
  onAction?: () => void;
  className?: string;
};

export function SectionHeader({
  icon: Icon,
  tone = 'accent',
  title,
  count,
  action,
  onAction,
  className,
}: SectionHeaderProps): ReactElement {
  return (
    <div className={['flex items-center gap-2.5', className ?? ''].join(' ')}>
      {Icon ? (
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${TONE_CHIP[tone]}`}
        >
          <Icon size={14} stroke={1.8} />
        </span>
      ) : null}
      <h3 className="text-aq-sm text-aq-ink m-0 font-bold">{title}</h3>
      {typeof count === 'number' ? (
        <span className="border-aq-border bg-aq-zebra text-aq-ink-soft text-aq-caption ml-0.5 rounded-full border px-1.5 py-0.5 font-mono font-semibold">
          {count}
        </span>
      ) : null}
      {action ? (
        <button
          type="button"
          onClick={onAction}
          className="text-aq-accent text-aq-caption ml-auto inline-flex items-center gap-1 font-semibold"
        >
          {action}
          <IconArrowUpRight size={10} stroke={2} />
        </button>
      ) : null}
    </div>
  );
}

export default SectionHeader;
