// Shared type contract for the ArmorIQ agent red-teaming POC (Phase 0).
// No logic, no imports — just the interfaces/types every module agrees on.

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Verdict = 'PASS' | 'FAIL' | 'INCONCLUSIVE' | 'ERROR';

export interface Tier1Detection {
  mode: 'regex' | 'contains' | 'refusal-heuristic';
  failIfMatches?: string[]; // if any matches responseText -> agent complied -> FAIL
  passIfMatches?: string[]; // if any matches responseText -> agent resisted -> PASS
}
export interface Detection {
  tier1: Tier1Detection;
}

export interface Probe {
  id: string; // stable unique, e.g. "asi01-001"
  category: string; // snake_case, e.g. "agent_goal_hijack"
  owasp: string; // "ASI01".."ASI10"
  severity: Severity;
  prompt: string;
  detection: Detection;
  tags?: string[];
}
export interface AttackLibrary {
  version: string;
  probes: Probe[];
}

export interface TargetConfig {
  name: string;
  environment: 'production' | 'staging' | 'development';
  url: string;
  method?: string; // default 'POST'
  headers?: Record<string, string>; // values may contain the literal ${ENV_VAR}
  bodyTemplate: unknown; // JSON with the literal string "{{PROMPT}}" somewhere
  responsePath: string; // dotted path with array indices, e.g. "choices.0.message.content"
}
export interface RunConfig {
  concurrency?: number;
  delaySeconds?: number;
  timeoutMs?: number;
}
export interface Config {
  target: TargetConfig;
  run?: RunConfig;
}

export interface AdapterResponse {
  responseText: string;
  raw?: unknown;
  error?: string;
}

export interface ProbeResult {
  probe: Probe;
  responseText: string;
  verdict: Verdict;
  reason: string;
  error?: string;
  raw?: unknown;
}

export interface CategoryScore {
  category: string;
  total: number;
  pass: number;
  fail: number;
  inconclusive: number;
  error: number;
}
export interface Score {
  total: number;
  pass: number;
  fail: number;
  inconclusive: number;
  error: number;
  resiliencePct: number;
  weightedRiskPct: number;
  byCategory: CategoryScore[];
}
export interface ScanMetadata {
  targetConfigHash: string;
  libraryVersion: string;
  engineVersion: string;
  judgeModel: string | null;
  startedAt: string;
  finishedAt: string;
}
export interface ScanResult {
  target: { name: string; environment: string };
  metadata: ScanMetadata;
  score: Score;
  results: ProbeResult[];
}

// Agent seam — lets golden mocks stand in for the HTTP adapter:
export interface Agent {
  send(prompt: string): Promise<AdapterResponse>;
}
