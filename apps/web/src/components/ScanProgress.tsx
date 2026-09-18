'use client';

/**
 * ScanProgress — real-time progress component for active streaming scans.
 * Displays target metadata, progress bar, live verdict chips, and an
 * auto-scrolling feed of recent probe activities.
 */

import React from 'react';
import { StatusBadge, Chip, Button } from '@shared/ui';
import {
  IconRadar,
  IconCheckCircle,
  IconErrorCircle,
  IconInfo,
  IconAlert,
} from '@shared/icons';
import type { StreamProbeEvent, Environment, ScanProfile } from '@/lib/types';
import type { ScanState } from '@/lib/scanState';

export interface ScanProgressProps {
  state?: ScanState;
  targetName?: string;
  environment?: Environment;
  profile?: ScanProfile;
  totalProbes?: number;
  completedProbes?: number;
  passedCount?: number;
  failedCount?: number;
  inconclusiveCount?: number;
  errorCount?: number;
  recentProbes?: StreamProbeEvent[];
  onCancel?: () => void;
}

function getVerdictPresentation(verdict: string): {
  tone: 'good' | 'bad' | 'warn' | 'neutral';
  label: string;
  icon: typeof IconCheckCircle;
} {
  const v = String(verdict || '').toUpperCase();
  if (v === 'PASS') {
    return { tone: 'good', label: 'PASS', icon: IconCheckCircle };
  }
  if (v === 'FAIL') {
    return { tone: 'bad', label: 'FAIL', icon: IconErrorCircle };
  }
  if (v === 'INCONCLUSIVE') {
    return { tone: 'warn', label: 'INCONCLUSIVE', icon: IconInfo };
  }
  return { tone: 'neutral', label: 'ERROR', icon: IconAlert };
}

export function ScanProgress(props: ScanProgressProps) {
  const targetName = props.targetName ?? props.state?.targetName ?? '';
  const environment = props.environment ?? props.state?.environment ?? 'development';
  const profile = props.profile ?? props.state?.profile ?? 'quick';
  const totalProbes = props.totalProbes ?? props.state?.totalProbes ?? 0;
  const completedProbes = props.completedProbes ?? props.state?.completedProbes ?? 0;
  const passedCount = props.passedCount ?? props.state?.passedCount ?? 0;
  const failedCount = props.failedCount ?? props.state?.failedCount ?? 0;
  const inconclusiveCount = props.inconclusiveCount ?? props.state?.inconclusiveCount ?? 0;
  const errorCount = props.errorCount ?? props.state?.errorCount ?? 0;
  const recentProbes = props.recentProbes ?? props.state?.recentProbes ?? [];
  const onCancel = props.onCancel;

  const pct =
    totalProbes > 0
      ? Math.min(100, Math.round((completedProbes / totalProbes) * 100))
      : 0;

  const envTone =
    environment === 'production'
      ? 'bad'
      : environment === 'staging'
        ? 'warn'
        : 'neutral';

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-aq-border bg-aq-surface p-5 shadow-aq-card">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-aq-border pb-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-aq-accent-soft text-aq-accent-strong">
            <IconRadar size={18} className="animate-spin motion-reduce:animate-none" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-aq-base font-semibold text-aq-ink">
              {targetName || 'Agent Scan'}
            </h2>
            <StatusBadge tone={envTone} label={environment} />
            <Chip tone="neutral" size="sm">
              {profile}
            </Chip>
          </div>
        </div>
      </div>

      {/* Progress Track */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-aq-xs font-mono text-aq-ink-muted">
          <span className="font-sans font-medium text-aq-ink-soft">
            Scanning target agent…
          </span>
          <span className="tabular-nums">
            {completedProbes} / {totalProbes} probes · {pct}%
          </span>
        </div>
        <div className="bg-aq-zebra relative h-2 w-full overflow-hidden rounded-full">
          <div
            className="bg-aq-accent h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Live Metric Summary Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="good" size="sm" leading={IconCheckCircle}>
          {passedCount} Resisted
        </Chip>
        <Chip tone="bad" size="sm" leading={IconErrorCircle}>
          {failedCount} Vulnerable
        </Chip>
        <Chip tone="warn" size="sm" leading={IconInfo}>
          {inconclusiveCount} Inconclusive
        </Chip>
        {errorCount > 0 ? (
          <Chip tone="neutral" size="sm" leading={IconAlert}>
            {errorCount} Errors
          </Chip>
        ) : null}
      </div>

      {/* Live Activity Feed */}
      <div className="flex flex-col gap-2">
        <div className="text-aq-xs font-medium text-aq-ink-muted">
          Live Probe Activity
        </div>
        <div className="max-h-56 overflow-y-auto space-y-1.5 font-mono text-xs rounded-md border border-aq-border bg-aq-zebra/30 p-2.5">
          {recentProbes.length === 0 ? (
            <div className="py-4 text-center text-aq-ink-muted">
              Awaiting probe dispatch…
            </div>
          ) : (
            recentProbes.map((probe, i) => {
              const v = getVerdictPresentation(probe.verdict);
              return (
                <div
                  key={`${probe.probeId}-${probe.index ?? i}`}
                  className="flex flex-wrap items-center gap-2 rounded bg-aq-surface px-2.5 py-1.5 border border-aq-border/50 text-aq-ink"
                >
                  <StatusBadge
                    tone={v.tone}
                    label={v.label}
                    icon={v.icon}
                    shape="tag"
                  />
                  <span className="font-semibold text-aq-accent-strong">
                    {probe.owasp}
                  </span>
                  <span className="text-[10px] uppercase text-aq-ink-muted">
                    {probe.severity}
                  </span>
                  <span className="text-aq-ink-soft">{probe.probeId}</span>
                  <span className="max-w-xs truncate text-aq-ink-muted">
                    {probe.reason}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer */}
      {onCancel ? (
        <div className="flex items-center justify-end border-t border-aq-border pt-3">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel Scan
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default ScanProgress;
