/**
 * HTTP adapter — implements the Agent seam: turns a probe prompt + target config
 * into one HTTP request and extracts the response text via a dotted path.
 *
 * Guardrails:
 *  - Never DoS: per-probe timeout via AbortController (concurrency/delay live in
 *    the runner).
 *  - Secrets by reference only: ${ENV_VAR} placeholders in headers are resolved
 *    from the environment at request time; raw secrets are never persisted.
 *  - Never mis-score: send() never throws — transport/HTTP/parse/path failures
 *    are returned on AdapterResponse.error so the runner records ERROR (not PASS).
 */

import type { Agent, AdapterResponse, RunConfig, TargetConfig } from '@armoriq/schema';

/** The token replaced with the probe prompt inside the body template. */
export const PROMPT_TOKEN = '{{PROMPT}}';

/**
 * Deep-clone a JSON-serializable value, replacing every {{PROMPT}} occurrence
 * inside string values with the prompt. Object keys are left untouched.
 */
export function injectPrompt(template: unknown, prompt: string): unknown {
  if (typeof template === 'string') {
    return template.split(PROMPT_TOKEN).join(prompt);
  }
  if (Array.isArray(template)) {
    return template.map((item) => injectPrompt(item, prompt));
  }
  if (template !== null && typeof template === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(template)) {
      out[k] = injectPrompt(v, prompt);
    }
    return out;
  }
  return template;
}

const ENV_REF = /\$\{([A-Z0-9_]+)\}/g;

export class MissingEnvVarError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissingEnvVarError';
  }
}

/**
 * Resolve ${ENV_VAR} references in header values. Throws MissingEnvVarError if a
 * referenced variable is absent (fail fast rather than send an empty auth header).
 */
export function resolveHeaders(
  headers: Record<string, string>,
  env: NodeJS.ProcessEnv = process.env,
): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const [name, rawValue] of Object.entries(headers)) {
    resolved[name] = rawValue.replace(ENV_REF, (_m, varName: string) => {
      const value = env[varName];
      if (value === undefined) {
        throw new MissingEnvVarError(
          `header "${name}" references missing environment variable \${${varName}}`,
        );
      }
      return value;
    });
  }
  return resolved;
}

/**
 * Extract a value from parsed JSON using a dotted path. Numeric segments index
 * into arrays, e.g. "choices.0.message.content". Returns undefined if the path
 * cannot be fully resolved.
 */
export function extractByPath(data: unknown, path: string): unknown {
  if (path.length === 0) return data;
  const segments = path.split('.');
  let current: unknown = data;
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const idx = Number(segment);
      if (!Number.isInteger(idx) || idx < 0 || idx >= current.length) {
        return undefined;
      }
      current = current[idx];
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Parse a Server-Sent Events body and aggregate the answer text. For each event
 * block whose `event:` matches `eventName`, the `data:` payload is parsed as JSON
 * and `dataPath` (dotted) is extracted. Chunks are aggregated with auto delta vs
 * cumulative detection: if a chunk starts with everything seen so far it REPLACES
 * (cumulative streams like {"text":"He"} -> {"text":"Hello"}); otherwise it is
 * APPENDED (delta streams like {"text":"He"} -> {"text":"llo"}).
 */
export function parseSse(rawText: string, eventName: string, dataPath: string): string {
  let result = '';
  for (const block of rawText.split(/\r?\n\r?\n/)) {
    let ev = 'message';
    const dataLines: string[] = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('event:')) ev = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if (ev !== eventName || dataLines.length === 0) continue;
    const dataStr = dataLines.join('\n');
    let piece: string;
    try {
      piece = toResponseText(extractByPath(JSON.parse(dataStr), dataPath));
    } catch {
      piece = dataStr;
    }
    if (!piece) continue;
    if (result === '' || piece.startsWith(result)) result = piece; // cumulative
    else if (!result.endsWith(piece)) result += piece; // delta
  }
  return result;
}

/** Coerce an extracted response value into text for the detectors. */
export function toResponseText(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

export interface HttpAgentOptions {
  run?: RunConfig;
  env?: NodeJS.ProcessEnv;
  /** Injectable fetch for tests. Defaults to the built-in global fetch. */
  fetchImpl?: typeof fetch;
}

/**
 * Build an Agent backed by an HTTP target. Each send() issues one POST, honoring
 * the per-probe timeout, and returns the extracted response text (or an error).
 */
export function createHttpAgent(
  target: TargetConfig,
  options: HttpAgentOptions = {},
): Agent {
  const timeoutMs = options.run?.timeoutMs ?? 30000;
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async send(prompt: string): Promise<AdapterResponse> {
      let headers: Record<string, string>;
      try {
        headers = resolveHeaders(target.headers ?? {}, env);
      } catch (err) {
        return { responseText: '', error: (err as Error).message };
      }
      if (!Object.keys(headers).some((h) => h.toLowerCase() === 'content-type')) {
        headers['Content-Type'] = 'application/json';
      }

      const body = injectPrompt(target.bodyTemplate, prompt);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
      try {
        response = await fetchImpl(target.url, {
          method: target.method ?? 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timer);
        const e = err as Error;
        const msg =
          e.name === 'AbortError'
            ? `request timed out after ${timeoutMs}ms`
            : `request failed: ${e.message}`;
        return { responseText: '', error: msg };
      }
      clearTimeout(timer);

      const rawText = await response.text();
      if (!response.ok) {
        return {
          responseText: '',
          error: `target returned HTTP ${response.status}: ${rawText.slice(0, 200)}`,
        };
      }

      // Server-Sent Events: explicit responseMode 'sse' OR an event-stream content type.
      const contentType = response.headers.get('content-type') ?? '';
      if (target.responseMode === 'sse' || contentType.includes('text/event-stream')) {
        const eventName = target.sseEvent ?? 'content';
        const dataPath = target.responsePath.length > 0 ? target.responsePath : 'text';
        const text = parseSse(rawText, eventName, dataPath);
        if (!text) {
          return {
            responseText: '',
            raw: rawText.slice(0, 2000),
            error: `no "${eventName}" events carrying "${dataPath}" found in the SSE stream`,
          };
        }
        return { responseText: text, raw: rawText.slice(0, 2000) };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        if (target.responsePath.length > 0) {
          return {
            responseText: '',
            error: `response is not JSON but responsePath "${target.responsePath}" was specified`,
          };
        }
        return { responseText: rawText, raw: rawText };
      }

      const extracted = extractByPath(parsed, target.responsePath);
      if (extracted === undefined) {
        return {
          responseText: '',
          raw: parsed,
          error: `responsePath "${target.responsePath}" did not resolve in the response body`,
        };
      }

      return { responseText: toResponseText(extracted), raw: parsed };
    },
  };
}
