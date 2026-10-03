// Seeded randomness and noise. Use ctx.rng in sketches so everything follows the seed.
import { createNoise2D, createNoise3D, createNoise4D } from 'simplex-noise';
import { TAU } from './math';

/** sfc32 PRNG seeded through splitmix32: fast, good quality, 0..1 floats. */
function sfc32(seed: number) {
  let s = seed >>> 0;
  const split = () => {
    s = (s + 0x9e3779b9) | 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
    return (z ^ (z >>> 16)) >>> 0;
  };
  let a = split(), b = split(), c = split(), d = split();
  return () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    const r = (t + d) | 0;
    c = (c + r) | 0;
    return (r >>> 0) / 4294967296;
  };
}

export function createRng(seed: number) {
  const next = sfc32(seed);
  let spare: number | undefined;

  const rng = {
    seed,
    /** 0..1 */
    float: next,
    /** min..max (or 0..min if one arg) */
    range: (min: number, max?: number) => (max === undefined ? next() * min : min + next() * (max - min)),
    /** Integer in [min, max) (or [0, min) if one arg). */
    int: (min: number, max?: number) => Math.floor(rng.range(min, max)),
    chance: (p = 0.5) => next() < p,
    sign: () => (next() < 0.5 ? -1 : 1),
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)],
    /** Pick with weights: weighted([['a', 3], ['b', 1]]). */
    weighted: <T>(items: readonly (readonly [T, number])[]): T => {
      const total = items.reduce((s, [, w]) => s + w, 0);
      let r = next() * total;
      for (const [v, w] of items) if ((r -= w) <= 0) return v;
      return items[items.length - 1][0];
    },
    /** Returns a shuffled copy. */
    shuffle: <T>(arr: readonly T[]): T[] => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    /** Normal distribution (Box–Muller). */
    gaussian: (mean = 0, sd = 1) => {
      if (spare !== undefined) { const s = spare; spare = undefined; return mean + s * sd; }
      let u = 0, v = 0;
      while (u === 0) u = next();
      while (v === 0) v = next();
      const m = Math.sqrt(-2 * Math.log(u));
      spare = m * Math.sin(TAU * v);
      return mean + m * Math.cos(TAU * v) * sd;
    },
    /** Uniform point on a circle of radius r. */
    onCircle: (r = 1): [number, number] => { const a = next() * TAU; return [Math.cos(a) * r, Math.sin(a) * r]; },
    /** Uniform point inside a disc of radius r. */
    inCircle: (r = 1): [number, number] => {
      const a = next() * TAU, d = Math.sqrt(next()) * r;
      return [Math.cos(a) * d, Math.sin(a) * d];
    },
    /** Independent child generator (e.g. one per layer) that doesn't disturb this one's sequence later. */
    fork: () => createRng(Math.floor(next() * 4294967296)),
    /** Seeded simplex noise, output -1..1. */
    noise2: createNoise2D(next),
    noise3: createNoise3D(next),
    noise4: createNoise4D(next),
  };
  return rng;
}
export type Rng = ReturnType<typeof createRng>;

type Noise2 = (x: number, y: number) => number;
type Noise3 = (x: number, y: number, z: number) => number;

/** Fractal Brownian motion: summed octaves of noise, output roughly -1..1. */
export function fbm(noise: Noise3, x: number, y: number, z = 0, octaves = 5, lacunarity = 2, persistence = 0.5) {
  let sum = 0, amp = 1, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * freq, y * freq, z * freq);
    norm += amp;
    amp *= persistence;
    freq *= lacunarity;
  }
  return sum / norm;
}

/** Ridged multifractal: sharp creases, output 0..1. */
export function ridged(noise: Noise3, x: number, y: number, z = 0, octaves = 5) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(noise(x * freq, y * freq, z * freq));
    sum += amp * n * n;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

/** Domain warp: offsets the lookup by noise itself, giving fluid, marbled shapes. */
export function warp(noise: Noise3, x: number, y: number, z = 0, amount = 1, octaves = 4) {
  const qx = fbm(noise, x, y, z, octaves);
  const qy = fbm(noise, x + 5.2, y + 1.3, z, octaves);
  return fbm(noise, x + amount * qx, y + amount * qy, z, octaves);
}

/** Divergence-free 2D flow (curl of a noise field): swirls without sinks. Returns [vx, vy]. */
export function curl2(noise: Noise3, x: number, y: number, z = 0, eps = 1e-4): [number, number] {
  const dx = (noise(x + eps, y, z) - noise(x - eps, y, z)) / (2 * eps);
  const dy = (noise(x, y + eps, z) - noise(x, y - eps, z)) / (2 * eps);
  return [dy, -dx];
}

/**
 * Noise that loops perfectly every `loop` seconds: walks a circle through 4D noise.
 * radius controls how much it changes over the loop.
 */
export function loopNoise(noise4: (x: number, y: number, z: number, w: number) => number,
  x: number, y: number, t: number, loop: number, radius = 1) {
  const a = (t / loop) * TAU;
  return noise4(x, y, Math.cos(a) * radius, Math.sin(a) * radius);
}

export type { Noise2, Noise3 };
