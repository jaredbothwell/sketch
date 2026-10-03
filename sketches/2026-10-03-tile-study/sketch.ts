import type p5 from 'p5';
import { defineP5 } from '../../src/runtime/types';
import { ease, loopT, pingpong, poissonDisk, splitBackground, subdivide, TAU, withAlpha, type Rect, type Rng } from '../../src/lib';

type Pattern = 'stripes' | 'rings' | 'dots' | 'arc' | 'solid';
type Tile = Rect & { pattern: Pattern; ink: string; ink2: string; phase: number; dir: number; dots: [number, number][] };

let tiles: Tile[] = [];
let layoutKey = '';

export default defineP5({
  meta: { title: 'Tile Study', size: [1000, 1000], fps: 60, loop: 6, tags: ['grid', 'palette', 'subdivision'] },
  params: {
    palette: { palette: true, value: 0 },
    bgMode: { value: 'auto', options: ['auto', 'dark', 'light'], label: 'background' },
    depth: { value: 5, min: 1, max: 8, step: 1 },
    split: { value: 0.75, min: 0.2, max: 1, step: 0.05 },
    margin: { value: 40, min: 0, max: 150, step: 1 },
    gap: { value: 6, min: 0, max: 30, step: 1 },
    density: { value: 14, min: 4, max: 40, step: 1, label: 'pattern density' },
    animate: { value: true },
    regenerate: { button: true },
  },
  draw(p, params, t, ctx) {
    const key = [params.depth, params.split, params.margin, params.palette.join(), params.bgMode, ctx.seed].join('|');
    if (key !== layoutKey) { layoutKey = key; tiles = layout(ctx.rng.fork(), p, params); }

    const { bg } = splitBackground(params.palette, params.bgMode as 'auto');
    p.background(bg);
    const phase = params.animate ? loopT(t, 6) : 0;
    for (const tile of tiles) drawTile(p, tile, params.gap, params.density, phase, bg);
  },
  onButton(name, _p, _params, ctx) {
    if (name === 'regenerate') layoutKey = `regen-${ctx.rng.float()}`;
  },
});

function layout(rng: Rng, p: p5, params: { depth: number; split: number; margin: number; palette: string[]; bgMode: string }): Tile[] {
  const { inks } = splitBackground(params.palette, params.bgMode as 'auto');
  const m = params.margin;
  const rects = subdivide(rng, { x: m, y: m, w: p.width - m * 2, h: p.height - m * 2 }, { maxDepth: params.depth, minSize: 30, split: params.split });
  return rects.map(r => {
    const [ink, ink2] = rng.shuffle(inks);
    const pattern = rng.weighted<Pattern>([['stripes', 3], ['rings', 2], ['dots', 2], ['arc', 2], ['solid', 1]]);
    return {
      ...r, pattern, ink, ink2: ink2 ?? ink, phase: rng.float(), dir: rng.sign(),
      dots: pattern === 'dots' ? poissonDisk(rng, r.w, r.h, Math.max(8, Math.min(r.w, r.h) / 6)) : [],
    };
  });
}

function drawTile(p: p5, tile: Tile, gap: number, density: number, phase: number, bg: string) {
  const x = tile.x + gap / 2, y = tile.y + gap / 2, w = tile.w - gap, h = tile.h - gap;
  if (w <= 2 || h <= 2) return;
  // Each tile breathes on its own offset; ease makes the motion feel deliberate.
  const k = ease.inOutCubic(pingpong((phase + tile.phase) * 2));

  p.push();
  p.drawingContext.save();
  p.drawingContext.beginPath();
  p.drawingContext.rect(x, y, w, h);
  p.drawingContext.clip();
  p.noStroke();
  p.fill(tile.ink2);
  p.rect(x, y, w, h);

  switch (tile.pattern) {
    case 'stripes': {
      const step = Math.max(w, h) / density;
      p.stroke(tile.ink);
      p.strokeWeight(step * (0.25 + 0.35 * k));
      p.translate(x + w / 2, y + h / 2);
      p.rotate((tile.dir * TAU) / 8);
      const r = Math.hypot(w, h);
      const off = (phase * tile.dir * step * 4) % step;
      for (let s = -r; s < r; s += step) p.line(s + off, -r, s + off, r);
      break;
    }
    case 'rings': {
      const cx = x + w / 2, cy = y + h / 2, max = Math.hypot(w, h) / 2;
      const step = max / (density / 2);
      p.noFill();
      p.stroke(tile.ink);
      p.strokeWeight(step * 0.45);
      const off = (phase * step * 2 * tile.dir + step) % step;
      for (let r = off; r < max + step; r += step) p.circle(cx, cy, r * 2);
      break;
    }
    case 'dots': {
      p.fill(tile.ink);
      const base = Math.min(w, h) / 6;
      for (const [dx, dy] of tile.dots) p.circle(tile.x + dx, tile.y + dy, base * (0.3 + 0.5 * k));
      break;
    }
    case 'arc': {
      const s = Math.min(w, h);
      const corner = tile.dir > 0 ? [x, y + h] : [x + w, y];
      p.fill(tile.ink);
      p.arc(corner[0], corner[1], s * 2 * (0.6 + 0.4 * k), s * 2 * (0.6 + 0.4 * k), 0, TAU);
      break;
    }
    case 'solid': {
      p.fill(withAlpha(tile.ink, 0.35 + 0.65 * k));
      p.rect(x, y, w, h);
      break;
    }
  }
  p.drawingContext.restore();
  p.pop();

  p.noFill();
  p.stroke(withAlpha(bg, 0.15));
  p.strokeWeight(1);
  p.rect(x, y, w, h);
}
