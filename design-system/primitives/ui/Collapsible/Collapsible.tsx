/**
 * Collapsible — height-tween a region open and closed (the "card resize"
 * pattern from transitions.dev). Use for expand/collapse rows, "show more"
 * sections, and accordions where the container should grow smoothly rather
 * than jump.
 *
 *   <Collapsible open={expanded}>{details}</Collapsible>
 *
 * Animates height auto ↔ 0 with the shared smooth ease, clipping overflow so
 * content never spills mid-tween. Honours prefers-reduced-motion (instant).
 */
import { type ReactElement, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { aqDuration, aqEaseOut } from '@shared/motion';

export type CollapsibleProps = {
  open: boolean;
  children: ReactNode;
  className?: string;
};

export function Collapsible({ open, children, className }: CollapsibleProps): ReactElement {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          className={['overflow-hidden', className ?? ''].join(' ')}
          initial={reduce ? false : { height: 0, opacity: 0 }}
          animate={{
            height: 'auto',
            opacity: 1,
            transition: { duration: aqDuration.slow, ease: aqEaseOut },
          }}
          exit={
            reduce
              ? { height: 0, opacity: 0, transition: { duration: 0 } }
              : {
                  height: 0,
                  opacity: 0,
                  transition: { duration: aqDuration.base, ease: aqEaseOut },
                }
          }
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default Collapsible;
