import { defineP5 } from '../../src/runtime/types';

type Particle = { x: number; y: number; px: number; py: number };
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
    bg: { value: '#0d0d12' },
    ink: { value: '#ff7a3d' },
    mode: { value: 'lines', options: ['lines', 'dots'] },
    scatter: { button: true, label: 'Scatter particles' },
  },
  setup(p, params) {
    p.background(params.bg);
    scatter(p, params.count);
  },
  draw(p, params, t) {
    if (particles.length !== params.count) scatter(p, params.count);
    const bg = p.color(params.bg);
    bg.setAlpha(params.fade);
    p.noStroke();
    p.fill(bg);
    p.rect(0, 0, p.width, p.height);

    const ink = p.color(params.ink);
    ink.setAlpha(140);
    p.stroke(ink);
    p.strokeWeight(params.weight);
    for (const q of particles) {
      const a = p.noise(q.x * params.noiseScale, q.y * params.noiseScale, t * 0.1) * p.TWO_PI * params.turbulence;
      q.px = q.x; q.py = q.y;
      q.x += Math.cos(a) * params.speed;
      q.y += Math.sin(a) * params.speed;
      if (q.x < 0 || q.x > p.width || q.y < 0 || q.y > p.height) {
        q.x = q.px = p.random(p.width);
        q.y = q.py = p.random(p.height);
      }
      if (params.mode === 'lines') p.line(q.px, q.py, q.x, q.y);
      else p.point(q.x, q.y);
    }
  },
  onButton(name, p, params) {
    if (name === 'scatter') scatter(p, params.count);
  },
});

function scatter(p: import('p5'), n: number) {
  particles = Array.from({ length: n }, () => {
    const x = p.random(p.width), y = p.random(p.height);
    return { x, y, px: x, py: y };
  });
}
