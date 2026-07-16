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
  AnimatedNumber,
  Banner,
  Button,
  Chip,
  Collapsible,
  MatrixLoader,
  PageState,
  Progress,
  SectionHeader,
  StatusBadge,
} from '@shared/ui';
import type { ChipTone, StatusTone } from '@shared/ui';
import {
  IconAlert,
  IconArrowLeft,
  IconCheckCircle,
  IconClock,
  IconDownload,
  IconErrorCircle,
  IconGrid2,
  IconInfo,
  IconPlus,
  IconRadar,
  IconRefresh,
  IconShield,
} from '@shared/icons';
import type { IconProps } from '@shared/icons';
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

/** Verdict → status pill tone + icon. */
function verdictView(v: Verdict): { tone: StatusTone; icon: React.ComponentType<IconProps> } {
  switch (v) {
    case 'PASS':
      return { tone: 'good', icon: IconCheckCircle };
    case 'FAIL':
      return { tone: 'bad', icon: IconErrorCircle };
    case 'INCONCLUSIVE':
      return { tone: 'warn', icon: IconInfo };
    default:
      return { tone: 'neutral', icon: IconAlert };
  }
}

/** Scan lifecycle status → status pill. */
function scanStatusView(
  status: Scan['status'],
): { tone: StatusTone; icon: React.ComponentType<IconProps>; shimmer?: boolean } {
  switch (status) {
    case 'completed':
      return { tone: 'good', icon: IconCheckCircle };
    case 'failed':
      return { tone: 'bad', icon: IconErrorCircle };
    case 'running':
      return { tone: 'info', icon: IconRadar, shimmer: true };
    default:
      return { tone: 'neutral', icon: IconClock, shimmer: true };
  }
}

/** Severity → chip tone (critical/high read as bad, medium warn, low neutral). */
function severityTone(severity: string): ChipTone {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'bad';
    case 'medium':
      return 'warn';
    default:
      return 'neutral';
  }
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

/* Shared surfaces — token-only, mirrors the other pages' card treatment. */
const CARD_CLS = 'rounded-lg border border-aq-border bg-aq-surface p-5 shadow-aq-card';
/** Ghost-style link (Button renders a <button>; report downloads must be anchors). */
const LINK_BTN_CLS =
  'inline-flex items-center gap-1.5 rounded-md border border-aq-border bg-aq-surface px-2.5 py-1.5 text-aq-sm font-medium text-aq-ink-muted transition-colors hover:bg-aq-zebra hover:text-aq-ink';

