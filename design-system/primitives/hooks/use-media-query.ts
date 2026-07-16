/**
 * useMediaQuery: subscribe to a CSS media query and re-render on change.
 *
 * Pure read of `window.matchMedia`. SSR-safe (returns `false` when there's no
 * window). Use this only when a layout decision genuinely needs to live in JS
 * (e.g. forcing the nav drawer open on touch, where Tailwind responsive classes
 * can't express the behavioural difference). For plain show/hide, prefer
 * Tailwind responsive prefixes (`lg:flex`, `lg:hidden`) over this hook.
 *
 * The breakpoint contract for the app (matches the default Tailwind scale):
 *   <  640px (below sm)  → phone        : single column, stacked cards
 *   640–1023px (sm/md)   → tablet        : condensed, rails as drawer
 *   >= 1024px (lg+)      → desktop       : full two-rail chrome
 *
 * `useIsDesktop()` is the shared boundary the app shell keys off: at and above
 * `lg` (1024px) the inline rails show; below it, navigation collapses into the
 * off-canvas drawer.
 */
import { useEffect, useState } from 'react';

/** Tailwind `lg` breakpoint: the desktop boundary for the app shell. */
export const DESKTOP_QUERY = '(min-width: 1024px)';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent): void => setMatches(e.matches);
    // Sync once in case the query changed between render and effect.
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** True at and above the `lg` (1024px) desktop boundary. */
export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY);
}
