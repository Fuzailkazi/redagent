/**
 * DataCard + DataCardList — the cards-over-tables primitive.
 *
 * On a phone a 6+ column grid is unreadable; horizontal scroll reads as broken.
 * The fix (per Vercel's mobile dashboard guide) is not a collapsing table but a
 * different component: one card per row. The most important field is the card
 * header; 2-3 secondary fields sit in a labelled grid below; everything else
 * lives behind a tap into the detail view.
 *
 *   ┌─────────────────────────────────────────┐
 *   │ [icon] Title                  [status]  │  ← header (+ optional status slot)
 *   │        subtitle                          │
 *   │  LABEL          LABEL                     │  ← fields, 2-up grid
 *   │  value          value                     │
 *   │  ┌─────────────┐ ┌─────────────┐         │  ← optional thumb-zone actions
 *   │  │  Approve    │ │  Reject     │         │
 *   └─────────────────────────────────────────┘
 *
 * Presentational only. The consumer owns data, click → navigation, and the
 * action handlers. Tapping the card body fires `onClick`; action buttons and
 * any element marked `data-stop` do not bubble to it.
 */
import type { ReactElement, ReactNode } from 'react';

export type DataCardField = {
  /** Short uppercase-styled label, e.g. "Owner". */
  label: string;
  /** The value — string or a small node (chip, sparkline, avatar+name). */
  value: ReactNode;
};

export type DataCardProps = {
  /** Optional leading glyph/avatar tile. */
  icon?: ReactNode;
  /** The hero line. */
  title: ReactNode;
  /** Secondary line under the title (muted). */
  subtitle?: ReactNode;
  /** Top-right slot — a StatusBadge / Chip / health dot. */
  status?: ReactNode;
  /** 2-up labelled fields. Keep to the 3 that matter on mobile. */
  fields?: ReadonlyArray<DataCardField>;
  /** Thumb-zone action row (e.g. Approve / Reject). Does not trigger onClick. */
  actions?: ReactNode;
  /** Tap handler for the whole card (→ detail). */
  onClick?: () => void;
  /** Accessible label for the card-level button when onClick is set. */
  ariaLabel?: string;
};

export function DataCard({
  icon,
  title,
  subtitle,
  status,
  fields,
  actions,
  onClick,
  ariaLabel,
}: DataCardProps): ReactElement {
  const interactive = typeof onClick === 'function';
  return (
    <div
      className={[
        'bg-aq-surface border-aq-border rounded-xl border p-3.5',
        interactive ? 'active:bg-aq-zebra transition-colors' : '',
      ].join(' ')}
    >
      {/* Header + body are one tap target into detail; actions are separate. */}
      <div
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? ariaLabel : undefined}
        onClick={interactive ? onClick : undefined}
        onKeyDown={
          interactive
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick?.();
                }
              }
            : undefined
        }
        className={interactive ? 'cursor-pointer outline-none' : undefined}
      >
        <div className="flex items-start gap-3">
          {icon ? <div className="shrink-0">{icon}</div> : null}
          <div className="min-w-0 flex-1">
            <div className="text-aq-base text-aq-ink truncate font-semibold">{title}</div>
            {subtitle ? (
              <div className="text-aq-sm text-aq-ink-muted mt-0.5 truncate">{subtitle}</div>
            ) : null}
          </div>
          {status ? <div className="shrink-0">{status}</div> : null}
        </div>

        {fields && fields.length > 0 ? (
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
            {fields.map((f, i) => (
              <div key={i} className="min-w-0">
                <dt className="text-aq-caption tracking-aq-wider text-aq-ink-muted font-semibold uppercase">
                  {f.label}
                </dt>
                <dd className="text-aq-sm text-aq-ink mt-0.5 truncate">{f.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      {actions ? (
        <div data-stop className="mt-3.5">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export type DataCardListProps = {
  children: ReactNode;
  /** Rendered when there are no children (e.g. a PageState/EmptyState). */
  empty?: ReactNode;
  /** Whether the list currently has items. Drives the empty slot. */
  isEmpty?: boolean;
  className?: string;
};

export function DataCardList({
  children,
  empty,
  isEmpty,
  className,
}: DataCardListProps): ReactElement {
  if (isEmpty && empty) return <>{empty}</>;
  return <div className={['flex flex-col gap-2.5', className ?? ''].join(' ')}>{children}</div>;
}

export default DataCard;
