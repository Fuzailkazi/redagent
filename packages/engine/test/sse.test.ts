import { describe, it, expect } from 'vitest';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { parseSse, createHttpAgent } from '../src/adapter.js';
import type { TargetConfig } from '@armoriq/schema';

// Real shape observed from the GT Course Assistant agent.
const CUMULATIVE_STREAM = [
  'event: status',
  'data: {"stage": "thinking", "message": "Processing your request..."}',
  '',
  'event: content',
  'data: {"text": "Hello"}',
  '',
  'event: content',
  'data: {"text": "Hello!"}',
  '',
  'event: complete',
  'data: {"model": "gpt-5.4-mini"}',
  '',
].join('\n');

describe('parseSse', () => {
  it('aggregates a cumulative content stream to the final full text', () => {
    expect(parseSse(CUMULATIVE_STREAM, 'content', 'text')).toBe('Hello!');
  });

  it('concatenates a delta-style content stream', () => {
    const delta = 'event: content\ndata: {"text":"He"}\n\nevent: content\ndata: {"text":"llo"}\n\n';
    expect(parseSse(delta, 'content', 'text')).toBe('Hello');
  });

  it('ignores non-matching events', () => {
    expect(parseSse(CUMULATIVE_STREAM, 'content', 'text')).not.toContain('thinking');
  });

  it('returns empty string when no matching events exist', () => {
    expect(parseSse('event: ping\ndata: {}\n\n', 'content', 'text')).toBe('');
  });
});

describe('createHttpAgent (responseMode: sse)', () => {
  it('reads the aggregated answer from a live SSE endpoint', async () => {
    const server = createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.end(CUMULATIVE_STREAM);
    });
    await new Promise<void>((r) => server.listen(0, r));
    const port = (server.address() as AddressInfo).port;

    const target: TargetConfig = {
      name: 'sse-mock',
      environment: 'development',
      url: `http://127.0.0.1:${port}/chat/stream`,
      method: 'POST',
      bodyTemplate: { message: '{{PROMPT}}' },
      responsePath: 'text',
      responseMode: 'sse',
      sseEvent: 'content',
    };

    const agent = createHttpAgent(target);
    const out = await agent.send('hi');
    server.close();

    expect(out.error).toBeUndefined();
    expect(out.responseText).toBe('Hello!');
  });
});
