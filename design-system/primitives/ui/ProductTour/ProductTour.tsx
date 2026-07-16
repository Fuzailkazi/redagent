/**
 * ProductTour — a dependency-free spotlight walkthrough.
 *
 * Renders a dimmed overlay with a cut-out "hole" over the current step's
 * anchor element (found via `[data-tour="<anchor>"]`) plus a tooltip card next
 * to it. The hole is NOT covered, so the real element underneath stays
 * clickable — steps can ask the user to click a live button (Verify, Approve)
 * and then advance. Four `bg-aq-scrim` panels form the dim so we never inline a
 * color (rule 6) and never pull a tour library (rule 9).
 *
 * Fully controlled: the host owns `stepIndex` and the open state.
 */
import { useCallback, useEffect, useLayoutEffect, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { aqDuration, aqEaseOut, aqSpring, reducedSnap } from '@shared/motion';
import { IconArrowLeft, IconArrowRight, IconX } from '@shared/icons';
import { Button } from '../Button';

export type ProductTourStep = {
  /**
   * `data-tour` value(s) of the element(s) to spotlight. Pass an array to
   * highlight several elements at once — the spotlight frames their union.
   */
  anchor: string | ReadonlyArray<string>;
  title: string;
  body: string;
  /** Preferred tooltip side relative to the anchor. Defaults to 'bottom'. */
  placement?: 'top' | 'bottom';
  /** Extra px of breathing room around the highlighted rect. Defaults to 6. */
  padding?: number;
  /** Overrides the advance-button label (e.g. "I clicked Verify"). */
  cta?: string;
  /** When true, clicking the highlighted element itself advances the tour. */
  advanceOnAnchorClick?: boolean;
};

function anchorList(anchor: string | ReadonlyArray<string>): ReadonlyArray<string> {
  return Array.isArray(anchor) ? anchor : [anchor as string];
}

export type ProductTourProps = {
  steps: ReadonlyArray<ProductTourStep>;
  open: boolean;
  stepIndex: number;
  onStepChange: (next: number) => void;
  onFinish: () => void;
  onSkip: () => void;
};

type Rect = { top: number; left: number; width: number; height: number };

const TOOLTIP_W = 320;
const GAP = 12;

export function ProductTour({
  steps,
  open,
  stepIndex,
  onStepChange,
  onFinish,
  onSkip,
}: ProductTourProps): ReactElement | null {
  const [rect, setRect] = useState<Rect | null>(null);
  const [vp, setVp] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const reduce = useReducedMotion();
  const moveTransition = reduce ? reducedSnap : aqSpring;

  const step = steps[stepIndex];
  const padding = step?.padding ?? 6;

  const measure = useCallback(() => {
    if (typeof document === 'undefined' || !step) return;
    setVp({ w: window.innerWidth, h: window.innerHeight });
    let top = Infinity;
    let left = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    let found = false;
    for (const a of anchorList(step.anchor)) {
      const el = document.querySelector<HTMLElement>(`[data-tour="${a}"]`);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      found = true;
      top = Math.min(top, r.top);
      left = Math.min(left, r.left);
      right = Math.max(right, r.right);
      bottom = Math.max(bottom, r.bottom);
    }
    if (!found) {
      setRect(null);
      return;
    }
    setRect({ top, left, width: right - left, height: bottom - top });
  }, [step]);

  // Scroll the first anchor into view, then measure. Re-measure on resize/scroll.
  useLayoutEffect(() => {
    if (!open || !step) return;
    const first = anchorList(step.anchor)[0];
    document
      .querySelector<HTMLElement>(`[data-tour="${first}"]`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    // Anchor may mount a tick late (route still painting) — retry only until
    // every anchor is present, then stop. The scroll/resize listeners below
    // keep the spotlight tracking as the smooth-scroll settles, so we don't
    // need to keep re-measuring on a fixed timer (which made the spring chase
    // a target that never stopped moving).
    let tries = 0;
    const id = window.setInterval(() => {
      measure();
      tries += 1;
      const ready = anchorList(step.anchor).every((a) =>
        document.querySelector(`[data-tour="${a}"]`)
      );
      if (ready || tries > 12) window.clearInterval(id);
    }, 60);
    return () => window.clearInterval(id);
  }, [open, step, measure]);

  useEffect(() => {
    if (!open) return;
    const onChange = (): void => measure();
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
    };
  }, [open, measure]);

  // Click-to-advance: when a step opts in, clicking the highlighted element
  // moves the tour forward (the spotlight hole leaves it interactive).
  useEffect(() => {
    if (!open || !step || !step.advanceOnAnchorClick) return;
    const isLastStep = stepIndex >= steps.length - 1;
    const handler = (): void => (isLastStep ? onFinish() : onStepChange(stepIndex + 1));
    const attached: Element[] = [];
    let tries = 0;
    const id = window.setInterval(() => {
      for (const a of anchorList(step.anchor)) {
        const el = document.querySelector(`[data-tour="${a}"]`);
        if (el && !attached.includes(el)) {
          el.addEventListener('click', handler);
          attached.push(el);
        }
      }
      tries += 1;
      if (attached.length > 0 || tries > 12) window.clearInterval(id);
    }, 60);
    return () => {
      window.clearInterval(id);
      attached.forEach((el) => el.removeEventListener('click', handler));
    };
  }, [open, step, stepIndex, steps.length, onStepChange, onFinish]);

  if (!open || !step || typeof document === 'undefined') return null;

  const isLast = stepIndex >= steps.length - 1;
  const advance = (): void => (isLast ? onFinish() : onStepChange(stepIndex + 1));

  // Hole geometry (clamped so a partially off-screen anchor still frames).
  const hole = rect
    ? {
        top: Math.max(0, rect.top - padding),
        left: Math.max(0, rect.left - padding),
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      }
    : null;

  // Tooltip placement: below the hole by default, flip above when it would
  // overflow the viewport bottom. Centered when there's no anchor yet.
  let tipTop = vp.h / 2 - 80;
  let tipLeft = vp.w / 2 - TOOLTIP_W / 2;
  if (hole) {
    const below = hole.top + hole.height + GAP;
    const wantAbove = step.placement === 'top' || below + 180 > vp.h;
    tipTop = wantAbove ? Math.max(GAP, hole.top - 180 - GAP) : below;
    tipLeft = Math.min(Math.max(GAP, hole.left), vp.w - TOOLTIP_W - GAP);
  }

  // Tooltip enters/leaves with a small slide toward its anchor side.
  const above = hole ? tipTop < hole.top : false;
  const tipOffset = reduce ? 0 : above ? -8 : 8;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={step.title} className="fixed inset-0 z-50">
      {/* Dim — four panels around the hole so the anchor stays interactive. The
          panels spring to each step's geometry so the spotlight glides. */}
      {hole ? (
        <>
          <motion.div
            className="bg-aq-scrim absolute top-0 right-0 left-0"
            initial={false}
            animate={{ height: hole.top }}
            transition={moveTransition}
          />
          <motion.div
            className="bg-aq-scrim absolute right-0 bottom-0 left-0"
            initial={false}
            animate={{ top: hole.top + hole.height }}
            transition={moveTransition}
          />
          <motion.div
            className="bg-aq-scrim absolute left-0"
            initial={false}
            animate={{ top: hole.top, height: hole.height, width: hole.left }}
            transition={moveTransition}
          />
          <motion.div
            className="bg-aq-scrim absolute right-0"
            initial={false}
            animate={{ top: hole.top, height: hole.height, left: hole.left + hole.width }}
            transition={moveTransition}
          />
        </>
      ) : (
        <div className="bg-aq-scrim absolute inset-0" />
      )}

      {/* Tooltip card — ONE persistent card that springs to each step's anchor
          while only its copy crossfades. Keeping the card mounted (instead of
          remounting per step) means it glides alongside the spotlight rather
          than popping out, repositioning, and popping back in. */}
      <motion.div
        className="border-aq-border bg-aq-surface shadow-aq-popover absolute flex flex-col gap-3 rounded-xl border p-4"
        style={{ width: TOOLTIP_W }}
        initial={{ opacity: 0, y: tipOffset, top: tipTop, left: tipLeft }}
        animate={{ opacity: 1, y: 0, top: tipTop, left: tipLeft }}
        transition={{
          default: { duration: aqDuration.base, ease: aqEaseOut },
          top: moveTransition,
          left: moveTransition,
        }}
      >
        <button
          type="button"
          onClick={onSkip}
          aria-label="Skip tour"
          className="text-aq-ink-muted hover:bg-aq-zebra hover:text-aq-ink absolute top-3 right-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
        >
          <IconX size={13} stroke={2} />
        </button>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stepIndex}
            className="flex flex-col gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: aqDuration.fast }}
          >
            <div className="text-aq-ink text-aq-md pr-7 font-bold">{step.title}</div>
            <p className="text-aq-ink-soft text-aq-sm m-0 leading-relaxed">{step.body}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-aq-ink-muted text-aq-caption font-mono">
                {stepIndex + 1} / {steps.length}
              </span>
              <div className="flex items-center gap-2">
                {stepIndex > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leading={IconArrowLeft}
                    onClick={() => onStepChange(stepIndex - 1)}
                  >
                    Back
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  trailing={isLast ? undefined : IconArrowRight}
                  onClick={advance}
                >
                  {step.cta ?? (isLast ? 'Finish' : 'Next')}
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>,
    document.body
  );
}

export default ProductTour;
