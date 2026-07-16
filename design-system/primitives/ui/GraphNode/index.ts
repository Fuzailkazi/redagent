/**
 * @shared/ui/GraphNode - the portable circular graph node: a presentational
 * shape (GraphNodeShape) plus the shared node taxonomy + visual config. Used by
 * the AIQ graph and the Plans flow canvas so both render identical nodes.
 */
export { GraphNodeShape } from './GraphNodeShape';
export type { GraphNodeShapeProps } from './GraphNodeShape';

export { NODE_TYPES, NODE_RADIUS, nodeRadius, STATUS, EDGE_STYLE } from './node-config';
export type {
  NodeColorClasses,
  NodeTypeConfig,
  StatusConfig,
  EdgeStyle,
  GraphEdgeRelKey,
} from './node-config';

export { NODE_TYPE_VALUES, EDGE_REL_VALUES, STATUS_VALUES } from './types';
export type { GraphNodeType, GraphEdgeRel, GraphStatus, GraphKind } from './types';
