import type p5 from 'p5';
import { defineP5, type Ctx } from '../../src/runtime/types';

// Slime mold after Sage Jenson's "36 Points": each agent's sensor angle/distance, turn angle and step
// are interpolated lo→hi by the trail value it reads at an offset point.
const SIM = 300;
const MAX_N = 100_000;
const PI = Math.PI;

type Preset = { SA: [number, number]; SD: [number, number]; RA: [number, number]; SS: [number, number];
  oA: number; oR: number; dep: number; dec: number; hue: [number, number]; rsp: number };
const P = (SA: [number, number], SD: [number, number], RA: [number, number], SS: [number, number],
  oA: number, oR: number, dep: number, dec: number, hue: [number, number], rsp: number): Preset =>
  ({ SA, SD, RA, SS, oA, oR, dep, dec, hue, rsp });

const presets: Record<string, Preset> = {
  a: P([PI/4, PI/4], [9, 9], [PI/4, PI/4], [1, 1], 0, 0, 0.05, 0.92, [30, 50], 0),
  b: P([PI/3, PI/8], [9, 9], [PI/4, PI/4], [1, 1], 0, 0, 0.05, 0.92, [200, 260], 0),
  c: P([PI/8, PI/3], [9, 9], [PI/4, PI/4], [1, 1], 0, 0, 0.05, 0.92, [0, 30], 0),
  d: P([PI/4, PI/4], [20, 5], [PI/4, PI/4], [1, 1], 0, 0, 0.05, 0.92, [120, 180], 0),
  e: P([PI/4, PI/4], [5, 20], [PI/4, PI/4], [1, 1], 0, 0, 0.05, 0.92, [270, 320], 0),
  f: P([PI/4, PI/4], [9, 9], [PI/2, PI/8], [1, 1], 0, 0, 0.05, 0.90, [40, 65], 0),
  g: P([PI/4, PI/4], [9, 9], [PI/8, PI/2], [1, 1], 0, 0, 0.05, 0.90, [180, 220], 0),
  h: P([PI/4, 0.1], [9, 18], [PI/4, PI/8], [1, 1.5], 0, 2, 0.05, 0.93, [0, 60], 0),
  i: P([0.1, PI/2], [15, 5], [PI/6, PI/3], [1, 1], 0, 0, 0.05, 0.91, [200, 280], 0),
  j: P([PI/3, PI/6], [5, 20], [PI/3, PI/8], [0.5, 2], 0, 0, 0.05, 0.92, [300, 350], 0),
  k: P([PI/3, 0.2], [7, 14], [PI/5, PI/3], [1.5, 0.5], 0, 3, 0.06, 0.91, [80, 140], 0),
  l: P([0.3, 1.2], [3, 25], [0.5, 0.2], [0.8, 2], 0, 0, 0.05, 0.92, [20, 50], 0),
  m: P([0.8, 0.1], [6, 12], [0.3, 0.8], [1, 1], 3, 5, 0.05, 0.92, [0, 40], 0),
  n: P([PI/6, PI/3], [12, 8], [PI/3, PI/6], [1, 2], -3, 4, 0.05, 0.92, [210, 270], 0),
  o: P([PI/2, PI/8], [15, 3], [PI/4, PI/3], [1, 0.5], 5, 0, 0.05, 0.91, [150, 200], 0),
  p: P([0.05, 1.5], [3, 30], [0.1, 1.2], [0.5, 3], 0, 8, 0.04, 0.93, [280, 340], 0),
  q: P([1.5, 0.05], [30, 3], [1.2, 0.1], [3, 0.5], 5, 5, 0.06, 0.90, [40, 80], 0),
  r: P([PI/4, PI/4], [9, 9], [0.01, PI], [1, 1], -5, 3, 0.05, 0.92, [0, 360], 0),
  s: P([PI/4, PI/4], [1, 30], [PI/4, PI/4], [1, 1], 0, 0, 0.05, 0.92, [180, 240], 500),
  t: P([PI/6, PI/2], [10, 10], [PI/2, PI/6], [1, 1], 0, 0, 0.05, 0.92, [0, 50], 300),
  u: P([PI/4, PI/3], [8, 15], [PI/4, PI/3], [1, 1.5], 2, 3, 0.05, 0.91, [100, 160], 400),
  v: P([PI/3, PI/8], [12, 6], [PI/6, PI/2], [0.8, 1.2], 0, 0, 0.05, 0.93, [330, 30], 0),
  w: P([0.5, 1.0], [5, 20], [0.3, 0.8], [1, 2], -4, 6, 0.04, 0.92, [50, 100], 600),
  x: P([1.0, 0.2], [15, 8], [0.8, 0.3], [1.5, 0.8], 3, -3, 0.06, 0.90, [220, 280], 0),
  y: P([PI/4, PI/4], [10, 10], [PI/4, PI/4], [1, 1], 8, 8, 0.05, 0.92, [0, 360], 0),
  z: P([0.2, 1.3], [4, 18], [0.2, 1.0], [0.5, 2.5], -3, 5, 0.05, 0.91, [330, 30], 200),
  '0': P([0.1, 0.1], [3, 3], [PI, PI], [1, 1], 0, 0, 0.08, 0.88, [0, 10], 0),
  '1': P([PI/2, PI/2], [20, 20], [0.1, 0.1], [2, 2], 0, 0, 0.03, 0.95, [200, 240], 0),
  '2': P([PI/4, PI/4], [9, 9], [PI/4, PI/4], [1, 1], 10, 0, 0.05, 0.92, [120, 180], 0),
  '3': P([PI/4, PI/4], [9, 9], [PI/4, PI/4], [1, 1], 0, 10, 0.05, 0.92, [270, 330], 0),
  '4': P([0.5, 1.2], [5, 25], [0.3, 1.5], [0.5, 3], 5, 5, 0.04, 0.93, [0, 360], 300),
  '5': P([1.2, 0.3], [25, 5], [1.0, 0.2], [2, 0.5], -5, -5, 0.06, 0.90, [40, 70], 0),
  '6': P([PI/6, PI/2], [3, 35], [PI/8, PI], [0.5, 3], 0, 0, 0.03, 0.94, [180, 260], 500),
  '7': P([PI/3, PI/6], [15, 7], [PI/2, PI/8], [1.5, 0.8], 4, -4, 0.05, 0.92, [300, 360], 0),
  '8': P([0.8, 0.8], [10, 10], [0.8, 0.8], [1.2, 1.2], 3, 3, 0.05, 0.92, [60, 120], 0),
  '9': P([0.1, PI/2], [2, 30], [0.05, PI], [0.3, 4], -8, 8, 0.04, 0.93, [0, 360], 200),
};
const keys = Object.keys(presets);

