/**
 * Progress — determinate (and indeterminate) progress for tasks with a knowable
 * end: scans, uploads, bulk deploys, an MCP server connecting.
 *
 * Loading-system rule: when a task has a measurable end, show progress — an
 * indeterminate matrix on a 90-second scan reads as hung. The chosen treatment
 * for the app is the INLINE ROW form (`inline`): a short label, the track
 * filling the remaining width, and an optional percent on the right, so the
 * progress lives inside the list row it belongs to and keeps its context.
 *
 *   <Progress value={62} label="Scanning" inline showValue />
 *   <Progress value={40} />              // bare bar
 *   <Progress label="Connecting" inline />   // indeterminate (no value)
 *
 * Pass no `value` for an indeterminate bar (work started, no percentage yet).
 */
import { type CSSProperties, type ReactElement } from 'react';

export type ProgressSize = 'sm' | 'md';

export type ProgressProps = {
  /** 0–100. Omit for an indeterminate bar. */
  value?: number;
  /** Short leading label (e.g. "Scanning", "Connecting"). */
  label?: string;
  /** Inline-row layout: label left, track flexes, percent right. */
  inline?: boolean;
  /** Show the numeric percent (determinate only). */
  showValue?: boolean;
  size?: ProgressSize;
  className?: string;
};

const TRACK_H: Record<ProgressSize, string> = { sm: 'h-1', md: 'h-1.5' };

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function Progress({
  value,
  label,
  inline = false,
  showValue = false,
  size = 'md',
  className,
}: ProgressProps): ReactElement {
  const indeterminate = value == null;
  const pct = indeterminate ? 0 : clamp(value);
  const fillStyle: CSSProperties = { width: `${pct}%` };

  const track = (
    <span
      role="progressbar"
      aria-label={label ?? 'Progress'}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 100}
      aria-valuenow={indeterminate ? undefined : Math.round(pct)}
      className={[
        'bg-aq-zebra relative block w-full overflow-hidden rounded-full',
        TRACK_H[size],
        inline ? 'min-w-0 flex-1' : '',
      ].join(' ')}
    >
      {indeterminate ? (
        <span className="aq-progress-indeterminate" />
      ) : (
        <span
          style={fillStyle}
          className="bg-aq-accent motion-safe:duration-aq-base block h-full rounded-full motion-safe:transition-[width]"
        />
      )}
    </span>
  );

  if (!inline) {
    return (
      <span className={['flex flex-col gap-1.5', className ?? ''].join(' ')}>
        {(label || (showValue && !indeterminate)) && (
          <span className="text-aq-caption text-aq-ink-muted flex items-center justify-between">
            {label ? <span>{label}</span> : <span />}
            {showValue && !indeterminate ? (
              <span className="font-mono tabular-nums">{Math.round(pct)}%</span>
            ) : null}
          </span>
        )}
        {track}
      </span>
    );
  }

  return (
    <span className={['flex items-center gap-2.5', className ?? ''].join(' ')}>
      {label ? (
        <span className="text-aq-caption text-aq-ink-soft shrink-0 font-medium">{label}</span>
      ) : null}
      {track}
      {showValue && !indeterminate ? (
        <span className="text-aq-caption text-aq-ink-muted shrink-0 font-mono tabular-nums">
          {Math.round(pct)}%
        </span>
      ) : null}
    </span>
  );
}

export default Progress;
