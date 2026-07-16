/**
 * Icon — shared base for the inline-SVG icon set.
 *
 * All concrete icons (IconSearch, IconBell, …) compose this. The icon renders
 * its `children` inside a 24x24 viewBox with `stroke="currentColor"`, so the
 * caller controls the color via a Tailwind text class (e.g. `text-aq-ink-muted`).
 *
 * Defaults: size 16, stroke width 1.6 — matches the V5 Compact SaaS design.
 *
 * Ported from docs/design-source/lib-icons.jsx → Icon.
 */
import type { ReactElement, ReactNode } from 'react';

export type IconProps = {
  /** Pixel size for both width and height. Defaults to 16. */
  size?: number;
  /** Stroke width. Defaults to 1.6. */
  stroke?: number;
  /** Extra Tailwind classes (e.g. text-color, transform). */
  className?: string;
};

type BaseProps = IconProps & {
  /** SVG inner contents — paths, circles, rects, etc. */
  children: ReactNode;
  /** Fill mode. Defaults to "none". */
  fill?: 'none' | 'currentColor';
};

export function Icon({
  size = 16,
  stroke = 1.6,
  className = '',
  children,
  fill = 'none',
}: BaseProps): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
