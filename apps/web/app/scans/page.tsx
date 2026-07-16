'use client';

/** Scan history — a table of recent scans linking to each report. */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  IconCheckCircle,
  IconClock,
  IconErrorCircle,
  IconHistory,
  IconPlus,
  IconRadar,
} from '@shared/icons';
import { Button, Chip, PageState, StatusBadge } from '@shared/ui';
import type { IconProps } from '@shared/icons';
import { listScans, ApiError, type ScanSummary } from '@/lib/api';

function fmt(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

type StatusView = {
  tone: 'good' | 'bad' | 'info' | 'neutral';
  icon: React.ComponentType<IconProps>;
  shimmer?: boolean;
};

function statusView(status: ScanSummary['status']): StatusView {
  switch (status) {
    case 'completed':
      return { tone: 'good', icon: IconCheckCircle };
    case 'failed':
      return { tone: 'bad', icon: IconErrorCircle };
    case 'running':
      return { tone: 'info', icon: IconRadar, shimmer: true };
    default:
      return { tone: 'neutral', icon: IconClock };
  }
}

/** Resilience %: high (>=80) reads good, mid (>=50) warn, low bad. */
function resilienceClass(pct: number): string {
  if (pct >= 80) return 'text-aq-good';
  if (pct >= 50) return 'text-aq-warn';
  return 'text-aq-bad';
}

export default function ScansPage() {
  const router = useRouter();
  const [scans, setScans] = useState<ScanSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let active = true;
    setError(null);
    setScans(null);
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

  useEffect(() => load(), [load]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-aq-lg font-semibold tracking-aq-tight text-aq-ink">Scans</h1>
        <Button
          size="sm"
          variant="primary"
          leading={IconPlus}
          onClick={() => router.push('/')}
        >
          New scan
        </Button>
      </div>

      {error && (
        <PageState
          state="error"
          headline="Couldn't load scans"
          body={error}
          cta={
            <Button size="sm" variant="secondary" onClick={load}>
              Retry
            </Button>
          }
        />
      )}

      {!scans && !error && (
        <PageState state="loading" headline="Loading scans…" />
      )}

      {scans && scans.length === 0 && (
        <PageState
          state="empty"
          icon={IconHistory}
          headline="No scans yet"
          body="Run a red-team scan against an agent to see its OWASP resilience scorecard here."
          cta={
            <Button size="sm" variant="primary" leading={IconRadar} onClick={() => router.push('/')}>
              Run your first scan
            </Button>
          }
        />
      )}

      {scans && scans.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-aq-border bg-aq-surface">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-aq-sm">
              <thead>
                <tr className="bg-aq-zebra text-left">
                  {['Target', 'Env', 'Profile', 'Status', 'Resilience', 'When'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-3.5 py-2.5 text-aq-caption font-semibold uppercase tracking-aq-wide text-aq-ink-muted ${
                        i === 4 ? 'text-right' : ''
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scans.map((s) => {
                  const sv = statusView(s.status);
                  return (
                    <tr
                      key={s.id}
                      className="border-t border-aq-border transition-colors hover:bg-aq-zebra"
                    >
                      <td className="px-3.5 py-3">
                        <Link
                          href={`/scans/${s.id}`}
                          className="font-mono text-aq-sm text-aq-ink hover:text-aq-accent-strong"
                        >
                          {s.targetName}
                        </Link>
                      </td>
                      <td className="px-3.5 py-3 text-aq-ink-muted">{s.environment}</td>
                      <td className="px-3.5 py-3">
                        <Chip size="sm" tone="neutral">
                          {s.profile}
                        </Chip>
                      </td>
                      <td className="px-3.5 py-3">
                        <StatusBadge
                          tone={sv.tone}
                          icon={sv.icon}
                          shimmer={sv.shimmer}
                          label={s.status}
                        />
                      </td>
                      <td className="px-3.5 py-3 text-right tabular-nums">
                        {s.resiliencePct != null ? (
                          <span className={`font-semibold ${resilienceClass(s.resiliencePct)}`}>
                            {s.resiliencePct}%
                          </span>
                        ) : (
                          <span className="text-aq-ink-muted">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-3 text-aq-ink-muted">
                        {fmt(s.finishedAt ?? s.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
