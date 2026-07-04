import { describe, it, expect } from 'vitest';

import { runScan } from '../src/runner.js';
import type { Agent, AttackLibrary, Probe } from '@armoriq/schema';

function makeProbe(id: string): Probe {
  return {
    id,
    category: 'test_category',
    owasp: 'ASI01',
    severity: 'low',
    prompt: `prompt for ${id}`,
    detection: { tier1: { mode: 'contains', failIfMatches: ['pwned'] } },
  };
}

const lib: AttackLibrary = {
  version: '0.0.0-test',
  probes: [makeProbe('t-1'), makeProbe('t-2'), makeProbe('t-3')],
};

/** In-memory agent that echoes the prompt back — no network. */
const echoAgent: Agent = {
  async send(prompt: string) {
    return { responseText: `echo: ${prompt}` };
  },
};

describe('runScan', () => {
  it('returns exactly one ProbeResult per probe, in input order', async () => {
    const results = await runScan(lib, echoAgent);

    expect(results).toHaveLength(lib.probes.length);
    expect(results.map((r) => r.probe.id)).toEqual(['t-1', 't-2', 't-3']);

    for (const r of results) {
      expect(r.verdict).not.toBe('ERROR');
      expect(typeof r.reason).toBe('string');
      expect(r.responseText).toContain('echo:');
    }
  });

  it('maps a thrown send() to verdict ERROR without throwing', async () => {
    const throwingAgent: Agent = {
      async send() {
        throw new Error('boom: transport down');
      },
    };

    const results = await runScan(lib, throwingAgent);

    expect(results).toHaveLength(lib.probes.length);
    for (const r of results) {
      expect(r.verdict).toBe('ERROR');
      expect(r.error).toContain('boom');
      expect(r.reason).toContain('boom');
    }
  });

  it('maps an AdapterResponse error field to verdict ERROR', async () => {
    const errorAgent: Agent = {
      async send() {
        return { responseText: '', error: 'timeout after 30000ms' };
      },
    };

    const results = await runScan(lib, errorAgent);

    for (const r of results) {
      expect(r.verdict).toBe('ERROR');
      expect(r.error).toContain('timeout');
    }
  });

  it('invokes onResult exactly once per probe', async () => {
    const seen: string[] = [];
    const results = await runScan(lib, echoAgent, {
      onResult: (r) => seen.push(r.probe.id),
    });

    expect(seen).toHaveLength(lib.probes.length);
    expect([...seen].sort()).toEqual(['t-1', 't-2', 't-3']);
    expect(results).toHaveLength(lib.probes.length);
  });

  it('handles an empty probe list', async () => {
    const empty: AttackLibrary = { version: '0.0.0-test', probes: [] };
    const results = await runScan(empty, echoAgent);
    expect(results).toEqual([]);
  });
});
