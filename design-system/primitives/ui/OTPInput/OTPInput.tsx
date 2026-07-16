/**
 * OTPInput — boxed one-digit-per-cell input for short codes.
 *
 * Default length = 6 (auth/verify, MFA challenge). Each box is 56×56 px,
 * bg-aq-surface, border-aq-border, rounded-md. Internal digit uses
 * text-aq-h2 + font-mono + font-bold + centered. Active (focused) box gets a
 * 2-px border-aq-accent ring. Error state paints all boxes border-aq-bad.
 *
 * Behaviour:
 *   - Auto-tab forward on input.
 *   - Auto-tab back on Backspace when the current box is empty.
 *   - Paste anywhere: if pasted text is digits AND length matches, distribute
 *     across all boxes and fire onComplete.
 *   - onChange fires on every box-level change with the joined string.
 *   - When all boxes are filled, onComplete(full) fires.
 *
 * Spec ref: docs/prototype-context/auth-onboarding.md §6.3, §10.1 (2).
 */
import {
  useEffect,
  useMemo,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { shakeAnimation } from '@shared/motion';

export type OTPInputProps = {
  /** Number of boxes. Defaults to 6. */
  length?: number;
  /** Joined digit string; pad with empty cells as needed. */
  value: string;
  /** Fires whenever any box changes; receives the joined string (no spaces). */
  onChange: (next: string) => void;
  /** Fires when every box is filled with a digit. */
  onComplete?: (full: string) => void;
  disabled?: boolean;
  /** Visual error state: all boxes go border-aq-bad. */
  error?: boolean;
  /** Optional aria-label for the group. */
  ariaLabel?: string;
  /** When true, focus the first empty box on mount. Defaults true. */
  autoFocus?: boolean;
};

export function OTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  ariaLabel = 'One-time code',
  autoFocus = true,
}: OTPInputProps): ReactElement {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  // Shake the row of boxes once when the code is rejected (error flips true).
  const controls = useAnimationControls();
  const reduce = useReducedMotion();
  const prevError = useRef(error);
  useEffect(() => {
    if (error && !prevError.current && !reduce) {
      void controls.start(shakeAnimation);
    }
    prevError.current = error;
  }, [error, reduce, controls]);

  // Normalise value into an array of length `length`. Only digits count.
  const cells = useMemo<string[]>(() => {
    const digits = value.replace(/\D/g, '').slice(0, length).split('');
    while (digits.length < length) digits.push('');
    return digits;
  }, [value, length]);

  useEffect(() => {
    if (!autoFocus) return;
    const firstEmpty = cells.findIndex((c) => c === '');
    const idx = firstEmpty === -1 ? 0 : firstEmpty;
    inputsRef.current[idx]?.focus();
    // Run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = (nextCells: string[]): void => {
    const joined = nextCells.join('');
    onChange(joined);
    if (joined.length === length && nextCells.every((c) => c !== '')) {
      onComplete?.(joined);
    }
  };

  const setCell = (idx: number, next: string): void => {
    const digit = next.replace(/\D/g, '').slice(-1); // keep only last typed digit
    const nextCells = [...cells];
    nextCells[idx] = digit;
    emit(nextCells);
    if (digit && idx < length - 1) {
      inputsRef.current[idx + 1]?.focus();
      inputsRef.current[idx + 1]?.select();
    }
  };

  const handleKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Backspace') {
      if (cells[idx]) {
        // Let the input's native onChange handle clearing.
        return;
      }
      // Empty cell: hop back and clear that cell.
      if (idx > 0) {
        e.preventDefault();
        const nextCells = [...cells];
        nextCells[idx - 1] = '';
        emit(nextCells);
        inputsRef.current[idx - 1]?.focus();
        inputsRef.current[idx - 1]?.select();
      }
      return;
    }
    if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault();
      inputsRef.current[idx - 1]?.focus();
      inputsRef.current[idx - 1]?.select();
      return;
    }
    if (e.key === 'ArrowRight' && idx < length - 1) {
      e.preventDefault();
      inputsRef.current[idx + 1]?.focus();
      inputsRef.current[idx + 1]?.select();
      return;
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>): void => {
    const text = e.clipboardData.getData('text').trim();
    const digits = text.replace(/\D/g, '');
    if (digits.length === 0) return;
    e.preventDefault();
    const next = digits.slice(0, length).split('');
    const nextCells = [...cells];
    for (let i = 0; i < length; i++) {
      nextCells[i] = next[i] ?? '';
    }
    emit(nextCells);
    // Move focus to the last filled box (or last box).
    const focusIdx = Math.min(next.length, length) - 1;
    if (focusIdx >= 0) {
      inputsRef.current[focusIdx]?.focus();
      inputsRef.current[focusIdx]?.select();
    }
  };

  const baseBox =
    'bg-aq-surface text-aq-h2 text-aq-ink rounded-md border text-center font-mono font-bold ' +
    'outline-none transition-colors';
  const sizeBox = 'h-14 w-14';
  const borderRest = error ? 'border-aq-bad' : 'border-aq-border';
  const borderFocus = error
    ? 'focus:border-aq-bad focus:ring-2 focus:ring-aq-bad'
    : 'focus:border-aq-accent focus:ring-2 focus:ring-aq-accent';
  const disabledCls = disabled ? 'opacity-60 cursor-not-allowed' : '';

  return (
    <motion.div
      role="group"
      aria-label={ariaLabel}
      className="flex items-center gap-3"
      onPaste={handlePaste}
      animate={controls}
    >
      {cells.map((cell, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputsRef.current[idx] = el;
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          value={cell}
          onChange={(e) => setCell(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onFocus={(e) => e.currentTarget.select()}
          aria-label={`Digit ${idx + 1} of ${length}`}
          aria-invalid={error || undefined}
          className={[baseBox, sizeBox, borderRest, borderFocus, disabledCls].join(' ')}
        />
      ))}
    </motion.div>
  );
}

export default OTPInput;
