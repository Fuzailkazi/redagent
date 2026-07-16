/**
 * Popover — anchor-relative overlay primitive.
 *
 * A lightweight, accessible overlay that positions itself relative to an
 * anchor element on the page. Used by the header controls (account menu,
 * notifications, role switcher) and any other surface that needs a
 * "dropdown" without the weight of a full modal.
 *
 * Behaviour:
 *   - Position is computed from `anchorRef.getBoundingClientRect()` at the
 *     requested `placement`, recomputed on window resize and scroll and on
 *     anchor size changes (via ResizeObserver).
 *   - Esc closes.
 *   - Outside-click closes (mousedown listener on document; ignored if the
 *     event target lives inside the panel or the anchor).
 *   - On open: focus moves to the first focusable child inside the panel.
 *   - On close: focus is restored to the anchor element.
 *   - Rendered via `createPortal` into `document.body` so it composes
 *     correctly with any layout.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { dropdownVariants, reducedFade } from '@shared/motion';

export type PopoverPlacement =
  | 'bottom-end'
  | 'bottom-start'
  | 'bottom-center'
  | 'top-end'
  | 'top-start';

export type PopoverProps = {
  /** Controls visibility. When false, nothing is rendered. */
  open: boolean;
  /** Called when the user dismisses the popover (Esc or outside-click). */
  onClose: () => void;
  /** The element the popover anchors to. */
  anchorRef: RefObject<HTMLElement | null>;
  /** Where the popover sits relative to the anchor. Defaults to bottom-end. */
  placement?: PopoverPlacement;
  /** Fixed width in px. If omitted, the panel sizes to its content. */
  width?: number;
  /** Optional accessibility label for the panel container. */
  ariaLabel?: string;
  /** Panel content. */
  children: ReactNode;
};

type Position = { top: number; left: number };

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Breathing gutter kept between the panel and every viewport edge (px). */
const MARGIN = 12;

export function Popover({
  open,
  onClose,
  anchorRef,
  placement = 'bottom-end',
  width,
  ariaLabel,
  children,
}: PopoverProps): ReactElement | null {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const reduce = useReducedMotion();

  // Compute panel position relative to the anchor. Called on open, on every
  // resize/scroll, and whenever the anchor itself changes size.
  const computePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const aRect = anchor.getBoundingClientRect();
    const pRect = panel.getBoundingClientRect();
    const gap = 6;
    // Vertical: `top-*` placements sit above the anchor; everything else below.
    const isTop = placement === 'top-start' || placement === 'top-end';
    let top = isTop ? aRect.top - pRect.height - gap : aRect.bottom + gap;
    let left: number;
    if (placement === 'bottom-start' || placement === 'top-start') {
      left = aRect.left;
    } else if (placement === 'bottom-center') {
      left = aRect.left + aRect.width / 2 - pRect.width / 2;
    } else {
      // bottom-end / top-end
      left = aRect.right - pRect.width;
    }

    // Clamp into the viewport so the panel never spills off-screen — this is
    // what keeps every popover (filter, notifications, create, sort, legend)
    // fully on a phone screen, where a fixed-width panel anchored bottom-end is
    // routinely wider than the gap to the left edge. MARGIN keeps a small
    // breathing gutter from the edges.
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxLeft = Math.max(MARGIN, vw - pRect.width - MARGIN);
    left = Math.min(Math.max(left, MARGIN), maxLeft);
    const maxTop = Math.max(MARGIN, vh - pRect.height - MARGIN);
    top = Math.min(Math.max(top, MARGIN), maxTop);

    setPosition({ top, left });
  }, [anchorRef, placement]);

  // Position the panel on open, and keep it positioned across resize/scroll
  // and anchor size changes.
  useLayoutEffect(() => {
    // Keep the last position while closing so AnimatePresence can play the
    // exit animation in place rather than snapping the panel off-screen.
    if (!open) return;
    computePosition();
    const onScroll = (): void => computePosition();
    const onResize = (): void => computePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    const anchor = anchorRef.current;
    let observer: ResizeObserver | null = null;
    if (anchor && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => computePosition());
      observer.observe(anchor);
    }
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      observer?.disconnect();
    };
  }, [open, computePosition, anchorRef]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Outside-click to close. Ignored when the click lands inside the panel or
  // the anchor (so the same trigger can toggle without immediately reopening).
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent): void => {
      const target = e.target as Node | null;
      if (!target) return;
      const panel = panelRef.current;
      const anchor = anchorRef.current;
      if (panel && panel.contains(target)) return;
      if (anchor && anchor.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open, onClose, anchorRef]);

  // Focus management: move focus into the panel on open, restore to anchor on
  // close. We capture the anchor at open-time so the restore target is stable
  // even if the parent re-renders.
  useEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    // Defer to next frame so the panel is mounted and laid out.
    const id = window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const first = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (first) {
        first.focus();
      } else {
        panel.focus();
      }
    });
    return () => {
      window.cancelAnimationFrame(id);
      // Restore focus to the anchor on close.
      if (anchor) {
        anchor.focus();
      }
    };
  }, [open, anchorRef]);

  if (typeof document === 'undefined') {
    return null;
  }

  // Cap the panel width to the viewport (minus gutters) so a fixed `width`
  // wider than a phone screen is never honoured. `maxWidth` covers the
  // content-sized (no explicit width) case too.
  const maxPanelWidth = typeof window !== 'undefined' ? `calc(100vw - ${MARGIN * 2}px)` : undefined;

  // While we wait for the first layout pass, render the panel off-screen but
  // measurable so `getBoundingClientRect` returns real width/height.
  const style: React.CSSProperties = position
    ? { top: position.top, left: position.left, width, maxWidth: maxPanelWidth }
    : { top: -9999, left: -9999, width, maxWidth: maxPanelWidth, visibility: 'hidden' };

  // Origin-aware grow: the panel unfolds from the corner nearest its anchor.
  const isTop = placement === 'top-start' || placement === 'top-end';
  const originY = isTop ? 'bottom' : 'top';
  const originX = placement.endsWith('start')
    ? 'left'
    : placement === 'bottom-center'
      ? 'center'
      : 'right';
  const variants = reduce ? reducedFade : dropdownVariants;

  // Portal stays mounted so the close animation can play before unmount.
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-label={ariaLabel}
          tabIndex={-1}
          className="bg-aq-surface border-aq-border shadow-aq-popover fixed z-50 rounded-lg border outline-none"
          style={{ ...style, transformOrigin: `${originX} ${originY}` }}
          variants={variants}
          initial="hidden"
          animate={position ? 'visible' : 'hidden'}
          exit="exit"
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
