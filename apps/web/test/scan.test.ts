import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { streamScanInProcess } from '../src/lib/scan';
import type { Config } from '../src/lib/types';

describe('streamScanInProcess', () => {
  const config: Config = {
    target: {
      name: 'Test Target',
      environment: 'development',
      url: 'http://localhost:3000/api/chat',
      method: 'POST',
      bodyTemplate: { prompt: '{{PROMPT}}' },
      responsePath: 'reply',
    },
    run: {
      concurrency: 4,
      delaySeconds: 0,
      timeoutMs: 1000,
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ reply: 'I cannot fulfill this request.' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits init, sequential probe events (1..N), and complete with full RunScanResult', async () => {
    const events: { event: string; data: any }[] = [];
    const emit = (event: string, data: unknown) => {
      events.push({ event, data });
    };

    await streamScanInProcess(config, 'quick', emit);

    expect(events.length).toBeGreaterThanOrEqual(3);

    // 1. Init event
    const init = events[0];
    expect(init.event).toBe('init');
    expect(init.data).toEqual({
      total: 30,
      targetName: 'Test Target',
      profile: 'quick',
    });

    // 2. Probe events
    const probeEvents = events.filter((e) => e.event === 'probe');
    expect(probeEvents.length).toBe(30);

    // Sequential 1..N indices
    const indices = probeEvents.map((e) => e.data.index);
    expect(indices).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));

    for (const probe of probeEvents) {
      expect(probe.data.total).toBe(30);
      expect(typeof probe.data.probeId).toBe('string');
      expect(typeof probe.data.category).toBe('string');
      expect(typeof probe.data.owasp).toBe('string');
      expect(typeof probe.data.severity).toBe('string');
      expect(['PASS', 'FAIL', 'INCONCLUSIVE', 'ERROR']).toContain(probe.data.verdict);
      expect(typeof probe.data.reason).toBe('string');
    }

    // 3. Complete event
    const complete = events[events.length - 1];
    expect(complete.event).toBe('complete');
    const result = complete.data;
    expect(result).toHaveProperty('scan');
    expect(result).toHaveProperty('findings');
    expect(result).toHaveProperty('reportJson');
    expect(result).toHaveProperty('reportMd');

    expect(result.scan.id).toBe('live');
    expect(result.scan.targetId).toBe('live');
    expect(result.scan.status).toBe('completed');
    expect(result.scan.profile).toBe('quick');
    expect(result.scan.counts).toEqual({
      total: 30,
      pass: expect.any(Number),
      fail: expect.any(Number),
      inconclusive: expect.any(Number),
      error: expect.any(Number),
    });
    expect(
      result.scan.counts.pass +
        result.scan.counts.fail +
        result.scan.counts.inconclusive +
        result.scan.counts.error,
    ).toBe(30);

    expect(result.findings).toHaveLength(30);
    expect(typeof result.reportJson).toBe('string');
    expect(typeof result.reportMd).toBe('string');
    expect(JSON.parse(result.reportJson)).toBeDefined();
  });

  it('aborts early and does not emit complete when signal is aborted mid-scan', async () => {
    const controller = new AbortController();
    const events: { event: string; data: any }[] = [];
    let probeCount = 0;

    const emit = (event: string, data: unknown) => {
      events.push({ event, data });
      if (event === 'probe') {
        probeCount++;
        if (probeCount === 2) {
          controller.abort();
        }
      }
    };

    await streamScanInProcess(config, 'quick', emit, controller.signal);

    const completeEvent = events.find((e) => e.event === 'complete');
    expect(completeEvent).toBeUndefined();
    expect(events.filter((e) => e.event === 'probe').length).toBeLessThan(30);
  });

  it('does not emit complete when signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const events: { event: string; data: any }[] = [];
    const emit = (event: string, data: unknown) => {
      events.push({ event, data });
    };

    await streamScanInProcess(config, 'quick', emit, controller.signal);

    const completeEvent = events.find((e) => e.event === 'complete');
    expect(completeEvent).toBeUndefined();
  });

  it('handles standard profile without OPENAI_API_KEY as Tier-1 only', async () => {
    const events: { event: string; data: any }[] = [];
    const emit = (event: string, data: unknown) => {
      events.push({ event, data });
    };

    const origKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      await streamScanInProcess(config, 'standard', emit);
      const complete = events.find((e) => e.event === 'complete');
      expect(complete).toBeDefined();
      expect(complete!.data.scan.judgeModel).toBeNull();
      expect(complete!.data.scan.judgeMode).toBe('inconclusive');
    } finally {
      if (origKey !== undefined) process.env.OPENAI_API_KEY = origKey;
    }
  });
});
