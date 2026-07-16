/**
 * StatusChip — bottom-center confirmation chip that appears after an important
 * action lands. Pairs with the Modal "Confirm" pattern: after a Save / Confirm
 * / Apply press, dismiss the modal and `showStatusChip()` so the user gets a
 * tangible "this happened" without an interstitial.
 *
 * Three tones:
 *   - good  (default) — successful state change
 *   - warn         — soft caution (e.g. partial action, queued)
 *   - bad          — destructive landed (e.g. removed, signed out)
 *
 * Usage:
 *   const chip = useStatusChip();
 *   ...
 *   chip.show('Role changed to Admin');
 *   chip.show('Member removed', { tone: 'bad' });
 *   ...
 *   {chip.element}
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactElement,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { reducedFade, successPop, toastVariants } from '@shared/motion';
import { IconCheckCircle, IconErrorCircle, IconShield, type IconProps } from '@shared/icons';

export type StatusChipTone = 'good' | 'warn' | 'bad';

const TONE_ICON: Record<StatusChipTone, ComponentType<IconProps>> = {
  good: IconCheckCircle,
  warn: IconShield,
  bad: IconErrorCircle,
};

const TONE_COLOR: Record<StatusChipTone, string> = {
  good: 'text-aq-good',
  warn: 'text-aq-warn',
  bad: 'text-aq-bad',
};

export type StatusChipAction = { label: string; onClick: () => void };

export type StatusChipProps = {
  message: string;
  tone?: StatusChipTone;
  onDismiss?: () => void;
  /** Optional inline action, e.g. Undo. Rendered as an emphasised button. */
  action?: StatusChipAction;
};

export function StatusChip({
  message,
  tone = 'good',
  onDismiss,
  action,
}: StatusChipProps): ReactElement {
  const Icon = TONE_ICON[tone];
  const reduce = useReducedMotion();
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2">
      <motion.div
        role="status"
        aria-live="polite"
        className="border-aq-toast-border bg-aq-toast-bg text-aq-toast-fg shadow-aq-modal pointer-events-auto flex items-center gap-2.5 rounded-lg border px-4 py-2.5"
        variants={reduce ? reducedFade : toastVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <motion.span
          className="flex shrink-0"
          variants={reduce ? undefined : successPop}
          initial={reduce ? false : 'hidden'}
          animate="visible"
        >
          <Icon size={14} stroke={2} className={TONE_COLOR[tone]} />
        </motion.span>
        <span className="text-aq-sm">{message}</span>
        {action ? (
          <button
            type="button"
            onClick={action.onClick}
            className="text-aq-toast-fg hover:text-aq-toast-fg text-aq-caption ml-2 font-bold underline underline-offset-2"
          >
            {action.label}
          </button>
        ) : null}
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="text-aq-ink-on-muted hover:text-aq-ink-on text-aq-caption ml-2 font-semibold"
          >
            Dismiss
          </button>
        ) : null}
      </motion.div>
    </div>
  );
}

type ShowOpts = { tone?: StatusChipTone; durationMs?: number; action?: StatusChipAction };

/** Hook + element pair. Drop {chip.element} at the bottom of your route and
 *  call chip.show(msg) wherever a confirmation should land. */
export function useStatusChip(): {
  show: (message: string, opts?: ShowOpts) => void;
  hide: () => void;
  element: ReactElement | null;
} {
  const [state, setState] = useState<{
    message: string;
    tone: StatusChipTone;
    action?: StatusChipAction;
  } | null>(null);
  const timer = useRef<number | null>(null);

  const hide = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    setState(null);
  }, []);

  const show = useCallback(
    (message: string, opts?: ShowOpts) => {
      const tone: StatusChipTone = opts?.tone ?? 'good';
      const duration = opts?.durationMs ?? 3500;
      if (timer.current !== null) window.clearTimeout(timer.current);
      // If an action is present (e.g. Undo), wrap its handler so invoking it also
      // dismisses the chip immediately.
      const action: StatusChipAction | undefined = opts?.action
        ? {
            label: opts.action.label,
            onClick: () => {
              opts.action!.onClick();
              hide();
            },
          }
        : undefined;
      setState({ message, tone, action });
      timer.current = window.setTimeout(() => setState(null), duration);
    },
    [hide]
  );

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    []
  );

  // AnimatePresence stays mounted so the chip can rise in and quietly fade out.
  const element = (
    <AnimatePresence>
      {state !== null ? (
        <StatusChip
          key="status-chip"
          message={state.message}
          tone={state.tone}
          action={state.action}
        />
      ) : null}
    </AnimatePresence>
  );
  return { show, hide, element };
}
