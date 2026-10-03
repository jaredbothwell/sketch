import { defineP5 } from '../../src/runtime/types';

export default defineP5({
  meta: { title: '__TITLE__', size: [800, 800], fps: 60, loop: 6 },
  params: {
    count: { value: 12, min: 1, max: 100, step: 1 },
    bg: { value: '#111113' },
    fg: { value: '#ff7a3d' },
  },
  draw(p, params, t) {
    p.background(params.bg);
    p.noFill();
    p.stroke(params.fg);
    for (let i = 0; i < params.count; i++) {
      const r = 40 + i * 25 + 15 * Math.sin(t * 2 + i * 0.4);
      p.circle(p.width / 2, p.height / 2, r);
    }
  },
});
