/**
 * useResizablePanel: drag-to-resize for a panel docked against the RIGHT edge of
 * the viewport (the studio rail, the SideModal). The resize handle sits on the
 * panel's LEFT border; dragging it left widens the panel, right narrows it.
 *
 * The chosen width is clamped to [min, max] and (when `storageKey` is given)
 * persisted to localStorage so the preference survives reloads. Double-clicking
 * the handle resets to `defaultWidth`. Pointer capture keeps the drag smooth even
 * when the cursor outruns the handle; `user-select` is suppressed on <body> for
 * the duration so text isn't selected mid-drag.
 *
 * Returns the live `width`, a `handleProps` spread for the grabber element, a
 * `dragging` flag (for styling), and `reset()`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export type ResizablePanel = {
  width: number;
  dragging: boolean;
  reset: () => void;
  handleProps: {
    onPointerDown: (e: React.PointerEvent) => void;
    onDoubleClick: () => void;
    role: 'separator';
    'aria-orientation': 'vertical';
    'aria-label': string;
    tabIndex: 0;
    onKeyDown: (e: React.KeyboardEvent) => void;
  };
};

function readStored(key: string | undefined, fallback: number): number {
  if (!key || typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    const n = raw === null ? NaN : Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

export function useResizablePanel(opts: {
  defaultWidth: number;
  min: number;
  max: number;
  storageKey?: string;
  /** Accessible label for the handle. */
  label?: string;
}): ResizablePanel {
  const { defaultWidth, min, max, storageKey, label = 'Resize panel' } = opts;

  const clamp = useCallback((n: number): number => Math.min(max, Math.max(min, n)), [min, max]);

  const [width, setWidth] = useState<number>(() => clamp(readStored(storageKey, defaultWidth)));
  const [dragging, setDragging] = useState(false);

  // Live refs so the global pointer listeners always read fresh values without
  // re-binding on every width change.
  const widthRef = useRef(width);
  widthRef.current = width;
  const startX = useRef(0);
  const startWidth = useRef(width);

  const persist = useCallback(
    (n: number): void => {
      if (!storageKey || typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(storageKey, String(n));
      } catch {
        // ignore
      }
    },
    [storageKey]
  );

  const onPointerDown = useCallback((e: React.PointerEvent): void => {
    e.preventDefault();
    startX.current = e.clientX;
    startWidth.current = widthRef.current;
    setDragging(true);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent): void => {
      // Panel hugs the right edge: moving the handle left (negative delta)
      // should widen it, hence `startWidth - delta`.
      const delta = e.clientX - startX.current;
      setWidth(clamp(startWidth.current - delta));
    };
    const onUp = (): void => {
      setDragging(false);
      persist(widthRef.current);
    };
    const prevSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.userSelect = prevSelect;
      document.body.style.cursor = prevCursor;
    };
  }, [dragging, clamp, persist]);

  const reset = useCallback((): void => {
    setWidth(defaultWidth);
    persist(defaultWidth);
  }, [defaultWidth, persist]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      // Keyboard resize: arrows nudge by 24px, with persist on each step.
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.key === 'ArrowLeft' ? 24 : -24;
        const next = clamp(widthRef.current + step);
        setWidth(next);
        persist(next);
      }
    },
    [clamp, persist]
  );

  return {
    width,
    dragging,
    reset,
    handleProps: {
      onPointerDown,
      onDoubleClick: reset,
      role: 'separator',
      'aria-orientation': 'vertical',
      'aria-label': label,
      tabIndex: 0,
      onKeyDown,
    },
  };
}
