/**
 * Target-config loader + validation (Phase 0: JSON only, zero runtime deps).
 *
 * The reproducibility hash (targetConfigHash) lives in report.ts
 * (hashTargetConfig) so provenance stays with the report builder.
 *
 * Secrets by reference only: header values keep their literal ${ENV_VAR}
 * placeholders here; they are resolved at request time by the adapter.
 */

import { readFileSync } from 'node:fs';
import type { Config, RunConfig, TargetConfig } from './types.js';

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

const VALID_ENVIRONMENTS: readonly TargetConfig['environment'][] = [
  'production',
  'staging',
  'development',
];

/** Defaults applied when run.* fields are omitted. Never DoS: bounded + delayed. */
export const DEFAULT_RUN: Required<RunConfig> = {
  concurrency: 4,
  delaySeconds: 0.5,
  timeoutMs: 30000,
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function requireNonEmptyString(value: unknown, where: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ConfigValidationError(`${where} must be a non-empty string`);
  }
  return value;
}

/** Validate an already-parsed config object. Throws on malformed data. */
export function validateConfig(raw: unknown): Config {
  if (!isPlainObject(raw)) {
    throw new ConfigValidationError('config root must be an object');
  }
  if (!isPlainObject(raw.target)) {
    throw new ConfigValidationError('config.target must be an object');
  }

  const t = raw.target;
  const name = requireNonEmptyString(t.name, 'config.target.name');
  const url = requireNonEmptyString(t.url, 'config.target.url');
  try {
    void new URL(url);
  } catch {
    throw new ConfigValidationError(`config.target.url "${url}" is not a valid URL`);
  }

  const environment =
    t.environment === undefined ? 'staging' : t.environment;
  if (
    typeof environment !== 'string' ||
    !VALID_ENVIRONMENTS.includes(environment as TargetConfig['environment'])
  ) {
    throw new ConfigValidationError(
      `config.target.environment "${String(environment)}" is invalid (expected one of ${VALID_ENVIRONMENTS.join(', ')})`,
    );
  }

  if (t.headers !== undefined) {
    if (!isPlainObject(t.headers)) {
      throw new ConfigValidationError('config.target.headers must be an object');
    }
    for (const [k, v] of Object.entries(t.headers)) {
      if (typeof v !== 'string') {
        throw new ConfigValidationError(`config.target.headers.${k} must be a string`);
      }
    }
  }

  if (t.bodyTemplate === undefined) {
    throw new ConfigValidationError('config.target.bodyTemplate is required');
  }

  const responsePath = requireNonEmptyString(
    t.responsePath,
    'config.target.responsePath',
  );

  if (t.method !== undefined && typeof t.method !== 'string') {
    throw new ConfigValidationError('config.target.method must be a string');
  }

  const target: TargetConfig = {
    name,
    environment: environment as TargetConfig['environment'],
    url,
    method: typeof t.method === 'string' ? t.method : 'POST',
    headers: (t.headers as Record<string, string> | undefined) ?? {},
    bodyTemplate: t.bodyTemplate,
    responsePath,
  };

  const runRaw = isPlainObject(raw.run) ? raw.run : {};
  const run: RunConfig = {
    concurrency:
      typeof runRaw.concurrency === 'number' && runRaw.concurrency > 0
        ? Math.floor(runRaw.concurrency)
        : DEFAULT_RUN.concurrency,
    delaySeconds:
      typeof runRaw.delaySeconds === 'number' && runRaw.delaySeconds >= 0
        ? runRaw.delaySeconds
        : DEFAULT_RUN.delaySeconds,
    timeoutMs:
      typeof runRaw.timeoutMs === 'number' && runRaw.timeoutMs > 0
        ? Math.floor(runRaw.timeoutMs)
        : DEFAULT_RUN.timeoutMs,
  };

  return { target, run };
}

/** Read + parse + validate the target config from disk (JSON only in Phase 0). */
export function loadConfig(path: string): Config {
  if (/\.ya?ml$/i.test(path)) {
    throw new ConfigValidationError(
      'YAML config is not supported in Phase 0 (zero runtime deps); use JSON.',
    );
  }
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch (err) {
    throw new ConfigValidationError(
      `cannot read config at ${path}: ${(err as Error).message}`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new ConfigValidationError(
      `config at ${path} is not valid JSON: ${(err as Error).message}`,
    );
  }
  return validateConfig(parsed);
}
