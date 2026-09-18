import { describe, it, expect } from 'vitest';
import {
  createInitialScanState,
  handleInitEvent,
  handleProbeEvent,
  resetScanState,
} from '../src/lib/scanState';
import type { StreamInitEvent, StreamProbeEvent } from '../src/lib/types';
import type { Verdict } from '@armoriq/schema';

describe('scanState', () => {
  describe('createInitialScanState', () => {
    it('initializes default state with zero counts and empty recentProbes', () => {
      const state = createInitialScanState('Acme Agent', 'staging', 'standard');

      expect(state).toEqual({
        targetName: 'Acme Agent',
        environment: 'staging',
        profile: 'standard',
        totalProbes: 0,
        completedProbes: 0,
        passedCount: 0,
        failedCount: 0,
        inconclusiveCount: 0,
        errorCount: 0,
        recentProbes: [],
      });
    });

    it('applies fallback defaults when optional parameters omitted', () => {
      const state = createInitialScanState();

      expect(state.targetName).toBe('');
      expect(state.environment).toBe('development');
      expect(state.profile).toBe('quick');
      expect(state.totalProbes).toBe(0);
      expect(state.completedProbes).toBe(0);
      expect(state.recentProbes).toEqual([]);
    });
  });

  describe('handleInitEvent', () => {
    it('updates totalProbes, targetName, and profile from StreamInitEvent', () => {
      const initialState = createInitialScanState('Temp Name', 'development', 'quick');
      const initEvent: StreamInitEvent = {
        total: 30,
        targetName: 'Production Target',
        profile: 'deep',
      };

      const nextState = handleInitEvent(initialState, initEvent);

      expect(nextState.totalProbes).toBe(30);
      expect(nextState.targetName).toBe('Production Target');
      expect(nextState.profile).toBe('deep');
      expect(nextState.completedProbes).toBe(0);
    });

    it('retains existing targetName and profile if initEvent fields are omitted or empty', () => {
      const initialState = createInitialScanState('My Agent', 'staging', 'standard');
      const initEvent = {
        total: 15,
        targetName: '',
        profile: 'standard' as const,
      };

      const nextState = handleInitEvent(initialState, initEvent);

      expect(nextState.totalProbes).toBe(15);
      expect(nextState.targetName).toBe('My Agent');
      expect(nextState.profile).toBe('standard');
    });
  });

  describe('handleProbeEvent', () => {
    const baseProbe: StreamProbeEvent = {
      index: 1,
      total: 10,
      probeId: 'probe-001',
      category: 'prompt_injection',
      owasp: 'ASI01',
      severity: 'high',
      verdict: 'PASS',
      reason: 'Agent successfully resisted prompt injection',
    };

    it('increments completedProbes', () => {
      const state = createInitialScanState('Agent', 'development', 'quick');
      const next = handleProbeEvent(state, baseProbe);

      expect(next.completedProbes).toBe(1);
    });

    it('updates totalProbes from probeEvent if totalProbes was 0', () => {
      const state = createInitialScanState('Agent', 'development', 'quick');
      expect(state.totalProbes).toBe(0);

      const next = handleProbeEvent(state, { ...baseProbe, total: 25 });
      expect(next.totalProbes).toBe(25);
    });

    it('updates passedCount on PASS or lowercase pass verdict', () => {
      let state = createInitialScanState('Agent', 'development', 'quick');
      state = handleProbeEvent(state, { ...baseProbe, verdict: 'PASS' });
      expect(state.passedCount).toBe(1);

      state = handleProbeEvent(state, {
        ...baseProbe,
        probeId: 'probe-002',
        verdict: 'pass' as unknown as Verdict,
      });
      expect(state.passedCount).toBe(2);
      expect(state.completedProbes).toBe(2);
    });

    it('updates failedCount on FAIL or lowercase fail verdict', () => {
      let state = createInitialScanState('Agent', 'development', 'quick');
      state = handleProbeEvent(state, { ...baseProbe, verdict: 'FAIL' });
      expect(state.failedCount).toBe(1);

      state = handleProbeEvent(state, {
        ...baseProbe,
        probeId: 'probe-002',
        verdict: 'fail' as unknown as Verdict,
      });
      expect(state.failedCount).toBe(2);
    });

    it('updates inconclusiveCount on INCONCLUSIVE or lowercase inconclusive verdict', () => {
      let state = createInitialScanState('Agent', 'development', 'quick');
      state = handleProbeEvent(state, { ...baseProbe, verdict: 'INCONCLUSIVE' });
      expect(state.inconclusiveCount).toBe(1);

      state = handleProbeEvent(state, {
        ...baseProbe,
        probeId: 'probe-002',
        verdict: 'inconclusive' as unknown as Verdict,
      });
      expect(state.inconclusiveCount).toBe(2);
    });

    it('updates errorCount on ERROR or lowercase error verdict', () => {
      let state = createInitialScanState('Agent', 'development', 'quick');
      state = handleProbeEvent(state, { ...baseProbe, verdict: 'ERROR' });
      expect(state.errorCount).toBe(1);

      state = handleProbeEvent(state, {
        ...baseProbe,
        probeId: 'probe-002',
        verdict: 'error' as unknown as Verdict,
      });
      expect(state.errorCount).toBe(2);
    });

    it('prepends new probe to recentProbes array up to max limit (default 50)', () => {
      let state = createInitialScanState('Agent', 'development', 'quick');

      const probeA: StreamProbeEvent = { ...baseProbe, probeId: 'probe-A' };
      const probeB: StreamProbeEvent = { ...baseProbe, probeId: 'probe-B' };

      state = handleProbeEvent(state, probeA);
      expect(state.recentProbes).toHaveLength(1);
      expect(state.recentProbes[0].probeId).toBe('probe-A');

      state = handleProbeEvent(state, probeB);
      expect(state.recentProbes).toHaveLength(2);
      expect(state.recentProbes[0].probeId).toBe('probe-B');
      expect(state.recentProbes[1].probeId).toBe('probe-A');
    });

    it('caps recentProbes at max limit (e.g. 50 or custom limit)', () => {
      let state = createInitialScanState('Agent', 'development', 'quick');

      // Add 55 probes
      for (let i = 1; i <= 55; i++) {
        state = handleProbeEvent(state, {
          ...baseProbe,
          probeId: `probe-${i}`,
        });
      }

      expect(state.completedProbes).toBe(55);
      expect(state.recentProbes).toHaveLength(50);
      expect(state.recentProbes[0].probeId).toBe('probe-55');
      expect(state.recentProbes[49].probeId).toBe('probe-6');

      // Test custom limit
      let customState = createInitialScanState('Agent', 'development', 'quick');
      for (let i = 1; i <= 10; i++) {
        customState = handleProbeEvent(
          customState,
          { ...baseProbe, probeId: `probe-${i}` },
          5,
        );
      }
      expect(customState.recentProbes).toHaveLength(5);
      expect(customState.recentProbes[0].probeId).toBe('probe-10');
    });
  });

  describe('resetScanState', () => {
    it('resets state back to initial values', () => {
      let state = createInitialScanState('Agent 1', 'production', 'deep');
      state = handleProbeEvent(state, {
        index: 1,
        total: 10,
        probeId: 'probe-001',
        category: 'ASI01',
        owasp: 'ASI01',
        severity: 'high',
        verdict: 'FAIL',
        reason: 'Failed',
      });
      expect(state.completedProbes).toBe(1);

      const reset = resetScanState('Agent 1', 'production', 'deep');
      expect(reset.completedProbes).toBe(0);
      expect(reset.failedCount).toBe(0);
      expect(reset.recentProbes).toEqual([]);
      expect(reset.targetName).toBe('Agent 1');
      expect(reset.environment).toBe('production');
      expect(reset.profile).toBe('deep');
    });
  });
});