let trail = new Float32Array(SIM * SIM), tBuf = new Float32Array(SIM * SIM);
const aX = new Float32Array(MAX_N), aY = new Float32Array(MAX_N), aH = new Float32Array(MAX_N), aP = new Float32Array(MAX_N);
let N = 0;
let img: p5.Image | null = null;
let rand: () => number = Math.random;

const lut = new Uint8Array(256 * 3);
let lutKey = '';
function buildLut(lo: number, hi: number) {
  const key = `${lo},${hi}`;
  if (key === lutKey) return;
  lutKey = key;
  const range = hi >= lo ? hi - lo : 360 - lo + hi;
  for (let i = 0; i < 256; i++) {
    const v = i / 255, h = (lo + v * range) % 360, s = 0.7, l = v * 0.58;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    lut[i * 3] = (f(0) * 255 + 0.5) | 0; lut[i * 3 + 1] = (f(8) * 255 + 0.5) | 0; lut[i * 3 + 2] = (f(4) * 255 + 0.5) | 0;
  }
}

function spawnAgent(i: number) {
  aX[i] = rand() * SIM; aY[i] = rand() * SIM; aH[i] = rand() * PI * 2; aP[i] = rand() * 1000;
}

const sample = (x: number, y: number) => {
  let ix = Math.round(x), iy = Math.round(y);
  if (ix < 0) ix += SIM; else if (ix >= SIM) ix -= SIM;
  if (iy < 0) iy += SIM; else if (iy >= SIM) iy -= SIM;
  return trail[iy * SIM + ix];
};

