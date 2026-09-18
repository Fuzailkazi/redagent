'use client';

/**
 * ScanReport — renders a completed scan result: resilience scorecard, per-OWASP
 * category rollup, and the per-probe findings (FAIL first, then INCONCLUSIVE/
 * ERROR, then PASS).
 *
 * Fed a RunScanResult held in memory (no fetching, no polling). Report downloads
 * are generated client-side from the pre-rendered strings the scan route returned.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  AnimatedNumber,
  Banner,
  Button,
  Chip,
  Collapsible,
  SectionHeader,
  StatusBadge,
} from '@shared/ui';
import type { ChipTone, StatusTone } from '@shared/ui';
import {
  IconAlert,
  IconCheck,
  IconCheckCircle,
  IconClipboard,
  IconDownload,
  IconErrorCircle,
  IconGrid2,
  IconInfo,
  IconPlus,
  IconShield,
} from '@shared/icons';
import type { IconProps } from '@shared/icons';
import type { Verdict } from '@armoriq/schema';
import type { Finding, RunScanResult } from '@/lib/types';
import {
  getRemediationForFinding,
  generateMarkdownBadge,
  generatePrSummary,
} from '@/lib/remediations';

const VERDICT_RANK: Record<Verdict, number> = {
  FAIL: 0,
  INCONCLUSIVE: 1,
  ERROR: 2,
  PASS: 3,
};

function verdictView(v: Verdict): {
  tone: StatusTone;
  icon: React.ComponentType<IconProps>;
} {
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

const CARD_CLS = 'rounded-lg border border-aq-border bg-aq-surface p-5 shadow-aq-card';
const LINK_BTN_CLS =
  'inline-flex items-center gap-1.5 rounded-md border border-aq-border bg-aq-surface px-2.5 py-1.5 text-aq-sm font-medium text-aq-ink-muted transition-colors hover:bg-aq-zebra hover:text-aq-ink';

/** Trigger a client-side download of a text report the scan route pre-rendered. */
function downloadText(filename: string, mime: string, text: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

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

export function ScanReport({
  result,
  onNewScan,
}: {
  result: RunScanResult;
  onNewScan: () => void;
}) {
  const { scan, findings, reportJson, reportMd } = result;
  const [tab, setTab] = useState<Verdict>(() =>
    scan.counts.fail > 0
      ? 'FAIL'
      : scan.counts.inconclusive > 0
        ? 'INCONCLUSIVE'
        : scan.counts.error > 0
          ? 'ERROR'
          : 'PASS',
  );
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [openRemediation, setOpenRemediation] = useState<Record<string, boolean>>({});
  const [copiedPr, setCopiedPr] = useState(false);
  const [copiedBadge, setCopiedBadge] = useState(false);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  const toggle = useCallback((fid: string) => {
    setOpen((o) => ({ ...o, [fid]: !o[fid] }));
  }, []);

  const toggleRemediation = useCallback((fid: string) => {
    setOpenRemediation((o) => ({ ...o, [fid]: !o[fid] }));
  }, []);

  const handleCopyPr = useCallback(() => {
    navigator.clipboard.writeText(generatePrSummary(result));
    setCopiedPr(true);
    setTimeout(() => setCopiedPr(false), 2000);
  }, [result]);

  const handleCopyBadge = useCallback(() => {
    navigator.clipboard.writeText(generateMarkdownBadge(scan.resiliencePct));
    setCopiedBadge(true);
    setTimeout(() => setCopiedBadge(false), 2000);
  }, [scan.resiliencePct]);

  const handleCopyPrompt = useCallback((fid: string, promptText: string) => {
    navigator.clipboard.writeText(promptText);
    setCopiedPromptId(fid);
    setTimeout(() => setCopiedPromptId(null), 2000);
  }, []);

  const sorted = useMemo(
    () =>
      [...findings].sort(
        (a, b) =>
          VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict] ||
          a.probeId.localeCompare(b.probeId),
      ),
    [findings],
  );
  const filtered = sorted.filter((f) => f.verdict === tab);

  const categories = useMemo(() => {
    const map = new Map<
      string,
      { owasp: string; category: string; total: number; pass: number; fail: number; inconclusive: number; error: number }
    >();
    for (const f of findings) {
      const row =
        map.get(f.owasp) ??
        { owasp: f.owasp, category: f.category, total: 0, pass: 0, fail: 0, inconclusive: 0, error: 0 };
      row.total += 1;
      if (f.verdict === 'PASS') row.pass += 1;
      else if (f.verdict === 'FAIL') row.fail += 1;
      else if (f.verdict === 'INCONCLUSIVE') row.inconclusive += 1;
      else row.error += 1;
      map.set(f.owasp, row);
    }
    return [...map.values()].sort((a, b) => a.owasp.localeCompare(b.owasp));
  }, [findings]);

  // Clear, plain-language verdict: how many vulnerabilities (FAILs) and how bad.
  const vulnCount = scan.counts.fail;
  const needsReview = scan.counts.inconclusive + scan.counts.error;
  const failSeverities = useMemo(() => {
    const order = ['critical', 'high', 'medium', 'low'];
    const counts: Record<string, number> = {};
    for (const f of findings) {
      if (f.verdict === 'FAIL') counts[f.severity] = (counts[f.severity] ?? 0) + 1;
    }
    return order
      .filter((s) => counts[s])
      .map((s) => `${counts[s]} ${s}`)
      .join(' · ');
  }, [findings]);

  // Findings tabs — travel between Failed / Needs review / Passed (+ Errors if any).
  const tabs = useMemo(() => {
    const defs: { key: Verdict; label: string; count: number; countClass: string }[] = [
      {
        key: 'FAIL',
        label: 'Failed',
        count: scan.counts.fail,
        countClass: scan.counts.fail > 0 ? 'text-aq-bad' : 'text-aq-ink-faint',
      },
      {
        key: 'INCONCLUSIVE',
        label: 'Needs review',
        count: scan.counts.inconclusive,
        countClass: scan.counts.inconclusive > 0 ? 'text-aq-warn' : 'text-aq-ink-faint',
      },
      {
        key: 'PASS',
        label: 'Passed',
        count: scan.counts.pass,
        countClass: scan.counts.pass > 0 ? 'text-aq-good' : 'text-aq-ink-faint',
      },
    ];
    if (scan.counts.error > 0) {
      defs.push({ key: 'ERROR', label: 'Errors', count: scan.counts.error, countClass: 'text-aq-ink-muted' });
    }
    return defs;
  }, [scan.counts]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-aq-lg font-semibold tracking-aq-tight text-aq-ink">Scan report</h2>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="good" icon={IconCheckCircle} label="completed" />
            <Chip size="sm" tone="neutral">{scan.profile}</Chip>
            {scan.judgeModel && (
              <span className="font-mono text-aq-xs text-aq-ink-muted">judge: {scan.judgeModel}</span>
            )}
            {scan.libraryVersion && (
              <span className="font-mono text-aq-xs text-aq-ink-faint">library {scan.libraryVersion}</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={LINK_BTN_CLS}
            onClick={handleCopyPr}
            title="Copy formatted summary to paste into a GitHub PR comment"
          >
            {copiedPr ? <IconCheck size={15} className="text-aq-good" /> : <IconClipboard size={15} />}
            {copiedPr ? 'PR copied!' : 'Copy PR summary'}
          </button>
          <button
            type="button"
            className={LINK_BTN_CLS}
            onClick={handleCopyBadge}
            title="Copy Markdown badge for README.md"
          >
            {copiedBadge ? <IconCheck size={15} className="text-aq-good" /> : <IconShield size={15} />}
            {copiedBadge ? 'Badge copied!' : 'Copy badge'}
          </button>
          <button
            className={LINK_BTN_CLS}
            onClick={() => downloadText('report.json', 'application/json', reportJson)}
          >
            <IconDownload size={15} />
            JSON
          </button>
          <button
            className={LINK_BTN_CLS}
            onClick={() => downloadText('report.md', 'text/markdown', reportMd)}
          >
            <IconDownload size={15} />
            Markdown
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-md bg-aq-accent px-2.5 py-1.5 text-aq-sm font-medium text-aq-ink-on shadow-aq-button transition-colors hover:bg-aq-accent-strong"
            onClick={onNewScan}
          >
            <IconPlus size={15} />
            New scan
          </button>
        </div>
      </div>

      {/* Headline verdict — is this a bad result, and how many vulnerabilities? */}
      {vulnCount > 0 ? (
        <Banner tone="bad" icon={IconErrorCircle}>
          <b>
            {vulnCount} vulnerabilit{vulnCount === 1 ? 'y' : 'ies'} found.
          </b>{' '}
          The agent complied with {vulnCount} of {scan.counts.total} attacks
          {failSeverities ? ` (${failSeverities})` : ''}. Open the <b>Failed</b> tab below to see each
          one.
          {needsReview > 0 && (
            <>
              {' '}
              {needsReview} response{needsReview === 1 ? '' : 's'} also need review.
            </>
          )}
        </Banner>
      ) : (
        <Banner tone="good" icon={IconCheckCircle}>
          <b>No vulnerabilities found.</b> The agent resisted all {scan.counts.total} attacks.
          {needsReview > 0 && (
            <>
              {' '}
              {needsReview} response{needsReview === 1 ? '' : 's'} need review — check the{' '}
              <b>Needs review</b> tab.
            </>
          )}
        </Banner>
      )}

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

      {/* Per-OWASP category matrix */}
      {categories.length > 0 && (
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
      <div className={`flex flex-col gap-3 ${CARD_CLS}`}>
        <div className="flex flex-col gap-0.5">
          <div className="text-aq-md font-semibold text-aq-ink">Findings</div>
          <div className="text-aq-sm text-aq-ink-muted">
            FAIL = the agent complied (vulnerability). PASS = it resisted.
          </div>
        </div>

        {/* Tabs — travel between verdicts */}
        <div
          role="tablist"
          aria-label="Findings by verdict"
          className="flex flex-wrap gap-1 border-b border-aq-border"
        >
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3.5 py-2 text-aq-sm font-medium transition-colors ${
                  active
                    ? 'border-aq-accent text-aq-ink'
                    : 'border-transparent text-aq-ink-muted hover:text-aq-ink'
                }`}
              >
                {t.label}
                <span
                  className={`rounded-full bg-aq-zebra px-1.5 py-0.5 text-aq-xs tabular-nums ${t.countClass}`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-aq-sm text-aq-ink-faint">
            No {tab === 'FAIL' ? 'failed' : tab === 'PASS' ? 'passed' : tab.toLowerCase()} findings.
          </div>
        )}

        <div className="flex flex-col gap-2">
          {filtered.map((f: Finding) => {
            const j = judgeInfo(f.judge);
            const overrode = f.tier1Verdict && f.tier1Verdict !== f.verdict;
            const vv = verdictView(f.verdict);
            return (
              <div key={f.id} className="rounded-md border border-aq-border bg-aq-zebra px-4 py-3">
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
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="xs" variant="ghost" onClick={() => toggle(f.id)}>
                    {open[f.id] ? 'Hide' : 'Show'} response{j ? ' + judge' : ''}
                  </Button>
                  {f.verdict === 'FAIL' && (
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => toggleRemediation(f.id)}
                    >
                      {openRemediation[f.id] ? 'Hide fix' : '🛠️ How to fix'}
                    </Button>
                  )}
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
                {f.verdict === 'FAIL' && openRemediation[f.id] && (() => {
                  const playbook = getRemediationForFinding(f.owasp);
                  if (!playbook) return null;
                  return (
                    <div className="mt-3 flex flex-col gap-3 rounded-md border border-aq-accent/40 bg-aq-surface p-4 shadow-aq-card">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-aq-border pb-2">
                        <div className="flex items-center gap-2">
                          <IconShield size={16} className="text-aq-accent" />
                          <span className="text-aq-sm font-semibold text-aq-ink">{playbook.title}</span>
                          <span className="font-mono text-aq-xs text-aq-ink-muted">({playbook.owaspId})</span>
                        </div>
                        <Chip tone="accent" size="sm">Remediation Guide</Chip>
                      </div>

                      <div className="text-aq-xs text-aq-ink-muted">
                        <b className="text-aq-ink">Root Cause:</b> {playbook.rootCause}
                      </div>

                      {playbook.systemPromptFix && (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-aq-caption font-semibold uppercase tracking-aq-wide text-aq-ink-muted">
                              Recommended System Prompt Hardening
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyPrompt(f.id, playbook.systemPromptFix!)}
                              className="inline-flex items-center gap-1 text-aq-xs font-semibold text-aq-accent transition-colors hover:underline"
                            >
                              {copiedPromptId === f.id ? (
                                <>
                                  <IconCheck size={13} className="text-aq-good" /> Copied!
                                </>
                              ) : (
                                <>
                                  <IconClipboard size={13} /> Copy prompt guardrail
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="m-0 max-h-52 overflow-y-auto rounded-md border border-aq-border bg-aq-zebra p-3 font-mono text-aq-xs text-aq-ink whitespace-pre-wrap">
                            {playbook.systemPromptFix}
                          </pre>
                        </div>
                      )}

                      <div className="flex flex-col gap-1 rounded-md border border-aq-border bg-aq-zebra/60 p-3 text-aq-xs">
                        <span className="font-semibold text-aq-ink">Architectural Defense Pattern:</span>
                        <p className="m-0 text-aq-ink-muted leading-relaxed">{playbook.architectureFix}</p>
                      </div>

                      <div className="text-aq-caption text-aq-ink-faint">
                        <b className="text-aq-ink-muted">Verification Test:</b> {playbook.verificationRule}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
