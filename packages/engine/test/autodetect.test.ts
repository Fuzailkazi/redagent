import { describe, it, expect, afterEach } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { detectTarget } from '../src/autodetect.js';

const servers: Server[] = [];
afterEach(() => {
  for (const s of servers.splice(0)) s.close();
});

async function listen(handler: (body: unknown, res: import('node:http').ServerResponse) => void): Promise<string> {
  const server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      let body: unknown;
      try { body = JSON.parse(raw); } catch { body = raw; }
      handler(body, res);
    });
  });
  servers.push(server);
  await new Promise<void>((r) => server.listen(0, r));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
}

describe('detectTarget', () => {
  it('detects a simple JSON agent with a {message} body and {reply} response', async () => {
    const url = await listen((body, res) => {
      const b = body as { message?: string };
      res.writeHead(b?.message ? 200 : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(b?.message ? { reply: 'I can help with courses.' } : { error: 'bad' }));
    });
    const r = await detectTarget(url);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.bodyShape).toBe('message');
      expect(r.target.responsePath).toBe('reply');
      expect(r.sample).toContain('courses');
    }
  });

  it('detects an OpenAI-style agent', async () => {
    const url = await listen((body, res) => {
      const b = body as { messages?: unknown };
      res.writeHead(b?.messages ? 200 : 400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(b?.messages ? { choices: [{ message: { content: 'Hi from OpenAI-style.' } }] } : {}));
    });
    const r = await detectTarget(url);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.target.responsePath).toBe('choices.0.message.content');
  });

  it('detects an SSE streaming agent', async () => {
    const url = await listen((_body, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.end('event: content\ndata: {"text":"Hello"}\n\nevent: content\ndata: {"text":"Hello there"}\n\n');
    });
    const r = await detectTarget(url);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.target.responseMode).toBe('sse');
      expect(r.target.sseEvent).toBe('content');
      expect(r.sample).toBe('Hello there');
    }
  });

  it('fails cleanly on a non-agent URL', async () => {
    const url = await listen((_body, res) => {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    });
    const r = await detectTarget(url);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.tried.length).toBeGreaterThan(0);
  });
});
