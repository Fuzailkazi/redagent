/**
 * FormField — wraps a control with label + (optional required mark) +
 * helper text. Switches helper for an error message when `error` is set.
 *
 * Mirrors the Figma FormField component (Required + Has error booleans).
 * Replaces ~36 ad-hoc "label / input / helper / error" blocks in feature
 * code, every one slightly different.
 *
 * Usage:
 *   <FormField label="Email" helper="We never spam." required>
 *     <input ... />
 *   </FormField>
 *
 *   <FormField label="Password" error={errMsg}>
 *     <input type="password" ... />
 *   </FormField>
 */
import { useEffect, useId, useRef, type ReactElement, type ReactNode } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { shakeAnimation } from '@shared/motion';

export type FormFieldProps = {
  label: string;
  /** Helper shown when `error` is unset. */
  helper?: string;
  /** When set, replaces helper and red-tints the field affordance. */
  error?: string;
  required?: boolean;
  /** Extra wrapper class. */
  className?: string;
  /** The control. The label's htmlFor is wired to the first input/select/
   *  textarea inside, identified by a generated id passed via context...
   *  but since we don't have context here, pass the id manually. */
  children: ReactNode;
  /** Optional explicit id for the control inside `children`. */
  htmlFor?: string;
};

export function FormField({
  label,
  helper,
  error,
  required = false,
  className,
  children,
  htmlFor,
}: FormFieldProps): ReactElement {
  const generatedId = useId();
  const id = htmlFor ?? `ff-${generatedId}`;
  const hasError = typeof error === 'string' && error.length > 0;
  const describedById = hasError ? `${id}-error` : helper ? `${id}-helper` : undefined;

  // Shake the control once when a new error appears (empty → error, or one
  // error message → a different one). No shake on mount or when clearing.
  const controls = useAnimationControls();
  const reduce = useReducedMotion();
  const prevError = useRef(error);
  useEffect(() => {
    if (hasError && prevError.current !== error && !reduce) {
      void controls.start(shakeAnimation);
    }
    prevError.current = error;
  }, [error, hasError, reduce, controls]);

  return (
    <div className={['flex flex-col gap-1.5', className ?? ''].join(' ')}>
      <label
        htmlFor={id}
        className="text-aq-ink-soft text-aq-xs inline-flex items-center gap-1 font-medium"
      >
        {label}
        {required ? (
          <span aria-hidden className="text-aq-bad">
            *
          </span>
        ) : null}
      </label>
      <motion.div animate={controls} aria-describedby={describedById}>
        {children}
      </motion.div>
      {hasError ? (
        <div id={`${id}-error`} className="text-aq-bad text-aq-xs font-medium">
          {error}
        </div>
      ) : helper ? (
        <div id={`${id}-helper`} className="text-aq-ink-muted text-aq-xs">
          {helper}
        </div>
      ) : null}
    </div>
  );
}

export default FormField;
