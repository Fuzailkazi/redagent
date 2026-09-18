'use client';

/**
 * Home — paste an agent URL (or configure it), run a scan, see the report.
 *
 * The scan runs in-process (POST /api/scan) and returns everything in one
 * response; the result is held in memory and rendered inline. Nothing is stored.
 *   • Easy mode: paste the URL, we auto-detect its request/response shape.
 *   • Advanced: full manual target config for auth'd or non-standard agents.
 */

import { useState, useRef, useEffect, type FormEvent } from 'react';
import type { Config } from '@armoriq/schema';
import { Chip, Button, Banner, FormField, SegmentedControl } from '@shared/ui';
import { IconRadar, IconPlay } from '@shared/icons';
import {
  detect,
  runScanStream,
  ApiError,
  type Environment,
  type RunScanResult,
  type ScanProfile,
} from '@/lib/api';
import { ScanReport } from '@/components/ScanReport';
import { ScanProgress } from '@/components/ScanProgress';
import {
  createInitialScanState,
  handleInitEvent,
  handleProbeEvent,
  type ScanState,
} from '@/lib/scanState';

const PROFILES: { value: ScanProfile; label: string; desc: string }[] = [
  { value: 'quick', label: 'Quick', desc: 'Fast pattern checks, no LLM. Best for a live demo.' },
  { value: 'standard', label: 'Standard', desc: 'LLM judge on unclear results (needs OPENAI_API_KEY).' },
  { value: 'deep', label: 'Deep', desc: 'LLM judge on every response. Most accurate, slowest.' },
];

const PROFILE_OPTIONS = PROFILES.map((p) => ({ value: p.value, label: p.label }));

const INPUT_CLS =
  'h-9 w-full rounded-md border border-aq-border bg-aq-surface px-3 text-aq-sm text-aq-ink placeholder:text-aq-ink-muted outline-none transition-colors focus:border-aq-accent disabled:cursor-not-allowed disabled:opacity-60';
const MONO_INPUT_CLS = `${INPUT_CLS} font-mono`;
const SELECT_CLS = INPUT_CLS;
const TEXTAREA_CLS =
  'w-full rounded-md border border-aq-border bg-aq-surface px-3 py-2 font-mono text-aq-sm text-aq-ink placeholder:text-aq-ink-muted outline-none transition-colors focus:border-aq-accent disabled:cursor-not-allowed disabled:opacity-60';
const CARD_CLS = 'rounded-lg border border-aq-border bg-aq-surface p-5 shadow-aq-card';

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'agent';
  }
}

