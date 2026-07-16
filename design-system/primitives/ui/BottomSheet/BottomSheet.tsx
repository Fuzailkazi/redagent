/**
 * BottomSheet — the mobile thumb-zone surface.
 *
 * Slides up from the bottom edge over a soft scrim. This is the touch-first
 * replacement for popovers and menus: a sheet always sits inside the viewport,
 * animates from the reachable bottom of the screen, and gives actions room for
 * 44px+ targets. Modelled on <SideModal>'s portal + scroll-lock + AnimatePresence
 * approach, but rising from the bottom instead of the right.
 *
 * Behaviour:
 *   - Esc closes. Backdrop click closes. A drag-handle affordance reads as
 *     "swipe me down" (the handle itself is also a tap-to-close target).
 *   - Body scroll is locked while open.
 *   - Caps at 85vh; the body scrolls internally past that.
 *   - Honours `env(safe-area-inset-bottom)` so content clears the home bar.
 *   - Rendered via createPortal into document.body.
 *
 * Compose the body freely, or use the <SheetSection> / <SheetOption> helpers
 * for the grouped "Filter by / Sort by / View" list pattern (active option gets
 * a right-aligned check), and pass `footer` for sticky thumb-zone actions.
 */
import { useCallback, useEffect, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { reducedFade, scrimVariants, sheetVariants } from '@shared/motion';
import { IconCheck, IconX } from '@shared/icons';

export type BottomSheetProps = {
  /** Controls visibility. When false, nothing is rendered (after exit anim). */
  open: boolean;
  /** Called when the user dismisses (handle, backdrop, X, or Esc). */
  onClose: () => void;
  /** Optional heading shown in the sheet's grab bar row. */
  title?: string;
  /** Optional sticky footer (thumb-zone actions). Sits above the safe area. */
  footer?: ReactNode;
  /** Optional aria-label when no visible title is given. */
  ariaLabel?: string;
  /** Sheet body. Scrolls internally when tall. */
  children: ReactNode;
};

export function BottomSheet({
  open,
  onClose,
  title,
  footer,
  ariaLabel,
  children,
}: BottomSheetProps): ReactElement | null {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, handleKey]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const reduce = useReducedMotion();
  const scrim = reduce ? reducedFade : scrimVariants;
  const panel = reduce ? reducedFade : sheetVariants;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title ?? ariaLabel}
          className="fixed inset-0 z-50 flex items-end justify-center"
        >
          {/* Scrim */}
          <motion.button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="bg-aq-scrim absolute inset-0 cursor-default"
            variants={scrim}
            initial="hidden"
            animate="visible"
            exit="exit"
          />

          {/* Sheet panel */}
          <motion.div
            className="bg-aq-surface border-aq-border shadow-aq-modal relative flex max-h-[85vh] w-full flex-col rounded-t-2xl border-t"
            variants={panel}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Grab bar: the handle is the visual swipe-down affordance and a
                tap-to-close target. Title (if any) and close X share the row. */}
            <div className="relative shrink-0 px-4 pt-2.5 pb-1">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="bg-aq-border-strong mx-auto block h-1.5 w-10 rounded-full"
              />
              {title ? (
                <div className="mt-2 flex items-center justify-between">
                  <h2 className="text-aq-md text-aq-ink m-0 font-bold">{title}</h2>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="text-aq-ink-soft hover:bg-aq-zebra -mr-1 flex h-9 w-9 items-center justify-center rounded-md"
                  >
                    <IconX size={18} stroke={1.8} />
                  </button>
                </div>
              ) : null}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 pb-3">{children}</div>

            {/* Sticky footer (thumb-zone actions), padded for the home bar. */}
            {footer ? (
              <div
                className="border-aq-border bg-aq-surface shrink-0 border-t px-4 pt-3"
                style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
              >
                {footer}
              </div>
            ) : (
              <div
                aria-hidden="true"
                style={{ height: 'env(safe-area-inset-bottom)' }}
                className="shrink-0"
              />
            )}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

/* ───────────────────────── grouped option pattern ─────────────────────────
 * The "Filter by / Sort by / View" shape from Vercel's mobile sheets: a muted
 * section label, then full-width rows with an optional leading icon and a
 * right-aligned check on the active row. */

export function SheetSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section className="border-aq-border border-b py-2 last:border-b-0">
      <div className="text-aq-caption tracking-aq-wider text-aq-ink-muted px-1 py-1.5 font-semibold uppercase">
        {label}
      </div>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

export function SheetOption({
  label,
  icon: Icon,
  active = false,
  onClick,
}: {
  label: string;
  icon?: (props: { size?: number; stroke?: number }) => ReactElement;
  active?: boolean;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="text-aq-base text-aq-ink hover:bg-aq-zebra flex min-h-[44px] w-full items-center gap-3 rounded-md px-1 text-left font-medium"
    >
      {Icon ? (
        <span className="text-aq-ink-soft flex w-5 shrink-0 justify-center">
          <Icon size={18} stroke={1.8} />
        </span>
      ) : null}
      <span className="flex-1">{label}</span>
      {active ? (
        <IconCheck size={18} stroke={2.2} className="text-aq-accent-strong shrink-0" />
      ) : null}
    </button>
  );
}

export default BottomSheet;
