import { test, expect } from "vitest";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/config.js";

test("loadConfig resolves ${ENV_VAR} header references from process.env", async () => {
  process.env.ARMORIQ_TEST_TOKEN = "secret-value";
  const dir = await mkdtemp(join(tmpdir(), "armoriq-config-"));
  const configPath = join(dir, "config.json");
  await writeFile(
    configPath,
    JSON.stringify({
      target: {
        url: "http://localhost:4001/chat",
        headers: { Authorization: "${ARMORIQ_TEST_TOKEN}" },
        responsePath: "reply",
      },
      library: "./library.json",
    }),
  );
  try {
    const { config, libraryPath } = await loadConfig(configPath);
    expect(config.target.headers.Authorization).toBe("secret-value");
    expect(libraryPath).toBe(join(dir, "library.json"));
  } finally {
    delete process.env.ARMORIQ_TEST_TOKEN;
    await rm(dir, { recursive: true, force: true });
  }
});

test("loadConfig throws when a header references an unset env var", async () => {
  const dir = await mkdtemp(join(tmpdir(), "armoriq-config-"));
  const configPath = join(dir, "config.json");
  await writeFile(
    configPath,
    JSON.stringify({
      target: {
        url: "http://localhost:4001/chat",
        headers: { Authorization: "${ARMORIQ_DEFINITELY_UNSET}" },
        responsePath: "reply",
      },
      library: "./library.json",
    }),
  );
  try {
    await expect(loadConfig(configPath)).rejects.toThrow(/unset env var/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
