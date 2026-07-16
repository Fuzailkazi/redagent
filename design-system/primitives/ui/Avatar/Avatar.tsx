/**
 * Avatar — PFP component with deterministic image + initials fallback.
 *
 * Renders a <img> sourced from i.pravatar.cc using a stable hash key
 * (email > name > 'unknown') so the same user always renders the same
 * portrait. If the image fails to load (offline, blocked), the avatar
 * gracefully falls back to a colored initials disc.
 *
 * Used everywhere people appear: owner columns, activity feed, audit log,
 * comment threads.
 */
import { useMemo, useState, type ReactElement } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { aqSpring } from '@shared/motion';

export type AvatarProps = {
  /** Used as the hash seed for the pravatar URL. Preferred over `name`. */
  email?: string;
  /** Display name. Used for `alt` text and initials fallback. */
  name?: string;
  /** Edge length in px. Defaults to 28. */
  size?: number;
  /** Visual shape. Defaults to `circle`. */
  shape?: 'circle' | 'rounded';
  /** Adds a subtle hover lift (use in avatar rows / stacks). Defaults to true. */
  lift?: boolean;
};

// Soft pastel-ish backgrounds drawn from the token palette so the fallback
// disc still sits in the design system.
const FALLBACK_PALETTE: ReadonlyArray<{ bg: string; fg: string }> = [
  { bg: 'bg-aq-accent-soft', fg: 'text-aq-accent-strong' },
  { bg: 'bg-aq-good-soft', fg: 'text-aq-good' },
  { bg: 'bg-aq-warn-soft', fg: 'text-aq-warn' },
  { bg: 'bg-aq-bad-soft', fg: 'text-aq-bad' },
];

function hashString(s: string): number {
  // Tiny djb2 — deterministic, plenty good for a palette index.
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function deriveInitials(name?: string, email?: string): string {
  const source = (name ?? '').trim() || (email ?? '').split('@')[0] || '?';
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

export function Avatar({
  email,
  name,
  size = 28,
  shape = 'circle',
  lift = true,
}: AvatarProps): ReactElement {
  const [errored, setErrored] = useState(false);
  const reduce = useReducedMotion();
  // Subtle distance-free lift on hover — reads as "interactive" in member
  // rows and avatar stacks without being loud. Disabled for reduced motion.
  const hover = !lift || reduce ? undefined : { y: -2, scale: 1.06 };

  const seed = email ?? name ?? 'unknown';
  const src = `https://i.pravatar.cc/${size * 2}?u=${encodeURIComponent(seed)}`;
  const alt = name ?? email ?? 'Avatar';

  const { initials, palette } = useMemo(() => {
    const hash = hashString(seed);
    return {
      initials: deriveInitials(name, email),
      palette: FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length]!,
    };
  }, [seed, name, email]);

  const radiusClass = shape === 'circle' ? 'rounded-full' : 'rounded-md';

  if (errored) {
    return (
      <motion.span
        aria-label={alt}
        className={`${radiusClass} ${palette.bg} ${palette.fg} text-aq-caption inline-flex shrink-0 items-center justify-center font-bold uppercase`}
        style={{ width: size, height: size }}
        whileHover={hover}
        transition={aqSpring}
      >
        {initials}
      </motion.span>
    );
  }

  return (
    <motion.span
      className={`${radiusClass} bg-aq-zebra inline-flex shrink-0 overflow-hidden`}
      style={{ width: size, height: size }}
      whileHover={hover}
      transition={aqSpring}
    >
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setErrored(true)}
        className="h-full w-full object-cover"
      />
    </motion.span>
  );
}
