/**
 * SideModal — Notion-style right drawer.
 *
 * Slides in from the right over a soft scrim. Used for "peek" detail views
 * (an agent row, an MCP server) where the surrounding registry context is
 * still useful. The drawer always exposes an "Open as page →" affordance
 * when `onOpenFullPage` is provided so a peek can be promoted into the
 * full-page detail route.
 *
 * Behaviour:
 *   - Esc key closes.
 *   - Backdrop click closes.
 *   - Body scroll is locked while open.
 *   - Rendered via `createPortal` so it composes correctly with any layout.
 */
import { useCallback, useEffect, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { drawerVariants, reducedFade, scrimVariants } from '@shared/motion';
import { useResizablePanel } from '@shared/hooks/use-resizable-panel';
import { IconArrowUpRight, IconX } from '@shared/icons';
import { ResizeHandle } from '../ResizeHandle';

export type SideModalProps = {
  /** Controls visibility. When false, nothing is rendered. */
  open: boolean;
  /** Called when the user closes the drawer (X, backdrop click, or Esc). */
  onClose: () => void;
  /** Heading rendered at the top of the drawer. */
  title: string;
  /**
   * If provided, a "Open as page →" button is rendered in the drawer header.
   * Used to promote a peek into the full-page detail route.
   */
  onOpenFullPage?: () => void;
  /** Drawer width in px. Defaults to 520. Acts as the default for resizing. */
  width?: number;
  /**
   * Whether the drawer's left edge can be dragged to resize it. On by default
   * so every drawer in the app is resizable. Double-click the handle (or press
   * arrows when focused) to reset to `width`.
   */
  resizable?: boolean;
  /**
   * localStorage key for the persisted resized width. Defaults to a key derived
   * from `title` so each distinct drawer remembers its own width.
   */
  resizeStorageKey?: string;
  /** Body content. Scrollable. */
  children: ReactNode;
};

export function SideModal({
  open,
  onClose,
  title,
  onOpenFullPage,
  width = 520,
  resizable = true,
  resizeStorageKey,
  children,
}: SideModalProps): ReactElement | null {
  // Drag-to-resize from the left edge. Clamped to a readable band; the chosen
  // width persists per-drawer (keyed by title unless an explicit key is given).
  const autoKey = `armoriq:sidemodal-width:${resizeStorageKey ?? title.replace(/\s+/g, '-').toLowerCase()}`;
  const resize = useResizablePanel({
    defaultWidth: width,
    min: 360,
    max: 920,
    storageKey: autoKey,
    label: 'Resize drawer',
  });
  // Esc-to-close. Stable reference so the effect only re-binds when `open`
  // or `onClose` change.
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, handleKey]);

  // Lock body scroll while the drawer is open so the underlying page doesn't
  // jitter when the user scrolls within the drawer.
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
  const panel = reduce ? reducedFade : drawerVariants;

  if (typeof document === 'undefined') {
    return null;
  }

  // Portal stays mounted so AnimatePresence can slide the drawer back out on
  // close instead of unmounting it instantly.
  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-50 flex justify-end"
        >
          {/* Scrim — click to close. */}
          <motion.button
            type="button"
            aria-label="Close drawer"
            onClick={onClose}
            className="bg-aq-scrim absolute inset-0 cursor-default backdrop-blur-sm"
            variants={scrim}
            initial="hidden"
            animate="visible"
            exit="exit"
          />

          {/* Drawer panel. On phones the requested px width routinely exceeds
              the screen, so cap it to the viewport minus a 16px gutter
              (full-bleed-minus-gutter); on desktop the fixed width wins. */}
          <motion.div
            className="bg-aq-surface border-aq-border shadow-aq-modal relative flex h-full flex-col border-l"
            style={{
              width: resizable
                ? `min(${resize.width}px, calc(100vw - 16px))`
                : `min(${width}px, calc(100vw - 16px))`,
            }}
            variants={panel}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {resizable ? (
              <ResizeHandle dragging={resize.dragging} handleProps={resize.handleProps} />
            ) : null}
            <header className="border-aq-border flex items-center gap-3 border-b px-5 py-3.5">
              <h2 className="text-aq-md flex-1 truncate font-bold">{title}</h2>

              {onOpenFullPage && (
                <button
                  type="button"
                  onClick={onOpenFullPage}
                  className="text-aq-ink-soft hover:bg-aq-zebra text-aq-sm flex items-center gap-1.5 rounded-md px-2 py-1 font-medium"
                >
                  <span>Open as page</span>
                  <IconArrowUpRight size={14} stroke={1.8} />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-aq-ink-soft hover:bg-aq-zebra flex h-7 w-7 items-center justify-center rounded-md"
              >
                <IconX size={16} stroke={1.8} />
              </button>
            </header>

            <div className="flex-1 overflow-auto p-5">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
