/**
 * Browser client for the in-process scan routes (app/api/*).
 *
 * There is no external API server anymore — scans run inside this Next.js app.
 * Two calls power the whole product:
 *   • detect(url)                       -> POST /api/detect  (infer a config)
 *   • runScan(config, profile, auth)    -> POST /api/scan    (run + score + report)
 *
 * Same-origin fetches, so no NEXT_PUBLIC_API_URL / CORS.
 */

import type {
  Config,
  DetectResponse,
  RunScanResult,
  ScanProfile,
} from './types';

export type {
  Config,
  DetectResponse,
  DetectedTarget,
  Environment,
  Finding,
  RunScanResult,
  Scan,
  ScanCounts,
  ScanProfile,
} from './types';

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
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

/** Infer a working target config from just a URL (+ optional auth headers). */
export function detect(
  url: string,
  headers?: Record<string, string>,
): Promise<DetectResponse> {
  return request<DetectResponse>('/api/detect', {
    method: 'POST',
    body: JSON.stringify({ url, headers }),
  });
}

/** Run a scan synchronously and get back the scored result + reports. */
export function runScan(
  config: Config,
  profile: ScanProfile,
  authorize = false,
): Promise<RunScanResult> {
  return request<RunScanResult>('/api/scan', {
    method: 'POST',
    body: JSON.stringify({ config, profile, authorize }),
  });
}
