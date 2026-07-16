/**
 * ListRow — canonical row primitive for vertical stacks of items.
 *
 * Mirrors the Figma ListRow component (Density variant + leading/trailing
 * slot booleans + title/meta text). Replaces ~8 ad-hoc row components in
 * features/team (JoinRequestRow, SessionRow, DeviceApprovalRow,
 * WorkspaceRow, DangerZoneRow, Row in MemberRelationships, etc).
 *
 * Slots:
 *   leading   — any ReactNode (Avatar, icon glyph, BrandIcon)
 *   trailing  — any ReactNode (Chip, action button cluster, arrow)
 *   title     — primary line (semibold ink)
 *   meta      — secondary line (caption ink-muted)
 *
 * Click handling: pass onClick to make the entire row interactive.
 * Without it, the row is a static <div>.
 */
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { IconArrowRight } from '@shared/icons';

export type ListRowDensity = 'cozy' | 'compact';

export type ListRowProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> & {
  density?: ListRowDensity;
  leading?: ReactNode;
  trailing?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  /** When provided, the row becomes interactive (button-like, with hover +
   *  trailing chevron when no trailing slot is set). */
  onClick?: () => void;
  /** Render the row as a card (own border + radius + shadow) rather than
   *  inside a parent bordered list. Default: true. */
  asCard?: boolean;
};

const PADDING_Y: Record<ListRowDensity, string> = {
  cozy: 'py-3',
  compact: 'py-2',
};

export const ListRow = forwardRef<HTMLDivElement, ListRowProps>(function ListRow(
  { density = 'cozy', leading, trailing, title, meta, onClick, asCard = true, className, ...rest },
  ref
) {
  const clickable = Boolean(onClick);
  const baseCls = [
    'flex items-center gap-3 px-3.5',
    PADDING_Y[density],
    asCard ? 'border-aq-border bg-aq-surface rounded-lg border' : 'bg-aq-surface',
    clickable ? 'hover:bg-aq-zebra cursor-pointer transition-colors text-left w-full' : '',
    className ?? '',
  ].join(' ');

  const content = (
    <>
      {leading ? <span className="shrink-0">{leading}</span> : null}
      <div className="min-w-0 flex-1">
        <div className="text-aq-sm text-aq-ink truncate font-semibold">{title}</div>
        {meta ? (
          <div className="text-aq-ink-muted text-aq-caption mt-0.5 truncate">{meta}</div>
        ) : null}
      </div>
      {trailing ? (
        <span className="shrink-0">{trailing}</span>
      ) : clickable ? (
        <IconArrowRight size={12} stroke={2} className="text-aq-ink-muted shrink-0" />
      ) : null}
    </>
  );

  if (clickable) {
    return (
      <button
        ref={ref as unknown as React.Ref<HTMLButtonElement>}
        type="button"
        onClick={onClick}
        className={baseCls}
      >
        {content}
      </button>
    );
  }

  return (
    <div ref={ref} className={baseCls} {...rest}>
      {content}
    </div>
  );
});

export default ListRow;
