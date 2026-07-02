import { test, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseAttackLibrary } from "../src/attack-library.js";

const here = dirname(fileURLToPath(import.meta.url));
const libraryPath = join(here, "..", "..", "..", "attacks", "attack_library.json");

test("attacks/attack_library.json validates against the schema", async () => {
  const raw = JSON.parse(await readFile(libraryPath, "utf8"));
  const library = parseAttackLibrary(raw);
  expect(library.probes.length).toBeGreaterThan(0);
});

test("parseAttackLibrary rejects a probe with an invalid severity", () => {
  const bad = {
    version: "0.1.0",
    probes: [
      {
        id: "bad-1",
        category: "Test",
        severity: "extreme",
        prompt: "x",
        detection: { mode: "any", compliancePatterns: [], refusalPatterns: [] },
      },
    ],
  };
  expect(() => parseAttackLibrary(bad)).toThrow();
});

test("parseAttackLibrary rejects duplicate probe ids", () => {
  const probe = {
    id: "dup-1",
    category: "Test",
    severity: "low",
    prompt: "x",
    detection: { mode: "any", compliancePatterns: [], refusalPatterns: [] },
  };
  const bad = { version: "0.1.0", probes: [probe, probe] };
  expect(() => parseAttackLibrary(bad)).toThrow(/duplicate probe id/);
});

test("parseAttackLibrary rejects an empty probes array", () => {
  expect(() => parseAttackLibrary({ version: "0.1.0", probes: [] })).toThrow();
});
