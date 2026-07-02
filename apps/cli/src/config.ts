import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { parseRedTeamConfig } from "@armoriq/schema";
import type { RedTeamConfig } from "@armoriq/schema";

const ENV_REF = /^\$\{([A-Z0-9_]+)\}$/;

function resolveEnvRefs(headers: Record<string, string>): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const match = ENV_REF.exec(value);
    if (match) {
      const envValue = process.env[match[1]];
      if (envValue === undefined) {
        throw new Error(`Config error: header "${key}" references unset env var ${match[1]}`);
      }
      resolved[key] = envValue;
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

export async function loadConfig(configPath: string): Promise<{ config: RedTeamConfig; libraryPath: string }> {
  const absConfigPath = resolve(process.cwd(), configPath);
  const raw = JSON.parse(await readFile(absConfigPath, "utf8"));
  const parsed = parseRedTeamConfig(raw);

  const config: RedTeamConfig = {
    ...parsed,
    target: { ...parsed.target, headers: resolveEnvRefs(parsed.target.headers) },
  };

  const libraryPath = resolve(dirname(absConfigPath), config.library);
  return { config, libraryPath };
}
