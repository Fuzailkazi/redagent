/**
 * WelcomeDialog — the first-run "welcome aboard" moment.
 *
 * Shown once, the first time a freshly provisioned owner lands on Plans. It is
 * the emotional beat between "your workspace is live" and "here's what to do",
 * and the launch point for the guided tour. Built on the same portal / scroll
 * lock / esc-to-close contract as <Modal>, but with its own Framer Motion
 * choreography (scrim fade, card rise + scale, staggered children) so it reads
 * as a calm, premium greeting rather than a utilitarian dialog.
 *
 * Self-sequencing exit: the CTAs trigger the card's exit animation and the
 * chosen callback fires only after that animation completes (`onExitComplete`),
 * so the welcome is fully gone before the tour spotlight animates in — the two
 * overlays never collide. Honours `prefers-reduced-motion` via opacity-only
 * fallbacks.
 */
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  reducedFade,
  welcomeCardVariants,
  welcomeChildVariants,
  welcomeScrimVariants,
} from '@shared/motion';
import { IconShieldCheck } from '@shared/icons';
import { Button } from '../Button';

export type WelcomeDialogProps = {
  open: boolean;
  /** Workspace name for the greeting. Falls back to a generic line when empty. */
  orgName?: string;
  /** Fires after the exit animation when the user chooses the tour. */
  onTakeTour: () => void;
  /** Fires after the exit animation when the user dismisses / explores alone. */
  onDismiss: () => void;
};

type Intent = 'tour' | 'dismiss';

export function WelcomeDialog({
  open,
  orgName,
  onTakeTour,
  onDismiss,
}: WelcomeDialogProps): ReactElement | null {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(open);
  const intentRef = useRef<Intent>('dismiss');

  // Re-arm visibility whenever the dialog is (re)opened.
  useEffect(() => {
    if (open) setVisible(true);
  }, [open]);

  // Esc closes (as a dismiss). Only while actually shown.
  useEffect(() => {
    if (!open || !visible) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') beginExit('dismiss');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, visible]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (typeof document === 'undefined') return null;

  function beginExit(intent: Intent): void {
    intentRef.current = intent;
    setVisible(false); // drives AnimatePresence exit; callback fires on complete
  }

  const handleExitComplete = (): void => {
    if (intentRef.current === 'tour') onTakeTour();
    else onDismiss();
  };

  const greeting = orgName?.trim() ? `Welcome to ${orgName.trim()}` : 'Welcome to ArmorIQ';
  const scrimVariants = reduce ? reducedFade : welcomeScrimVariants;
  const cardVariants = reduce ? reducedFade : welcomeCardVariants;
  const childVariants = reduce ? reducedFade : welcomeChildVariants;

  return createPortal(
    <AnimatePresence onExitComplete={handleExitComplete}>
      {open && visible ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={greeting}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <motion.button
            type="button"
            aria-label="Close"
            onClick={() => beginExit('dismiss')}
            className="bg-aq-scrim absolute inset-0 cursor-default backdrop-blur-sm"
            variants={scrimVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          />
          <motion.div
            className="bg-aq-surface shadow-aq-modal relative flex w-full flex-col items-center rounded-2xl px-8 pt-9 pb-8 text-center"
            style={{ maxWidth: 460 }}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div
              aria-hidden="true"
              variants={childVariants}
              className="bg-aq-accent-soft text-aq-accent-strong mb-5 flex items-center justify-center rounded-2xl"
              style={{ width: 64, height: 64 }}
            >
              <IconShieldCheck size={30} stroke={1.6} />
            </motion.div>

            <motion.h2
              variants={childVariants}
              className="text-aq-h2 text-aq-ink tracking-aq-tight m-0 font-bold"
            >
              {greeting}
            </motion.h2>

            <motion.p
              variants={childVariants}
              className="text-aq-ink-soft text-aq-sm mt-3 mb-0 max-w-sm leading-relaxed"
            >
              Your workspace is live. This is Plans — the record of everything your agents do, and
              where you approve the calls that need a human. Take a quick tour, or dive in.
            </motion.p>

            <motion.div variants={childVariants} className="mt-7 flex w-full flex-col gap-2">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => beginExit('tour')}
              >
                Take the tour
              </Button>
              <Button
                variant="ghost"
                size="md"
                className="w-full"
                onClick={() => beginExit('dismiss')}
              >
                I&rsquo;ll explore on my own
              </Button>
            </motion.div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

export default WelcomeDialog;
