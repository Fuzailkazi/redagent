import { describe, it, expect } from 'vitest';
import {
  getRemediationForFinding,
  generateMarkdownBadge,
  generatePrSummary,
  REMEDIATION_PLAYBOOKS,
} from '../src/lib/remediations.js';
import type { RunScanResult } from '../src/lib/types.js';

describe('Remediations Engine', () => {
  it('provides comprehensive playbooks for all 10 OWASP Agentic categories', () => {
    const categories = ['ASI01', 'ASI02', 'ASI03', 'ASI04', 'ASI05', 'ASI06', 'ASI07', 'ASI08', 'ASI09', 'ASI10'];
    for (const code of categories) {
      const playbook = getRemediationForFinding(code);
      expect(playbook).toBeDefined();
      expect(playbook?.owaspId).toBe(code);
      expect(playbook?.title.length).toBeGreaterThan(5);
      expect(playbook?.rootCause.length).toBeGreaterThan(10);
      expect(playbook?.architectureFix.length).toBeGreaterThan(10);
    }
  });

  it('handles case-insensitivity and invalid codes', () => {
    expect(getRemediationForFinding('asi01')?.owaspId).toBe('ASI01');
    expect(getRemediationForFinding('   ASI02  ')?.owaspId).toBe('ASI02');
    expect(getRemediationForFinding('UNKNOWN99')).toBeNull();
  });

  it('generates accurate shields.io badges based on resilience score', () => {
    const b1 = generateMarkdownBadge(95);
    expect(b1).toContain('95%');
    expect(b1).toContain('brightgreen');

    const b2 = generateMarkdownBadge(80);
    expect(b2).toContain('80%');
    expect(b2).toContain('green');

    const b3 = generateMarkdownBadge(60);
    expect(b3).toContain('60%');
    expect(b3).toContain('yellow');

    const b4 = generateMarkdownBadge(20);
    expect(b4).toContain('20%');
    expect(b4).toContain('red');

    const bNull = generateMarkdownBadge(null);
    expect(bNull).toContain('0%');
  });

  it('generates formatted PR review comments with fail breakdowns', () => {
    const mockResult: RunScanResult = {
      scan: {
        id: 'scan_test',
        targetId: 'target_test',
        status: 'completed',
        profile: 'quick',
        judgeModel: null,
        resiliencePct: 83.3,
        weightedRiskPct: 15.2,
        counts: { pass: 25, fail: 3, inconclusive: 2, error: 0, total: 30 },
        startedAt: '2026-09-18T10:00:00.000Z',
        finishedAt: '2026-09-18T10:00:10.000Z',
      },
      findings: [
        {
          id: 'f1',
          scanId: 'scan_test',
          probeId: 'asi01-001',
          category: 'agent_goal_hijack',
          owasp: 'ASI01',
          severity: 'critical',
          verdict: 'FAIL',
          reason: 'Complied with prompt injection',
          tier1Verdict: 'FAIL',
          judge: null,
          latencyMs: 120,
          responseText: 'SYSTEM PROMPT BEGINS:',
          createdAt: '2026-09-18T10:00:01.000Z',
        },
      ],
      reportJson: '{}',
      reportMd: '# Report',
    };

    const prSummary = generatePrSummary(mockResult);
    expect(prSummary).toContain('RedAgent Security Scan Results');
    expect(prSummary).toContain('83.3%');
    expect(prSummary).toContain('Vulnerabilities Detected (1)');
    expect(prSummary).toContain('asi01-001');
    expect(prSummary).toContain('CRITICAL');
  });
});
