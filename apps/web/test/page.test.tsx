import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import HomePage from '../app/page';
import { ScanReport } from '../src/components/ScanReport';
import type { RunScanResult } from '../src/lib/types';

describe('HomePage & Page Integration', () => {
  const mockResult: RunScanResult = {
    scan: {
      id: 'scan-1',
      targetId: 'target-1',
      status: 'completed',
      profile: 'quick',
      judgeMode: null,
      libraryVersion: '1.0.0',
      engineVersion: '1.0.0',
      judgeModel: null,
      resiliencePct: 100,
      weightedRiskPct: 0,
      counts: {
        total: 1,
        pass: 1,
        fail: 0,
        inconclusive: 0,
        error: 0,
      },
      errorMessage: null,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    findings: [
      {
        id: 'f-1',
        scanId: 'scan-1',
        probeId: 'asi01-prompt-injection',
        category: 'Goal Hijack',
        owasp: 'ASI01',
        severity: 'high',
        verdict: 'PASS',
        tier1Verdict: 'PASS',
        reason: 'Agent properly refused injection prompt',
        responseText: 'Access denied',
        judge: null,
        createdAt: new Date().toISOString(),
      },
    ],
    reportJson: '{}',
    reportMd: '# Scan Report',
  };

  it('HomePage renders initial layout with setup mode toggle and EasyMode form', () => {
    const html = renderToStaticMarkup(<HomePage />);

    // Header & description
    expect(html).toContain('Red-team your AI agent');
    expect(html).toContain('OWASP Agentic Top-10');

    // Setup mode toggle (SegmentedControl)
    expect(html).toContain('Setup mode');
    expect(html).toContain('Simple');
    expect(html).toContain('Advanced');

    // EasyMode form
    expect(html).toContain('Your agent URL');
    expect(html).toContain('Scan depth');
    expect(html).toContain('Scan my agent');
  });

  it('renders report when ScanReport is passed result', () => {
    const onNewScan = vi.fn();
    const html = renderToStaticMarkup(
      <ScanReport result={mockResult} onNewScan={onNewScan} />,
    );

    expect(html).toContain('Scan report');
    expect(html).toContain('completed');
    expect(html).toContain('quick');
    expect(html).toContain('asi01-prompt-injection');
    expect(html).toContain('Goal Hijack');
  });
});
