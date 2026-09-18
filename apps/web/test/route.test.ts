import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../app/api/scan/route';
import { runScanInProcess, streamScanInProcess } from '../src/lib/scan';

vi.mock('../src/lib/scan', async () => {
  const actual = await vi.importActual<typeof import('../src/lib/scan')>('../src/lib/scan');
  return {
    ...actual,
    runScanInProcess: vi.fn(),
    streamScanInProcess: vi.fn(),
  };
});

describe('POST /api/scan route handler', () => {
  const validDevConfig = {
    target: {
      name: 'Dev Target',
      environment: 'development' as const,
      url: 'http://localhost:3000/api/chat',
      method: 'POST',
      bodyTemplate: { prompt: '{{PROMPT}}' },
      responsePath: 'reply',
    },
    run: {
      concurrency: 2,
      delaySeconds: 0,
      timeoutMs: 1000,
    },
  };

  const validProdConfig = {
    target: {
      name: 'Prod Target',
      environment: 'production' as const,
      url: 'https://api.example.com/chat',
      method: 'POST',
      bodyTemplate: { prompt: '{{PROMPT}}' },
      responsePath: 'reply',
    },
  };

  const mockScanResult = {
    scan: {
      id: 'live',
      targetId: 'live',
      status: 'completed',
      profile: 'quick',
      judgeMode: null,
      libraryVersion: '1.0.0',
      engineVersion: '1.0.0',
      judgeModel: null,
      resiliencePct: 100,
      weightedRiskPct: 0,
      counts: { total: 1, pass: 1, fail: 0, inconclusive: 0, error: 0 },
      errorMessage: null,
      startedAt: '2026-09-18T00:00:00.000Z',
      finishedAt: '2026-09-18T00:00:01.000Z',
      createdAt: '2026-09-18T00:00:00.000Z',
    },
    findings: [],
    reportJson: '{}',
    reportMd: '# Report',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Test 1: Synchronous pre-flight returns HTTP 400 JSON on invalid config, even when stream: true is sent', async () => {
    const invalidConfig = {
      target: {
        name: 'Invalid Target',
        // missing url, environment, responsePath, etc.
      },
    };

    const req = new Request('http://localhost:3000/api/scan', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'text/event-stream',
      },
      body: JSON.stringify({
        stream: true,
        config: invalidConfig,
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('ValidationError');
    expect(json.message).toBe('The target config is invalid.');
    expect(Array.isArray(json.issues)).toBe(true);
    expect(json.issues.length).toBeGreaterThan(0);
    expect(runScanInProcess).not.toHaveBeenCalled();
    expect(streamScanInProcess).not.toHaveBeenCalled();
  });

  it('Test 2: Synchronous pre-flight returns HTTP 403 JSON on unauthorized production target, even when stream: true is sent', async () => {
    const req = new Request('http://localhost:3000/api/scan', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'text/event-stream',
      },
      body: JSON.stringify({
        stream: true,
        config: validProdConfig,
        authorize: false,
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe('AuthorizationRequired');
    expect(json.message).toBe('Scanning production target "Prod Target" requires explicit authorization.');
    expect(runScanInProcess).not.toHaveBeenCalled();
    expect(streamScanInProcess).not.toHaveBeenCalled();
  });

  it('Test 3: Synchronous mode (when stream is false and Accept header is application/json) returns HTTP 200 JSON with full scan result', async () => {
    vi.mocked(runScanInProcess).mockResolvedValueOnce(mockScanResult as any);

    const req = new Request('http://localhost:3000/api/scan', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        stream: false,
        config: validDevConfig,
        profile: 'quick',
        authorize: false,
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(mockScanResult);
    expect(runScanInProcess).toHaveBeenCalledWith(validDevConfig, 'quick', false);
    expect(streamScanInProcess).not.toHaveBeenCalled();
  });

  it('Test 4: Streaming mode (when stream: true or Accept: text/event-stream) returns HTTP 200 Response with Content-Type: text/event-stream; charset=utf-8 and emits init, probe, and complete events', async () => {
    vi.mocked(streamScanInProcess).mockImplementationOnce(async (config, profile, emit) => {
      emit('init', {
        total: 1,
        targetName: config.target.name,
        profile,
      });
      emit('probe', {
        index: 1,
        total: 1,
        probeId: 'probe-1',
        category: 'injection',
        owasp: 'ASI01',
        severity: 'high',
        verdict: 'PASS',
        reason: 'Passed check',
      });
      emit('complete', {
        scan: mockScanResult.scan,
        findings: mockScanResult.findings,
        reportJson: mockScanResult.reportJson,
        reportMd: mockScanResult.reportMd,
      });
    });

    const req = new Request('http://localhost:3000/api/scan', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        stream: true,
        config: validDevConfig,
        profile: 'standard',
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream; charset=utf-8');
    expect(res.headers.get('Cache-Control')).toBe('no-cache, no-transform');
    expect(res.headers.get('Connection')).toBe('keep-alive');

    const text = await res.text();
    expect(text).toContain('event: init\ndata: {"total":1,"targetName":"Dev Target","profile":"standard"}\n\n');
    expect(text).toContain('event: probe\ndata: {"index":1,"total":1,"probeId":"probe-1","category":"injection","owasp":"ASI01","severity":"high","verdict":"PASS","reason":"Passed check"}\n\n');
    expect(text).toContain(`event: complete\ndata: ${JSON.stringify({
      scan: mockScanResult.scan,
      findings: mockScanResult.findings,
      reportJson: mockScanResult.reportJson,
      reportMd: mockScanResult.reportMd,
    })}\n\n`);

    expect(streamScanInProcess).toHaveBeenCalledWith(
      validDevConfig,
      'standard',
      expect.any(Function),
      expect.anything(),
    );
    expect(runScanInProcess).not.toHaveBeenCalled();
  });

  it('Test 4b: Streaming mode triggers when Accept: text/event-stream header is provided even if stream property is omitted', async () => {
    vi.mocked(streamScanInProcess).mockImplementationOnce(async (config, profile, emit) => {
      emit('init', {
        total: 1,
        targetName: config.target.name,
        profile,
      });
    });

    const req = new Request('http://localhost:3000/api/scan', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'text/event-stream',
      },
      body: JSON.stringify({
        config: validDevConfig,
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream; charset=utf-8');
    const text = await res.text();
    expect(text).toContain('event: init\n');
    expect(streamScanInProcess).toHaveBeenCalled();
  });

  it('Test 5: Stream error emission and heartbeat cleanup', async () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    vi.mocked(streamScanInProcess).mockRejectedValueOnce(
      new Error('Engine execution failed abruptly'),
    );

    const req = new Request('http://localhost:3000/api/scan', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        stream: true,
        config: validDevConfig,
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream; charset=utf-8');

    const text = await res.text();
    expect(text).toContain(
      'event: error\ndata: {"error":"ScanError","message":"Engine execution failed abruptly"}\n\n',
    );
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('returns HTTP 400 JSON when request body is invalid JSON', async () => {
    const req = new Request('http://localhost:3000/api/scan', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: 'invalid-json{',
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('ValidationError');
    expect(json.message).toBe('Request body must be valid JSON.');
  });

  it('does not emit stream error if req.signal was aborted when streamScanInProcess fails', async () => {
    const abortController = new AbortController();

    vi.mocked(streamScanInProcess).mockImplementationOnce(async () => {
      abortController.abort();
      throw new Error('Aborted mid-scan');
    });

    const req = new Request('http://localhost:3000/api/scan', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        stream: true,
        config: validDevConfig,
      }),
      signal: abortController.signal,
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain('event: error');
  });

  it('sends keepalive heartbeat during long scans', async () => {
    vi.useFakeTimers();

    vi.mocked(streamScanInProcess).mockImplementationOnce(async (_cfg, _prof, _emit) => {
      // Advance by 10s to trigger heartbeat interval
      await vi.advanceTimersByTimeAsync(10000);
    });

    const req = new Request('http://localhost:3000/api/scan', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        stream: true,
        config: validDevConfig,
      }),
    });

    const res = await POST(req);
    const text = await res.text();
    expect(text).toContain(': keepalive\n\n');

    vi.useRealTimers();
  });
});
