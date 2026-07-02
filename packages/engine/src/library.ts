import { readFile } from "node:fs/promises";
import { parseAttackLibrary } from "@armoriq/schema";
import type { AttackLibrary } from "@armoriq/schema";

export async function loadLibrary(libraryPath: string): Promise<AttackLibrary> {
  const raw = JSON.parse(await readFile(libraryPath, "utf8"));
  return parseAttackLibrary(raw);
}
