import { defineP5, type Ctx } from '../../src/runtime/types';

type Pt = { x: number; y: number; px: number; py: number; hue: number; nOff: number; age: number; maxAge: number };
let pts: Pt[] = [];

// Mostly blues with a couple of warm yellow accents (HSB).
const palette = [
  [230, 85, 30], [220, 75, 50], [215, 65, 65], [210, 55, 75], [200, 50, 80], [195, 45, 75],
  [235, 70, 45], [205, 60, 60], [190, 40, 70], [50, 80, 90], [55, 65, 80],
];

export default defineP5({
  meta: { title: 'Starry Field', size: [1000, 1000], fps: 60, loop: 20, tags: ['noise', 'particles'] },
  params: {
    lines: { value: 2500, min: 500, max: 5000, step: 100 },
    length: { value: 500, min: 50, max: 1000, step: 10, label: 'lifespan (frames)' },
    curl: { value: 0.15, min: 0.01, max: 0.3, step: 0.01 },
    scale: { value: 200, min: 50, max: 600, step: 1 },
    speed: { value: 0.3, min: 0.1, max: 2, step: 0.1 },
    weight: { value: 4, min: 0.5, max: 7.5, step: 0.1 },
    restart: { button: true, label: 'Restart' },
  },
  setup(p, params, ctx) { init(p, params, ctx); },
  draw(p, params, t, ctx) {
    if (pts.length !== params.lines) init(p, params, ctx);
    const ts = t * 0.06, ns = 1 / params.scale;
    for (let i = 0; i < pts.length; i++) {
      const q = pts[i];
      const n1 = p.noise(q.x * ns, q.y * ns, ts);
      const n2 = p.noise(q.x * ns * 2 + 50, q.y * ns * 2 + 50, ts * 1.2);
      const a = (n1 + n2 * 0.3) * Math.PI * 2 * (1.5 + params.curl * 12) + q.nOff * 0.15;
      q.px = q.x; q.py = q.y;
      q.x += Math.cos(a) * params.speed; q.y += Math.sin(a) * params.speed;
      q.age++;

      const f = (q.hue / 360) * palette.length;
      const A = palette[Math.floor(f) % palette.length], B = palette[Math.ceil(f) % palette.length], m = f % 1;
      p.stroke(A[0] + (B[0] - A[0]) * m, A[1] + (B[1] - A[1]) * m, Math.min(100, A[2] + (B[2] - A[2]) * m + n1 * 20), 25);
      p.strokeWeight(params.weight * (0.5 + n1));
      p.line(q.px, q.py, q.x, q.y);

      if (q.age >= q.maxAge || q.x < 0 || q.x > p.width || q.y < 0 || q.y > p.height) {
        pts[i] = spawn(p, params, ctx, ctx.rng.range(p.width), ctx.rng.range(p.height), 0, ts);
      }
    }
  },
  onButton(name, p, params, ctx) { if (name === 'restart') init(p, params, ctx); },
});

type P = { lines: number; length: number };

function spawn(p: import('p5'), params: P, ctx: Ctx, x: number, y: number, age: number, z: number): Pt {
  const hue = Math.min(360, Math.max(0, p.map(p.noise(x * 0.003, y * 0.003, z * 0.5), 0.25, 0.75, 0, 360)));
  return { x, y, px: x, py: y, hue, nOff: ctx.rng.range(3), age,
           maxAge: Math.floor(ctx.rng.range(params.length * 0.6, params.length * 1.4)) };
}

// Stratified start positions so the first frames cover the canvas evenly.
function init(p: import('p5'), params: P, ctx: Ctx) {
  p.colorMode(p.HSB, 360, 100, 100, 100);
  p.background(230, 80, 16);
  const n = params.lines;
  const cols = Math.ceil(Math.sqrt(n * (p.width / p.height))), rows = Math.ceil(n / cols);
  const cw = p.width / cols, ch = p.height / rows;
  pts = Array.from({ length: n }, (_, i) => spawn(p, params, ctx,
    (i % cols) * cw + ctx.rng.range(cw), Math.floor(i / cols) * ch + ctx.rng.range(ch),
    Math.floor(ctx.rng.range(params.length)), 0));
}
