/**
 * Scan state tracker — pure state transitions for real-time streaming scans.
 */

import type {
  Environment,
  ScanProfile,
  StreamInitEvent,
  StreamProbeEvent,
} from './types';

export interface ScanState {
  targetName: string;
  environment: Environment;
  profile: ScanProfile;
  totalProbes: number;
  completedProbes: number;
  passedCount: number;
  failedCount: number;
  inconclusiveCount: number;
  errorCount: number;
  recentProbes: StreamProbeEvent[];
}

/**
 * Creates the clean initial state for a scan.
 */
export function createInitialScanState(
  targetName = '',
  environment: Environment = 'development',
  profile: ScanProfile = 'quick',
): ScanState {
  return {
    targetName,
    environment,
    profile,
    totalProbes: 0,
    completedProbes: 0,
    passedCount: 0,
    failedCount: 0,
    inconclusiveCount: 0,
    errorCount: 0,
    recentProbes: [],
  };
}

/**
 * Updates scan state with initialization metadata from an SSE `init` event.
 */
export function handleInitEvent(
  state: ScanState,
  initEvent: StreamInitEvent,
): ScanState {
  return {
    ...state,
    totalProbes: initEvent.total,
    targetName: initEvent.targetName || state.targetName,
    profile: initEvent.profile || state.profile,
  };
}

/**
 * Updates scan state with probe results from an SSE `probe` event.
 * Increments completed probes, updates pass/fail/inconclusive/error counts,
 * and prepends to the recent probes buffer capped at `maxRecent`.
 */
export function handleProbeEvent(
  state: ScanState,
  probeEvent: StreamProbeEvent,
  maxRecent = 50,
): ScanState {
  const v = String(probeEvent.verdict || '').toUpperCase();
  const isPass = v === 'PASS';
  const isFail = v === 'FAIL';
  const isInconclusive = v === 'INCONCLUSIVE';
  const isError = v === 'ERROR';

  const totalProbes = state.totalProbes > 0 ? state.totalProbes : (probeEvent.total || 0);
  const recentProbes = [probeEvent, ...state.recentProbes].slice(0, maxRecent);

  return {
    ...state,
    totalProbes,
    completedProbes: state.completedProbes + 1,
    passedCount: state.passedCount + (isPass ? 1 : 0),
    failedCount: state.failedCount + (isFail ? 1 : 0),
    inconclusiveCount: state.inconclusiveCount + (isInconclusive ? 1 : 0),
    errorCount: state.errorCount + (isError ? 1 : 0),
    recentProbes,
  };
}

/**
 * Resets state back to initial values.
 */
export function resetScanState(
  targetName = '',
  environment: Environment = 'development',
  profile: ScanProfile = 'quick',
): ScanState {
  return createInitialScanState(targetName, environment, profile);
}
