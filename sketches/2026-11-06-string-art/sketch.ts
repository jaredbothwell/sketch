import { defineP5 } from '../../src/runtime/types';
import { hsvToRgb, TAU } from '../../src/lib';

export default defineP5({
  meta: { title: 'String Art', size: [1000, 1000], fps: 60, loop: 20, tags: ['lines', 'parametric'] },
  params: {
    length: { value: 100, min: 1, max: 100, step: 1, label: 'length %' },
    offset: { value: 0.04, min: 0.001, max: 0.2, step: 0.001 },
    weight: { value: 0.8, min: 0.1, max: 5, step: 0.1 },
    opacity: { value: 50, min: 1, max: 255, step: 1 },
    speed: { value: 0.36, min: 0.06, max: 1.8, step: 0.01, label: 'speed (rad/s)' },
    freqA: { value: 3, min: 1, max: 8, step: 1, label: 'curve A' },
    freqB: { value: 5, min: 1, max: 8, step: 1, label: 'curve B' },
    showA: { value: false, label: 'show curve A' },
    showB: { value: false, label: 'show curve B' },
  },
  draw(p, params, t) {
    const time = t * params.speed;
    const cx = p.width / 2, cy = p.height / 2, m = Math.min(p.width, p.height);
    const curveA = (s: number): [number, number] => {
      const r = m * 0.42;
      return [cx + Math.sin(params.freqA * s + time) * r * Math.cos(s + time * 0.3),
              cy + Math.cos(params.freqA * s - time * 0.7) * r * Math.sin(s - time * 0.2)];
    };
    const curveB = (s: number): [number, number] => {
      const r = m * 0.38;
      return [cx + Math.cos(params.freqB * s - time * 0.5) * r * Math.sin(s * 0.7 + time * 0.4),
              cy + Math.sin(params.freqB * s + time * 0.3) * r * Math.cos(s * 0.7 - time * 0.6)];
    };

    p.background(0);
    const n = Math.max(1, Math.floor(((params.length / 100) * TAU) / params.offset));
    p.strokeWeight(params.weight);
    for (let i = 0; i < n; i++) {
      const s = i * params.offset;
      const [ax, ay] = curveA(s);
      const [bx, by] = curveB(s + params.offset);
      const [r, g, b] = hsvToRgb((((i / n) * 360 + t * 30) % 360) / 360, 0.6, 0.85);
      p.stroke(r, g, b, params.opacity);
      p.line(ax, ay, bx, by);
    }

    const trace = (f: (s: number) => [number, number], col: [number, number, number], shift: number) => {
      p.noFill(); p.strokeWeight(1.5); p.stroke(...col);
      p.beginShape();
      for (let i = 0; i <= 200; i++) p.vertex(...f((i / 200) * TAU + shift));
      p.endShape();
    };
    if (params.showA) trace(curveA, [255, 80, 80], 0);
    if (params.showB) trace(curveB, [80, 140, 255], params.offset);
  },
});
