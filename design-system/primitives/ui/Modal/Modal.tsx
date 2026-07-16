/**
 * Modal — centered overlay dialog.
 *
 * The companion to `SideModal` (a right drawer): this is a centered dialog for
 * confirmations and short focused flows (transfer ownership, dependency-aware
 * remove, delete confirms). Esc closes, backdrop click closes, body scroll
 * locks, rendered through a portal.
 *
 * Visual contract (Phase 5 cleanup):
 *   - No outer border on the panel; only shadow-aq-modal and rounded-xl.
 *   - No internal borders between header / body / footer.
 *   - Header is just the title (no icon chip, no eyebrow).
 *   - Close button is pushed into the true top-right corner.
 *
 * The `tone` and `icon` props are still accepted to keep call sites unchanged,
 * but they are intentionally ignored visually here — destructive intent is
 * conveyed by the action buttons in the footer, not by header chrome.
 */
import {
  useCallback,
  useEffect,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { modalVariants, reducedFade, scrimVariants } from '@shared/motion';
import { type IconProps } from '@shared/icons';
import { Button } from '../Button';

export type ModalTone = 'accent' | 'warn' | 'bad' | 'good' | 'info';

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Accepted for API stability; not rendered in the simplified header. */
  icon?: ComponentType<IconProps>;
  /** Accepted for API stability; tone is conveyed by footer actions. */
  tone?: ModalTone;
  /** Max width in px. Defaults to 560. Callers that want a tighter dialog
   *  can still pass a smaller value (e.g. 420 for short delete confirms). */
  width?: number;
  /** Action row rendered in the footer. */
  footer?: ReactNode;
  children: ReactNode;
};

export function Modal({
  open,
  onClose,
  title,
  width = 560,
  footer,
  children,
}: ModalProps): ReactElement | null {
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

  // Portal stays mounted so AnimatePresence can play the close animation
  // before the dialog leaves the tree.
  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
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
            className="bg-aq-surface shadow-aq-modal relative flex max-h-[90vh] w-full flex-col rounded-xl"
            style={{ maxWidth: width }}
            variants={card}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-aq-ink-muted hover:bg-aq-zebra hover:text-aq-ink absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-md"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <header className="px-6 pt-5 pr-12">
              <h2 className="text-aq-md m-0 font-bold">{title}</h2>
            </header>

            <div className="flex-1 overflow-auto px-6 py-5">{children}</div>

            {footer ? <div className="flex justify-end gap-2 px-6 pt-2 pb-5">{footer}</div> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

/**
 * Modal footer button wrappers. Thin convenience around <Button>: existing
 * Modal callers can keep importing ModalPrimaryButton / ModalSecondaryButton
 * unchanged, but they now resolve to the canonical Button primitive so the
 * visual contract stays consistent across the app.
 */
export function ModalPrimaryButton({
  onClick,
  children,
  disabled,
  tone = 'accent',
}: {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  tone?: 'accent' | 'bad';
}): ReactElement {
  return (
    <Button
      variant={tone === 'bad' ? 'danger' : 'primary'}
      size="md"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}

export function ModalSecondaryButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}): ReactElement {
  return (
    <Button variant="secondary" size="md" onClick={onClick}>
      {children}
    </Button>
  );
}
