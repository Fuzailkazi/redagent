/**
 * CommandPalette — centered modal overlay for global search / command surfaces.
 *
 * A focused, dependency-free shell that the caller fills with an input row
 * and a scrollable result list. The palette itself is responsible for:
 *
 *   - Backdrop dimming (click closes).
 *   - Esc to close.
 *   - Body scroll lock while open.
 *   - Portal rendering into `document.body`.
 *
 * The caller decides what the input looks like, what results render, and how
 * keyboard navigation through results works — those concerns belong to the
 * specific palette instance, not the shell.
 */
import { useCallback, useEffect, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type CommandPaletteProps = {
  /** Controls visibility. When false, nothing is rendered. */
  open: boolean;
  /** Called when the user dismisses (Esc or backdrop click). */
  onClose: () => void;
  /** Palette contents — typically an input at the top and a scrollable list below. */
  children: ReactNode;
  /** Optional accessibility label for the dialog. */
  ariaLabel?: string;
};

export function CommandPalette({
  open,
  onClose,
  children,
  ariaLabel,
}: CommandPaletteProps): ReactElement | null {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
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

  // Lock body scroll while the palette is open.
  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel ?? 'Command palette'}
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[14vh]"
    >
      {/* Backdrop — click to close. */}
      <button
        type="button"
        aria-label="Close command palette"
        onClick={onClose}
        className="bg-aq-ink-panel/30 absolute inset-0 cursor-default"
      />

      {/* Panel. */}
      <div
        className="bg-aq-surface border-aq-border shadow-aq-modal relative flex w-full max-w-[640px] flex-col overflow-hidden rounded-lg border"
        style={{ maxHeight: '70vh' }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