export default function HomePage() {
  const [advanced, setAdvanced] = useState(false);
  const [result, setResult] = useState<RunScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  if (result) {
    return (
      <ScanReport
        result={result}
        onNewScan={() => {
          setResult(null);
          setIsScanning(false);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col items-start gap-2.5">
        <Chip tone="accent" size="sm">OWASP Agentic Top-10 · ASI01–ASI10</Chip>
        <h1 className="text-aq-display font-semibold tracking-aq-tight text-aq-ink">
          Red-team your AI agent
        </h1>
        <p className="max-w-[58ch] text-aq-sm text-aq-ink-muted">
          Paste your agent&apos;s URL. We probe it, figure out how it talks, fire 30
          adversarial probes, and hand you a resilience scorecard.
        </p>
      </section>

      {!isScanning && (
        <SegmentedControl
          ariaLabel="Setup mode"
          value={advanced ? 'advanced' : 'easy'}
          onChange={(next) => setAdvanced(next === 'advanced')}
          options={[
            { value: 'easy', label: 'Simple' },
            { value: 'advanced', label: 'Advanced' },
          ]}
        />
      )}

      {!advanced ? (
        <EasyMode onResult={setResult} onScanningChange={setIsScanning} />
      ) : (
        <AdvancedMode onResult={setResult} onScanningChange={setIsScanning} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Easy mode — paste a URL                                                    */
/* -------------------------------------------------------------------------- */

function EasyMode({
  onResult,
  onScanningChange,
}: {
  onResult: (r: RunScanResult) => void;
  onScanningChange?: (scanning: boolean) => void;
}) {
  const [url, setUrl] = useState('');
  const [profile, setProfile] = useState<ScanProfile>('quick');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanState, setScanState] = useState<ScanState | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  function handleCancel() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!url.trim()) {
      setError('Paste your agent URL first.');
      return;
    }

    setBusy(true);
    try {
      setStatus('Probing your agent…');
      const d = await detect(url.trim());
      const stream = d.target.responseMode === 'sse' ? ' · streaming' : '';
      setStatus(
        `Detected — sends "${d.bodyShape}", reads "${d.target.responsePath || 'plain text'}"${stream}. Firing 30 probes…`,
      );

      const host = hostOf(d.target.url);
      const config: Config = {
        target: {
          name: host,
          environment: 'development',
          url: d.target.url,
          method: d.target.method ?? 'POST',
          ...(d.target.headers ? { headers: d.target.headers } : {}),
          bodyTemplate: d.target.bodyTemplate,
          responsePath: d.target.responsePath,
          ...(d.target.responseMode ? { responseMode: d.target.responseMode } : {}),
          ...(d.target.sseEvent ? { sseEvent: d.target.sseEvent } : {}),
        },
        run: { concurrency: 4, delaySeconds: 0.3, timeoutMs: 30000 },
      };

      const ac = new AbortController();
      abortControllerRef.current = ac;
      setScanState(createInitialScanState(host, 'development', profile));
      onScanningChange?.(true);

      const res = await runScanStream(
        config,
        profile,
        false,
        {
          onInit: (d) => setScanState((s) => (s ? handleInitEvent(s, d) : s)),
          onProbe: (p) => setScanState((s) => (s ? handleProbeEvent(s, p) : s)),
        },
        ac.signal,
      );

      setScanState(null);
      setBusy(false);
      onScanningChange?.(false);
      onResult(res);
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setScanState(null);
        setBusy(false);
        setStatus('Scan cancelled.');
        onScanningChange?.(false);
        return;
      }
      setScanState(null);
      setStatus(null);
      setBusy(false);
      onScanningChange?.(false);
      if (err instanceof ApiError && err.status === 422) {
        setError(
          "We couldn't auto-detect this agent (it may need an API key or use an unusual format). Try Advanced setup below.",
        );
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    }
  }

  async function handleDemoScan(demoType: 'vulnerable' | 'hardened') {
    setError(null);
    setBusy(true);
    const mockUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/api/mock/${demoType}`
        : `http://localhost:3000/api/mock/${demoType}`;
    setUrl(mockUrl);

    try {
      setStatus(`Probing simulated ${demoType} agent (${mockUrl})…`);
      const d = await detect(mockUrl);
      const stream = d.target.responseMode === 'sse' ? ' · streaming' : '';
      setStatus(
        `Detected simulated ${demoType} agent (${d.bodyShape} format${stream}) — firing 30 OWASP probes…`,
      );

      const host = demoType === 'vulnerable' ? 'acme-vulnerable-bot' : 'acme-hardened-bot';
      const config: Config = {
        target: {
          name: host,
          environment: 'development',
          url: d.target.url,
          method: d.target.method ?? 'POST',
          bodyTemplate: d.target.bodyTemplate,
          responsePath: d.target.responsePath,
        },
        run: { concurrency: 4, delaySeconds: 0.1, timeoutMs: 30000 },
      };

      const ac = new AbortController();
      abortControllerRef.current = ac;
      setScanState(createInitialScanState(host, 'development', profile));
      onScanningChange?.(true);

      const res = await runScanStream(
        config,
        profile,
        false,
        {
          onInit: (data) => setScanState((s) => (s ? handleInitEvent(s, data) : s)),
          onProbe: (p) => setScanState((s) => (s ? handleProbeEvent(s, p) : s)),
        },
        ac.signal,
      );

      setScanState(null);
      setBusy(false);
      onScanningChange?.(false);
      onResult(res);
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setScanState(null);
        setBusy(false);
        setStatus('Scan cancelled.');
        onScanningChange?.(false);
        return;
      }
      // Fallback directly to in-process mock scan config if detect network step fails locally
      try {
        const host = demoType === 'vulnerable' ? 'acme-vulnerable-bot' : 'acme-hardened-bot';
        setStatus(`Running direct scan on simulated ${demoType} agent…`);
        const directConfig: Config = {
          target: {
            name: host,
            environment: 'development',
            url: mockUrl,
            method: 'POST',
            bodyTemplate: { message: '{{PROMPT}}' },
            responsePath: 'reply',
          },
          run: { concurrency: 4, delaySeconds: 0.1, timeoutMs: 30000 },
        };

        const ac = new AbortController();
        abortControllerRef.current = ac;
        setScanState(createInitialScanState(host, 'development', profile));
        onScanningChange?.(true);

        const res = await runScanStream(
          directConfig,
          profile,
          false,
          {
            onInit: (data) => setScanState((s) => (s ? handleInitEvent(s, data) : s)),
            onProbe: (p) => setScanState((s) => (s ? handleProbeEvent(s, p) : s)),
          },
          ac.signal,
        );

        setScanState(null);
        setBusy(false);
        onScanningChange?.(false);
        onResult(res);
      } catch (fallbackErr) {
        setScanState(null);
        setStatus(null);
        setBusy(false);
        onScanningChange?.(false);
        setError(fallbackErr instanceof Error ? fallbackErr.message : 'Demo scan failed.');
      }
    }
  }

  if (scanState) {
    return <ScanProgress state={scanState} onCancel={handleCancel} />;
  }

  const selectedDesc = PROFILES.find((p) => p.value === profile)?.desc;

  return (
    <form className={`flex flex-col gap-4 ${CARD_CLS}`} onSubmit={onSubmit}>
      {/* 1-Click Interactive Demo Presets */}
      <div className="flex flex-col gap-2 rounded-lg border border-aq-border bg-aq-zebra/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-aq-sm font-semibold text-aq-ink">🚀 Try an Interactive Demo</span>
            <Chip tone="accent" size="sm">No Setup Required</Chip>
          </div>
          <span className="text-aq-caption text-aq-ink-faint">
            Simulates realistic agent architectures & OWASP attacks in-process
          </span>
        </div>
        <p className="m-0 text-aq-xs text-aq-ink-muted">
          Don&apos;t have a live HTTP agent URL right now? Click one of the simulated targets below to see RedAgent detect the API shape, fire 30 probes with live streaming progress, and produce a resilience scorecard in seconds:
        </p>
        <div className="mt-1 flex flex-wrap gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => handleDemoScan('vulnerable')}
            className="inline-flex items-center gap-2 rounded-md border border-aq-bad/40 bg-aq-surface px-3 py-2 text-aq-xs font-semibold text-aq-bad shadow-aq-card transition-all hover:bg-aq-bad/10 hover:border-aq-bad disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aq-bad opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-aq-bad" />
            </span>
            <span>🔴 Try Vulnerable Support Bot (Fails prompt injection, tool abuse)</span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handleDemoScan('hardened')}
            className="inline-flex items-center gap-2 rounded-md border border-aq-good/40 bg-aq-surface px-3 py-2 text-aq-xs font-semibold text-aq-good shadow-aq-card transition-all hover:bg-aq-good/10 hover:border-aq-good disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="inline-flex h-2 w-2 rounded-full bg-aq-good" />
            <span>🟢 Try Hardened Enterprise Bot (95%+ Resilience score)</span>
          </button>
        </div>
      </div>
      <FormField
        label="Your agent URL"
        htmlFor="url"
        helper="We auto-detect the request shape and where the reply lives (JSON or streaming). No API key needed for public agents — for authenticated ones, use Advanced."
      >
        <input
          id="url"
          className={MONO_INPUT_CLS}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-agent.example.com/chat"
          autoComplete="off"
          disabled={busy}
        />
      </FormField>

      <FormField label="Scan depth" helper={selectedDesc}>
        <SegmentedControl
          ariaLabel="Scan depth"
          value={profile}
          onChange={(next) => setProfile(next as ScanProfile)}
          options={PROFILE_OPTIONS}
        />
      </FormField>

      {status && <Banner tone="info">{status}</Banner>}
      {error && <Banner tone="bad">{error}</Banner>}

      <div>
        <Button type="submit" variant="primary" leading={IconRadar} loading={busy} disabled={busy}>
          {busy ? 'Scanning…' : 'Scan my agent'}
        </Button>
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Advanced mode — full manual config                                         */
/* -------------------------------------------------------------------------- */

const DEFAULT_HEADERS = '{\n  "Content-Type": "application/json"\n}';
const DEFAULT_BODY = '{\n  "message": "{{PROMPT}}"\n}';

function AdvancedMode({
  onResult,
  onScanningChange,
}: {
  onResult: (r: RunScanResult) => void;
  onScanningChange?: (scanning: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [environment, setEnvironment] = useState<Environment>('development');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('POST');
  const [headersText, setHeadersText] = useState(DEFAULT_HEADERS);
  const [bodyText, setBodyText] = useState(DEFAULT_BODY);
  const [responsePath, setResponsePath] = useState('choices.0.message.content');
  const [responseMode, setResponseMode] = useState<'json' | 'sse'>('json');
  const [sseEvent, setSseEvent] = useState('content');
  const [profile, setProfile] = useState<ScanProfile>('quick');
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanState, setScanState] = useState<ScanState | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  function handleCancel() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    if (environment === 'production' && !authorized) {
      setError('Production targets require the authorization checkbox.');
      return;
    }
    let headers: Record<string, string>;
    let bodyTemplate: unknown;
    try {
      headers = JSON.parse(headersText || '{}');
    } catch {
      setError('Headers must be valid JSON.');
      return;
    }
    try {
      bodyTemplate = JSON.parse(bodyText || '{}');
    } catch {
      setError('Body template must be valid JSON.');
      return;
    }
    if (!JSON.stringify(bodyTemplate).includes('{{PROMPT}}')) {
      setError('Body template must contain "{{PROMPT}}".');
      return;
    }

    const targetName = name.trim() || hostOf(url);
    const config: Config = {
      target: {
        name: targetName,
        environment,
        url: url.trim(),
        method,
        headers,
        bodyTemplate,
        responsePath: responsePath.trim(),
        ...(responseMode === 'sse' ? { responseMode: 'sse', sseEvent: sseEvent.trim() || 'content' } : {}),
      },
      run: { concurrency: 3, delaySeconds: 0.3, timeoutMs: 30000 },
    };

    setBusy(true);
    const ac = new AbortController();
    abortControllerRef.current = ac;
    setScanState(createInitialScanState(targetName, environment, profile));
    onScanningChange?.(true);

    try {
      const res = await runScanStream(
        config,
        profile,
        environment === 'production' ? authorized : false,
        {
          onInit: (d) => setScanState((s) => (s ? handleInitEvent(s, d) : s)),
          onProbe: (p) => setScanState((s) => (s ? handleProbeEvent(s, p) : s)),
        },
        ac.signal,
      );
      setScanState(null);
      setBusy(false);
      onScanningChange?.(false);
      onResult(res);
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setScanState(null);
        setBusy(false);
        setStatus('Scan cancelled.');
        onScanningChange?.(false);
        return;
      }
      setScanState(null);
      setBusy(false);
      onScanningChange?.(false);
      setError(
        err instanceof ApiError
          ? `${err.message} (HTTP ${err.status})`
          : err instanceof Error
            ? err.message
            : 'Failed.',
      );
    }
  }

  if (scanState) {
    return <ScanProgress state={scanState} onCancel={handleCancel} />;
  }

  return (
    <form className={`flex flex-col gap-4 ${CARD_CLS}`} onSubmit={onSubmit}>
      <div className="flex flex-col gap-1">
        <div className="text-aq-md font-semibold text-aq-ink">Advanced setup</div>
        <div className="text-aq-sm text-aq-ink-muted">Full control — for authenticated or non-standard agents.</div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="min-w-[240px] flex-1">
          <FormField label="Name">
            <input className={INPUT_CLS} value={name} onChange={(e) => setName(e.target.value)} placeholder="my-agent" />
          </FormField>
        </div>
        <FormField label="Environment">
          <select className={SELECT_CLS} value={environment} onChange={(e) => setEnvironment(e.target.value as Environment)}>
            <option value="development">development</option>
            <option value="staging">staging</option>
            <option value="production">production</option>
          </select>
        </FormField>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="min-w-[240px] flex-1">
          <FormField label="Endpoint URL">
            <input className={MONO_INPUT_CLS} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://.../chat" required />
          </FormField>
        </div>
        <FormField label="Method">
          <select className={SELECT_CLS} value={method} onChange={(e) => setMethod(e.target.value)}>
            <option>POST</option>
            <option>GET</option>
          </select>
        </FormField>
      </div>

      <FormField
        label="Headers (JSON)"
        helper={'Auth by reference, e.g. "Authorization": "Bearer ${MY_TOKEN}" (resolved server-side; never stored raw).'}
      >
        <textarea className={TEXTAREA_CLS} rows={3} value={headersText} onChange={(e) => setHeadersText(e.target.value)} spellCheck={false} />
      </FormField>

      <FormField label="Body template (JSON, must contain {{PROMPT}})">
        <textarea className={TEXTAREA_CLS} rows={5} value={bodyText} onChange={(e) => setBodyText(e.target.value)} spellCheck={false} />
      </FormField>

      <div className="flex flex-wrap gap-4">
        <div className="min-w-[240px] flex-1">
          <FormField label="Response path">
            <input className={MONO_INPUT_CLS} value={responsePath} onChange={(e) => setResponsePath(e.target.value)} placeholder="choices.0.message.content" />
          </FormField>
        </div>
        <FormField label="Response mode">
          <select className={SELECT_CLS} value={responseMode} onChange={(e) => setResponseMode(e.target.value as 'json' | 'sse')}>
            <option value="json">JSON</option>
            <option value="sse">SSE (stream)</option>
          </select>
        </FormField>
        {responseMode === 'sse' && (
          <FormField label="SSE event">
            <input className={MONO_INPUT_CLS} value={sseEvent} onChange={(e) => setSseEvent(e.target.value)} placeholder="content" />
          </FormField>
        )}
      </div>

      <FormField label="Scan depth">
        <SegmentedControl
          ariaLabel="Scan depth"
          value={profile}
          onChange={(next) => setProfile(next as ScanProfile)}
          options={PROFILE_OPTIONS}
        />
      </FormField>

      {environment === 'production' && (
        <Banner tone="warn">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" className="accent-aq-accent" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} />
            <span>I am authorized to scan this <b>production</b> target.</span>
          </label>
        </Banner>
      )}
      {status && <Banner tone="info">{status}</Banner>}
      {error && <Banner tone="bad">{error}</Banner>}
      <div>
        <Button type="submit" variant="primary" leading={IconPlay} loading={busy} disabled={busy}>
          {busy ? 'Scanning…' : 'Run scan'}
        </Button>
      </div>
    </form>
  );
}
