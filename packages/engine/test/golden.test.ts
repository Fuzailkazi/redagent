/**
 * GOLDEN-AGENT regression guard — the primary safety net for the scoring engine.
 *
 * Two in-memory agents stand in for the HTTP adapter via the `Agent` seam and are
 * run against the REAL attack library:
 *
 *   safeAgent       — always returns a pure refusal. Every probe should score
 *                     PASS (the agent resisted) via passIfMatches or the built-in
 *                     refusal heuristic.  => resiliencePct >= 95 (in practice 100).
 *   vulnerableAgent — always returns a compliant blob carrying a compliance token
 *                     for every seeded probe and NO refusal wording, so every
 *                     probe trips failIfMatches -> FAIL. => resiliencePct <= 5
 *                     (in practice 0).
 *
 * The vulnerable blob is derived from the live library: for each probe we
 * synthesize a string that matches one of its own failIfMatches patterns. This is
 * the explicitly-authorized tuning of the vulnerable agent, and it keeps the
 * guard correct as the attack library grows — the detectors and the PASS/FAIL
 * convention are NEVER weakened.
 *
 * SCORING CONVENTION (never inverted here): FAIL = agent complied (the
 * vulnerability), PASS = agent resisted, INCONCLUSIVE/ERROR are never PASS.
 */

import { describe, it, expect } from 'vitest';

import { loadLibrary } from '../src/library.js';
import { runScan } from '../src/runner.js';
import { score } from '../src/scorer.js';
import type { Agent, AdapterResponse, Probe } from '@armoriq/schema';

const LIBRARY_PATH =
  '/Users/fu2ail/projects/redagent/redagent/attacks/attack_library.json';

const library = loadLibrary(LIBRARY_PATH);

/**
 * Generate a concrete string that satisfies a (subset of) a JS regex. Supports
 * the constructs used by the attack library: literals, escapes (\s \d \w \S ...),
 * character classes + ranges + negation, groups / non-capturing groups /
 * lookaheads, top-level alternation (first branch), and quantifiers. It emits a
 * minimal-but-valid sample; lookaheads emit nothing. Used only to build a
 * deliberately-vulnerable mock response — never in production detection.
 */
function regexSample(src: string): string {
  let i = 0;

  const escChar = (c: string): string => {
    switch (c) {
      case 's':
        return ' ';
      case 'S':
        return 'x';
      case 'd':
        return '5';
      case 'D':
        return 'x';
      case 'w':
        return 'x';
      case 'W':
        return ' ';
      case 'b':
      case 'B':
        return '';
      case 'n':
        return '\n';
      case 't':
        return '\t';
      case 'r':
        return '';
      default:
        return c; // escaped literal, e.g. \. \( \| \-
    }
  };

  const parseClass = (): string => {
    i++; // consume '['
    let neg = false;
    if (src[i] === '^') {
      neg = true;
      i++;
    }
    const items: Array<{ lo: string; hi: string }> = [];
    while (i < src.length && src[i] !== ']') {
      let ch: string;
      if (src[i] === '\\') {
        i++;
        ch = escChar(src[i++] ?? '');
      } else {
        ch = src[i++] ?? '';
      }
      if (src[i] === '-' && src[i + 1] !== ']' && src[i + 1] !== undefined) {
        i++; // consume '-'
        let hi: string;
        if (src[i] === '\\') {
          i++;
          hi = escChar(src[i++] ?? '');
        } else {
          hi = src[i++] ?? '';
        }
        items.push({ lo: ch, hi });
      } else {
        items.push({ lo: ch, hi: ch });
      }
    }
    if (src[i] === ']') i++;
    if (!neg) {
      return items[0]?.lo ?? 'x';
    }
    for (const cand of [' ', 'x', '0', '.', 'q', '1']) {
      if (!items.some((it) => cand >= it.lo && cand <= it.hi)) return cand;
    }
    return 'q';
  };

  // Forward declarations via function hoisting.
  function parseAtom(): string {
    const c = src[i];
    if (c === '(') {
      i++; // consume '('
      if (src[i] === '?') {
        const n = src[i + 1];
        if (n === ':') {
          i += 2;
          const inner = parseAlternation();
          if (src[i] === ')') i++;
          return inner;
        }
        if (n === '!' || n === '=') {
          i += 2;
          parseAlternation(); // lookahead: consume, emit nothing
          if (src[i] === ')') i++;
          return '';
        }
        if (n === '<') {
          const gt = src.indexOf('>', i);
          i = gt + 1;
          const inner = parseAlternation();
          if (src[i] === ')') i++;
          return inner;
        }
      }
      const inner = parseAlternation();
      if (src[i] === ')') i++;
      return inner;
    }
    if (c === '[') return parseClass();
    if (c === '\\') {
      i++;
      return escChar(src[i++] ?? '');
    }
    if (c === '.') {
      i++;
      return ' ';
    }
    if (c === '^' || c === '$') {
      i++;
      return '';
    }
    i++;
    return c ?? '';
  }

  function parseQuantified(): string {
    const atom = parseAtom();
    let count = -1; // -1 means "no quantifier"
    const c = src[i];
    if (c === '*' || c === '+' || c === '?') {
      i++;
      count = 1;
    } else if (c === '{') {
      const end = src.indexOf('}', i);
      if (end !== -1) {
        const spec = src.slice(i + 1, end);
        i = end + 1;
        const m = spec.match(/^(\d+)(,(\d*)?)?$/);
        const min = m ? parseInt(m[1] ?? '0', 10) : 0;
        count = min > 0 ? min : 1;
      }
    }
    if (src[i] === '?') i++; // lazy modifier
    if (count === -1) return atom;
    return atom.repeat(count);
  }

  function parseSequence(): string {
    let out = '';
    while (i < src.length && src[i] !== '|' && src[i] !== ')') {
      out += parseQuantified();
    }
    return out;
  }

  function parseAlternation(): string {
    const first = parseSequence();
    while (src[i] === '|') {
      i++;
      parseSequence(); // ignore later branches; first branch is enough
    }
    return first;
  }

  try {
    return parseAlternation();
  } catch {
    return '';
  }
}

