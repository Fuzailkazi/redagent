import { describe, it, expect } from 'vitest';

import { runScan } from '../src/runner.js';
import type {
  Agent,
  AttackLibrary,
  Judge,
  JudgeAssessment,
  Probe,
  Verdict,
} from '@armoriq/schema';

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

  it('halts probe execution when AbortSignal is aborted', async () => {
    const controller = new AbortController();
    let dispatched = 0;
    const mockAgent = {
      send: async () => {
        dispatched++;
        if (dispatched === 1) controller.abort();
        return { responseText: 'OK' };
      },
    };
    await runScan(
      {
        version: '1.0',
        probes: [
          { id: 'p1', category: 'c1', owasp: 'ASI01', severity: 'low', prompt: 'a', detection: { tier1: { mode: 'regex', failIfMatches: [], passIfMatches: [] } }, tags: [] },
          { id: 'p2', category: 'c1', owasp: 'ASI01', severity: 'low', prompt: 'b', detection: { tier1: { mode: 'regex', failIfMatches: [], passIfMatches: [] } }, tags: [] },
          { id: 'p3', category: 'c1', owasp: 'ASI01', severity: 'low', prompt: 'c', detection: { tier1: { mode: 'regex', failIfMatches: [], passIfMatches: [] } }, tags: [] },
        ],
      },
      mockAgent,
      { signal: controller.signal, run: { concurrency: 1, delaySeconds: 0 } },
    );
    expect(dispatched).toBeLessThan(3);
  });
});

/**
 * Deterministic agent producing one of each Tier-1 verdict:
 *   t-1 -> 'pwned'            => FAIL (compliance signal matched)
 *   t-2 -> refusal phrase     => PASS (refusal heuristic)
 *   t-3 -> echoed prompt      => INCONCLUSIVE (no signal)
 */
const mixedAgent: Agent = {
  async send(prompt: string) {
    if (prompt.includes('t-1')) return { responseText: 'pwned' };
    if (prompt.includes('t-2')) return { responseText: "I can't help with that" };
    return { responseText: `echo: ${prompt}` };
  },
};

/** Records adjudication calls and returns a fixed verdict. */
function makeMockJudge(verdict: Verdict, model = 'mock-model') {
  const calls: string[] = [];
  const judge: Judge = {
    async adjudicate(input): Promise<JudgeAssessment> {
      calls.push(input.probe.id);
      return { verdict, rationale: 'mock rationale', model, cached: false };
    },
  };
  return { judge, calls };
}

describe('runScan with an injected judge', () => {
  it('default mode adjudicates only INCONCLUSIVE results and rewrites the verdict', async () => {
    const { judge, calls } = makeMockJudge('FAIL');

    const results = await runScan(lib, mixedAgent, { judge });

    // Only the INCONCLUSIVE probe (t-3) is sent to the judge.
    expect(calls).toEqual(['t-3']);

    const byId = Object.fromEntries(results.map((r) => [r.probe.id, r]));

    // t-1 FAIL and t-2 PASS are untouched by the judge.
    expect(byId['t-1']?.verdict).toBe('FAIL');
    expect(byId['t-1']?.judge).toBeUndefined();
    expect(byId['t-1']?.tier1Verdict).toBeUndefined();
    expect(byId['t-2']?.verdict).toBe('PASS');
    expect(byId['t-2']?.judge).toBeUndefined();

    // t-3 was INCONCLUSIVE; the judge promoted it to FAIL.
    const t3 = byId['t-3'];
    expect(t3?.tier1Verdict).toBe('INCONCLUSIVE');
    expect(t3?.verdict).toBe('FAIL');
    expect(t3?.judge).toEqual({
      verdict: 'FAIL',
      rationale: 'mock rationale',
      model: 'mock-model',
      cached: false,
    });
    expect(t3?.reason).toContain('[judge:mock-model] mock rationale');
  });

  it("deep mode adjudicates PASS/FAIL results too", async () => {
    const { judge, calls } = makeMockJudge('PASS');

    const results = await runScan(lib, mixedAgent, {
      judge,
      judgeMode: 'deep',
    });

    // Every non-ERROR probe is adjudicated.
    expect([...calls].sort()).toEqual(['t-1', 't-2', 't-3']);

    const byId = Object.fromEntries(results.map((r) => [r.probe.id, r]));

    // Original Tier-1 verdicts are preserved for human override.
    expect(byId['t-1']?.tier1Verdict).toBe('FAIL');
    expect(byId['t-2']?.tier1Verdict).toBe('PASS');
    expect(byId['t-3']?.tier1Verdict).toBe('INCONCLUSIVE');

    // The judge's verdict becomes the effective verdict on every result.
    for (const r of results) {
      expect(r.verdict).toBe('PASS');
      expect(r.judge?.verdict).toBe('PASS');
      expect(r.reason).toContain('[judge:mock-model] mock rationale');
    }
  });

  it('never sends ERROR results to the judge', async () => {
    const errorAgent: Agent = {
      async send() {
        return { responseText: '', error: 'timeout after 30000ms' };
      },
    };
    const { judge, calls } = makeMockJudge('PASS');

    const results = await runScan(lib, errorAgent, {
      judge,
      judgeMode: 'deep',
    });

    expect(calls).toEqual([]);
    for (const r of results) {
      expect(r.verdict).toBe('ERROR');
      expect(r.judge).toBeUndefined();
      expect(r.tier1Verdict).toBeUndefined();
    }
  });

  it('keeps the Tier-1 verdict when the judge throws', async () => {
    const throwingJudge: Judge = {
      async adjudicate() {
        throw new Error('judge upstream 503');
      },
    };

    // echoAgent yields INCONCLUSIVE for every probe.
    const results = await runScan(lib, echoAgent, { judge: throwingJudge });

    for (const r of results) {
      // Tier-1 verdict is preserved; no assessment attached.
      expect(r.verdict).toBe('INCONCLUSIVE');
      expect(r.judge).toBeUndefined();
      expect(r.tier1Verdict).toBeUndefined();
      expect(r.reason).toContain('[judge error: judge upstream 503]');
    }
  });
});
