import { defineP5, type Ctx } from '../../src/runtime/types';
import { curl2, splitBackground } from '../../src/lib';

type Particle = { x: number; y: number; px: number; py: number; ink: number };
let particles: Particle[] = [];

export default defineP5({
  meta: { title: 'Flow Field', size: [1000, 1000], fps: 60, loop: 10, tags: ['noise', 'particles'] },
  params: {
    count: { value: 2000, min: 100, max: 10000, step: 100 },
    noiseScale: { value: 0.003, min: 0.0005, max: 0.02, step: 0.0005, label: 'noise scale' },
    speed: { value: 1.5, min: 0.1, max: 6 },
    turbulence: { value: 2, min: 0.5, max: 8, label: 'turbulence' },
    fade: { value: 8, min: 0, max: 60, step: 1 },
    weight: { value: 1, min: 0.25, max: 4 },
    palette: { palette: true, value: 0 },
    field: { value: 'angle', options: ['angle', 'curl'] },
    mode: { value: 'lines', options: ['lines', 'dots'] },
    scatter: { button: true, label: 'Scatter particles' },
  },
  setup(p, params, ctx) {
    p.background(splitBackground(params.palette, 'dark').bg);
    scatter(ctx, p, params.count);
  },
  draw(p, params, t, ctx) {
    if (particles.length !== params.count) scatter(ctx, p, params.count);
    const { bg: bgHex, inks: inkHex } = splitBackground(params.palette, 'dark');
    const bg = p.color(bgHex);
    bg.setAlpha(params.fade);
    p.noStroke();
    p.fill(bg);
    p.rect(0, 0, p.width, p.height);

    const inks = inkHex.map(c => { const k = p.color(c); k.setAlpha(140); return k; });
    p.strokeWeight(params.weight);
    for (const q of particles) {
      const nx = q.x * params.noiseScale, ny = q.y * params.noiseScale;
      let vx: number, vy: number;
      if (params.field === 'curl') {
        // Curl noise: divergence-free, so particles swirl instead of bunching into lines.
        [vx, vy] = curl2(ctx.rng.noise3, nx, ny, t * 0.1);
        const len = Math.hypot(vx, vy) || 1;
        const turb = Math.min(1, len / params.turbulence);
        vx = (vx / len) * turb; vy = (vy / len) * turb;
      } else {
        const a = p.noise(nx, ny, t * 0.1) * p.TWO_PI * params.turbulence;
        vx = Math.cos(a); vy = Math.sin(a);
      }
      q.px = q.x; q.py = q.y;
      q.x += vx * params.speed;
      q.y += vy * params.speed;
      if (q.x < 0 || q.x > p.width || q.y < 0 || q.y > p.height) {
        q.x = q.px = ctx.rng.range(p.width);
        q.y = q.py = ctx.rng.range(p.height);
      }
      p.stroke(inks[q.ink % inks.length]);
      if (params.mode === 'lines') p.line(q.px, q.py, q.x, q.y);
      else p.point(q.x, q.y);
    }
  },
  onButton(name, p, params, ctx) {
    if (name === 'scatter') scatter(ctx, p, params.count);
  },
});

function scatter(ctx: Ctx, p: import('p5'), n: number) {
  particles = Array.from({ length: n }, () => {
    const x = ctx.rng.range(p.width), y = ctx.rng.range(p.height);
    return { x, y, px: x, py: y, ink: ctx.rng.int(16) };
  });
}
