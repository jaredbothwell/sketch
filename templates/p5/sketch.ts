import { defineP5 } from '../../src/runtime/types';
import { grid, splitBackground } from '../../src/lib';

export default defineP5({
  meta: { title: '__TITLE__', size: [800, 800], fps: 60, loop: 6 },
  params: {
    palette: { palette: true, value: 0 },
    cols: { value: 8, min: 1, max: 40, step: 1 },
    margin: { value: 60, min: 0, max: 200, step: 1 },
  },
  draw(p, params, t, ctx) {
    const { bg, inks } = splitBackground(params.palette);
    p.background(bg);
    p.noStroke();
    for (const c of grid(params.cols, params.cols, p.width, p.height, params.margin, 8)) {
      p.fill(inks[c.index % inks.length]);
      const s = 0.5 + 0.5 * Math.sin(t * 2 + (c.u + c.v) * 4);
      p.circle(c.cx, c.cy, Math.min(c.w, c.h) * s);
    }
  },
});
