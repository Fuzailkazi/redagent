/**
 * @armoriq/reporting — report builders for ArmorIQ red-teaming scans.
 *
 * Assembles a ScanResult (with provenance metadata) and renders it as JSON or
 * Markdown. Pure refactor of the Phase 0 typescript/src/report.ts — output is
 * byte-identical; the only structural change is that the score is supplied by
 * the caller (the engine's scorer) instead of being imported here, so this
 * package depends solely on @armoriq/schema.
 */

export {
  buildScanResult,
  buildJsonReport,
  buildMarkdownReport,
  getEngineVersion,
  hashTargetConfig,
  type BuildScanResultArgs,
} from "./report.js";
