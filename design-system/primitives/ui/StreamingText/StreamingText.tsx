/**
 * StreamingText — renders text as it arrives token-by-token, with a blinking
 * caret while generation is live. The honest "it is generating now" signal for
 * AI surfaces (the AI policy composer, AI explanations) — the Cursor feel.
 *
 * Controlled by design: the caller owns the stream and passes the accumulated
 * text so far plus a `streaming` flag. The component does not buffer or fake
 * typing — it shows exactly what has arrived, with the caret only while the
 * stream is open. When `streaming` flips false, the caret disappears and the
 * final text stays.
 *
 *   <StreamingText text={partial} streaming={isGenerating} />
 *
 * Pair with the step-checklist ThinkingState for the "reasoning" phase, then
 * switch to StreamingText for the actual generated output.
 */
import { type ElementType, type ReactElement } from 'react';

export type StreamingTextProps = {
  /** The accumulated text received so far. */
  text: string;
  /** Show the caret while the stream is open. */
  streaming?: boolean;
  /** Element to render as. Defaults to 'span'. */
  as?: ElementType;
  className?: string;
};

export function StreamingText({
  text,
  streaming = false,
  as: As = 'span',
  className,
}: StreamingTextProps): ReactElement {
  return (
    <As className={className} aria-live="polite" aria-busy={streaming || undefined}>
      {text}
      {streaming ? <span className="aq-caret" aria-hidden="true" /> : null}
    </As>
  );
}

export default StreamingText;