export default defineP5({
  meta: { title: 'Physarum', size: [900, 900], fps: 60, loop: 20, tags: ['simulation', 'agents'] },
  params: {
    preset: { value: 'a', options: [...keys, 'custom'] },
    agents: { value: 30000, min: 5000, max: MAX_N, step: 5000 },
    decay: { value: 0.92, min: 0.8, max: 0.99, step: 0.01 },
    deposit: { value: 0.05, min: 0.01, max: 0.2, step: 0.01 },
    saLo: { value: 0.79, min: 0.01, max: 1.57, step: 0.01, label: 'sensor ∠ lo' },
    saHi: { value: 0.79, min: 0.01, max: 1.57, step: 0.01, label: 'sensor ∠ hi' },
    sdLo: { value: 9, min: 1, max: 40, step: 1, label: 'sensor dist lo' },
    sdHi: { value: 9, min: 1, max: 40, step: 1, label: 'sensor dist hi' },
    raLo: { value: 0.79, min: 0.01, max: 3.14, step: 0.01, label: 'turn ∠ lo' },
    raHi: { value: 0.79, min: 0.01, max: 3.14, step: 0.01, label: 'turn ∠ hi' },
    ssLo: { value: 1, min: 0.1, max: 4, step: 0.1, label: 'step lo' },
    ssHi: { value: 1, min: 0.1, max: 4, step: 0.1, label: 'step hi' },
    ofsAbs: { value: 0, min: -20, max: 20, step: 0.1, label: 'ofs abs' },
    ofsRel: { value: 0, min: -20, max: 20, step: 0.1, label: 'ofs rel' },
    hueLo: { value: 30, min: 0, max: 360, step: 1, label: 'hue lo' },
    hueHi: { value: 50, min: 0, max: 360, step: 1, label: 'hue hi' },
    respawn: { value: 0, min: 0, max: 1000, step: 10, label: 'respawn (0 = off)' },
    restart: { button: true, label: 'Restart' },
  },
  setup(p, params, ctx) { restart(p, params.agents, ctx); },
  draw(p, params) {
    const c = params.preset === 'custom' ? {
      SA: [params.saLo, params.saHi], SD: [params.sdLo, params.sdHi], RA: [params.raLo, params.raHi],
      SS: [params.ssLo, params.ssHi], oA: params.ofsAbs, oR: params.ofsRel, dep: params.deposit,
      dec: params.decay, hue: [params.hueLo, params.hueHi], rsp: params.respawn,
    } as Preset : presets[params.preset];

    for (let i = N; i < params.agents; i++) spawnAgent(i);
    N = params.agents;

    const [saLo, saHi] = c.SA, [sdLo, sdHi] = c.SD, [raLo, raHi] = c.RA, [ssLo, ssHi] = c.SS;
    for (let i = 0; i < N; i++) {
      if (c.rsp > 0 && ++aP[i] >= c.rsp) { spawnAgent(i); aP[i] = 0; }
      const x = aX[i], y = aY[i], h = aH[i];
      const T = Math.min(1, sample(x + c.oR * Math.cos(h), y + c.oR * Math.sin(h) + c.oA));
      const sa = saLo + T * (saHi - saLo), sd = sdLo + T * (sdHi - sdLo);
      const ra = raLo + T * (raHi - raLo), ss = ssLo + T * (ssHi - ssLo);
      const fL = sample(x + Math.cos(h - sa) * sd, y + Math.sin(h - sa) * sd);
      const fC = sample(x + Math.cos(h) * sd, y + Math.sin(h) * sd);
      const fR = sample(x + Math.cos(h + sa) * sd, y + Math.sin(h + sa) * sd);
      if (fC > fL && fC > fR) { /* keep heading */ }
      else if (fC < fL && fC < fR) aH[i] += rand() < 0.5 ? ra : -ra;
      else if (fL > fR) aH[i] -= ra;
      else if (fR > fL) aH[i] += ra;
      let nx = x + Math.cos(aH[i]) * ss, ny = y + Math.sin(aH[i]) * ss;
      if (nx < 0) nx += SIM; else if (nx >= SIM) nx -= SIM;
      if (ny < 0) ny += SIM; else if (ny >= SIM) ny -= SIM;
      aX[i] = nx; aY[i] = ny;
      const dx = Math.round(nx), dy = Math.round(ny);
      if (dx < SIM && dy < SIM) trail[dy * SIM + dx] += c.dep;
    }

    // 3×3 box blur + decay, wrapping at the edges.
    for (let y = 0; y < SIM; y++) {
      const rU = (y === 0 ? SIM - 1 : y - 1) * SIM, rC = y * SIM, rD = (y === SIM - 1 ? 0 : y + 1) * SIM;
      for (let x = 0; x < SIM; x++) {
        const xL = x === 0 ? SIM - 1 : x - 1, xR = x === SIM - 1 ? 0 : x + 1;
        tBuf[rC + x] = (trail[rU + xL] + trail[rU + x] + trail[rU + xR] + trail[rC + xL] + trail[rC + x] +
          trail[rC + xR] + trail[rD + xL] + trail[rD + x] + trail[rD + xR]) / 9 * c.dec;
      }
    }
    [trail, tBuf] = [tBuf, trail];

    buildLut(c.hue[0], c.hue[1]);
    img!.loadPixels();
    const px = img!.pixels;
    for (let i = 0; i < SIM * SIM; i++) {
      const v = (Math.min(255, trail[i] * 250) | 0) * 3, j = i << 2;
      px[j] = lut[v]; px[j + 1] = lut[v + 1]; px[j + 2] = lut[v + 2]; px[j + 3] = 255;
    }
    img!.updatePixels();
    p.image(img!, 0, 0, p.width, p.height);
  },
  onButton(name, p, params, ctx) { if (name === 'restart') restart(p, params.agents, ctx); },
});

function restart(p: p5, agents: number, ctx: Ctx) {
  p.noSmooth();
  img = p.createImage(SIM, SIM);
  rand = ctx.rng.float;
  trail.fill(0); tBuf.fill(0);
  N = agents;
  for (let i = 0; i < N; i++) spawnAgent(i);
}
