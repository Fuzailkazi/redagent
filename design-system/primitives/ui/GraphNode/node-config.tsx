/**
 * node-config - the single source of truth for how each of the ten node types
 * renders: radius, the monoline 24×24 glyph, and the FULL static Tailwind token
 * class strings per hue family. Shared by the AIQ graph and the Plans flow.
 *
 * Why static strings: Tailwind only generates utilities it can see as literal
 * text, so we cannot build class names like `fill-aq-node-${type}` at runtime.
 * Every utility a node can use is spelled out here as a complete literal and
 * picked by key - this keeps the token discipline (CLAUDE.md rules 6 + 11)
 * intact while letting one <GraphNodeShape> drive all node types.
 */
import type { ReactElement } from 'react';
import type { GraphNodeType, GraphKind, GraphStatus, GraphEdgeRel } from './types';

/** Per-type radius (px), ported from the prototype NODE_R. */
export const NODE_RADIUS: Record<GraphNodeType, number> = {
  Org: 30,
  OpenClaw: 27,
  MCPAgent: 26,
  MCPServer: 24,
  Policy: 22,
  IntentPlan: 21,
  MCPTool: 20,
  ApiKey: 19,
  OpaPolicy: 18,
  ToolInvocation: 16,
};

/** Static token class strings per node type. */
export type NodeColorClasses = {
  /** glyph + icon stroke colour */
  text: string;
  /** ring stroke colour (SVG) */
  stroke: string;
  /** ring border colour (HTML tile) */
  border: string;
  /** soft tile background (legend / detail tile) */
  bg: string;
  /** soft fill for the circle body (hero only) */
  fillSoft: string;
};

/** Per-type display config. */
export type NodeTypeConfig = {
  label: string;
  short: string;
  kind: GraphKind;
  hero?: boolean;
  color: NodeColorClasses;
  glyph: () => ReactElement;
};

// Each type maps to its aq-node-<hue> token, spelled out as full literals.
export const NODE_TYPES: Record<GraphNodeType, NodeTypeConfig> = {
  Org: {
    label: 'Organization',
    short: 'Org',
    kind: 'structure',
    color: {
      text: 'text-aq-node-org',
      stroke: 'stroke-aq-node-org/55',
      border: 'border-aq-node-org/40',
      bg: 'bg-aq-node-org/8',
      fillSoft: 'fill-aq-node-org/6',
    },
    glyph: () => (
      <>
        <path d="M5 21V6a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15" />
        <path d="M14 10h4a1 1 0 0 1 1 1v10" />
        <path d="M3 21h18M8 9h2M8 13h2M8 17h2" />
      </>
    ),
  },
  OpenClaw: {
    label: 'Security Framework',
    short: 'OpenClaw',
    kind: 'structure',
    color: {
      text: 'text-aq-node-framework',
      stroke: 'stroke-aq-node-framework/55',
      border: 'border-aq-node-framework/40',
      bg: 'bg-aq-node-framework/8',
      fillSoft: 'fill-aq-node-framework/6',
    },
    glyph: () => (
      <>
        <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3Z" />
        <rect x="9" y="11" width="6" height="5" rx="1" />
        <path d="M10.3 11V9.5a1.7 1.7 0 0 1 3.4 0V11" />
      </>
    ),
  },
  Policy: {
    label: 'Policy',
    short: 'Policy',
    kind: 'governance',
    color: {
      text: 'text-aq-node-policy',
      stroke: 'stroke-aq-node-policy/55',
      border: 'border-aq-node-policy/40',
      bg: 'bg-aq-node-policy/8',
      fillSoft: 'fill-aq-node-policy/6',
    },
    glyph: () => (
      <>
        <path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3Z" />
        <path d="m9 11.5 2 2 4-4" />
      </>
    ),
  },
  OpaPolicy: {
    label: 'OPA Bundle',
    short: 'OPA',
    kind: 'governance',
    color: {
      text: 'text-aq-node-bundle',
      stroke: 'stroke-aq-node-bundle/55',
      border: 'border-aq-node-bundle/40',
      bg: 'bg-aq-node-bundle/8',
      fillSoft: 'fill-aq-node-bundle/6',
    },
    glyph: () => (
      <>
        <path d="M8 6 3 12l5 6M16 6l5 6-5 6" />
        <path d="m13.5 5-3 14" />
      </>
    ),
  },
  ApiKey: {
    label: 'API Key',
    short: 'ApiKey',
    kind: 'identity',
    color: {
      text: 'text-aq-node-key',
      stroke: 'stroke-aq-node-key/55',
      border: 'border-aq-node-key/40',
      bg: 'bg-aq-node-key/8',
      fillSoft: 'fill-aq-node-key/6',
    },
    glyph: () => (
      <>
        <circle cx="8" cy="15" r="4.2" />
        <path d="m11 12 9-9M17 6l2.5 2.5M15 8l2.5 2.5" />
      </>
    ),
  },
  MCPAgent: {
    label: 'Agent',
    short: 'Agent',
    kind: 'compute',
    hero: true,
    color: {
      text: 'text-aq-node-agent',
      stroke: 'stroke-aq-node-agent/55',
      border: 'border-aq-node-agent/40',
      bg: 'bg-aq-node-agent/8',
      fillSoft: 'fill-aq-node-agent/6',
    },
    glyph: () => (
      <>
        <rect x="3.5" y="8" width="17" height="11" rx="2.5" />
        <path d="M12 3.5V8M8.5 13v1.8M15.5 13v1.8M2 13h1.5M20.5 13H22" />
        <circle cx="12" cy="3" r="1.3" fill="currentColor" stroke="none" />
      </>
    ),
  },
  MCPServer: {
    label: 'MCP Server',
    short: 'Server',
    kind: 'compute',
    color: {
      text: 'text-aq-node-server',
      stroke: 'stroke-aq-node-server/55',
      border: 'border-aq-node-server/40',
      bg: 'bg-aq-node-server/8',
      fillSoft: 'fill-aq-node-server/6',
    },
    glyph: () => (
      <>
        <rect x="3.5" y="4" width="17" height="6.5" rx="1.5" />
        <rect x="3.5" y="13.5" width="17" height="6.5" rx="1.5" />
        <path d="M7 7.2h.01M7 16.7h.01M11 7.2h4M11 16.7h4" />
      </>
    ),
  },
  MCPTool: {
    label: 'Tool',
    short: 'Tool',
    kind: 'capability',
    color: {
      text: 'text-aq-node-tool',
      stroke: 'stroke-aq-node-tool/55',
      border: 'border-aq-node-tool/40',
      bg: 'bg-aq-node-tool/8',
      fillSoft: 'fill-aq-node-tool/6',
    },
    glyph: () => (
      <>
        <path d="M14.5 6.5a3.8 3.8 0 0 0-5 5l-6 6 2.8 2.8 6-6a3.8 3.8 0 0 0 5-5l-2.4 2.4-2.5-.6-.6-2.5 2.4-2.4Z" />
      </>
    ),
  },
  IntentPlan: {
    label: 'Intent Plan',
    short: 'Plan',
    kind: 'flow',
    color: {
      text: 'text-aq-node-plan',
      stroke: 'stroke-aq-node-plan/55',
      border: 'border-aq-node-plan/40',
      bg: 'bg-aq-node-plan/8',
      fillSoft: 'fill-aq-node-plan/6',
    },
    glyph: () => (
      <>
        <circle cx="6" cy="6" r="2.4" />
        <circle cx="6" cy="18" r="2.4" />
        <path d="M6 8.4v7.2M8.4 6H14a3.5 3.5 0 0 1 0 7H9" />
        <path d="m11.5 10.5 2.5 2.5-2.5 2.5" />
      </>
    ),
  },
  ToolInvocation: {
    label: 'Invocation',
    short: 'Call',
    kind: 'event',
    color: {
      text: 'text-aq-node-invocation',
      stroke: 'stroke-aq-node-invocation/55',
      border: 'border-aq-node-invocation/40',
      bg: 'bg-aq-node-invocation/8',
      fillSoft: 'fill-aq-node-invocation/6',
    },
    glyph: () => (
      <>
        <path d="M2.5 12h4l2.5-7 4 14 2.5-7h6" />
      </>
    ),
  },
};

