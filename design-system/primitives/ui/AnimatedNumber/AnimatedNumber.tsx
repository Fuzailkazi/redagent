/**
 * AnimatedNumber — pops the value when it changes.
 *
 * Mirrors transitions.dev "number pop-in": the old value blurs + slides out
 * and the new one blurs + slides in, so a count that updates feels alive
 * rather than silently swapping. Use for live counts (unread, sandbox usage,
 * decision totals).
 *
 *   <AnimatedNumber value={unread} />
 *
 * Direction follows the delta (up = rise, down = fall). Honours
 * prefers-reduced-motion (plain swap).
 */
import { useRef, type ReactElement } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { aqDuration, aqEaseOut } from '@shared/motion';

export type AnimatedNumberProps = {
  value: number;
  /** Format the number before display (e.g. toLocaleString). */
  format?: (n: number) => string;
  className?: string;
};

export function AnimatedNumber({
  value,
  format = (n) => String(n),
  className,
}: AnimatedNumberProps): ReactElement {
  const prev = useRef(value);
  const dir = value >= prev.current ? 1 : -1;
  prev.current = value;
  const reduce = useReducedMotion();
  const rise = reduce ? 0 : 8 * dir;

  return (
    <span
      className={['relative inline-grid place-items-center tabular-nums', className ?? ''].join(
        ' '
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          className="col-start-1 row-start-1"
          initial={{ opacity: 0, y: rise, filter: reduce ? 'blur(0px)' : 'blur(2px)' }}
          animate={{
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            transition: { duration: aqDuration.base, ease: aqEaseOut },
          }}
          exit={{
            opacity: 0,
            y: -rise,
            filter: reduce ? 'blur(0px)' : 'blur(2px)',
            transition: { duration: aqDuration.fast, ease: aqEaseOut },
          }}
        >
          {format(value)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default AnimatedNumber;
