/**
 * Auto-detection: given just an agent URL, probe it with a harmless canary
 * message and infer a working TargetConfig — which request field carries the
 * message, and where the reply text lives (JSON path or SSE event/field).
 *
 * This powers the "paste a URL, we do the rest" flow. It is best-effort and
 * deliberately gentle: one benign message per attempt, short timeouts, and it
 * stops at the first shape that produces a real reply. Agents needing auth or an
 * unusual contract fall back to manual (Advanced) configuration.
 */

import { extractByPath, parseSse, resolveHeaders, toResponseText } from './adapter.js';
import type { TargetConfig } from '@armoriq/schema';

const CANARY = 'Hello! In one short sentence, what can you help me with?';
const PER_REQUEST_TIMEOUT_MS = 20000;

/** Request body shapes to try, in priority order. */
const BODY_SHAPES: { desc: string; make: (c: string) => unknown }[] = [
  { desc: 'message', make: (c) => ({ message: c }) },
  { desc: 'openai-messages', make: (c) => ({ messages: [{ role: 'user', content: c }] }) },
  { desc: 'input', make: (c) => ({ input: c }) },
  { desc: 'prompt', make: (c) => ({ prompt: c }) },
  { desc: 'query', make: (c) => ({ query: c }) },
  { desc: 'question', make: (c) => ({ question: c }) },
  { desc: 'text', make: (c) => ({ text: c }) },
  { desc: 'openai-chat', make: (c) => ({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: c }] }) },
];

/** Known JSON response paths where the reply text commonly lives. */
const JSON_TEXT_PATHS = [
  'choices.0.message.content',
  'choices.0.text',
  'content.0.text',
  'message.content',
  'messages.0.content',
  'output_text',
  'reply',
  'response',
  'answer',
  'output',
  'text',
  'content',
  'data.answer',
  'data.text',
  'data.reply',
  'result',
  'completion',
];

const SSE_EVENTS = ['content', 'message', 'token', 'delta', 'text', 'data'];
const SSE_TEXT_FIELDS = ['text', 'content', 'delta', 'token', 'message'];

/** Common API sub-paths to try when the given URL isn't itself the endpoint. */
const COMMON_PATHS = [
  '/chat/stream',
  '/chat',
  '/api/chat',
  '/v1/chat/completions',
  '/api/message',
  '/message',
  '/ask',
  '/api/ask',
  '/query',
  '/api/query',
  '/invoke',
  '/run',
  '/generate',
  '/api/generate',
  '/completion',
];

export interface DetectSuccess {
  ok: true;
  target: Pick<TargetConfig, 'url' | 'method' | 'bodyTemplate' | 'responsePath'> &
    Partial<Pick<TargetConfig, 'responseMode' | 'sseEvent' | 'headers'>>;
  bodyShape: string;
  sample: string;
}
export interface DetectFailure {
  ok: false;
  error: string;
  tried: string[];
}
export type DetectResult = DetectSuccess | DetectFailure;

export interface DetectOptions {
  headers?: Record<string, string>;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}

/** Walk parsed JSON and return the dotted path to the longest plausible string. */
function deepestTextPath(obj: unknown): { path: string; value: string } | null {
  let best: { path: string; value: string } | null = null;
  const skip = new Set(['id', 'role', 'model', 'type', 'event', 'stage', 'status', 'name']);
  function walk(node: unknown, path: string): void {
    if (typeof node === 'string') {
      if (node.length >= 2 && (!best || node.length > best.value.length)) {
        best = { path, value: node };
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, path ? `${path}.${i}` : String(i)));
      return;
    }
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        if (skip.has(k)) continue;
        walk(v, path ? `${path}.${k}` : k);
      }
    }
  }
  walk(obj, '');
  return best;
}

function looksLikeHtml(text: string): boolean {
  return /^\s*<(!doctype|html)/i.test(text);
}
function isSse(contentType: string, body: string): boolean {
  return contentType.includes('text/event-stream') || /^event:\s*\S+/m.test(body) || /^data:\s*\S+/m.test(body);
}

