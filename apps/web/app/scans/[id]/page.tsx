'use client';

/**
 * SCAN RESULTS page.
 *
 * Polls GET /scans/:id every ~1.5s while queued/running, then renders the
 * resilience scorecard and, once completed, the per-probe findings from
 * GET /scans/:id/findings (FAIL first, then INCONCLUSIVE/ERROR, then PASS).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  getFindings,
  getScan,
  createScan,
  reportUrl,
  ApiError,
  type Finding,
  type Scan,
} from '@/lib/api';
import type { Verdict } from '@armoriq/schema';

type VerdictFilter = 'ALL' | Verdict;

const POLL_MS = 1500;

const VERDICT_RANK: Record<Verdict, number> = {
  FAIL: 0,
  INCONCLUSIVE: 1,
  ERROR: 2,
  PASS: 3,
};

function pillClass(v: Verdict): string {
  const suffix =
    v === 'PASS'
      ? 'pass'
      : v === 'FAIL'
        ? 'fail'
        : v === 'INCONCLUSIVE'
          ? 'inconclusive'
          : 'error';
  return `pill pill-${suffix}`;
}

interface JudgeInfo {
  verdict?: string;
  rationale?: string;
  model?: string;
  confidence?: number;
  cached?: boolean;
}

function judgeInfo(j: unknown): JudgeInfo | null {
  if (j && typeof j === 'object') return j as JudgeInfo;
  return null;
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function ScanResultsPage() {
  const params = useParams<{ id: string }>();
  const id = String(params.id);

  const [scan, setScan] = useState<Scan | null>(null);
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>('ALL');
  const [rescanning, setRescanning] = useState(false);
  const router = useRouter();

  const toggle = useCallback((fid: string) => {
    setOpen((o) => ({ ...o, [fid]: !o[fid] }));
  }, []);

  async function rescan() {
    if (!scan) return;
    setRescanning(true);
    try {
      const { scanId } = await createScan(scan.targetId, {
        profile: scan.profile,
        authorize: true, // re-scanning a target you already scanned implies authorization
      });
      router.push(`/scans/${scanId}`);
    } catch {
      setRescanning(false);
    }
  }

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const s = await getScan(id);
        if (!active) return;
        setScan(s);
        if (s.status === 'completed') {
          const f = await getFindings(id);
          if (active) setFindings(f);
          return;
        }
        if (s.status === 'failed') return;
        timer = setTimeout(poll, POLL_MS);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? `${err.message} (HTTP ${err.status})`
            : err instanceof Error
              ? err.message
              : 'Failed to load the scan.',
        );
      }
    }

    poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  const running = scan && (scan.status === 'queued' || scan.status === 'running');
  const scored = scan
    ? scan.counts.pass + scan.counts.fail + scan.counts.inconclusive + scan.counts.error
    : 0;
  const progressPct = scan && scan.counts.total > 0 ? Math.round((scored / scan.counts.total) * 100) : 0;

  const sorted = useMemo(
    () =>
      findings
        ? [...findings].sort(
            (a, b) =>
              VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict] ||
              a.probeId.localeCompare(b.probeId),
          )
        : [],
    [findings],
  );
  const filtered = verdictFilter === 'ALL' ? sorted : sorted.filter((f) => f.verdict === verdictFilter);

  // Per-OWASP category rollup for the matrix.
  const categories = useMemo(() => {
    const map = new Map<string, { owasp: string; category: string; total: number; pass: number; fail: number; inconclusive: number; error: number }>();
    for (const f of findings ?? []) {
      const key = f.owasp;
      const row = map.get(key) ?? { owasp: f.owasp, category: f.category, total: 0, pass: 0, fail: 0, inconclusive: 0, error: 0 };
      row.total += 1;
      if (f.verdict === 'PASS') row.pass += 1;
      else if (f.verdict === 'FAIL') row.fail += 1;
      else if (f.verdict === 'INCONCLUSIVE') row.inconclusive += 1;
      else row.error += 1;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => a.owasp.localeCompare(b.owasp));
  }, [findings]);

  return (
    <div className="stack">
      <div className="between cluster">
        <div>
          <div className="faint mono" style={{ fontSize: '0.8rem' }}>scan {id}</div>
          <h1 style={{ margin: 0 }}>Scan report</h1>
        </div>
        <div className="cluster" style={{ gap: 'var(--sp-2)' }}>
          {scan?.status === 'completed' && (
            <>
              <button type="button" className="btn btn-secondary btn-sm" onClick={rescan} disabled={rescanning}>
                {rescanning ? 'Re-scanning…' : '↻ Re-scan'}
              </button>
              <a className="btn btn-ghost btn-sm" href={reportUrl(id, 'json')}>JSON</a>
              <a className="btn btn-ghost btn-sm" href={reportUrl(id, 'md')}>Markdown</a>
            </>
          )}
          <Link href="/scans" className="btn btn-ghost btn-sm">All scans</Link>
          <Link href="/" className="btn btn-primary btn-sm">+ New scan</Link>
        </div>
      </div>

      {error && <div className="notice notice-error" role="alert">{error}</div>}

      {!scan && !error && (
        <div className="card cluster"><span className="spinner" aria-hidden="true" /> Loading scan…</div>
      )}

      {scan && (
        <>
          {/* Status + metadata */}
          <div className="card stack" style={{ gap: 'var(--sp-3)' }}>
            <div className="between cluster">
              <div className="cluster" style={{ gap: 'var(--sp-2)' }}>
                <span className={`pill pill-${scan.status === 'completed' ? 'pass' : scan.status === 'failed' ? 'fail' : 'inconclusive'}`}>
                  {scan.status}
                </span>
                <span className="badge badge-accent">{scan.profile}</span>
                {scan.judgeModel && <span className="muted mono" style={{ fontSize: '0.82rem' }}>judge: {scan.judgeModel}</span>}
              </div>
              {running && <span className="cluster faint" style={{ gap: 'var(--sp-2)' }}><span className="spinner" aria-hidden="true" /> polling…</span>}
            </div>
            {scan.status === 'failed' && scan.errorMessage && (
              <div className="notice notice-error">Scan failed: {scan.errorMessage}</div>
            )}
            <div className="faint" style={{ fontSize: '0.82rem' }}>
              started {fmtTime(scan.startedAt)} · finished {fmtTime(scan.finishedAt)}
              {scan.libraryVersion && ` · library ${scan.libraryVersion}`}
              {scan.engineVersion && ` · engine ${scan.engineVersion}`}
            </div>
          </div>

          {/* Scorecard */}
          <div className="stat-grid">
            <div className="stat-tile">
              <div className="stat-label">Resilience</div>
              <div className="stat-value pass tnum">
                {scan.resiliencePct != null ? `${scan.resiliencePct}%` : '—'}
              </div>
              <div className="stat-sub">pass rate · higher is better</div>
              {scan.resiliencePct != null && (
                <div className="meter"><div className="meter-fill pass" style={{ width: `${scan.resiliencePct}%` }} /></div>
              )}
            </div>
            <div className="stat-tile">
              <div className="stat-label">Weighted risk</div>
              <div className="stat-value fail tnum">
                {scan.weightedRiskPct != null ? `${scan.weightedRiskPct}%` : '—'}
              </div>
              <div className="stat-sub">severity-weighted fails · lower is better</div>
              {scan.weightedRiskPct != null && (
                <div className="meter"><div className="meter-fill fail" style={{ width: `${scan.weightedRiskPct}%` }} /></div>
              )}
            </div>
            <div className="stat-tile">
              <div className="stat-label">Probes</div>
              <div className="stat-value tnum">{scan.counts.total}</div>
              <div className="stat-sub">
                <span className="pass">{scan.counts.pass} pass</span> · <span className="fail">{scan.counts.fail} fail</span>
              </div>
            </div>
            <div className="stat-tile">
              <div className="stat-label">Needs review</div>
              <div className="stat-value warn tnum">{scan.counts.inconclusive}</div>
              <div className="stat-sub">{scan.counts.error} error</div>
            </div>
          </div>

          {/* Live progress */}
          {running && (
            <div className="card stack" style={{ gap: 'var(--sp-2)' }}>
              <div className="between cluster">
                <span className="cluster" style={{ gap: 'var(--sp-2)' }}>
                  <span className="spinner" aria-hidden="true" />
                  {scan.status === 'queued' ? 'Queued…' : 'Running probes…'}
                </span>
                <span className="faint tnum">{scored}/{scan.counts.total || '?'} scored</span>
              </div>
              <div className="meter"><div className="meter-fill" style={{ width: `${progressPct}%` }} /></div>
            </div>
          )}

          {/* Per-OWASP category matrix */}
          {findings && categories.length > 0 && (
            <div className="card stack" style={{ gap: 'var(--sp-3)' }}>
              <div className="card-title">By OWASP category</div>
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Category</th><th>OWASP</th>
                      <th className="num">Probes</th><th className="num">Pass</th>
                      <th className="num">Fail</th><th className="num">Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c) => (
                      <tr key={c.owasp}>
                        <td>{c.category}</td>
                        <td className="mono faint">{c.owasp}</td>
                        <td className="num tnum">{c.total}</td>
                        <td className="num tnum pass">{c.pass}</td>
                        <td className="num tnum">{c.fail > 0 ? <span className="fail">{c.fail}</span> : 0}</td>
                        <td className="num tnum">{c.inconclusive + c.error > 0 ? <span className="warn">{c.inconclusive + c.error}</span> : 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Findings */}
          {findings && (
            <div className="card stack" style={{ gap: 'var(--sp-3)' }}>
              <div className="card-header" style={{ margin: 0 }}>
                <div>
                  <div className="card-title">Findings</div>
                  <div className="card-desc">FAIL = the agent complied (vulnerability). PASS = it resisted.</div>
                </div>
                <div className="cluster" style={{ gap: 'var(--sp-1)' }}>
                  {(['ALL', 'FAIL', 'INCONCLUSIVE', 'PASS', 'ERROR'] as VerdictFilter[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`btn btn-sm ${verdictFilter === v ? 'btn-secondary' : 'btn-ghost'}`}
                      onClick={() => setVerdictFilter(v)}
                    >
                      {v === 'ALL' ? 'All' : v}
                    </button>
                  ))}
                </div>
              </div>
              {filtered.length === 0 && (
                <div className="faint" style={{ fontSize: '0.85rem' }}>No findings match this filter.</div>
              )}
              <div className="stack" style={{ gap: 'var(--sp-2)' }}>
                {filtered.map((f) => {
                  const j = judgeInfo(f.judge);
                  const overrode = f.tier1Verdict && f.tier1Verdict !== f.verdict;
                  return (
                    <div key={f.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 'var(--sp-3) var(--sp-4)', background: 'var(--bg-elevated)' }}>
                      <div className="between cluster" style={{ gap: 'var(--sp-2)' }}>
                        <div className="cluster" style={{ gap: 'var(--sp-2)' }}>
                          <span className="mono" style={{ fontSize: '0.82rem' }}>{f.probeId}</span>
                          <span className="muted" style={{ fontSize: '0.85rem' }}>{f.category}</span>
                          <span className="faint mono" style={{ fontSize: '0.78rem' }}>{f.owasp}</span>
                          <span className={`badge badge-${f.severity}`}>{f.severity}</span>
                        </div>
                        <span className={pillClass(f.verdict)}>{f.verdict}</span>
                      </div>
                      <div className="muted" style={{ fontSize: '0.9rem', marginTop: 'var(--sp-2)' }}>{f.reason}</div>
                      {overrode && (
                        <div className="faint" style={{ fontSize: '0.82rem', marginTop: 'var(--sp-1)' }}>
                          judge overrode Tier-1 <span className="mono">{f.tier1Verdict}</span> → <span className="mono">{f.verdict}</span>
                        </div>
                      )}
                      <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 'var(--sp-2)' }} onClick={() => toggle(f.id)}>
                        {open[f.id] ? 'Hide' : 'Show'} response{j ? ' + judge' : ''}
                      </button>
                      {open[f.id] && (
                        <div className="stack" style={{ gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>
                          {j?.rationale && (
                            <div className="notice notice-accent" style={{ fontSize: '0.85rem' }}>
                              <b>Judge{j.model ? ` (${j.model})` : ''}:</b> {j.rationale}
                            </div>
                          )}
                          <pre className="mono" style={{ whiteSpace: 'pre-wrap', fontSize: '0.82rem', background: 'var(--surface-2)', padding: 'var(--sp-3)', borderRadius: 'var(--radius-sm)', margin: 0, overflowX: 'auto' }}>{f.responseText || '(empty response)'}</pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
