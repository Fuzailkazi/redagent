/**
 * useCardSave — per-card save state machine for SettingCard.
 *
 * Every editable SettingCard on /account has the same lifecycle:
 *   idle → dirty → saving → success (briefly) → idle
 *                       └─ error → dirty (user retries)
 *
 * This hook owns:
 *   - the draft `value` the user is editing
 *   - the `baseline` (last-saved snapshot) used to compute the dirty state
 *   - the running `state` for the SettingCard footer
 *   - the `error` message surfaced when `onSave` throws
 *
 * Dirty is computed by JSON.stringify equality since every account setting we
 * persist is a small plain object/string/number. If we ever need to track
 * something exotic (a File reference, a Map), bump this to a structuredClone
 * based comparator.
 *
 * `successDurationMs` (default 2000) controls how long the "Saved" indicator
 * sits on screen before reverting to `idle`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SettingCardSaveState } from '@shared/ui/SettingCard';

export type UseCardSaveOptions<T> = {
  /** Initial value. Also becomes the first baseline. */
  initial: T;
  /** Called by `save()`. May be async. If it throws, the card enters `error`. */
  onSave: (value: T) => Promise<void> | void;
  /** Optional side-effect after a successful save (e.g. toast). */
  onSuccess?: (value: T) => void;
  /** How long to show "Saved" before reverting to idle. Defaults to 2000ms. */
  successDurationMs?: number;
};

export type UseCardSaveResult<T> = {
  value: T;
  setValue: (next: T | ((prev: T) => T)) => void;
  state: SettingCardSaveState;
  error: string | null;
  save: () => Promise<void>;
  /** Revert to the last saved baseline. */
  reset: () => void;
};

function isEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function useCardSave<T>({
  initial,
  onSave,
  onSuccess,
  successDurationMs = 2000,
}: UseCardSaveOptions<T>): UseCardSaveResult<T> {
  const [value, setValueState] = useState<T>(initial);
  const [baseline, setBaseline] = useState<T>(initial);
  const [phase, setPhase] = useState<'pending' | 'saving' | 'success' | 'error'>('pending');
  const [error, setError] = useState<string | null>(null);

  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending success-timer on unmount so we don't setState after teardown.
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const setValue = useCallback((next: T | ((prev: T) => T)) => {
    setValueState((prev) => (typeof next === 'function' ? (next as (p: T) => T)(prev) : next));
    // Editing always pulls us out of the success/error display.
    setPhase('pending');
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setValueState(baseline);
    setPhase('pending');
    setError(null);
  }, [baseline]);

  const save = useCallback(async () => {
    setPhase('saving');
    setError(null);
    try {
      await onSave(value);
      setBaseline(value);
      setPhase('success');
      onSuccess?.(value);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => {
        setPhase('pending');
      }, successDurationMs);
    } catch (e) {
      setPhase('error');
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  }, [onSave, onSuccess, successDurationMs, value]);

  // Derive the public `state` from phase + dirty.
  let state: SettingCardSaveState;
  if (phase === 'saving') state = 'saving';
  else if (phase === 'success') state = 'success';
  else if (phase === 'error') state = 'error';
  else state = isEqual(value, baseline) ? 'idle' : 'dirty';

  return { value, setValue, state, error, save, reset };
}
