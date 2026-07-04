/**
 * Attack-library loader + hand-rolled validation (Phase 0, zero runtime deps).
 *
 * Probes are DATA, never code: the engine reads and validates
 * attacks/attack_library.json and fails fast on anything malformed. A bad probe
 * must never silently reach the runner and skew a scan.
 */

import { readFileSync } from 'node:fs';
import type {
  AttackLibrary,
  Detection,
  Probe,
  Severity,
  Tier1Detection,
} from './types.js';

const VALID_SEVERITIES: readonly Severity[] = ['critical', 'high', 'medium', 'low'];
const VALID_MODES: readonly Tier1Detection['mode'][] = [
  'regex',
  'contains',
  'refusal-heuristic',
];
// OWASP Top 10 for Agentic Applications ids, 01..10. The contract documents the
// "ASI" prefix but the source-of-truth attack_library.json uses "AAI"; accept
// both so the real library loads while still rejecting malformed ids.
const OWASP_RE = /^A[AS]I(0[1-9]|10)$/;

export class LibraryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LibraryValidationError';
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function requireNonEmptyString(value: unknown, where: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new LibraryValidationError(`${where} must be a non-empty string`);
  }
  return value;
}

function requireStringArray(value: unknown, where: string): string[] {
  if (!Array.isArray(value) || value.some((s) => typeof s !== 'string')) {
    throw new LibraryValidationError(`${where} must be an array of strings`);
  }
  return value as string[];
}

function validateTier1(raw: unknown, where: string): Tier1Detection {
  if (!isPlainObject(raw)) {
    throw new LibraryValidationError(`${where} must be an object`);
  }
  const mode = raw.mode;
  if (
    typeof mode !== 'string' ||
    !VALID_MODES.includes(mode as Tier1Detection['mode'])
  ) {
    throw new LibraryValidationError(
      `${where}.mode "${String(mode)}" is invalid (expected one of ${VALID_MODES.join(', ')})`,
    );
  }

  const tier1: Tier1Detection = { mode: mode as Tier1Detection['mode'] };

  if (raw.failIfMatches !== undefined) {
    tier1.failIfMatches = requireStringArray(
      raw.failIfMatches,
      `${where}.failIfMatches`,
    );
  }
  if (raw.passIfMatches !== undefined) {
    tier1.passIfMatches = requireStringArray(
      raw.passIfMatches,
      `${where}.passIfMatches`,
    );
  }

  // Regex patterns must compile (engine adds the case-insensitive "i" flag).
  if (mode === 'regex') {
    for (const bucket of ['failIfMatches', 'passIfMatches'] as const) {
      for (const pattern of tier1[bucket] ?? []) {
        try {
          void new RegExp(pattern, 'i');
        } catch (err) {
          throw new LibraryValidationError(
            `${where}.${bucket} contains an invalid regex ${JSON.stringify(pattern)}: ${(err as Error).message}`,
          );
        }
      }
    }
  }

  return tier1;
}

/** Validate a single probe object, throwing on the first problem found. */
function validateProbe(raw: unknown, index: number): Probe {
  const at = `probes[${index}]`;
  if (!isPlainObject(raw)) {
    throw new LibraryValidationError(`${at} must be an object`);
  }

  const id = requireNonEmptyString(raw.id, `${at}.id`);
  const category = requireNonEmptyString(raw.category, `${at}.category`);
  const owasp = requireNonEmptyString(raw.owasp, `${at}.owasp`);
  const prompt = requireNonEmptyString(raw.prompt, `${at}.prompt`);
  const severity = requireNonEmptyString(raw.severity, `${at}.severity`);

  if (!OWASP_RE.test(owasp)) {
    throw new LibraryValidationError(
      `${at}.owasp "${owasp}" is invalid (expected ASI01..ASI10)`,
    );
  }
  if (!VALID_SEVERITIES.includes(severity as Severity)) {
    throw new LibraryValidationError(
      `${at}.severity "${severity}" is invalid (expected one of ${VALID_SEVERITIES.join(', ')})`,
    );
  }

  if (!isPlainObject(raw.detection)) {
    throw new LibraryValidationError(`${at}.detection must be an object`);
  }
  const detection: Detection = {
    tier1: validateTier1(raw.detection.tier1, `${at}.detection.tier1`),
  };

  const probe: Probe = {
    id,
    category,
    owasp,
    severity: severity as Severity,
    prompt,
    detection,
  };

  if (raw.tags !== undefined) {
    probe.tags = requireStringArray(raw.tags, `${at}.tags`);
  }

  return probe;
}

/** Validate an already-parsed attack-library object. Throws on malformed data. */
export function validateLibrary(data: unknown): AttackLibrary {
  if (!isPlainObject(data)) {
    throw new LibraryValidationError('library root must be an object');
  }

  const version = requireNonEmptyString(data.version, 'library.version');

  if (!Array.isArray(data.probes)) {
    throw new LibraryValidationError('library.probes must be an array');
  }
  if (data.probes.length === 0) {
    throw new LibraryValidationError('library.probes must not be empty');
  }

  const probes = data.probes.map((p, i) => validateProbe(p, i));

  const seen = new Set<string>();
  for (const probe of probes) {
    if (seen.has(probe.id)) {
      throw new LibraryValidationError(`duplicate probe id "${probe.id}"`);
    }
    seen.add(probe.id);
  }

  return { version, probes };
}

/** Read + parse + validate the attack library from disk. */
export function loadLibrary(path: string): AttackLibrary {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch (err) {
    throw new LibraryValidationError(
      `cannot read attack library at ${path}: ${(err as Error).message}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new LibraryValidationError(
      `attack library at ${path} is not valid JSON: ${(err as Error).message}`,
    );
  }

  return validateLibrary(parsed);
}
