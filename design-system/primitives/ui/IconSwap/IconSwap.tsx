/**
 * IconSwap — cross-fade between two icons in the same slot.
 *
 * Mirrors transitions.dev "icon swap": the outgoing glyph blurs + scales out
 * while the incoming one blurs + scales in. Drive it by changing `swapKey`
 * (e.g. a boolean or a status string); the icon for the current state is
 * passed as `icon`.
 *
 *   <IconSwap swapKey={copied ? 'done' : 'idle'} icon={copied ? IconCheck : IconCopy} />
 *
 * The slot is a fixed inline-grid so both glyphs overlap and the layout never
 * shifts mid-swap. Honours prefers-reduced-motion (plain swap, no transform).
 */
import { type ComponentType, type ReactElement } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { aqDuration, aqEaseInOut } from '@shared/motion';
import type { IconProps } from '@shared/icons';

export type IconSwapProps = {
  /** Changing this re-runs the swap. Keep it stable while the icon is stable. */
  swapKey: string;
  icon: ComponentType<IconProps>;
  size?: number;
  stroke?: number;
  className?: string;
};

export function IconSwap({
  swapKey,
  icon: Icon,
  size = 16,
  stroke = 1.8,
  className,
}: IconSwapProps): ReactElement {
  const reduce = useReducedMotion();
  return (
    <span className={['relative inline-grid place-items-center', className ?? ''].join(' ')}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={swapKey}
          className="col-start-1 row-start-1 inline-flex"
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, filter: 'blur(2px)' }}
          animate={{
            opacity: 1,
            scale: 1,
            filter: 'blur(0px)',
            transition: { duration: aqDuration.fast, ease: aqEaseInOut },
          }}
          exit={
            reduce
              ? { opacity: 0, transition: { duration: aqDuration.fast } }
              : {
                  opacity: 0,
                  scale: 0.6,
                  filter: 'blur(2px)',
                  transition: { duration: aqDuration.fast, ease: aqEaseInOut },
                }
          }
        >
          <Icon size={size} stroke={stroke} />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default IconSwap;
