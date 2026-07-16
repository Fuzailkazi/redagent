/**
 * MatrixLoader — animated 5x5 dot-matrix indicator using ArmorIQ brand orange.
 *
 * Colors are resolved from CSS variables so the component works correctly in
 * both light and dark themes without any JavaScript theme detection.
 *
 * Four animation patterns:
 *   - 'wave'    (default) smooth cosine wave sweeping diagonally — generic loading
 *   - 'pulse'   radial rings expanding from center — analysis / computation
 *   - 'sweep'   diagonal comet TL to BR — thinking / AI processing
 *   - 'orbit'   comet racing around outer ring — data fetch / scanning
 *
 * Three sizes:
 *   - 'sm'  20px matrix
 *   - 'md'  28px matrix (default)
 *   - 'lg'  40px matrix
 */
import { useEffect, useRef, type ReactElement } from 'react';

export type LoaderPattern = 'wave' | 'pulse' | 'sweep' | 'orbit';
export type LoaderSize = 'sm' | 'md' | 'lg';

export type MatrixLoaderProps = {
  pattern?: LoaderPattern;
  size?: LoaderSize;
  className?: string;
};

const SIZE_CONFIG: Record<LoaderSize, { cell: number; gap: number; px: number }> = {
  sm: { cell: 3, gap: 1, px: 19 },
  md: { cell: 4, gap: 1.5, px: 27 },
  lg: { cell: 6, gap: 2, px: 40 },
};

const GRID = 5;
const NS = 'http://www.w3.org/2000/svg';

// Perimeter ring for the 'orbit' animation (16 cells, clockwise)
const PERIM: [number, number][] = [];
for (let c = 0; c < 5; c++) PERIM.push([0, c]);
for (let r = 1; r < 5; r++) PERIM.push([r, 4]);
for (let c = 3; c >= 0; c--) PERIM.push([4, c]);
for (let r = 3; r >= 1; r--) PERIM.push([r, 0]);
const PLEN = PERIM.length;
const PERIM_IDX: number[][] = Array.from({ length: GRID }, () => Array(GRID).fill(-1));
PERIM.forEach(([r, c], i) => {
  PERIM_IDX[r][c] = i;
});

type FrameFn = (t: number) => number[][];

const FRAMES: Record<LoaderPattern, FrameFn> = {
  wave(t) {
    const grid: number[][] = [];
    for (let r = 0; r < GRID; r++) {
      grid[r] = [];
      for (let c = 0; c < GRID; c++) {
        const phase = (r + c) / ((GRID - 1) * 2) - t;
        const val = (Math.cos(phase * Math.PI * 2) + 1) / 2;
        grid[r][c] = Math.pow(val, 1.6);
      }
    }
    return grid;
  },
  pulse(t) {
    const maxR = Math.sqrt(8);
    const grid: number[][] = [];
    for (let r = 0; r < GRID; r++) {
      grid[r] = [];
      for (let c = 0; c < GRID; c++) {
        const dist = Math.sqrt((r - 2) ** 2 + (c - 2) ** 2);
        const ring1 = (t % 1) * (maxR + 1.2);
        const ring2 = ((t + 0.5) % 1) * (maxR + 1.2);
        const best = Math.min(Math.abs(dist - ring1), Math.abs(dist - ring2));
        grid[r][c] = Math.pow(Math.max(0, 1 - best / 0.8), 1.4);
      }
    }
    return grid;
  },
  sweep(t) {
    const maxDiag = (GRID - 1) * 2;
    const head = t * (maxDiag + 2) - 1;
    const grid: number[][] = [];
    for (let r = 0; r < GRID; r++) {
      grid[r] = [];
      for (let c = 0; c < GRID; c++) {
        const behind = head - (r + c);
        const op = behind >= 0 && behind < 4 ? Math.pow(1 - behind / 4, 0.6) : 0;
        grid[r][c] = op;
      }
    }
    return grid;
  },
  orbit(t) {
    const grid: number[][] = Array.from({ length: GRID }, () => Array(GRID).fill(0));
    const comets = [
      { pos: t * PLEN, dim: 1.0 },
      { pos: (t * PLEN + PLEN / 2) % PLEN, dim: 0.3 },
    ];
    for (const { pos, dim } of comets) {
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          const idx = PERIM_IDX[r][c];
          if (idx < 0) continue;
          const behind = (pos - idx + PLEN) % PLEN;
          const op = behind < 5 ? Math.pow(1 - behind / 5, 0.5) : 0;
          grid[r][c] = Math.max(grid[r][c], op * dim);
        }
      }
    }
    return grid;
  },
};

const CYCLE_MS: Record<LoaderPattern, number> = {
  wave: 1400,
  pulse: 1600,
  sweep: 1800,
  orbit: 2200,
};

export function MatrixLoader({
  pattern = 'wave',
  size = 'md',
  className,
}: MatrixLoaderProps): ReactElement {
  const svgRef = useRef<SVGSVGElement>(null);
  const cellsRef = useRef<SVGRectElement[]>([]);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  const { cell, gap, px } = SIZE_CONFIG[size];
  const step = cell + gap;
  const viewSize = GRID * step - gap;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Build cells on first mount
    if (cellsRef.current.length === 0) {
      const onLayer = svg.querySelector<SVGGElement>('#ml-on')!;
      const cells: SVGRectElement[] = [];
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          const el = document.createElementNS(NS, 'rect');
          el.setAttribute('x', String(c * step));
          el.setAttribute('y', String(r * step));
          el.setAttribute('width', String(cell));
          el.setAttribute('height', String(cell));
          el.setAttribute('rx', String(Math.max(1, cell * 0.22)));
          el.setAttribute('fill', 'currentColor');
          el.setAttribute('opacity', '0');
          onLayer.appendChild(el);
          cells.push(el);
        }
      }
      cellsRef.current = cells;
    }

    const frameFn = FRAMES[pattern];
    const cycleMs = CYCLE_MS[pattern];

    function tick(now: number) {
      if (!startRef.current) startRef.current = now;
      const t = ((now - startRef.current) % cycleMs) / cycleMs;
      const grid = frameFn(t);
      const cells = cellsRef.current;
      let i = 0;
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          cells[i++].setAttribute('opacity', Math.min(1, Math.max(0, grid[r][c])).toFixed(3));
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      startRef.current = null;
    };
  }, [pattern, cell, gap, step]);

  return (
    <svg
      ref={svgRef}
      width={px}
      height={px}
      viewBox={`0 0 ${viewSize} ${viewSize}`}
      aria-hidden="true"
      className={className}
      style={{ display: 'block', overflow: 'visible', flexShrink: 0 }}
    >
      {/* Off layer — dim dots to show the grid structure */}
      <g id="ml-off" opacity="0.18">
        {Array.from({ length: GRID }, (_, r) =>
          Array.from({ length: GRID }, (_, c) => (
            <rect
              key={`${r}-${c}`}
              x={c * step}
              y={r * step}
              width={cell}
              height={cell}
              rx={Math.max(1, cell * 0.22)}
              fill="currentColor"
            />
          ))
        )}
      </g>
      {/* On layer — animated bright dots, built imperatively in useEffect */}
      <g id="ml-on" />
    </svg>
  );
}
