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
  ScanStreamCallbacks,
  StreamErrorEvent,
  StreamInitEvent,
  StreamProbeEvent,
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
  ScanStreamCallbacks,
  StreamErrorEvent,
  StreamInitEvent,
  StreamProbeEvent,
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

/** Run a scan via SSE streaming progress events. */
export async function runScanStream(
  config: Config,
  profile: ScanProfile = 'quick',
  authorize = false,
  callbacks?: ScanStreamCallbacks,
  signal?: AbortSignal,
): Promise<RunScanResult> {
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const onAbort = () => {
    reader?.cancel(signal?.reason).catch(() => {});
  };

  try {
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException('The operation was aborted.', 'AbortError');
    }

    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'text/event-stream',
      },
      body: JSON.stringify({ config, profile, authorize, stream: true }),
      signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let body: unknown = undefined;
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
      }
      let msg = `Request to /api/scan failed with ${res.status}`;
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

    if (!res.body) {
      throw new Error('Response body is missing');
    }

    reader = res.body.getReader();
    if (signal) {
      signal.addEventListener('abort', onAbort);
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = '';
    let currentData = '';

    while (true) {
      if (signal?.aborted) {
        throw signal.reason ?? new DOMException('The operation was aborted.', 'AbortError');
      }

      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const trimmed = rawLine.replace(/\r$/, '').trim();
        if (trimmed.startsWith(':')) {
          continue;
        }
        if (trimmed === '') {
          if (currentEvent && currentData) {
            if (currentEvent === 'init') {
              const data = JSON.parse(currentData) as StreamInitEvent;
              callbacks?.onInit?.(data);
            } else if (currentEvent === 'probe') {
              const data = JSON.parse(currentData) as StreamProbeEvent;
              callbacks?.onProbe?.(data);
            } else if (currentEvent === 'error') {
              const data = JSON.parse(currentData) as StreamErrorEvent;
              throw new Error(data.message || data.error || 'Scan stream error');
            } else if (currentEvent === 'complete') {
              const data = JSON.parse(currentData) as RunScanResult;
              return data;
            }
          }
          currentEvent = '';
          currentData = '';
        } else if (trimmed.startsWith('event:')) {
          currentEvent = trimmed.slice(6).trim();
        } else if (trimmed.startsWith('data:')) {
          const val = trimmed.slice(5).trim();
          currentData = currentData ? `${currentData}\n${val}` : val;
        }
      }
    }

    if (buffer.trim()) {
      const trimmed = buffer.replace(/\r$/, '').trim();
      if (trimmed.startsWith('event:')) {
        currentEvent = trimmed.slice(6).trim();
      } else if (trimmed.startsWith('data:')) {
        const val = trimmed.slice(5).trim();
        currentData = currentData ? `${currentData}\n${val}` : val;
      }
      if (currentEvent && currentData) {
        if (currentEvent === 'init') {
          const data = JSON.parse(currentData) as StreamInitEvent;
          callbacks?.onInit?.(data);
        } else if (currentEvent === 'probe') {
          const data = JSON.parse(currentData) as StreamProbeEvent;
          callbacks?.onProbe?.(data);
        } else if (currentEvent === 'error') {
          const data = JSON.parse(currentData) as StreamErrorEvent;
          throw new Error(data.message || data.error || 'Scan error');
        } else if (currentEvent === 'complete') {
          const data = JSON.parse(currentData) as RunScanResult;
          return data;
        }
      }
    }

    throw new Error('Scan stream disconnected before completion.');
  } catch (err) {
    callbacks?.onError?.(err as Error);
    throw err;
  } finally {
    if (signal) {
      signal.removeEventListener('abort', onAbort);
    }
    reader?.cancel().catch(() => {});
  }
}

