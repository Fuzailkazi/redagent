/**
 * TextSwap — swap text content in place with a blurred up-and-down transition.
 *
 * Mirrors transitions.dev "text states swap": when `text` changes, the old
 * string blurs + lifts out and the new one blurs + settles in. Use for a label
 * that mutates in place (a status word, a live "x selected" count, a toggle's
 * caption). Honours prefers-reduced-motion (plain crossfade).
 */
import { type ElementType, type ReactElement } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { aqDuration, aqEaseInOut } from '@shared/motion';

export type TextSwapProps = {
  /** The current text. Changing it triggers the swap. */
  text: string;
  /** Element to render as. Defaults to 'span'. */
  as?: ElementType;
  className?: string;
};

export function TextSwap({ text, as = 'span', className }: TextSwapProps): ReactElement {
  const reduce = useReducedMotion();
  const Motion = motion(as as ElementType);
  return (
    <span className={['relative inline-grid', className ?? ''].join(' ')}>
      <AnimatePresence mode="popLayout" initial={false}>
        <Motion
          key={text}
          className="col-start-1 row-start-1"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4, filter: 'blur(2px)' }}
          animate={{
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            transition: { duration: aqDuration.fast, ease: aqEaseInOut },
          }}
          exit={
            reduce
              ? { opacity: 0, transition: { duration: 0.1 } }
              : {
                  opacity: 0,
                  y: -4,
                  filter: 'blur(2px)',
                  transition: { duration: aqDuration.fast, ease: aqEaseInOut },
                }
          }
        >
          {text}
        </Motion>
      </AnimatePresence>
    </span>
  );
}

export default TextSwap;
