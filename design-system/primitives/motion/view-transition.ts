/**
 * runViewTransition — thin wrapper over the native View Transitions API.
 *
 * Used to carry the create-org → Plans route hop as one continuous morph
 * instead of a hard page flash. Feature-detected: when the API (or the user's
 * reduced-motion preference) isn't available, the callback runs immediately so
 * navigation never depends on animation support.
 */
type DocumentWithVT = Document & {
  startViewTransition?: (cb: () => void) => unknown;
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function runViewTransition(navigate: () => void): void {
  if (typeof document === 'undefined') {
    navigate();
    return;
  }
  const doc = document as DocumentWithVT;
  if (typeof doc.startViewTransition !== 'function' || prefersReducedMotion()) {
    navigate();
    return;
  }
  doc.startViewTransition(navigate);
}
