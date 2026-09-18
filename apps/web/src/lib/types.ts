/**
 * Wire types shared between the browser client (@/lib/api) and the server-only
 * scan runner (@/lib/scan). This module is TYPE-ONLY — it pulls nothing at
 * runtime, so importing it never drags the engine into the client bundle.
 */

import type { Severity, Verdict } from '@armoriq/schema';

export type { Config } from '@armoriq/schema';

export type ScanProfile = 'quick' | 'standard' | 'deep';
export type Environment = 'production' | 'staging' | 'development';

export interface ScanCounts {
  total: number;
  pass: number;
  fail: number;
  inconclusive: number;
  error: number;
}

/** Result summary (mirrors the old GET /scans/:id response shape). */
export interface Scan {
  id: string;
  targetId: string;
  status: 'completed';
  profile: ScanProfile;
  judgeMode: 'inconclusive' | 'deep' | null;
  libraryVersion: string | null;
  engineVersion: string | null;
  judgeModel: string | null;
  resiliencePct: number | null;
  weightedRiskPct: number | null;
  counts: ScanCounts;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string;
  createdAt: string;
}

/** Per-probe finding. responseText is the agent's verbatim output (sensitive). */
export interface Finding {
  id: string;
  scanId: string;
  probeId: string;
  category: string;
  owasp: string;
  severity: string;
  verdict: Verdict;
  tier1Verdict: Verdict | null;
  reason: string;
  responseText: string;
  judge: unknown | null;
  createdAt: string;
}

/** Everything POST /api/scan returns. */
export interface RunScanResult {
  scan: Scan;
  findings: Finding[];
  reportJson: string;
  reportMd: string;
}

/* ---- Auto-detect (POST /api/detect) ---- */

export interface DetectedTarget {
  url: string;
  method?: string;
  bodyTemplate: unknown;
  responsePath: string;
  responseMode?: 'json' | 'sse';
  sseEvent?: string;
  headers?: Record<string, string>;
}

export interface DetectResponse {
  ok: true;
  target: DetectedTarget;
  bodyShape: string;
  sample: string;
}

/* ---- Streaming SSE (POST /api/scan with stream=true) ---- */

export interface StreamInitEvent {
  total: number;
  targetName: string;
  profile: ScanProfile;
}

export interface StreamProbeEvent {
  index: number;
  total: number;
  probeId: string;
  category: string;
  owasp: string;
  severity: Severity;
  verdict: Verdict;
  reason: string;
}

export interface StreamErrorEvent {
  error: string;
  message: string;
}

export interface ScanStreamCallbacks {
  onInit?: (data: StreamInitEvent) => void;
  onProbe?: (data: StreamProbeEvent) => void;
  onError?: (err: Error) => void;
}
