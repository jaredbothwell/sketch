import type p5 from 'p5';
import { defineP5, type Ctx } from '../../src/runtime/types';
import { clamp, hslToRgb } from '../../src/lib';

type Pt = { x: number; y: number; vx: number; vy: number; hue: number; hueSpeed: number };
let pts: Pt[] = [];
let buf: p5.Graphics | null = null;

const makePt = (ctx: Ctx, i: number, n: number): Pt => ({
  x: ctx.rng.range(ctx.width), y: ctx.rng.range(ctx.height),
  vx: ctx.rng.range(-1, 1), vy: ctx.rng.range(-1, 1),
  hue: (i / n) * 360, hueSpeed: ctx.rng.range(0.2, 0.8),
});

export default defineP5({
  meta: { title: 'Voronoi', size: [1000, 1000], fps: 60, loop: 20, tags: ['cells'] },
  params: {
    cells: { value: 50, min: 5, max: 150, step: 1 },
    speed: { value: 1, min: 0.1, max: 3, step: 0.1 },
    hueShift: { value: 0.5, min: 0, max: 1, step: 0.01, label: 'hue shift' },
    edge: { value: 0.05, min: 0.01, max: 0.2, step: 0.01, label: 'edge width' },
    res: { value: 4, min: 1, max: 8, step: 1, label: 'pixel size' },
  },
  setup(p, params, ctx) {
    p.noSmooth();
    buf = null;
    pts = Array.from({ length: params.cells }, (_, i) => makePt(ctx, i, params.cells));
  },
  draw(p, params, time, ctx) {
    while (pts.length < params.cells) pts.push(makePt(ctx, pts.length, params.cells));
    pts.length = params.cells;
    const s = params.res, bw = Math.ceil(p.width / s), bh = Math.ceil(p.height / s);
    if (!buf || buf.width !== bw) { buf?.remove(); buf = p.createGraphics(bw, bh); buf.pixelDensity(1); }
    const t = time * 0.6, edge = params.edge;

    buf.loadPixels();
    const px = buf.pixels;
    for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
      const wx = bx * s, wy = by * s;
      let d1 = Infinity, d2 = Infinity, ci = 0;
      for (let i = 0; i < pts.length; i++) {
        const dx = wx - pts[i].x, dy = wy - pts[i].y, d = dx * dx + dy * dy;
        if (d < d1) { d2 = d1; d1 = d; ci = i; } else if (d < d2) d2 = d;
      }
      const a = Math.sqrt(d1), b = Math.sqrt(d2), e = (b - a) / (b + a + 1);
      const h = (((pts[ci].hue + a * 0.3 + Math.sin(t + wx * 0.01) * 20) % 360) + 360) % 360;
      const l = e < edge ? (5 + e * (100 / (edge / 0.05))) / 100 : (15 + e * 35) / 100;
      const [r, g, bl] = hslToRgb(h / 360, (70 + e * 25) / 100, l);
      const i = (by * bw + bx) * 4;
      px[i] = r; px[i + 1] = g; px[i + 2] = bl; px[i + 3] = 255;
    }
    buf.updatePixels();
    p.image(buf, 0, 0, p.width, p.height);

    for (const q of pts) {
      q.x += (q.vx + Math.sin(t * 2 + q.hue) * 0.3) * params.speed;
      q.y += (q.vy + Math.cos(t * 2 + q.hue) * 0.3) * params.speed;
      if (q.x < 0 || q.x > p.width) q.vx *= -1;
      if (q.y < 0 || q.y > p.height) q.vy *= -1;
      q.x = clamp(q.x, 0, p.width); q.y = clamp(q.y, 0, p.height);
      q.hue = (q.hue + q.hueSpeed * params.hueShift) % 360;
    }
  },
});
