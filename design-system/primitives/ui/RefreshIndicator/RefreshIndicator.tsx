/**
 * RefreshIndicator — the background-refresh signal.
 *
 * Loading-system rule: when new data is arriving for a view that is ALREADY on
 * screen (Event Log, the graph, the held-actions count), do not throw a
 * skeleton — that nukes scroll position and context. Refresh quietly with a
 * small pill while the current data stays put.
 *
 *   <RefreshIndicator refreshing={isFetching} />
 *   <RefreshIndicator refreshing={isFetching} idleLabel="Updated 2m ago" />
 *
 * While `refreshing`, shows a spinning glyph + label. When idle, shows
 * `idleLabel` if provided (doubles as a freshness stamp), otherwise renders
 * nothing — so the pill only appears when it has something to say.
 */
import { type ReactElement } from 'react';
import { IconRefresh } from '@shared/icons';

export type RefreshIndicatorProps = {
  refreshing: boolean;
  /** Label shown while refreshing. Defaults to "Refreshing". */
  label?: string;
  /** Optional freshness label shown when idle (e.g. "Updated 2m ago"). */
  idleLabel?: string;
  className?: string;
};

export function RefreshIndicator({
  refreshing,
  label = 'Refreshing',
  idleLabel,
  className,
}: RefreshIndicatorProps): ReactElement | null {
  if (!refreshing && !idleLabel) return null;

  return (
    <span
      role="status"
      aria-live="polite"
      className={[
        'border-aq-border bg-aq-surface text-aq-caption text-aq-ink-soft inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium',
        className ?? '',
      ].join(' ')}
    >
      {refreshing ? (
        <>
          <IconRefresh
            size={11}
            stroke={2}
            className="text-aq-ink-muted motion-safe:animate-spin"
          />
          {label}
        </>
      ) : (
        <span className="text-aq-ink-muted">{idleLabel}</span>
      )}
    </span>
  );
}

export default RefreshIndicator;
