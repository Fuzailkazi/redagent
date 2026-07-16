/**
 * useViewMode — remembers a "grid vs list" layout choice per page in
 * localStorage so it sticks across visits.
 *
 * Keyed (e.g. `aq.view.agents`, `aq.view.mcp`) so each registry page keeps
 * its own preference. Defaults to `grid` — the card view is the intended
 * first impression.
 */
import { useCallback, useEffect, useState } from 'react';

export type ViewMode = 'grid' | 'list';

function readStored(key: string, fallback: ViewMode): ViewMode {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = window.localStorage.getItem(key);
    return v === 'grid' || v === 'list' ? v : fallback;
  } catch {
    return fallback;
  }
}

export function useViewMode(
  storageKey: string,
  fallback: ViewMode = 'grid'
): [ViewMode, (next: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(() => readStored(storageKey, fallback));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, mode);
    } catch {
      /* private-mode / quota — non-fatal, the in-memory state still works */
    }
  }, [storageKey, mode]);

  const set = useCallback((next: ViewMode) => setMode(next), []);

  return [mode, set];
}
