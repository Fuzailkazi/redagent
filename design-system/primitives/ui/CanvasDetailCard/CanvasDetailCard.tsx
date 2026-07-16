/**
 * CanvasDetailCard — a pinned detail panel for an infinite canvas.
 *
 * Renders as an absolutely-positioned overlay against the RIGHT EDGE of its
 * positioned parent (the canvas wrapper), OUTSIDE the canvas transform — so it
 * stays fixed and does NOT pan/zoom with the graph. Appears only when `open`.
 * Identical behaviour inline and inside the full-screen canvas modal (both put
 * a `relative` wrapper around the canvas + this card).
 *
 * The parent MUST be `position: relative`.
 */
import { type ComponentType, type ReactElement, type ReactNode } from 'react';
import { IconX, type IconProps } from '@shared/icons';

export type CanvasDetailCardProps = {
  open: boolean;
  onClose: () => void;
  /** Header eyebrow (e.g. node kind). */
  eyebrow?: string;
  title: string;
  /** Optional header icon chip. */
  icon?: ComponentType<IconProps>;
  /** Scrollable body. */
  children: ReactNode;
  /** Optional sticky footer (e.g. a primary action). */
  footer?: ReactNode;
  /** Card width in px. Default 320. */
  width?: number;
};

export function CanvasDetailCard({
  open,
  onClose,
  eyebrow,
  title,
  icon: Icon,
  children,
  footer,
  width = 320,
}: CanvasDetailCardProps): ReactElement | null {
  if (!open) return null;
  return (
    <aside
      className="border-aq-border bg-aq-surface shadow-aq-modal absolute top-3 right-3 bottom-3 z-20 flex flex-col overflow-hidden rounded-xl border motion-safe:transition-opacity motion-safe:duration-150"
      style={{ width }}
      aria-label={`${eyebrow ?? 'Node'} detail`}
    >
      <header className="border-aq-border flex items-center gap-2.5 border-b px-4 py-3">
        {Icon ? (
          <span className="bg-aq-accent-soft text-aq-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
            <Icon size={16} stroke={1.8} />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <div className="text-aq-ink-muted text-aq-caption tracking-aq-wider font-semibold uppercase">
              {eyebrow}
            </div>
          ) : null}
          <div className="text-aq-ink truncate font-semibold">{title}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-aq-ink-soft hover:bg-aq-zebra flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
        >
          <IconX size={15} stroke={1.8} />
        </button>
      </header>

      <div className="flex-1 overflow-auto px-4 py-4">{children}</div>

      {footer ? <footer className="border-aq-border border-t px-4 py-3">{footer}</footer> : null}
    </aside>
  );
}

export default CanvasDetailCard;
