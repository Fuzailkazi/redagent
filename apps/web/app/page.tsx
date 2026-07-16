'use client';

/**
 * Home — two ways to start a scan:
 *   • Easy mode (default): paste the agent URL, we auto-detect its request/response
 *     shape (JSON or SSE) via POST /detect, then create the target + scan.
 *   • Advanced: full manual target config for auth'd or non-standard agents.
 */

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Config } from '@armoriq/schema';
import {
  Chip,
  Button,
  Banner,
  FormField,
  SegmentedControl,
} from '@shared/ui';
import { IconRadar, IconPlay } from '@shared/icons';
import {
  createScan,
  createTarget,
  detect,
  ApiError,
  type Environment,
  type ScanProfile,
} from '@/lib/api';

const PROFILES: { value: ScanProfile; label: string; desc: string }[] = [
  { value: 'quick', label: 'Quick', desc: 'Fast pattern checks, no LLM.' },
  { value: 'standard', label: 'Standard', desc: 'LLM judge on unclear results.' },
  { value: 'deep', label: 'Deep', desc: 'LLM judge on every response. Most accurate.' },
];

const PROFILE_OPTIONS = PROFILES.map((p) => ({ value: p.value, label: p.label }));

/** Shared control styling — token-only, no arbitrary sizes. */
const INPUT_CLS =
  'h-9 w-full rounded-md border border-aq-border bg-aq-surface px-3 text-aq-sm text-aq-ink placeholder:text-aq-ink-muted outline-none transition-colors focus:border-aq-accent disabled:cursor-not-allowed disabled:opacity-60';
const MONO_INPUT_CLS = `${INPUT_CLS} font-mono`;
const SELECT_CLS = INPUT_CLS;
const TEXTAREA_CLS =
  'w-full rounded-md border border-aq-border bg-aq-surface px-3 py-2 font-mono text-aq-sm text-aq-ink placeholder:text-aq-ink-muted outline-none transition-colors focus:border-aq-accent disabled:cursor-not-allowed disabled:opacity-60';
const CARD_CLS =
  'rounded-lg border border-aq-border bg-aq-surface p-5 shadow-aq-card';

function hostOf(url: string): string {
  try { return new URL(url).host; } catch { return 'agent'; }
}

export default function HomePage() {
  const router = useRouter();
  const [advanced, setAdvanced] = useState(false);

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

      <SegmentedControl
        ariaLabel="Setup mode"
        value={advanced ? 'advanced' : 'easy'}
        onChange={(next) => setAdvanced(next === 'advanced')}
        options={[
          { value: 'easy', label: 'Simple' },
          { value: 'advanced', label: 'Advanced' },
        ]}
      />

      {!advanced ? <EasyMode router={router} /> : <AdvancedMode router={router} />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Easy mode — paste a URL                                                    */
/* -------------------------------------------------------------------------- */

function EasyMode({ router }: { router: ReturnType<typeof useRouter> }) {
  const [url, setUrl] = useState('');
  const [profile, setProfile] = useState<ScanProfile>('deep');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!url.trim()) { setError('Paste your agent URL first.'); return; }

    setBusy(true);
    try {
      setStatus('Probing your agent…');
      const d = await detect(url.trim());
      const stream = d.target.responseMode === 'sse' ? ' · streaming' : '';
      setStatus(`Detected — sends "${d.bodyShape}", reads "${d.target.responsePath || 'plain text'}"${stream}. Reply: "${d.sample.slice(0, 60)}…" Starting scan…`);

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
        run: { concurrency: 2, delaySeconds: 0.5, timeoutMs: 60000 },
      };
      const { id } = await createTarget({ name: host, config });
      const { scanId } = await createScan(id, { profile });
      router.push(`/scans/${scanId}`);
    } catch (err) {
      setStatus(null);
      setBusy(false);
      if (err instanceof ApiError && err.status === 422) {
        setError("We couldn't auto-detect this agent (it may need an API key or use an unusual format). Try Advanced setup below.");
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    }
  }

  const selectedDesc = PROFILES.find((p) => p.value === profile)?.desc;

  return (
    <form className={`flex flex-col gap-4 ${CARD_CLS}`} onSubmit={onSubmit}>
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
          {busy ? 'Working…' : 'Scan my agent'}
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

function AdvancedMode({ router }: { router: ReturnType<typeof useRouter> }) {
  const [name, setName] = useState('');
  const [environment, setEnvironment] = useState<Environment>('development');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('POST');
  const [headersText, setHeadersText] = useState(DEFAULT_HEADERS);
  const [bodyText, setBodyText] = useState(DEFAULT_BODY);
  const [responsePath, setResponsePath] = useState('choices.0.message.content');
  const [responseMode, setResponseMode] = useState<'json' | 'sse'>('json');
  const [sseEvent, setSseEvent] = useState('content');
  const [profile, setProfile] = useState<ScanProfile>('deep');
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (environment === 'production' && !authorized) {
      setError('Production targets require the authorization checkbox.');
      return;
    }
    let headers: Record<string, string>;
    let bodyTemplate: unknown;
    try { headers = JSON.parse(headersText || '{}'); } catch { setError('Headers must be valid JSON.'); return; }
    try { bodyTemplate = JSON.parse(bodyText || '{}'); } catch { setError('Body template must be valid JSON.'); return; }
    if (!JSON.stringify(bodyTemplate).includes('{{PROMPT}}')) { setError('Body template must contain "{{PROMPT}}".'); return; }

    const config: Config = {
      target: {
        name: name.trim() || hostOf(url),
        environment,
        url: url.trim(),
        method,
        headers,
        bodyTemplate,
        responsePath: responsePath.trim(),
        ...(responseMode === 'sse' ? { responseMode: 'sse', sseEvent: sseEvent.trim() || 'content' } : {}),
      },
      run: { concurrency: 3, delaySeconds: 0.3, timeoutMs: 60000 },
    };

    setBusy(true);
    try {
      const { id } = await createTarget({ name: config.target.name, config });
      const { scanId } = await createScan(id, { profile, authorize: environment === 'production' ? authorized : undefined });
      router.push(`/scans/${scanId}`);
    } catch (err) {
      setBusy(false);
      setError(err instanceof ApiError ? `${err.message} (HTTP ${err.status})` : err instanceof Error ? err.message : 'Failed.');
    }
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
            <option value="development">development</option><option value="staging">staging</option><option value="production">production</option>
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
          <select className={SELECT_CLS} value={method} onChange={(e) => setMethod(e.target.value)}><option>POST</option><option>GET</option></select>
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
          <select className={SELECT_CLS} value={responseMode} onChange={(e) => setResponseMode(e.target.value as 'json' | 'sse')}><option value="json">JSON</option><option value="sse">SSE (stream)</option></select>
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
      {error && <Banner tone="bad">{error}</Banner>}
      <div>
        <Button type="submit" variant="primary" leading={IconPlay} loading={busy} disabled={busy}>
          {busy ? 'Starting…' : 'Run scan'}
        </Button>
      </div>
    </form>
  );
}
