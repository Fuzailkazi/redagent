/**
 * Adapter tests.
 *
 *  - Pure helpers: injectPrompt, extractByPath (incl. array indices),
 *    resolveHeaders (${ENV_VAR} resolution).
 *  - End-to-end createHttpAgent against a real local node:http server: verifies
 *    {{PROMPT}} injection into the body template, dotted responsePath extraction,
 *    and ${ENV_VAR} header resolution reaching the wire.
 */

import { createServer, type Server, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  createHttpAgent,
  extractByPath,
  injectPrompt,
  resolveHeaders,
} from '../src/adapter.js';
import type { TargetConfig } from '../src/types.js';

describe('injectPrompt', () => {
  it('replaces {{PROMPT}} in nested string values without mutating the template', () => {
    const template = {
      model: 'x',
      messages: [{ role: 'user', content: 'say {{PROMPT}} now' }],
    };
    const out = injectPrompt(template, 'HELLO') as typeof template;
    expect(out.messages[0]!.content).toBe('say HELLO now');
    // original untouched (deep clone)
    expect(template.messages[0]!.content).toBe('say {{PROMPT}} now');
  });

  it('replaces every occurrence', () => {
    expect(injectPrompt('{{PROMPT}}-{{PROMPT}}', 'x')).toBe('x-x');
  });
});

describe('extractByPath', () => {
  const data = {
    choices: [
      { message: { content: 'first' } },
      { message: { content: 'second' } },
    ],
  };

  it('resolves dotted paths with array indices', () => {
    expect(extractByPath(data, 'choices.0.message.content')).toBe('first');
    expect(extractByPath(data, 'choices.1.message.content')).toBe('second');
  });

  it('returns undefined for out-of-range or missing segments', () => {
    expect(extractByPath(data, 'choices.9.message.content')).toBeUndefined();
    expect(extractByPath(data, 'choices.0.nope')).toBeUndefined();
  });
});

describe('resolveHeaders', () => {
  it('resolves ${ENV_VAR} references from the provided environment', () => {
    const out = resolveHeaders(
      { Authorization: 'Bearer ${TOK}' },
      { TOK: 'secret-123' } as NodeJS.ProcessEnv,
    );
    expect(out.Authorization).toBe('Bearer secret-123');
  });

  it('throws when a referenced variable is missing', () => {
    expect(() =>
      resolveHeaders({ Authorization: 'Bearer ${MISSING}' }, {} as NodeJS.ProcessEnv),
    ).toThrow(/MISSING/);
  });
});

describe('createHttpAgent (live local server)', () => {
  let server: Server;
  let url: string;
  let lastBody: unknown;
  let lastAuth: string | undefined;

  beforeAll(async () => {
    server = createServer((req: IncomingMessage, res) => {
      lastAuth = req.headers['authorization'];
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(c as Buffer));
      req.on('end', () => {
        lastBody = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            choices: [{ message: { content: 'model says: refused' } }],
          }),
        );
      });
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const addr = server.address() as AddressInfo;
    url = `http://127.0.0.1:${addr.port}/chat`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('injects the prompt into the body and extracts via responsePath', async () => {
    const target: TargetConfig = {
      name: 'local',
      environment: 'staging',
      url,
      method: 'POST',
      headers: { Authorization: 'Bearer ${AGENT_TOKEN}' },
      bodyTemplate: { messages: [{ role: 'user', content: '{{PROMPT}}' }] },
      responsePath: 'choices.0.message.content',
    };
    const agent = createHttpAgent(target, {
      env: { AGENT_TOKEN: 'tok-xyz' } as NodeJS.ProcessEnv,
    });

    const res = await agent.send('attack payload 42');

    expect(res.error).toBeUndefined();
    expect(res.responseText).toBe('model says: refused');
    // {{PROMPT}} reached the wire inside the templated body:
    expect(lastBody).toMatchObject({
      messages: [{ role: 'user', content: 'attack payload 42' }],
    });
    // ${ENV_VAR} header was resolved before sending:
    expect(lastAuth).toBe('Bearer tok-xyz');
  });

  it('returns an error (not a throw) when responsePath does not resolve', async () => {
    const target: TargetConfig = {
      name: 'local',
      environment: 'staging',
      url,
      method: 'POST',
      headers: {},
      bodyTemplate: { messages: [{ role: 'user', content: '{{PROMPT}}' }] },
      responsePath: 'no.such.path',
    };
    const agent = createHttpAgent(target);
    const res = await agent.send('x');
    expect(res.responseText).toBe('');
    expect(res.error).toMatch(/did not resolve/);
  });
});
