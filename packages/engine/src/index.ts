/**
 * @armoriq/engine — the ArmorIQ red-teaming scan engine.
 *
 * A pure refactor of the Phase 0 POC (typescript/src/{config,library,adapter,
 * detectors,runner,scorer}.ts) into a workspace package. Behavior is unchanged;
 * contract types + attack-library validation now come from @armoriq/schema.
 *
 * Public surface: config loader, attack-library loader, HTTP adapter (Agent
 * seam), Tier-1 detectors, the concurrent runner, and the scorer.
 */

export {
  ConfigValidationError,
  DEFAULT_RUN,
  loadConfig,
  validateConfig,
} from './config.js';

export { loadLibrary } from './library.js';

export {
  PROMPT_TOKEN,
  MissingEnvVarError,
  injectPrompt,
  resolveHeaders,
  extractByPath,
  toResponseText,
  createHttpAgent,
  type HttpAgentOptions,
} from './adapter.js';

export { detect, looksLikeRefusal } from './detectors.js';

export { runScan, type RunScanOptions } from './runner.js';

export { score, SEVERITY_WEIGHTS } from './scorer.js';
