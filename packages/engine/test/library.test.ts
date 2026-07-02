import { test, expect } from "vitest";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadLibrary } from "../src/library.js";

test("loadLibrary reads and validates a library file from disk", async () => {
  const dir = await mkdtemp(join(tmpdir(), "armoriq-lib-"));
  const path = join(dir, "library.json");
  await writeFile(
    path,
    JSON.stringify({
      version: "9.9.9",
      probes: [
        {
          id: "p1",
          category: "Test",
          severity: "low",
          prompt: "hi",
          detection: { mode: "any", compliancePatterns: ["x"], refusalPatterns: [] },
        },
      ],
    }),
  );
  try {
    const library = await loadLibrary(path);
    expect(library.version).toBe("9.9.9");
    expect(library.probes).toHaveLength(1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("loadLibrary rejects a library with an empty probes array", async () => {
  const dir = await mkdtemp(join(tmpdir(), "armoriq-lib-"));
  const path = join(dir, "library.json");
  await writeFile(path, JSON.stringify({ version: "1.0.0", probes: [] }));
  try {
    await expect(loadLibrary(path)).rejects.toThrow();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
