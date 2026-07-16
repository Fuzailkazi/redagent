/**
 * PasswordStrengthMeter — subtle one-line strength indicator.
 *
 * Visuals: a single thin track that fills from 0% to 100% based on the
 * password score (0..4), plus one right-aligned word label underneath
 * (Weak / Okay / Good / Strong). When the password is empty we render
 * nothing so the form stays calm until the user actually starts typing.
 *
 * Width mapping (Tailwind classes, no arbitrary values):
 *   score 0 → w-0
 *   score 1 → w-1/4   (Weak)
 *   score 2 → w-1/2   (Okay)
 *   score 3 → w-3/4   (Good)
 *   score 4 → w-full  (Strong)
 *
 * Color mapping:
 *   0-1 → bg-aq-bad
 *   2   → bg-aq-warn
 *   3-4 → bg-aq-good
 *
 * Scoring lives in `./score-password` so signup/reset can re-read the score
 * without re-rendering the meter, and so this file stays "components only"
 * for Fast Refresh.
 *
 * Spec ref: docs/prototype-context/auth-onboarding.md §10.1 (1).
 */
import type { ReactElement } from 'react';
import { scorePassword, type PasswordStrengthScore } from './score-password';

export type PasswordStrengthMeterProps = {
  password: string;
  /** Optional className appended to the outer wrapper. */
  className?: string;
};

const WIDTH_CLASS: Record<PasswordStrengthScore, string> = {
  0: 'w-0',
  1: 'w-1/4',
  2: 'w-1/2',
  3: 'w-3/4',
  4: 'w-full',
};

const FILL_CLASS: Record<PasswordStrengthScore, string> = {
  0: 'bg-aq-bad',
  1: 'bg-aq-bad',
  2: 'bg-aq-warn',
  3: 'bg-aq-good',
  4: 'bg-aq-good',
};

const LABEL: Record<PasswordStrengthScore, string> = {
  0: '',
  1: 'Weak',
  2: 'Okay',
  3: 'Good',
  4: 'Strong',
};

export function PasswordStrengthMeter({
  password,
  className,
}: PasswordStrengthMeterProps): ReactElement | null {
  if (!password) return null;

  const score = scorePassword(password);

  return (
    <div className={['w-full', className ?? ''].join(' ')}>
      <div className="bg-aq-zebra h-1 w-full overflow-hidden rounded-full" aria-hidden="true">
        <div
          className={`h-full ${WIDTH_CLASS[score]} ${FILL_CLASS[score]} motion-safe:transition-all`}
        />
      </div>
      <div
        role="status"
        aria-live="polite"
        className="text-aq-caption text-aq-ink-muted mt-1.5 text-right"
      >
        {LABEL[score]}
      </div>
    </div>
  );
}

export default PasswordStrengthMeter;
