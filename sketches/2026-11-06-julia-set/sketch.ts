import type p5 from 'p5';
import { defineP5 } from '../../src/runtime/types';
import { hslToRgb } from '../../src/lib';

let buf: p5.Graphics | null = null;
let panX = 0, panY = 0, zoom = 1.5;
let drag: { x: number; y: number; px: number; py: number } | null = null;
let frozen = 0; // drift phase held while animate is off

const cAt = (ph: number): [number, number] => [
  -0.8 + Math.sin(ph) * 0.15 + Math.sin(ph * 0.6) * 0.05,
  Math.cos(ph * 0.7) * 0.25 + Math.sin(ph * 0.3) * 0.05,
];

export default defineP5({
  meta: { title: 'Julia Set', size: [1000, 1000], fps: 60, loop: 30, tags: ['fractal'] },
  params: {
    iter: { value: 80, min: 20, max: 200, step: 1, label: 'iterations' },
    speed: { value: 0.48, min: 0, max: 1.8, step: 0.01, label: 'drift speed' },
    res: { value: 3, min: 1, max: 6, step: 1, label: 'pixel size' },
    animate: { value: true },
    resetView: { button: true, label: 'Reset view' },
  },
  setup(p) {
    p.noSmooth();
    buf = null;
    const cv = (p as any).canvas as HTMLCanvasElement;
    cv.onwheel = (e) => {
      e.preventDefault();
      const r = cv.getBoundingClientRect(), a = p.width / p.height;
      const mx = (e.clientX - r.left) / r.width - 0.5, my = (e.clientY - r.top) / r.height - 0.5;
      const bx = mx * 2 * zoom * a + panX, by = my * 2 * zoom + panY;
      zoom = Math.max(0.001, Math.min(20, zoom * (e.deltaY > 0 ? 1.03 : 0.97)));
      panX = bx - mx * 2 * zoom * a; panY = by - my * 2 * zoom;
    };
    p.mousePressed = (e: any) => {
      if (e?.target === cv) drag = { x: p.mouseX, y: p.mouseY, px: panX, py: panY };
    };
    p.mouseDragged = () => {
      if (!drag) return;
      panX = drag.px - ((p.mouseX - drag.x) / p.width) * 2 * zoom * (p.width / p.height);
      panY = drag.py - ((p.mouseY - drag.y) / p.height) * 2 * zoom;
    };
    p.mouseReleased = () => { drag = null; };
  },
  draw(p, params, t) {
    const bw = Math.ceil(p.width / params.res), bh = Math.ceil(p.height / params.res);
    if (!buf || buf.width !== bw) { buf?.remove(); buf = p.createGraphics(bw, bh); buf.pixelDensity(1); }
    const phase = params.animate ? (frozen = t * params.speed) : frozen;
    const [cr, ci] = cAt(phase);
    const aspect = p.width / p.height, max = params.iter;

    buf.loadPixels();
    const px = buf.pixels;
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      let zr = (x / bw - 0.5) * 2 * zoom * aspect + panX;
      let zi = (y / bh - 0.5) * 2 * zoom + panY;
      let zr2 = zr * zr, zi2 = zi * zi, n = 0;
      while (zr2 + zi2 < 4 && n < max) { zi = 2 * zr * zi + ci; zr = zr2 - zi2 + cr; zr2 = zr * zr; zi2 = zi * zi; n++; }
      const i = (y * bw + x) * 4;
      if (n === max) { px[i] = px[i + 1] = px[i + 2] = 0; }
      else {
        const k = (n + 1 - Math.log(Math.log(Math.sqrt(zr2 + zi2))) / Math.LN2) / max;
        const [r, g, b] = hslToRgb((((k * 360 + phase * 15) % 360) + 360) % 360 / 360, 0.8, 0.1 + k * 0.5);
        px[i] = r; px[i + 1] = g; px[i + 2] = b;
      }
      px[i + 3] = 255;
    }
    buf.updatePixels();
    p.image(buf, 0, 0, p.width, p.height);
  },
  onButton(name) { if (name === 'resetView') { panX = 0; panY = 0; zoom = 1.5; } },
});
