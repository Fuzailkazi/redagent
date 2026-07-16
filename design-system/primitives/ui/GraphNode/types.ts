/**
 * GraphNode taxonomy - the node/status/edge type unions shared by the AIQ
 * graph and the Plans flow canvas. These were lifted out of the graph feature
 * so both surfaces render from one config (CLAUDE.md rule 11): the circular
 * node shape now recurs on two screens, so its taxonomy + visual config live
 * in @shared/ui.
 *
 * Pure value-lists + derived types only - no zod, no data. The graph feature's
 * data layer builds its zod enums from these tuples and re-exports the types
 * so existing graph imports keep resolving.
 */

/** The ten node types in the discovery taxonomy. */
export const NODE_TYPE_VALUES = [
  'Org',
  'OpenClaw',
  'Policy',
  'OpaPolicy',
  'ApiKey',
  'MCPAgent',
  'MCPServer',
  'MCPTool',
  'IntentPlan',
  'ToolInvocation',
] as const;

/** The ten relationship types an edge can carry. */
export const EDGE_REL_VALUES = [
  'owns',
  'hosts',
  'calls',
  'invokes',
  'executes',
  'plans',
  'authenticates',
  'governs',
  'secures',
  'compiles',
] as const;

export const STATUS_VALUES = ['healthy', 'warning', 'critical', 'idle'] as const;

export type GraphNodeType = (typeof NODE_TYPE_VALUES)[number];
export type GraphEdgeRel = (typeof EDGE_REL_VALUES)[number];
export type GraphStatus = (typeof STATUS_VALUES)[number];

/** A resource kind, used to suppress ungoverned/risk treatment on structure. */
export type GraphKind =
  | 'structure'
  | 'governance'
  | 'identity'
  | 'compute'
  | 'capability'
  | 'flow'
  | 'event';