/** Try one (url, bodyShape) combination. Returns a success config or null. */
async function tryCombo(
  url: string,
  shape: { desc: string; make: (c: string) => unknown },
  headers: Record<string, string>,
  fetchImpl: typeof fetch,
): Promise<DetectSuccess | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PER_REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(shape.make(CANARY)),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    return null;
  }
  clearTimeout(timer);
  if (!res.ok) return null;

  const contentType = res.headers.get('content-type') ?? '';
  const body = await res.text();
  if (looksLikeHtml(body)) return null;

  const base = { url, method: 'POST' as const, bodyTemplate: shape.make('{{PROMPT}}') };

  if (isSse(contentType, body)) {
    for (const ev of SSE_EVENTS) {
      for (const field of SSE_TEXT_FIELDS) {
        const t = parseSse(body, ev, field);
        if (t && t.length >= 2) {
          return {
            ok: true,
            bodyShape: shape.desc,
            sample: t.slice(0, 300),
            target: { ...base, responsePath: field, responseMode: 'sse', sseEvent: ev },
          };
        }
      }
    }
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    // Non-JSON, non-SSE plain text reply.
    if (body.trim().length >= 2) {
      return { ok: true, bodyShape: shape.desc, sample: body.slice(0, 300), target: { ...base, responsePath: '' } };
    }
    return null;
  }

  for (const path of JSON_TEXT_PATHS) {
    const v = extractByPath(parsed, path);
    const s = toResponseText(v);
    if (typeof v === 'string' && s.length >= 2) {
      return { ok: true, bodyShape: shape.desc, sample: s.slice(0, 300), target: { ...base, responsePath: path } };
    }
  }
  const deep = deepestTextPath(parsed);
  if (deep) {
    return { ok: true, bodyShape: shape.desc, sample: deep.value.slice(0, 300), target: { ...base, responsePath: deep.path } };
  }
  return null;
}

/** If the URL serves an SPA, sniff its JS bundle for a backend host + chat path. */
async function discoverFromSpa(url: string, fetchImpl: typeof fetch): Promise<string[]> {
  const found: string[] = [];
  try {
    const res = await fetchImpl(url, { method: 'GET' });
    const html = await res.text();
    if (!looksLikeHtml(html)) return found;
    const origin = new URL(url).origin;
    const scripts = [...html.matchAll(/src="([^"]+\.js)"/g)].map((m) => m[1]!);
    for (const src of scripts.slice(0, 4)) {
      const jsUrl = src.startsWith('http') ? src : origin + (src.startsWith('/') ? src : `/${src}`);
      const js = await (await fetchImpl(jsUrl)).text();
      const hosts = [...js.matchAll(/https:\/\/[a-z0-9.-]+\.run\.app/g)].map((m) => m[0]);
      const paths = [...js.matchAll(/["'`](\/[a-z0-9/_-]*chat[a-z0-9/_-]*)["'`]/gi)].map((m) => m[1]!);
      for (const host of [...new Set(hosts)]) {
        for (const p of paths.length ? [...new Set(paths)] : ['/chat/stream', '/chat']) {
          found.push(host + p);
        }
      }
    }
  } catch {
    /* best-effort */
  }
  return [...new Set(found)];
}

/**
 * Detect a working TargetConfig from just a URL (+ optional auth headers).
 */
export async function detectTarget(inputUrl: string, opts: DetectOptions = {}): Promise<DetectResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  let headers: Record<string, string>;
  try {
    headers = resolveHeaders(opts.headers ?? {}, opts.env ?? process.env);
  } catch (err) {
    return { ok: false, error: (err as Error).message, tried: [] };
  }

  const tried: string[] = [];
  const candidates: string[] = [inputUrl];

  // Add common sub-paths on the same origin (deduped).
  try {
    const origin = new URL(inputUrl).origin;
    for (const p of COMMON_PATHS) {
      const u = origin + p;
      if (!candidates.includes(u)) candidates.push(u);
    }
  } catch {
    return { ok: false, error: `"${inputUrl}" is not a valid URL`, tried };
  }

  // If the given URL is a SPA, discover its backend and prioritize it.
  const discovered = await discoverFromSpa(inputUrl, fetchImpl);
  for (const u of discovered.reverse()) {
    if (!candidates.includes(u)) candidates.unshift(u);
  }

  for (const url of candidates) {
    for (const shape of BODY_SHAPES) {
      tried.push(`${shape.desc} @ ${url}`);
      const hit = await tryCombo(url, shape, headers, fetchImpl);
      if (hit) {
        if (opts.headers && Object.keys(opts.headers).length) hit.target.headers = opts.headers;
        return hit;
      }
    }
  }

  return {
    ok: false,
    error:
      'Could not auto-detect this agent. It may need authentication, use a non-standard request/response shape, or not be an HTTP chat endpoint. Try Advanced setup.',
    tried,
  };
}
