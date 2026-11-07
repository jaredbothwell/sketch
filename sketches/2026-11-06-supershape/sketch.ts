import type p5 from 'p5';
import { defineP5 } from '../../src/runtime/types';
import { hsvToRgb } from '../../src/lib';

// The viewer gives a 2D canvas, so the 3D wireframe renders into an offscreen WEBGL buffer.
let gl: p5.Graphics | null = null;
let rotX = -0.4, rotY = 0, zoom = 1;
let drag: { x: number; y: number } | null = null;

function superformula(theta: number, m: number, n1: number, n2: number, n3: number) {
  const r = Math.pow(Math.pow(Math.abs(Math.cos((m * theta) / 4)), n2) + Math.pow(Math.abs(Math.sin((m * theta) / 4)), n3), -1 / n1);
  return isFinite(r) ? r : 0;
}

export default defineP5({
  meta: { title: 'Supershape', size: [1000, 1000], fps: 60, loop: 20, tags: ['3d', 'parametric'] },
  params: {
    m: { value: 7, min: 0, max: 20, step: 1 },
    n1: { value: 0.2, min: 0.01, max: 1, step: 0.01 },
    n2: { value: 1.7, min: 0.01, max: 2, step: 0.01 },
    n3: { value: 1.7, min: 0.01, max: 2, step: 0.01 },
    detail: { value: 30, min: 10, max: 60, step: 1 },
    spin: { value: 0.3, min: 0, max: 1.8, step: 0.01, label: 'spin (rad/s)' },
  },
  setup(p) {
    gl?.remove();
    gl = p.createGraphics(p.width, p.height, p.WEBGL);
    rotX = -0.4; rotY = 0; zoom = 1;
    const inside = () => p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height;
    p.mousePressed = () => { if (inside()) drag = { x: p.mouseX, y: p.mouseY }; };
    p.mouseReleased = () => { drag = null; };
    p.mouseDragged = () => {
      if (!drag) return;
      rotY += (p.mouseX - drag.x) * 0.01; rotX -= (p.mouseY - drag.y) * 0.01;
      drag = { x: p.mouseX, y: p.mouseY };
    };
    p.mouseWheel = (e: WheelEvent) => {
      if (!inside()) return;
      zoom = Math.max(0.2, Math.min(5, zoom * (e.deltaY > 0 ? 0.95 : 1.05)));
      return false;
    };
  },
  draw(p, params, t) {
    const g = gl!, res = params.detail, { m, n1, n2, n3 } = params;
    g.background(0);
    g.noFill();
    g.push();
    g.rotateX(rotX);
    g.rotateY(rotY + t * params.spin);
    const [r, gr, b] = hsvToRgb(((t * params.spin * 40) % 360) / 360, 0.5, 0.9);
    g.stroke(r, gr, b, 160);
    g.strokeWeight(0.8);
    const R = Math.min(p.width, p.height) * 0.3 * zoom;

    const lon = Array.from({ length: res + 1 }, (_, j) => -Math.PI + (j / res) * Math.PI * 2);
    const r1 = lon.map(a => superformula(a, m, n1, n2, n3));
    const pt = (j: number, lat: number, r2: number): [number, number, number] =>
      [R * r1[j] * Math.cos(lon[j]) * r2 * Math.cos(lat), R * r1[j] * Math.sin(lon[j]) * r2 * Math.cos(lat), R * r2 * Math.sin(lat)];

    g.beginShape(g.LINES);
    for (let i = 0; i < res; i++) {
      const lat0 = -Math.PI / 2 + (i / res) * Math.PI, lat1 = -Math.PI / 2 + ((i + 1) / res) * Math.PI;
      const r2a = superformula(lat0, m, n1, n2, n3), r2b = superformula(lat1, m, n1, n2, n3);
      for (let j = 0; j < res; j++) {
        const o = pt(j, lat0, r2a);
        g.vertex(...o); g.vertex(...pt(j + 1, lat0, r2a));
        g.vertex(...o); g.vertex(...pt(j, lat1, r2b));
      }
    }
    g.endShape();
    g.pop();
    p.image(g, 0, 0);
  },
});
