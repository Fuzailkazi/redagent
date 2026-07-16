/**
 * Shimmer — sweeps a soft highlight across muted text on a loop, for
 * in-progress / "thinking" labels (a running plan, a streaming status) that
 * should feel alive without a spinner.
 *
 *   <Shimmer>Running…</Shimmer>
 *
 * Thin wrapper over the design system's `aq-text-shimmer` utility (defined in
 * globals.css), so the gradient, timing, and the prefers-reduced-motion guard
 * all live in one place instead of being re-implemented per call site.
 */
import { type ElementType, type ReactElement, type ReactNode } from 'react';

export type ShimmerProps = {
  children: ReactNode;
  /** Element to render as. Defaults to 'span'. */
  as?: ElementType;
  className?: string;
};

export function Shimmer({ children, as: As = 'span', className }: ShimmerProps): ReactElement {
  return <As className={['aq-text-shimmer', className ?? ''].join(' ')}>{children}</As>;
}

export default Shimmer;
