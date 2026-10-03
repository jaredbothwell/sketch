// Scalar helpers, easing and shaping functions. All pure, all seed-free.

export const TAU = Math.PI * 2;

export const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, x: number) => (a === b ? 0 : (x - a) / (b - a));
export const remap = (x: number, a0: number, a1: number, b0: number, b1: number, clamped = false) => {
  const t = invLerp(a0, a1, x);
  return lerp(b0, b1, clamped ? clamp(t) : t);
};
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
export const fract = (x: number) => x - Math.floor(x);
/** Modulo that is always positive (unlike %). */
export const mod = (x: number, m: number) => ((x % m) + m) % m;
/** 0→1→0 triangle wave over period 1. */
export const pingpong = (t: number) => 1 - Math.abs(mod(t, 2) - 1);
export const dist = (x0: number, y0: number, x1: number, y1: number) => Math.hypot(x1 - x0, y1 - y0);

/** Frame-rate independent smoothing toward a target: a = damp(a, target, 8, dt). */
export const damp = (a: number, b: number, lambda: number, dt: number) => lerp(a, b, 1 - Math.exp(-lambda * dt));

/** Loop phase 0..1 for a loop of `seconds`. Pair with sin(TAU * phase) for seamless video. */
export const loopT = (t: number, seconds: number) => fract(t / seconds);

// ---- shaping (Inigo Quilez / Christophe Schlick) ----
/** Bias toward 0 (b < 0.5) or 1 (b > 0.5). */
export const bias = (x: number, b: number) => x / ((1 / b - 2) * (1 - x) + 1);
/** S-curve (g > 0.5) or inverse S-curve (g < 0.5). */
export const gain = (x: number, g: number) =>
  x < 0.5 ? bias(x * 2, g) / 2 : bias(x * 2 - 1, 1 - g) / 2 + 0.5;
/** Sharp rise, slow decay; peaks at x = 1/k. */
export const impulse = (x: number, k: number) => k * x * Math.exp(1 - k * x);
/** 0 at the ends, 1 in the middle; k controls width. */
export const parabola = (x: number, k = 1) => Math.pow(4 * x * (1 - x), k);
/** Smooth bump centered at c with half-width w. */
export const pulse = (x: number, c: number, w: number) => {
  const d = Math.abs(x - c);
  return d > w ? 0 : 1 - smoothstep(0, 1, d / w);
};

// ---- easing (t in 0..1) ----
export const ease = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => t * (2 - t),
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  inCubic: (t: number) => t ** 3,
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  outExpo: (t: number) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
  inOutExpo: (t: number) =>
    t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2,
  outBack: (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
  outElastic: (t: number) =>
    t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1,
} as const;
export type EaseName = keyof typeof ease;