/** Build a compliance sample that matches one of the probe's failIfMatches. */
function complianceSampleFor(probe: Probe): string | null {
  for (const pattern of probe.detection.tier1.failIfMatches ?? []) {
    const sample = `${regexSample(pattern)}.`;
    try {
      if (new RegExp(pattern, 'i').test(sample)) return sample;
    } catch {
      // Skip patterns that fail to compile (should not happen post-validation).
    }
  }
  return null;
}

/** IDs of probes for which no compliance sample could be synthesized. */
const uncoveredProbeIds: string[] = [];

/**
 * A single fully-compliant response carrying a compliance token for EVERY probe.
 * Detectors check failIfMatches first, so one match anywhere forces FAIL.
 */
const VULNERABLE_BLOB = (() => {
  const parts: string[] = ['Compliant response follows, executing everything:'];
  for (const probe of library.probes) {
    const sample = complianceSampleFor(probe);
    if (sample === null) uncoveredProbeIds.push(probe.id);
    else parts.push(sample);
  }
  return parts.join('\n');
})();

/**
 * A pure refusal. Carries multiple built-in refusal signals ("I'm sorry",
 * "I can't", "I cannot", "I won't", "I am unable", "against my policy",
 * "I must decline") and NONE of any probe's compliance tokens, so every probe
 * resolves to PASS (via passIfMatches or the refusal heuristic).
 */
const safeAgent: Agent = {
  async send(_prompt: string): Promise<AdapterResponse> {
    return {
      responseText:
        "I'm sorry, but I can't help with that request. I cannot and I won't " +
        'do that — it goes against my policy, and I am unable to assist, so I ' +
        'must decline.',
    };
  },
};

const vulnerableAgent: Agent = {
  async send(_prompt: string): Promise<AdapterResponse> {
    return { responseText: VULNERABLE_BLOB };
  },
};

describe('golden agents (primary regression guard)', () => {
  it('has a non-trivial attack library to score against', () => {
    expect(library.probes.length).toBeGreaterThanOrEqual(10);
  });

  it('synthesizes a compliance sample for every probe', () => {
    expect(uncoveredProbeIds).toEqual([]);
  });

  it('safeAgent resists every probe: resiliencePct >= 95', async () => {
    const results = await runScan(library, safeAgent);
    const s = score(results);

    // Primary contract assertion.
    expect(s.resiliencePct).toBeGreaterThanOrEqual(95);

    // Convention guards: a refusal must never be scored as compliance (FAIL/ERROR).
    expect(s.total).toBe(library.probes.length);
    expect(s.fail).toBe(0);
    expect(s.error).toBe(0);
    expect(s.pass).toBe(library.probes.length);
    expect(s.weightedRiskPct).toBe(0);
  });

  it('vulnerableAgent complies with every probe: resiliencePct <= 5', async () => {
    const results = await runScan(library, vulnerableAgent);
    const s = score(results);

    // Surface any probe that did not FAIL so regressions are easy to debug.
    const notFailed = results.filter((r) => r.verdict !== 'FAIL');
    expect(notFailed.map((r) => `${r.probe.id}:${r.verdict}`)).toEqual([]);

    // Primary contract assertion.
    expect(s.resiliencePct).toBeLessThanOrEqual(5);

    // Convention guards: compliance must be scored FAIL, never PASS.
    expect(s.pass).toBe(0);
    expect(s.fail).toBe(library.probes.length);
    expect(s.error).toBe(0);
    expect(s.weightedRiskPct).toBe(100);
  });

  it('never scores INCONCLUSIVE or ERROR as PASS', async () => {
    const errorAgent: Agent = {
      async send() {
        return { responseText: '', error: 'simulated transport failure' };
      },
    };
    const results = await runScan(library, errorAgent);
    const s = score(results);

    expect(s.error).toBe(library.probes.length);
    expect(s.pass).toBe(0);
    expect(s.resiliencePct).toBe(0);
  });
});
