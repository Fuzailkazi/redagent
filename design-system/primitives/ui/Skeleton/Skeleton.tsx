/**
 * Skeleton — the content-loading placeholder primitive.
 *
 * The loading-system rule (see docs/loading-states.html): when the page chrome
 * is already painted and you are filling in DATA — tables, cards, detail bodies
 * — use a shape-matched skeleton, not a spinner. Match the real layout so
 * nothing reflows when the data lands.
 *
 * Replaces the ~11 hand-rolled `bg-aq-zebra motion-safe:animate-pulse` copies
 * scattered across Activity, Agents, API Portal, Audit and Policy Templates.
 * The default treatment is the calm grey SWEEP (`aq-skeleton`), not an opacity
 * pulse — it reads as "loading" more clearly and feels more premium. Pass
 * `animate={false}` for a static block (reduced-motion is handled in CSS).
 *
 *   <Skeleton width={120} />                       // one line
 *   <Skeleton variant="circle" width={28} height={28} />
 *   <SkeletonText lines={3} />                      // a paragraph
 *
 * For a shape-matched row, compose the parts:
 *   <div className="flex items-center gap-3">
 *     <Skeleton variant="circle" width={28} height={28} />
 *     <SkeletonText lines={2} className="flex-1" />
 *   </div>
 */
import { type CSSProperties, type ReactElement } from 'react';

export type SkeletonVariant = 'line' | 'circle' | 'rect';

export type SkeletonProps = {
  /** line = thin text bar (default), circle = avatar, rect = block/card. */
  variant?: SkeletonVariant;
  /** Width in px or any CSS length. Lines default to 100%. */
  width?: number | string;
  /** Height in px or any CSS length. Lines/circles get a sensible default. */
  height?: number | string;
  /** Animate the sweep. Defaults to true; CSS still disables under reduced-motion. */
  animate?: boolean;
  className?: string;
};

const RADIUS: Record<SkeletonVariant, string> = {
  line: 'rounded',
  circle: 'rounded-full',
  rect: 'rounded-lg',
};

const DEFAULT_HEIGHT: Record<SkeletonVariant, string> = {
  line: '0.7rem',
  circle: '2rem',
  rect: '4rem',
};

export function Skeleton({
  variant = 'line',
  width,
  height,
  animate = true,
  className,
}: SkeletonProps): ReactElement {
  const style: CSSProperties = {
    width: width ?? (variant === 'circle' ? '2rem' : '100%'),
    height: height ?? DEFAULT_HEIGHT[variant],
  };

  return (
    <span
      aria-hidden="true"
      style={style}
      className={[
        'block',
        animate ? 'aq-skeleton' : 'bg-aq-border',
        RADIUS[variant],
        className ?? '',
      ].join(' ')}
    />
  );
}

export type SkeletonTextProps = {
  /** Number of lines to render. */
  lines?: number;
  animate?: boolean;
  className?: string;
};

/**
 * SkeletonText — a stack of line skeletons for paragraph / multi-line content.
 * The last line is shortened so the block reads as real prose, not a grid.
 */
export function SkeletonText({
  lines = 3,
  animate = true,
  className,
}: SkeletonTextProps): ReactElement {
  return (
    <span className={['flex flex-col gap-2', className ?? ''].join(' ')}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="line"
          animate={animate}
          width={i === lines - 1 && lines > 1 ? '60%' : '100%'}
        />
      ))}
    </span>
  );
}

export default Skeleton;
