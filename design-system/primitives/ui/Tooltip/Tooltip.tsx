/**
 * Tooltip — hover/focus hint anchored to a trigger.
 *
 * Mirrors transitions.dev "tooltip": a short delay, then a fade + slight
 * scale-up in; instant out. Wrap any focusable element:
 *
 *   <Tooltip label="Copy id"><button>…</button></Tooltip>
 *
 * The tooltip is portalled to <body> and positioned above the trigger
 * (flipping below when there isn't room). Honours prefers-reduced-motion.
 */
import { useCallback, useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { aqDuration, aqEaseOut } from '@shared/motion';

export type TooltipProps = {
  /** Tooltip text. When empty, the trigger renders without a tooltip. */
  label: string;
  /** The trigger element. Must be a single focusable child for keyboard use. */
  children: ReactNode;
  /** Preferred side. Defaults to 'top'; flips when it would clip. */
  placement?: 'top' | 'bottom';
  /** Open delay in ms. Defaults to 120 (matches the Micro/Quick tokens). */
  delayMs?: number;
};

type Pos = { top: number; left: number; below: boolean };

export function Tooltip({
  label,
  children,
  placement = 'top',
  delayMs = 120,
}: TooltipProps): ReactElement {
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const timer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const reduce = useReducedMotion();

  const place = useCallback(() => {
    const trigger = wrapRef.current?.firstElementChild ?? wrapRef.current;
    const tip = tipRef.current;
    if (!trigger || !tip) return;
    const a = trigger.getBoundingClientRect();
    const t = tip.getBoundingClientRect();
    const gap = 6;
    const wantBelow = placement === 'bottom' || a.top - t.height - gap < 0;
    const top = wantBelow ? a.bottom + gap : a.top - t.height - gap;
    const left = Math.min(
      Math.max(gap, a.left + a.width / 2 - t.width / 2),
      window.innerWidth - t.width - gap
    );
    setPos({ top, left, below: wantBelow });
  }, [placement]);

  const show = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), delayMs);
  }, [delayMs]);

  const hide = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    // Measure after the tip mounts so width/height are real.
    const id = window.requestAnimationFrame(place);
    return () => window.cancelAnimationFrame(id);
  }, [open, place]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    []
  );

  if (!label) return <>{children}</>;

  return (
    <>
      <span
        ref={wrapRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocusCapture={show}
        onBlurCapture={hide}
        className="contents"
      >
        {children}
      </span>
      {typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  ref={tipRef}
                  role="tooltip"
                  className="bg-aq-ink text-aq-surface text-aq-caption shadow-aq-popover pointer-events-none fixed z-[70] max-w-[240px] rounded-md px-2 py-1 font-medium"
                  style={{
                    top: pos ? pos.top : -9999,
                    left: pos ? pos.left : -9999,
                    visibility: pos ? 'visible' : 'hidden',
                  }}
                  initial={
                    reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: pos?.below ? -2 : 2 }
                  }
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    transition: { duration: aqDuration.fast, ease: aqEaseOut },
                  }}
                  exit={{ opacity: 0, transition: { duration: 0.06 } }}
                >
                  {label}
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body
          )
        : null}
    </>
  );
}

export default Tooltip;
