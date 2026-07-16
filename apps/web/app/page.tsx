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

function hostOf(url: string): string {
  try { return new URL(url).host; } catch { return 'agent'; }
}

export default function HomePage() {
  const router = useRouter();
  const [advanced, setAdvanced] = useState(false);

  return (
    <div className="stack" style={{ gap: 'var(--sp-6)' }}>
      <section className="stack" style={{ gap: 'var(--sp-2)' }}>
        <span className="badge badge-accent" style={{ alignSelf: 'flex-start' }}>OWASP Agentic Top-10 · ASI01–ASI10</span>
        <h1 style={{ margin: 0, fontSize: 'clamp(26px,4vw,38px)', letterSpacing: '-0.02em' }}>
          Red-team your AI agent
        </h1>
        <p className="muted" style={{ margin: 0, maxWidth: '58ch' }}>
          Paste your agent&apos;s URL. We probe it, figure out how it talks, fire 30
          adversarial probes, and hand you a resilience scorecard.
        </p>
      </section>

      {!advanced ? <EasyMode router={router} /> : <AdvancedMode router={router} />}

      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ alignSelf: 'flex-start' }}
        onClick={() => setAdvanced((a) => !a)}
      >
        {advanced ? '← Back to simple mode' : 'Advanced setup (manual config, auth, custom shapes) →'}
      </button>
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

  return (
    <form className="card stack" style={{ gap: 'var(--sp-4)' }} onSubmit={onSubmit}>
      <div className="field">
        <label className="label" htmlFor="url">Your agent URL</label>
        <input
          id="url"
          className="input mono"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-agent.example.com/chat"
          autoComplete="off"
          disabled={busy}
        />
        <span className="hint">We auto-detect the request shape and where the reply lives (JSON or streaming). No API key needed for public agents — for authenticated ones, use Advanced.</span>
      </div>

      <div className="field">
        <span className="label">Scan depth</span>
        <div className="cluster" style={{ gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
          {PROFILES.map((p) => (
            <label key={p.value} className="cluster" style={{ gap: 'var(--sp-1)', cursor: 'pointer' }}>
              <input type="radio" name="easyProfile" checked={profile === p.value} onChange={() => setProfile(p.value)} disabled={busy} />
              <span><b>{p.label}</b> <span className="faint" style={{ fontSize: '0.8rem' }}>— {p.desc}</span></span>
            </label>
          ))}
        </div>
      </div>

      {status && <div className="notice notice-accent cluster" style={{ gap: 'var(--sp-2)' }}><span className="spinner" aria-hidden="true" />{status}</div>}
      {error && <div className="notice notice-error" role="alert">{error}</div>}

      <div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Working…' : 'Scan my agent'}
        </button>
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
    <form className="card stack" style={{ gap: 'var(--sp-4)' }} onSubmit={onSubmit}>
      <div className="card-header" style={{ margin: 0 }}>
        <div className="card-title">Advanced setup</div>
        <div className="card-desc">Full control — for authenticated or non-standard agents.</div>
      </div>
      <div className="row">
        <div className="field grow"><label className="label">Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-agent" /></div>
        <div className="field"><label className="label">Environment</label>
          <select className="select" value={environment} onChange={(e) => setEnvironment(e.target.value as Environment)}>
            <option value="development">development</option><option value="staging">staging</option><option value="production">production</option>
          </select>
        </div>
      </div>
      <div className="row">
        <div className="field grow"><label className="label">Endpoint URL</label><input className="input mono" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://.../chat" required /></div>
        <div className="field"><label className="label">Method</label>
          <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}><option>POST</option><option>GET</option></select>
        </div>
      </div>
      <div className="field"><label className="label">Headers (JSON)</label>
        <textarea className="textarea" rows={3} value={headersText} onChange={(e) => setHeadersText(e.target.value)} spellCheck={false} />
        <span className="hint">Auth by reference, e.g. <span className="mono">{'"Authorization": "Bearer ${MY_TOKEN}"'}</span> (resolved server-side; never stored raw).</span>
      </div>
      <div className="field"><label className="label">Body template (JSON, must contain {'{{PROMPT}}'})</label>
        <textarea className="textarea" rows={5} value={bodyText} onChange={(e) => setBodyText(e.target.value)} spellCheck={false} />
      </div>
      <div className="row">
        <div className="field grow"><label className="label">Response path</label><input className="input mono" value={responsePath} onChange={(e) => setResponsePath(e.target.value)} placeholder="choices.0.message.content" /></div>
        <div className="field"><label className="label">Response mode</label>
          <select className="select" value={responseMode} onChange={(e) => setResponseMode(e.target.value as 'json' | 'sse')}><option value="json">JSON</option><option value="sse">SSE (stream)</option></select>
        </div>
        {responseMode === 'sse' && (
          <div className="field"><label className="label">SSE event</label><input className="input mono" value={sseEvent} onChange={(e) => setSseEvent(e.target.value)} placeholder="content" /></div>
        )}
      </div>
      <div className="field"><span className="label">Scan depth</span>
        <div className="cluster" style={{ gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
          {PROFILES.map((p) => (
            <label key={p.value} className="cluster" style={{ gap: 'var(--sp-1)', cursor: 'pointer' }}>
              <input type="radio" name="advProfile" checked={profile === p.value} onChange={() => setProfile(p.value)} /><span><b>{p.label}</b></span>
            </label>
          ))}
        </div>
      </div>
      {environment === 'production' && (
        <label className="notice notice-error cluster" style={{ gap: 'var(--sp-2)', cursor: 'pointer' }}>
          <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} />
          <span>I am authorized to scan this <b>production</b> target.</span>
        </label>
      )}
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      <div><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Starting…' : 'Run scan'}</button></div>
    </form>
  );
}
