/**
 * GraphNodeShape - the portable circular-node body shared by the AIQ graph and
 * the Plans flow canvas. A node is a circular body (ring + soft/white fill), a
 * centered monoline glyph, an optional status dot, an optional governance crown,
 * an optional count badge, and a two-line label (name + mono sublabel).
 *
 * This is presentation-only and fully parameterised - callers resolve the hue
 * class strings (from node-config) and pass them in, so no graph-domain types
 * leak into the shape. It owns the React Flow measurement box + centered
 * invisible handles so edges anchor centre-to-centre behind the opaque body.
 */
import { memo, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { Handle, Position } from '@xyflow/react';

export type GraphNodeShapeProps = {
  /** circle radius in px (drives the whole geometry) */
  radius: number;
  /** ring stroke token class, e.g. `stroke-aq-node-plan/55` */
  ringStrokeClass: string;
  /** glyph + icon stroke token class, e.g. `text-aq-node-plan` */
  glyphTextClass: string;
  /** the monoline glyph children, drawn into a 24×24 viewBox */
  glyph: ReactNode;
  /** hero nodes layer a soft colour wash on the white base */
  isHero?: boolean;
  /** soft body fill token class (hero only), e.g. `fill-aq-node-agent/6` */
  fillSoftClass?: string;
  /** status-dot fill token class, e.g. `fill-aq-good`. Omit to hide the dot. */
  statusDotFillClass?: string;
  /** draw the governance crown above the node */
  governed?: boolean;
  /** optional live-count badge (bottom-right) */
  badge?: number;
  /** badge fill token class (defaults to the status-dot fill) */
  badgeFillClass?: string;
  /** primary label under the node */
  name: string;
  /** mono uppercase sublabel under the name */
  sublabel: string;
  /** selection halo */
  selected?: boolean;
  /** dimmed (outside blast radius / not in focus) */
  dim?: boolean;
  /** spotlight anchor for the product tour (set on the root box) */
  dataTour?: string;
};

function GraphNodeShapeImpl({
  radius: r,
  ringStrokeClass,
  glyphTextClass,
  glyph,
  isHero = false,
  fillSoftClass,
  statusDotFillClass,
  governed = false,
  badge,
  badgeFillClass,
  name,
  sublabel,
  selected = false,
  dim = false,
  dataTour,
}: GraphNodeShapeProps): ReactElement {
  // Box big enough for halo (r+8), label (~r+40 below), crown (r+12 above).
  const pad = 14;
  const half = r + pad;
  const boxTop = r + 16; // extra room above for crown
  const boxBottom = r + 46; // room for two-line label
  const vbX = -half;
  const vbY = -boxTop;
  const vbW = half * 2;
  const vbH = boxTop + boxBottom;

  const glyphSize = r * 1.06;

  // The node reports a real 2r×2r box so React Flow can measure it and lay out
  // edges (a 0×0 node makes React Flow drop every connected edge). The visual
  // body is an overflow-visible SVG whose (0,0) is pinned to the box CENTER, so
  // with nodeOrigin=[0.5,0.5] the node position IS the circle centre and edges
  // anchor centre-to-centre.
  const boxSize = r * 2;
  const svgLeft = r - half;
  const svgTop = r - boxTop;

  // Centered, invisible handles - both source and target at the box centre so
  // React Flow anchors every edge at the circle centre.
  const handleStyle: CSSProperties = {
    opacity: 0,
    width: 1,
    height: 1,
    minWidth: 0,
    minHeight: 0,
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    border: 'none',
    background: 'transparent',
    pointerEvents: 'none',
  };

  return (
    <div
      data-tour={dataTour}
      className={[
        'aq-graph-node transition-opacity duration-200',
        dim ? 'opacity-30' : 'opacity-100',
      ].join(' ')}
      style={{ width: boxSize, height: boxSize, position: 'relative', pointerEvents: 'none' }}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} isConnectable={false} style={handleStyle} />
      <svg
        width={vbW}
        height={vbH}
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        style={{
          position: 'absolute',
          left: svgLeft,
          top: svgTop,
          overflow: 'visible',
          pointerEvents: 'auto',
          cursor: 'pointer',
        }}
      >
        {/* selection halo */}
        {selected ? (
          <>
            <circle
              r={r + 8}
              fill="none"
              className="stroke-aq-edge-hot"
              strokeWidth={2}
              opacity={0.9}
            />
            <circle r={r + 8} className="fill-aq-edge-hot" opacity={0.06} />
          </>
        ) : null}

        {/* body - opaque white base occludes edges + dotted background behind it.
            Hero nodes layer a soft colour wash on top so they read as tinted. */}
        <circle
          r={r}
          className={['fill-aq-surface', ringStrokeClass].join(' ')}
          strokeWidth={isHero ? 2.4 : 1.8}
        />
        {isHero && fillSoftClass ? (
          <circle r={r} className={`${fillSoftClass} stroke-none`} />
        ) : null}

        {/* glyph */}
        <svg
          x={-glyphSize / 2}
          y={-glyphSize / 2}
          width={glyphSize}
          height={glyphSize}
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth={1.85}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`${glyphTextClass} stroke-current`}
        >
          {glyph}
        </svg>

        {/* status dot */}
        {statusDotFillClass ? (
          <g transform={`translate(${r * 0.72},${-r * 0.72})`}>
            <circle r={5.5} className="fill-aq-surface" />
            <circle r={3.8} className={statusDotFillClass} />
          </g>
        ) : null}

        {/* governance crown */}
        {governed ? (
          <g transform={`translate(0,${-r - 8})`}>
            <path
              d="M-6 4 L-6 0 L-3 2 L0 -2 L3 2 L6 0 L6 4 Z"
              className="fill-aq-node-governed stroke-aq-surface"
              strokeWidth={0.8}
              strokeLinejoin="round"
            />
          </g>
        ) : null}

        {/* count badge */}
        {typeof badge === 'number' ? (
          <g transform={`translate(${r * 0.74},${r * 0.74})`}>
            <circle
              r={7}
              className={`${badgeFillClass ?? statusDotFillClass ?? 'fill-aq-ink'} stroke-aq-surface`}
              strokeWidth={1.4}
            />
            <text
              textAnchor="middle"
              dy="2.6"
              fontSize={8}
              fontWeight={700}
              className="fill-aq-surface font-mono"
            >
              {badge}
            </text>
          </g>
        ) : null}

        {/* label */}
        <text
          textAnchor="middle"
          y={r + 16}
          fontSize={11.5}
          fontWeight={600}
          className="fill-aq-ink"
          style={{ pointerEvents: 'none' }}
        >
          {name.length > 22 ? `${name.slice(0, 21)}…` : name}
        </text>
        <text
          textAnchor="middle"
          y={r + 29}
          fontSize={9.5}
          fontWeight={500}
          className="fill-aq-ink-muted font-mono"
          style={{ pointerEvents: 'none', textTransform: 'uppercase', letterSpacing: '0.04em' }}
        >
          {sublabel}
        </text>
      </svg>
    </div>
  );
}

export const GraphNodeShape = memo(GraphNodeShapeImpl);