export const nodeRadius = (type: GraphNodeType): number => NODE_RADIUS[type] ?? 20;

// ── status palette (status dot fill + pill tone classes) ─────────────────────
export type StatusConfig = {
  label: string;
  /** fill class for the SVG status dot */
  dotFill: string;
  /** bg class for the status dot indicator (HTML pill) */
  dotBg: string;
  /** text + bg classes for the status pill */
  pillText: string;
  pillBg: string;
};

export const STATUS: Record<GraphStatus, StatusConfig> = {
  healthy: {
    label: 'Healthy',
    dotFill: 'fill-aq-good',
    dotBg: 'bg-aq-good',
    pillText: 'text-aq-good',
    pillBg: 'bg-aq-good-soft',
  },
  warning: {
    label: 'Warning',
    dotFill: 'fill-aq-warn',
    dotBg: 'bg-aq-warn',
    pillText: 'text-aq-warn',
    pillBg: 'bg-aq-warn-soft',
  },
  critical: {
    label: 'Critical',
    dotFill: 'fill-aq-bad',
    dotBg: 'bg-aq-bad',
    pillText: 'text-aq-bad',
    pillBg: 'bg-aq-bad-soft',
  },
  idle: {
    label: 'Idle',
    dotFill: 'fill-aq-ink-muted',
    dotBg: 'bg-aq-ink-muted',
    pillText: 'text-aq-ink-muted',
    pillBg: 'bg-aq-zebra',
  },
};

// ── edge relationship styling (static token stroke classes + geometry) ───────
export type GraphEdgeRelKey = GraphEdgeRel;

export type EdgeStyle = {
  /** static stroke token class */
  stroke: string;
  width: number;
  dash?: string;
};

export const EDGE_STYLE: Record<GraphEdgeRelKey, EdgeStyle> = {
  owns: { stroke: 'stroke-aq-border', width: 1.3 },
  hosts: { stroke: 'stroke-aq-border-strong', width: 1.4 },
  calls: { stroke: 'stroke-aq-border-strong', width: 1.5 },
  invokes: { stroke: 'stroke-aq-edge-flow', width: 1.5 },
  executes: { stroke: 'stroke-aq-edge-flow', width: 1.5, dash: '1 5' },
  plans: { stroke: 'stroke-aq-edge-flow', width: 1.5 },
  authenticates: { stroke: 'stroke-aq-edge-auth', width: 1.5, dash: '1 5' },
  governs: { stroke: 'stroke-aq-edge-govern', width: 1.6, dash: '5 5' },
  secures: { stroke: 'stroke-aq-edge-secure', width: 1.5, dash: '5 5' },
  compiles: { stroke: 'stroke-aq-border-strong', width: 1.4, dash: '2 4' },
};
