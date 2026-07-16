/**
 * CanvasModal — the expanded ("full screen") view for an infinite canvas: a
 * centre-wide, almost full-size panel over the default blurred 40% scrim
 * (`bg-aq-scrim backdrop-blur-sm`). Generic: pass the canvas as children. Esc
 * or a backdrop click closes; body scroll locks while open.
 *
 * Shared by the Plans flow canvas and the Discovery topology canvas so the
 * full-screen behaviour (and the pinned detail card inside it) is identical.
 */
import { useCallback, useEffect, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { modalVariants, reducedFade, scrimVariants } from '@shared/motion';
import { IconX } from '@shared/icons';

export type CanvasModalProps = {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  /** Optional right-aligned header slot (e.g. a status badge). */
  headerRight?: ReactNode;
  /** The canvas. Fills the modal body. */
  children: ReactNode;
};

export function CanvasModal({
  open,
  onClose,
  eyebrow,
  title,
  headerRight,
  children,
}: CanvasModalProps): ReactElement | null {
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
  const card = reduce ? reducedFade : modalVariants;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
        >
          <motion.button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="bg-aq-scrim absolute inset-0 cursor-default backdrop-blur-sm"
            variants={scrim}
            initial="hidden"
            animate="visible"
            exit="exit"
          />
          <motion.div
            className="bg-aq-surface border-aq-border shadow-aq-modal relative flex flex-col overflow-hidden rounded-xl border"
            style={{ width: '92vw', height: '88vh' }}
            variants={card}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <header className="border-aq-border flex shrink-0 items-center gap-3 border-b px-5 py-3">
              <div className="min-w-0 flex-1">
                {eyebrow ? (
                  <div className="text-aq-ink-muted text-aq-caption tracking-aq-wider font-semibold uppercase">
                    {eyebrow}
                  </div>
                ) : null}
                <div className="text-aq-md truncate font-bold">{title}</div>
              </div>
              {headerRight}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-aq-ink-soft hover:bg-aq-zebra flex h-8 w-8 items-center justify-center rounded-md"
              >
                <IconX size={16} stroke={1.8} />
              </button>
            </header>
            <div className="relative min-h-0 flex-1">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

export default CanvasModal;
