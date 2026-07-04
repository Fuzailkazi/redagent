import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LibraryValidationError, validateLibrary } from '../src/index.js';

// The real, shared attack library (data — never edited by the refactor).
const LIBRARY_PATH = fileURLToPath(
  new URL('../../../attacks/attack_library.json', import.meta.url),
);

function loadReal(): unknown {
  return JSON.parse(readFileSync(LIBRARY_PATH, 'utf8'));
}

describe('validateLibrary — real library', () => {
  it('parses the real attack_library.json (30 probes)', () => {
    const lib = validateLibrary(loadReal());
    expect(lib.version).toBe('0.1.0');
    expect(lib.probes).toHaveLength(30);
    // ids are unique
    expect(new Set(lib.probes.map((p) => p.id)).size).toBe(30);
  });
});

describe('validateLibrary — malformed input', () => {
  function withFirstProbe(mutate: (probe: any) => void): unknown {
    const lib = loadReal() as { version: string; probes: any[] };
    mutate(lib.probes[0]);
    return lib;
  }

  it('rejects a bad severity', () => {
    const bad = withFirstProbe((p) => {
      p.severity = 'catastrophic';
    });
    expect(() => validateLibrary(bad)).toThrow(LibraryValidationError);
  });

  it('rejects a bad owasp id', () => {
    const bad = withFirstProbe((p) => {
      p.owasp = 'ASI99';
    });
    expect(() => validateLibrary(bad)).toThrow(LibraryValidationError);
  });

  it('rejects an invalid regex pattern', () => {
    const bad = withFirstProbe((p) => {
      p.detection.tier1.mode = 'regex';
      p.detection.tier1.failIfMatches = ['('];
    });
    expect(() => validateLibrary(bad)).toThrow(LibraryValidationError);
  });

  it('rejects duplicate probe ids', () => {
    const lib = loadReal() as { version: string; probes: any[] };
    lib.probes[1].id = lib.probes[0].id;
    expect(() => validateLibrary(lib)).toThrow(LibraryValidationError);
  });

  it('rejects an empty probes array', () => {
    const bad = { version: '0.1.0', probes: [] };
    expect(() => validateLibrary(bad)).toThrow(LibraryValidationError);
  });

  it('rejects a non-object root', () => {
    expect(() => validateLibrary(null)).toThrow(LibraryValidationError);
  });
});
