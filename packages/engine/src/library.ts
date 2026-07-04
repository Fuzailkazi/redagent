/**
 * Attack-library loader (Phase 1: reads from disk, validates via @armoriq/schema).
 *
 * Probes are DATA, never code: the engine reads and validates
 * attacks/attack_library.json and fails fast on anything malformed. A bad probe
 * must never silently reach the runner and skew a scan.
 *
 * Validation (non-empty version, non-empty probes, unique ids, regex-mode
 * patterns must compile) is owned by @armoriq/schema's validateLibrary; the
 * hand-rolled Phase 0 validator has been retired in favor of the shared zod
 * schema. This loader only handles the filesystem read + JSON parse.
 */

import { readFileSync } from 'node:fs';
import {
  LibraryValidationError,
  validateLibrary,
  type AttackLibrary,
} from '@armoriq/schema';

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