/** One scorecard tile. Optional token-colored meter under the value. */
function StatTile({
  label,
  value,
  valueClass,
  sub,
  meterPct,
  meterClass,
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
  sub: React.ReactNode;
  meterPct?: number | null;
  meterClass?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${CARD_CLS}`}>
      <div className="text-aq-caption font-semibold uppercase tracking-aq-wide text-aq-ink-muted">
        {label}
      </div>
      <div className={`text-aq-stat font-semibold tabular-nums ${valueClass ?? 'text-aq-ink'}`}>
        {value}
      </div>
      <div className="text-aq-caption text-aq-ink-muted">{sub}</div>
      {meterPct != null && (
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-aq-zebra">
          <div
            className={`h-full rounded-full ${meterClass ?? 'bg-aq-accent'} motion-safe:transition-[width] motion-safe:duration-aq-base`}
            style={{ width: `${Math.max(0, Math.min(100, meterPct))}%` }}
          />
        </div>
      )}
    </div>
  );
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

  const sv = scan ? scanStatusView(scan.status) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="font-mono text-aq-xs text-aq-ink-faint">scan {id}</div>
          <h1 className="text-aq-lg font-semibold tracking-aq-tight text-aq-ink">Scan report</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {scan?.status === 'completed' && (
            <>
              <Button
                size="sm"
                variant="secondary"
                leading={IconRefresh}
                onClick={rescan}
                loading={rescanning}
                disabled={rescanning}
              >
                {rescanning ? 'Re-scanning…' : 'Re-scan'}
              </Button>
              <a className={LINK_BTN_CLS} href={reportUrl(id, 'json')}>
                <IconDownload size={15} />
                JSON
              </a>
              <a className={LINK_BTN_CLS} href={reportUrl(id, 'md')}>
                <IconDownload size={15} />
                Markdown
              </a>
            </>
          )}
          <Link className={LINK_BTN_CLS} href="/scans">
            <IconArrowLeft size={15} />
            All scans
          </Link>
          <Link
            className="inline-flex items-center gap-1.5 rounded-md bg-aq-accent px-2.5 py-1.5 text-aq-sm font-medium text-aq-ink-on shadow-aq-button transition-colors hover:bg-aq-accent-strong"
            href="/"
          >
            <IconPlus size={15} />
            New scan
          </Link>
        </div>
      </div>

      {error && (
        <PageState state="error" headline="Couldn't load the scan" body={error} />
      )}

      {!scan && !error && <PageState state="loading" headline="Loading scan…" />}

      {scan && (
        <>
          {/* Status + metadata */}
          <div className={`flex flex-col gap-3 ${CARD_CLS}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {sv && (
                  <StatusBadge tone={sv.tone} icon={sv.icon} shimmer={sv.shimmer} label={scan.status} />
                )}
                <Chip size="sm" tone="neutral">
                  {scan.profile}
                </Chip>
                {scan.judgeModel && (
                  <span className="font-mono text-aq-xs text-aq-ink-muted">judge: {scan.judgeModel}</span>
                )}
              </div>
              {running && (
                <span className="flex items-center gap-2 text-aq-xs text-aq-ink-faint">
                  <MatrixLoader pattern="orbit" size="sm" /> polling…
                </span>
              )}
            </div>
            {scan.status === 'failed' && scan.errorMessage && (
              <Banner tone="bad">Scan failed: {scan.errorMessage}</Banner>
            )}
            <div className="text-aq-xs text-aq-ink-faint">
              started {fmtTime(scan.startedAt)} · finished {fmtTime(scan.finishedAt)}
              {scan.libraryVersion && ` · library ${scan.libraryVersion}`}
              {scan.engineVersion && ` · engine ${scan.engineVersion}`}
            </div>
          </div>

          {/* Scorecard */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Resilience"
              value={scan.resiliencePct != null ? `${scan.resiliencePct}%` : '—'}
              valueClass="text-aq-good"
              sub="pass rate · higher is better"
              meterPct={scan.resiliencePct}
              meterClass="bg-aq-good"
            />
            <StatTile
              label="Weighted risk"
              value={scan.weightedRiskPct != null ? `${scan.weightedRiskPct}%` : '—'}
              valueClass="text-aq-bad"
              sub="severity-weighted fails · lower is better"
              meterPct={scan.weightedRiskPct}
              meterClass="bg-aq-bad"
            />
            <StatTile
              label="Probes"
              value={<AnimatedNumber value={scan.counts.total} />}
              sub={
                <>
                  <span className="text-aq-good">{scan.counts.pass} pass</span> ·{' '}
                  <span className="text-aq-bad">{scan.counts.fail} fail</span>
                </>
              }
            />
            <StatTile
              label="Needs review"
              value={<AnimatedNumber value={scan.counts.inconclusive} />}
              valueClass="text-aq-warn"
              sub={`${scan.counts.error} error`}
            />
          </div>

          {/* Live progress */}
          {running && (
            <div className={`flex flex-col gap-3 ${CARD_CLS}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-aq-sm text-aq-ink">
                  <MatrixLoader pattern="sweep" size="sm" />
                  {scan.status === 'queued' ? 'Queued…' : 'Running probes…'}
                </span>
                <span className="text-aq-xs tabular-nums text-aq-ink-faint">
                  {scored}/{scan.counts.total || '?'} scored
                </span>
              </div>
              <Progress value={progressPct} />
            </div>
          )}

          {/* Per-OWASP category matrix */}
          {findings && categories.length > 0 && (
            <div className={`flex flex-col gap-3 ${CARD_CLS}`}>
              <SectionHeader icon={IconGrid2} tone="neutral" title="By OWASP category" />
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-aq-sm">
                  <thead>
                    <tr className="bg-aq-zebra text-left">
                      {['Category', 'OWASP', 'Probes', 'Pass', 'Fail', 'Review'].map((h, i) => (
                        <th
                          key={h}
                          className={`px-3.5 py-2.5 text-aq-caption font-semibold uppercase tracking-aq-wide text-aq-ink-muted ${
                            i >= 2 ? 'text-right' : ''
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c) => (
                      <tr key={c.owasp} className="border-t border-aq-border">
                        <td className="px-3.5 py-2.5 text-aq-ink">{c.category}</td>
                        <td className="px-3.5 py-2.5 font-mono text-aq-ink-faint">{c.owasp}</td>
                        <td className="px-3.5 py-2.5 text-right tabular-nums text-aq-ink-muted">{c.total}</td>
                        <td className="px-3.5 py-2.5 text-right tabular-nums text-aq-good">{c.pass}</td>
                        <td className="px-3.5 py-2.5 text-right tabular-nums">
                          {c.fail > 0 ? <span className="text-aq-bad">{c.fail}</span> : 0}
                        </td>
                        <td className="px-3.5 py-2.5 text-right tabular-nums">
                          {c.inconclusive + c.error > 0 ? (
                            <span className="text-aq-warn">{c.inconclusive + c.error}</span>
                          ) : (
                            0
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Findings */}
          {findings && (
            <div className={`flex flex-col gap-3 ${CARD_CLS}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <div className="text-aq-md font-semibold text-aq-ink">Findings</div>
                  <div className="text-aq-sm text-aq-ink-muted">
                    FAIL = the agent complied (vulnerability). PASS = it resisted.
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(['ALL', 'FAIL', 'INCONCLUSIVE', 'PASS', 'ERROR'] as VerdictFilter[]).map((v) => (
                    <Chip
                      key={v}
                      size="sm"
                      tone="neutral"
                      selected={verdictFilter === v}
                      onClick={() => setVerdictFilter(v)}
                    >
                      {v === 'ALL' ? 'All' : v}
                    </Chip>
                  ))}
                </div>
              </div>

              {filtered.length === 0 && (
                <div className="text-aq-sm text-aq-ink-faint">No findings match this filter.</div>
              )}

              <div className="flex flex-col gap-2">
                {filtered.map((f) => {
                  const j = judgeInfo(f.judge);
                  const overrode = f.tier1Verdict && f.tier1Verdict !== f.verdict;
                  const vv = verdictView(f.verdict);
                  return (
                    <div
                      key={f.id}
                      className="rounded-md border border-aq-border bg-aq-zebra px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-aq-xs text-aq-ink">{f.probeId}</span>
                          <span className="text-aq-sm text-aq-ink-muted">{f.category}</span>
                          <span className="font-mono text-aq-xs text-aq-ink-faint">{f.owasp}</span>
                          <Chip size="sm" tone={severityTone(f.severity)}>
                            {f.severity}
                          </Chip>
                        </div>
                        <StatusBadge tone={vv.tone} icon={vv.icon} label={f.verdict} />
                      </div>
                      <div className="mt-2 text-aq-sm text-aq-ink-muted">{f.reason}</div>
                      {overrode && (
                        <div className="mt-1 text-aq-xs text-aq-ink-faint">
                          judge overrode Tier-1 <span className="font-mono">{f.tier1Verdict}</span> →{' '}
                          <span className="font-mono">{f.verdict}</span>
                        </div>
                      )}
                      <div className="mt-2">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => toggle(f.id)}
                        >
                          {open[f.id] ? 'Hide' : 'Show'} response{j ? ' + judge' : ''}
                        </Button>
                      </div>
                      <Collapsible open={!!open[f.id]}>
                        <div className="mt-2 flex flex-col gap-2">
                          {j?.rationale && (
                            <Banner tone="info" icon={IconShield}>
                              <b>Judge{j.model ? ` (${j.model})` : ''}:</b> {j.rationale}
                            </Banner>
                          )}
                          <pre className="m-0 overflow-x-auto rounded-md bg-aq-surface p-3 font-mono text-aq-xs text-aq-ink whitespace-pre-wrap">
                            {f.responseText || '(empty response)'}
                          </pre>
                        </div>
                      </Collapsible>
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
