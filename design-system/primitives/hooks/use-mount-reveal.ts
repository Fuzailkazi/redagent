/**
 * useMountReveal — drives the `.aq-reveal` staggered entrance.
 *
 * Returns a ref to attach to the `.aq-reveal` container. On mount, the hook
 * adds `is-shown` on the next animation frame so the children transition from
 * their resting-down/blurred start state into place. Because the class flips
 * one frame after the element is in the DOM, the browser sees a state change
 * and animates it (rather than painting the final state immediately).
 *
 * The CSS lives in styles/globals.css under `.aq-reveal`; children opt in with
 * a `data-reveal` attribute and an optional `--reveal-i` index for cascade.
 *
 * Respects prefers-reduced-motion via the CSS guard — no JS branch needed.
 */
import { useEffect, useRef } from 'react';

export function useMountReveal<T extends HTMLElement = HTMLDivElement>(): React.RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const id = requestAnimationFrame(() => {
      node.classList.add('is-shown');
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return ref;
}
