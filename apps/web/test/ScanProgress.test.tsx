import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScanProgress } from '../src/components/ScanProgress';
import type { ScanState } from '../src/lib/scanState';
import type { StreamProbeEvent } from '../src/lib/types';

describe('<ScanProgress />', () => {
  const sampleProbes: StreamProbeEvent[] = [
    {
      index: 1,
      total: 30,
      probeId: 'asi01-leak',
      category: 'Agent Goal Hijack',
      owasp: 'ASI01',
      severity: 'critical',
      verdict: 'FAIL',
      reason: 'Agent revealed system instructions',
    },
    {
      index: 2,
      total: 30,
      probeId: 'asi02-tool-abuse',
      category: 'Tool Misuse',
      owasp: 'ASI02',
      severity: 'high',
      verdict: 'PASS',
      reason: 'Agent properly refused unauthorized tool call',
    },
    {
      index: 3,
      total: 30,
      probeId: 'asi04-supply-chain',
      category: 'Supply Chain',
      owasp: 'ASI04',
      severity: 'medium',
      verdict: 'INCONCLUSIVE',
      reason: 'Response was ambiguous',
    },
  ];

  const mockState: ScanState = {
    targetName: 'Acme Support Agent',
    environment: 'production',
    profile: 'standard',
    totalProbes: 30,
    completedProbes: 15,
    passedCount: 10,
    failedCount: 3,
    inconclusiveCount: 2,
    errorCount: 0,
    recentProbes: sampleProbes,
  };

  it('renders target name, environment badge, and profile chip', () => {
    const html = renderToStaticMarkup(<ScanProgress state={mockState} />);

    expect(html).toContain('Acme Support Agent');
    expect(html).toContain('production');
    expect(html).toContain('standard');
  });

  it('renders progress bar text showing completed / total probes and percentage', () => {
    const html = renderToStaticMarkup(<ScanProgress state={mockState} />);

    expect(html).toContain('15 / 30 probes · 50%');
  });

  it('renders metric chips for Resisted, Vulnerable, and Inconclusive', () => {
    const html = renderToStaticMarkup(<ScanProgress state={mockState} />);

    expect(html).toContain('10 Resisted');
    expect(html).toContain('3 Vulnerable');
    expect(html).toContain('2 Inconclusive');
    expect(html).not.toContain('Errors');
  });

  it('renders Errors metric chip when errorCount > 0', () => {
    const stateWithErrors: ScanState = {
      ...mockState,
      errorCount: 4,
    };
    const html = renderToStaticMarkup(<ScanProgress state={stateWithErrors} />);

    expect(html).toContain('4 Errors');
  });

  it('renders recent probe items with probeId, OWASP tag, severity, and status badge', () => {
    const html = renderToStaticMarkup(<ScanProgress state={mockState} />);

    expect(html).toContain('asi01-leak');
    expect(html).toContain('ASI01');
    expect(html).toContain('critical');
    expect(html).toContain('Agent revealed system instructions');
    expect(html).toContain('FAIL');

    expect(html).toContain('asi02-tool-abuse');
    expect(html).toContain('ASI02');
    expect(html).toContain('PASS');
    expect(html).toContain('Agent properly refused unauthorized tool call');

    expect(html).toContain('asi04-supply-chain');
    expect(html).toContain('ASI04');
    expect(html).toContain('INCONCLUSIVE');
  });

  it('renders Cancel Scan button when onCancel is passed', () => {
    const onCancel = vi.fn();
    const html = renderToStaticMarkup(
      <ScanProgress state={mockState} onCancel={onCancel} />,
    );

    expect(html).toContain('Cancel Scan');
  });

  it('omits Cancel Scan button when onCancel is not passed', () => {
    const html = renderToStaticMarkup(<ScanProgress state={mockState} />);

    expect(html).not.toContain('Cancel Scan');
  });

  it('accepts flattened props in place of state object', () => {
    const html = renderToStaticMarkup(
      <ScanProgress
        targetName="Direct Target"
        environment="staging"
        profile="deep"
        totalProbes={10}
        completedProbes={7}
        passedCount={5}
        failedCount={1}
        inconclusiveCount={1}
        errorCount={0}
        recentProbes={[]}
      />,
    );

    expect(html).toContain('Direct Target');
    expect(html).toContain('staging');
    expect(html).toContain('deep');
    expect(html).toContain('7 / 10 probes · 70%');
    expect(html).toContain('5 Resisted');
    expect(html).toContain('1 Vulnerable');
    expect(html).toContain('1 Inconclusive');
  });
});
