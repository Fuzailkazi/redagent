import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runScanStream, ApiError } from '../src/lib/api';
import type {
  Config,
  RunScanResult,
  StreamInitEvent,
  StreamProbeEvent,
} from '../src/lib/types';

describe('runScanStream', () => {
  const dummyConfig: Config = {
    target: {
      url: 'http://localhost:3000/api/chat',
      method: 'POST',
    },
  } as unknown as Config;

  const initEvent: StreamInitEvent = {
    total: 2,
    targetName: 'Test Target',
    profile: 'quick',
  };

  const probe1: StreamProbeEvent = {
    index: 0,
    total: 2,
    probeId: 'prompt-injection-1',
    category: 'Injection',
    owasp: 'LLM01',
    severity: 'high',
    verdict: 'PASS',
    reason: 'Agent properly refused prompt injection',
  };

  const probe2: StreamProbeEvent = {
    index: 1,
    total: 2,
    probeId: 'data-leak-1',
    category: 'Leakage',
    owasp: 'LLM06',
    severity: 'critical',
    verdict: 'FAIL',
    reason: 'System prompt was leaked',
  };

  const completeResult: RunScanResult = {
    scan: {
      id: 'scan-1',
      targetId: 'target-1',
      status: 'completed',
      profile: 'quick',
      judgeMode: null,
      libraryVersion: '1.0',
      engineVersion: '1.0',
      judgeModel: null,
      resiliencePct: 50,
      weightedRiskPct: 50,
      counts: { total: 2, pass: 1, fail: 1, inconclusive: 0, error: 0 },
      errorMessage: null,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    findings: [],
    reportJson: '{}',
    reportMd: '# Report',
  };

  function createStreamResponse(chunks: string[], status = 200): Response {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    });
    return new Response(stream, {
      status,
      headers: { 'content-type': 'text/event-stream' },
    });
  }

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('streams and parses SSE frames (init, probe, complete), ignoring lines starting with ":"', async () => {
    const ssePayload = [
      ': keepalive\n\n',
      `event: init\ndata: ${JSON.stringify(initEvent)}\n\n`,
      ': keepalive\n\n',
      `event: probe\ndata: ${JSON.stringify(probe1)}\n\n`,
      ': keepalive\n\n',
      `event: probe\ndata: ${JSON.stringify(probe2)}\n\n`,
      `event: complete\ndata: ${JSON.stringify(completeResult)}\n\n`,
    ].join('');

    const fetchMock = vi.fn().mockResolvedValue(createStreamResponse([ssePayload]));
    vi.stubGlobal('fetch', fetchMock);

    const onInit = vi.fn();
    const onProbe = vi.fn();
    const onError = vi.fn();

    const result = await runScanStream(dummyConfig, 'quick', false, {
      onInit,
      onProbe,
      onError,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/scan', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'text/event-stream',
      },
      body: JSON.stringify({
        config: dummyConfig,
        profile: 'quick',
        authorize: false,
        stream: true,
      }),
      signal: undefined,
    });

    expect(onInit).toHaveBeenCalledTimes(1);
    expect(onInit).toHaveBeenCalledWith(initEvent);
    expect(onProbe).toHaveBeenCalledTimes(2);
    expect(onProbe).toHaveBeenNthCalledWith(1, probe1);
    expect(onProbe).toHaveBeenNthCalledWith(2, probe2);
    expect(onError).not.toHaveBeenCalled();
    expect(result).toEqual(completeResult);
  });

  it('reassembles split chunk packets cleanly', async () => {
    const fullStream = [
      `event: init\ndata: ${JSON.stringify(initEvent)}\n\n`,
      `event: probe\ndata: ${JSON.stringify(probe1)}\n\n`,
      `event: complete\ndata: ${JSON.stringify(completeResult)}\n\n`,
    ].join('');

    // Fragment stream into small chunks across event/data boundaries
    const chunks: string[] = [];
    for (let i = 0; i < fullStream.length; i += 7) {
      chunks.push(fullStream.slice(i, i + 7));
    }

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createStreamResponse(chunks)));

    const onInit = vi.fn();
    const onProbe = vi.fn();

    const result = await runScanStream(dummyConfig, 'quick', false, {
      onInit,
      onProbe,
    });

    expect(onInit).toHaveBeenCalledWith(initEvent);
    expect(onProbe).toHaveBeenCalledWith(probe1);
    expect(result).toEqual(completeResult);
  });

  it('throws ApiError on HTTP 400 (validation) and HTTP 403 (authorization required)', async () => {
    // Test 400
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              error: 'invalid_config',
              message: 'Config is invalid',
            }),
            {
              status: 400,
              headers: { 'content-type': 'application/json' },
            },
          ),
        ),
      ),
    );

    await expect(runScanStream(dummyConfig, 'quick', false)).rejects.toThrow(ApiError);
    try {
      await runScanStream(dummyConfig, 'quick', false);
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(400);
      expect((err as ApiError).message).toBe('Config is invalid');
      expect((err as ApiError).body).toEqual({
        error: 'invalid_config',
        message: 'Config is invalid',
      });
    }

    // Test 403
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              error: 'authorization_required',
              message: 'Production targets require authorize=true',
            }),
            {
              status: 403,
              headers: { 'content-type': 'application/json' },
            },
          ),
        ),
      ),
    );

    await expect(runScanStream(dummyConfig, 'quick', false)).rejects.toThrow(ApiError);
    try {
      await runScanStream(dummyConfig, 'quick', false);
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(403);
      expect((err as ApiError).message).toBe('Production targets require authorize=true');
    }
  });

  it('rejects with error if stream ends prematurely before complete/error', async () => {
    const encoder = new TextEncoder();
    const truncatedStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(`event: init\ndata: ${JSON.stringify(initEvent)}\n\n`),
        );
        controller.close();
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(truncatedStream, {
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
        }),
      ),
    );

    const onError = vi.fn();
    await expect(
      runScanStream(dummyConfig, 'quick', false, { onError }),
    ).rejects.toThrow('Scan stream disconnected before completion.');
    expect(onError).toHaveBeenCalledWith(expect.any(Error));

    // Also test event: error frame rejection
    const errorStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({
              error: 'scan_failed',
              message: 'Target execution failed',
            })}\n\n`,
          ),
        );
        controller.close();
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(errorStream, {
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
        }),
      ),
    );

    const onError2 = vi.fn();
    await expect(
      runScanStream(dummyConfig, 'quick', false, { onError: onError2 }),
    ).rejects.toThrow('Target execution failed');
    expect(onError2).toHaveBeenCalledWith(expect.any(Error));
  });

  it('aborts cleanly when signal is aborted', async () => {
    const ac = new AbortController();
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(': keepalive\n\n'));
        ac.signal.addEventListener('abort', () => {
          controller.error(new DOMException('The operation was aborted.', 'AbortError'));
        });
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(stream, {
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
        }),
      ),
    );

    const promise = runScanStream(dummyConfig, 'quick', false, undefined, ac.signal);
    ac.abort();
    await expect(promise).rejects.toThrow();
  });
});
