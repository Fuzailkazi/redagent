/**
 * ConnectionStatus — a persistent live-connection signal for real-time surfaces
 * (the AIQ graph, the held-actions stream). Distinct from one-shot loading:
 * this is an ambient status the user can glance at to trust that the data is
 * live, not stale.
 *
 *   <ConnectionStatus state="connected" />
 *   <ConnectionStatus state="reconnecting" />
 *   <ConnectionStatus state="offline" label="No connection" />
 *
 * State is shown with colour PLUS a label (never colour alone), per the design
 * principles. `reconnecting` pulses; the others are steady.
 */
import { type ReactElement } from 'react';

export type ConnectionState = 'connected' | 'reconnecting' | 'offline';

export type ConnectionStatusProps = {
  state: ConnectionState;
  /** Override the default label for this state. */
  label?: string;
  className?: string;
};

const DOT_CLASS: Record<ConnectionState, string> = {
  connected: 'bg-aq-good',
  reconnecting: 'bg-aq-warn motion-safe:animate-pulse',
  offline: 'bg-aq-bad',
};

const DEFAULT_LABEL: Record<ConnectionState, string> = {
  connected: 'Live',
  reconnecting: 'Reconnecting',
  offline: 'Offline',
};

export function ConnectionStatus({ state, label, className }: ConnectionStatusProps): ReactElement {
  return (
    <span
      role="status"
      aria-live={state === 'reconnecting' ? 'polite' : 'off'}
      className={[
        'text-aq-caption text-aq-ink-muted inline-flex items-center gap-1.5 font-medium',
        className ?? '',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className={['inline-block h-2 w-2 rounded-full', DOT_CLASS[state]].join(' ')}
      />
      {label ?? DEFAULT_LABEL[state]}
    </span>
  );
}

export default ConnectionStatus;
