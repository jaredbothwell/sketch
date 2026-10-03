// Layout and point distributions.
import type { Rng } from './random';
import { TAU } from './math';

export type Cell = {
  i: number; j: number; index: number;
  /** Top-left corner and size in pixels. */
  x: number; y: number; w: number; h: number;
  /** Center in pixels. */
  cx: number; cy: number;
  /** Normalized center position 0..1 across the grid. */
  u: number; v: number;
};

/** Rectangular grid of cells inside a canvas, with an outer margin and gutter between cells. */
export function grid(cols: number, rows: number, width: number, height: number, margin = 0, gutter = 0): Cell[] {
  const w = (width - margin * 2 - gutter * (cols - 1)) / cols;
  const h = (height - margin * 2 - gutter * (rows - 1)) / rows;
  const cells: Cell[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = margin + i * (w + gutter);
      const y = margin + j * (h + gutter);
      cells.push({
        i, j, index: j * cols + i, x, y, w, h, cx: x + w / 2, cy: y + h / 2,
        u: cols === 1 ? 0.5 : i / (cols - 1), v: rows === 1 ? 0.5 : j / (rows - 1),
      });
    }
  }
  return cells;
}

/** Pointy-top hex centers covering a rect. Returns [x, y] pairs. */
export function hexGrid(size: number, width: number, height: number): [number, number][] {
  const w = Math.sqrt(3) * size, h = size * 1.5;
  const pts: [number, number][] = [];
  for (let row = 0, y = 0; y < height + size; row++, y = row * h) {
    for (let x = row % 2 ? w / 2 : 0; x < width + w; x += w) pts.push([x, y]);
  }
  return pts;
}

/** Hexagon polygon around a center (pointy-top). */
export function hexagon(cx: number, cy: number, size: number): [number, number][] {
  return Array.from({ length: 6 }, (_, k) => {
    const a = (TAU / 6) * k - Math.PI / 6;
    return [cx + Math.cos(a) * size, cy + Math.sin(a) * size] as [number, number];
  });
}

export type Rect = { x: number; y: number; w: number; h: number; depth: number };

/**
 * Recursive subdivision (Mondrian-style splits). Each rect splits with probability `split`
 * until maxDepth or the rect would get smaller than minSize.
 */
export function subdivide(rng: Rng, rect: Omit<Rect, 'depth'>, opts: { maxDepth?: number; minSize?: number; split?: number } = {}) {
  const { maxDepth = 5, minSize = 20, split = 0.75 } = opts;
  const out: Rect[] = [];
  const go = (r: Rect) => {
    const canSplit = r.depth < maxDepth && Math.max(r.w, r.h) > minSize * 2;
    if (!canSplit || (r.depth > 0 && !rng.chance(split))) return void out.push(r);
    const vertical = r.w > r.h ? true : r.w < r.h ? false : rng.chance();
    const t = rng.range(0.3, 0.7);
    if (vertical) {
      const w1 = r.w * t;
      go({ x: r.x, y: r.y, w: w1, h: r.h, depth: r.depth + 1 });
      go({ x: r.x + w1, y: r.y, w: r.w - w1, h: r.h, depth: r.depth + 1 });
    } else {
      const h1 = r.h * t;
      go({ x: r.x, y: r.y, w: r.w, h: h1, depth: r.depth + 1 });
      go({ x: r.x, y: r.y + h1, w: r.w, h: r.h - h1, depth: r.depth + 1 });
    }
  };
  go({ ...rect, depth: 0 });
  return out;
}

/**
 * Poisson-disk sampling (Bridson): evenly spaced but organic points, no two closer than `radius`.
 */
export function poissonDisk(rng: Rng, width: number, height: number, radius: number, tries = 30): [number, number][] {
  const cell = radius / Math.SQRT2;
  const cols = Math.ceil(width / cell), rows = Math.ceil(height / cell);
  const gridIdx = new Int32Array(cols * rows).fill(-1);
  const pts: [number, number][] = [];
  const active: number[] = [];
  const add = (x: number, y: number) => {
    pts.push([x, y]);
    active.push(pts.length - 1);
    gridIdx[Math.floor(y / cell) * cols + Math.floor(x / cell)] = pts.length - 1;
  };
  const fits = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    const gi = Math.floor(x / cell), gj = Math.floor(y / cell);
    for (let j = Math.max(0, gj - 2); j <= Math.min(rows - 1, gj + 2); j++) {
      for (let i = Math.max(0, gi - 2); i <= Math.min(cols - 1, gi + 2); i++) {
        const k = gridIdx[j * cols + i];
        if (k >= 0 && (pts[k][0] - x) ** 2 + (pts[k][1] - y) ** 2 < radius * radius) return false;
      }
    }
    return true;
  };
  add(rng.range(width), rng.range(height));
  while (active.length) {
    const ai = rng.int(active.length);
    const [px, py] = pts[active[ai]];
    let found = false;
    for (let n = 0; n < tries; n++) {
      const a = rng.range(TAU), d = rng.range(radius, radius * 2);
      const x = px + Math.cos(a) * d, y = py + Math.sin(a) * d;
      if (fits(x, y)) { add(x, y); found = true; break; }
    }
    if (!found) active.splice(ai, 1);
  }
  return pts;
}

/** Sunflower / phyllotaxis spiral of n points filling radius r around (cx, cy). */
export function phyllotaxis(n: number, cx: number, cy: number, r: number): [number, number][] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, k) => {
    const d = r * Math.sqrt((k + 0.5) / n), a = k * golden;
    return [cx + Math.cos(a) * d, cy + Math.sin(a) * d] as [number, number];
  });
}
