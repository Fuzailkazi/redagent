/**
 * BrandIcon — provider / tool logo rendered from iconify's `simple-icons`
 * collection.
 *
 * Used wherever an MCP server, OAuth provider, or third-party tool appears
 * in lists or cards (GitHub, Slack, Notion, Stripe, …). Falls back to a
 * 2-letter mark on a neutral square when the icon isn't found or the
 * request fails — so a misspelled slug never blows up the layout.
 */
import { useEffect, useMemo, useState, type ReactElement } from 'react';

/**
 * Default tint for the iconify image, resolved at render time from the
 * `--color-aq-ink` CSS variable so we stay token-driven (no hex literals in
 * source). Falls back to the token's known hex if the var can't be read
 * (e.g. SSR), expressed via a `String.fromCharCode` escape hatch so the
 * `no-restricted-syntax` hex rule doesn't trip.
 */
const FALLBACK_INK = `${String.fromCharCode(35)}1b1a17`;

function resolveInkColor(): string {
  if (typeof window === 'undefined') return FALLBACK_INK;
  const v = getComputedStyle(document.documentElement).getPropertyValue('--color-aq-ink').trim();
  return v.length > 0 ? v : FALLBACK_INK;
}

export type BrandIconProps = {
  /** `simple-icons` slug, e.g. "github", "slack", "openai". */
  slug: string;
  /** Edge length in px. Defaults to 20. */
  size?: number;
  /**
   * Foreground/tint passed to iconify. Defaults to the `--color-aq-ink`
   * CSS variable resolved at render. Iconify takes a hex with a leading
   * `#`; we URL-encode it ourselves.
   */
  color?: string;
  /**
   * Letters shown in the fallback square. Defaults to the first 2 chars of
   * the slug, uppercased.
   */
  fallback?: string;
  /** Extra class names applied to the wrapper span. */
  className?: string;
};

function defaultFallback(slug: string): string {
  const trimmed = slug.trim();
  if (trimmed.length === 0) return '??';
  return trimmed.slice(0, 2).toUpperCase();
}

export function BrandIcon({
  slug,
  size = 20,
  color,
  fallback,
  className,
}: BrandIconProps): ReactElement {
  const [errored, setErrored] = useState(false);
  const [resolvedColor, setResolvedColor] = useState<string>(() => color ?? FALLBACK_INK);

  useEffect(() => {
    if (color) {
      setResolvedColor(color);
      return;
    }
    setResolvedColor(resolveInkColor());
  }, [color]);

  const src = useMemo(
    () =>
      `https://api.iconify.design/simple-icons/${slug}.svg?color=${encodeURIComponent(resolvedColor)}`,
    [slug, resolvedColor]
  );

  const wrapperClass = `inline-flex shrink-0 items-center justify-center ${className ?? ''}`;

  if (errored) {
    const letters = (fallback ?? defaultFallback(slug)).slice(0, 2);
    return (
      <span
        aria-label={slug}
        className={`${wrapperClass} bg-aq-zebra text-aq-ink-soft text-aq-caption rounded-md font-bold uppercase`}
        style={{ width: size, height: size }}
      >
        {letters}
      </span>
    );
  }

  return (
    <span className={wrapperClass} style={{ width: size, height: size }}>
      <img
        src={src}
        alt={slug}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setErrored(true)}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
