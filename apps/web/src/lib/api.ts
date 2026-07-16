/**
 * Typed client for the ArmorIQ Phase 3 API (apps/api).
 *
 * All shapes here are derived from what apps/api ACTUALLY returns (see
 * apps/api/src/app.ts) — not from a spec. Notably: GET /scans/:id nests its
 * counts under `counts` and names the failure field `errorMessage`.
 *
 * Base URL comes from NEXT_PUBLIC_API_URL (default http://localhost:3001).
 * These functions run in the browser, so the API must allow CORS (it does).
 */

import type {
  Config,
  Severity,
  Verdict,
} from '@armoriq/schema';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/* -------------------------------------------------------------------------- */
/* Response types (mirror apps/api/src/app.ts)                                */
/* -------------------------------------------------------------------------- */

export type ScanProfile = 'quick' | 'standard' | 'deep';
export type ScanStatus = 'queued' | 'running' | 'completed' | 'failed';
export type Environment = 'production' | 'staging' | 'development';

/** POST /targets -> 201 */
export interface CreateTargetResponse {
  id: string;
}

/** GET /targets -> Target[] (summaries) */
export interface TargetSummary {
  id: string;
  name: string;
  environment: Environment;
  createdAt: string;
}

/** GET /targets/:id -> full target row (config with ${ENV_VAR} refs UNRESOLVED) */
export interface Target {
  id: string;
  name: string;
  environment: Environment;
  config: Config;
  targetConfigHash: string;
  createdAt: string;
}

/** POST /targets/:id/scans -> 202 */
export interface CreateScanResponse {
  scanId: string;
  status: 'queued';
}

/** GET /scans/:id -> status + scores + counts + reproducibility metadata */
export interface ScanCounts {
  total: number;
  pass: number;
  fail: number;
  inconclusive: number;
  error: number;
}

export interface Scan {
  id: string;
  targetId: string;
  status: ScanStatus;
  profile: ScanProfile;
  judgeMode: 'inconclusive' | 'deep' | null;
  libraryVersion: string | null;
  engineVersion: string | null;
  judgeModel: string | null;
  resiliencePct: number | null;
  weightedRiskPct: number | null;
  counts: ScanCounts;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

/** GET /scans/:id/findings -> Finding[] (responseText is SENSITIVE verbatim output) */
export interface Finding {
  id: string;
  scanId: string;
  probeId: string;
  category: string;
  owasp: string;
  severity: Severity;
  verdict: Verdict;
  tier1Verdict: Verdict | null;
  reason: string;
  responseText: string;
  judge: unknown | null;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/* Request bodies                                                             */
/* -------------------------------------------------------------------------- */

export interface CreateTargetRequest {
  name: string;
  config: Config;
}

export interface CreateScanRequest {
  profile?: ScanProfile;
  /** Required (via this OR the x-redteam-authorize header) for production targets. */
  authorize?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Fetch helper                                                               */
/* -------------------------------------------------------------------------- */

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  let body: unknown = undefined;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    let msg = `Request to ${path} failed with ${res.status}`;
    if (
      body &&
      typeof body === 'object' &&
      'message' in body &&
      typeof (body as { message: unknown }).message === 'string'
    ) {
      msg = (body as { message: string }).message;
    }
    throw new ApiError(res.status, msg, body);
  }

  return body as T;
}

/* -------------------------------------------------------------------------- */
/* Public client functions                                                    */
/* -------------------------------------------------------------------------- */

export function createTarget(
  input: CreateTargetRequest,
): Promise<CreateTargetResponse> {
  return request<CreateTargetResponse>('/targets', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listTargets(): Promise<TargetSummary[]> {
  return request<TargetSummary[]>('/targets');
}

export function getTarget(id: string): Promise<Target> {
  return request<Target>(`/targets/${encodeURIComponent(id)}`);
}

export function createScan(
  targetId: string,
  input: CreateScanRequest = {},
): Promise<CreateScanResponse> {
  // Send authorization both by header and in the body so a production target
  // scan is accepted (the API honors either).
  const headers: Record<string, string> = {};
  if (input.authorize) headers['x-redteam-authorize'] = 'true';
  return request<CreateScanResponse>(
    `/targets/${encodeURIComponent(targetId)}/scans`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    },
  );
}

export function getScan(id: string): Promise<Scan> {
  return request<Scan>(`/scans/${encodeURIComponent(id)}`);
}

export function getFindings(id: string): Promise<Finding[]> {
  return request<Finding[]>(`/scans/${encodeURIComponent(id)}/findings`);
}

/** POST /detect -> inferred target config from just a URL. */
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

export function detect(
  url: string,
  headers?: Record<string, string>,
): Promise<DetectResponse> {
  return request<DetectResponse>('/detect', {
    method: 'POST',
    body: JSON.stringify({ url, headers }),
  });
}

/** GET /scans -> recent scans for the history dashboard. */
export interface ScanSummary {
  id: string;
  targetId: string;
  targetName: string;
  environment: Environment;
  status: ScanStatus;
  profile: ScanProfile;
  resiliencePct: number | null;
  weightedRiskPct: number | null;
  total: number | null;
  createdAt: string;
  finishedAt: string | null;
}

export function listScans(): Promise<ScanSummary[]> {
  return request<ScanSummary[]>('/scans');
}

/** Direct download URL for a scan's report (bypasses JSON parsing). */
export function reportUrl(id: string, fmt: 'json' | 'md'): string {
  return `${API_URL}/scans/${encodeURIComponent(id)}/report.${fmt}`;
}
