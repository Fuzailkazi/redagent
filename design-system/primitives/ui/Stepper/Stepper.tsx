/**
 * Stepper — horizontal sequence of steps used inside wizards.
 *
 * Mirrors the Figma Stepper Item variant set (State: current / done /
 * upcoming). Replaces 3 ad-hoc wizard progress strips (CreateTeamWizard's
 * StepProgress, Add Agent wizard, onboarding Step components).
 *
 *   <Stepper
 *     steps={[{key: 'name', label: 'Name'}, ...]}
 *     currentIndex={2}
 *   />
 */
import { type ReactElement } from 'react';
import { IconCheckCircle } from '@shared/icons';

export type StepperStep = {
  /** Stable key used by React for list rendering. */
  key: string;
  label: string;
};

export type StepperProps = {
  steps: ReadonlyArray<StepperStep>;
  /** 0-based index. Steps before this are "done", at this index "current",
   *  after this are "upcoming". */
  currentIndex: number;
  className?: string;
};

export function Stepper({ steps, currentIndex, className }: StepperProps): ReactElement {
  return (
    <ol className={['flex items-center gap-2', className ?? ''].join(' ')}>
      {steps.map((step, i) => {
        const done = i < currentIndex;
        const here = i === currentIndex;
        return (
          <li key={step.key} className="flex items-center gap-2">
            <span
              className={[
                'text-aq-caption flex h-5 w-5 items-center justify-center rounded-full border font-mono font-bold',
                done
                  ? 'border-aq-accent bg-aq-accent text-aq-ink-on'
                  : here
                    ? 'border-aq-accent text-aq-accent-strong bg-aq-accent-soft'
                    : 'border-aq-border bg-aq-surface text-aq-ink-muted',
              ].join(' ')}
            >
              {done ? <IconCheckCircle size={11} stroke={2.4} /> : i + 1}
            </span>
            <span
              className={[
                'text-aq-caption tracking-aq-wider font-semibold uppercase',
                here ? 'text-aq-accent-strong' : done ? 'text-aq-ink-soft' : 'text-aq-ink-muted',
              ].join(' ')}
            >
              {step.label}
            </span>
            {i < steps.length - 1 ? <span className="bg-aq-border h-px w-6" aria-hidden /> : null}
          </li>
        );
      })}
    </ol>
  );
}

export default Stepper;
