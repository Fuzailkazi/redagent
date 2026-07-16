'use client';

/** Scan history — a table of recent scans linking to each report. */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listScans, ApiError, type ScanSummary } from '@/lib/api';

function fmt(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function statusPill(status: ScanSummary['status']): string {
  const suffix =
    status === 'completed' ? 'pass' : status === 'failed' ? 'fail' : 'inconclusive';
  return `pill pill-${suffix}`;
}

export default function ScansPage() {
  const [scans, setScans] = useState<ScanSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listScans()
      .then((s) => {
        if (active) setScans(s);
      })
      .catch((e) => {
        if (active) {
          setError(e instanceof ApiError ? `${e.message} (HTTP ${e.status})` : String(e));
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="stack">
      <div className="between cluster">
        <h1 style={{ margin: 0 }}>Scans</h1>
        <Link href="/" className="btn btn-primary btn-sm">
          + New scan
        </Link>
      </div>

      {error && <div className="notice notice-error" role="alert">{error}</div>}

      {!scans && !error && (
        <div className="card cluster">
          <span className="spinner" aria-hidden="true" /> Loading scans…
        </div>
      )}

      {scans && scans.length === 0 && (
        <div className="card stack" style={{ alignItems: 'flex-start' }}>
          <p className="muted" style={{ margin: 0 }}>No scans yet.</p>
          <Link href="/" className="btn btn-primary btn-sm">Run your first scan</Link>
        </div>
      )}

      {scans && scans.length > 0 && (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Target</th>
                <th>Env</th>
                <th>Profile</th>
                <th>Status</th>
                <th className="num">Resilience</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/scans/${s.id}`} className="mono">{s.targetName}</Link>
                  </td>
                  <td className="muted">{s.environment}</td>
                  <td><span className="badge badge-accent">{s.profile}</span></td>
                  <td><span className={statusPill(s.status)}>{s.status}</span></td>
                  <td className="num tnum">
                    {s.resiliencePct != null ? (
                      <span className={s.resiliencePct >= 80 ? 'pass' : s.resiliencePct >= 50 ? 'warn' : 'fail'}>
                        {s.resiliencePct}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>{fmt(s.finishedAt ?? s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
