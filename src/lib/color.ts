// Color helpers built on culori. Mixing happens in OKLCH/OKLab so gradients stay even and vivid.
import { clampChroma, formatHex, formatRgb, interpolate, oklch, parse, rgb, wcagContrast } from 'culori';
import nice from 'nice-color-palettes/200.json';
import { TAU } from './math';

export type Palette = string[];

/** Hand-picked palettes first (5 colors each), then 200 from nice-color-palettes. */
export const curated: Palette[] = [
  ['#0d0d12', '#ff7a3d', '#ffd166', '#06d6a0', '#118ab2'],
  ['#f2e8cf', '#386641', '#6a994e', '#a7c957', '#bc4749'],
  ['#fefae0', '#283618', '#606c38', '#dda15e', '#bc6c25'],
  ['#0b132b', '#1c2541', '#3a506b', '#5bc0be', '#f7f7ff'],
  ['#f4f1de', '#e07a5f', '#3d405b', '#81b29a', '#f2cc8f'],
  ['#111111', '#e63946', '#f1faee', '#a8dadc', '#457b9d'],
  ['#fffcf2', '#252422', '#eb5e28', '#ccc5b9', '#403d39'],
  ['#1a1423', '#3d1e6d', '#8338ec', '#ff006e', '#ffbe0b'],
];
export const palettes: Palette[] = [...curated, ...(nice as Palette[])];

const toOklch = (c: string) => oklch(parse(c))!;
const hex = (c: Parameters<typeof clampChroma>[0]) => formatHex(clampChroma(c, 'oklch'));

/** Sample a multi-stop gradient at t (0..1). mode: 'oklch' (vivid), 'oklab' (smooth), 'rgb'. */
export function gradient(colors: readonly string[], t: number, mode: 'oklch' | 'oklab' | 'rgb' = 'oklab') {
  return hex(interpolate(colors as string[], mode)(Math.min(1, Math.max(0, t))));
}

/** Build a reusable gradient function; faster than gradient() inside loops. */
export function gradientFn(colors: readonly string[], mode: 'oklch' | 'oklab' | 'rgb' = 'oklab') {
  const f = interpolate(colors as string[], mode);
  return (t: number) => hex(f(Math.min(1, Math.max(0, t))));
}

/** n evenly spaced colors from a gradient. */
export const ramp = (colors: readonly string[], n: number, mode: 'oklch' | 'oklab' | 'rgb' = 'oklab') => {
  const f = gradientFn(colors, mode);
  return Array.from({ length: n }, (_, i) => f(n === 1 ? 0.5 : i / (n - 1)));
};

export const mix = (a: string, b: string, t: number) => gradient([a, b], t);

/** Adjust lightness (-1..1), chroma (multiplier) and hue (degrees) in OKLCH. */
export function adjust(c: string, { l = 0, c: chroma = 1, h = 0 }: { l?: number; c?: number; h?: number }) {
  const o = toOklch(c);
  return hex({ ...o, l: Math.min(1, Math.max(0, o.l + l)), c: (o.c ?? 0) * chroma, h: ((o.h ?? 0) + h + 360) % 360 });
}
export const lighten = (c: string, amt = 0.1) => adjust(c, { l: amt });
export const darken = (c: string, amt = 0.1) => adjust(c, { l: -amt });
export const saturate = (c: string, k = 1.3) => adjust(c, { c: k });
export const rotateHue = (c: string, deg: number) => adjust(c, { h: deg });

/** CSS color string with alpha; works with p5 fill()/stroke() and canvas2d. */
export const withAlpha = (c: string, a: number) => formatRgb({ ...parse(c)!, alpha: a });

export const lightness = (c: string) => toOklch(c).l;
export const contrast = (a: string, b: string) => wcagContrast(a, b);
export const sortByLightness = (p: readonly string[]) => [...p].sort((a, b) => lightness(a) - lightness(b));

/**
 * Split a palette into a background and ink colors (chromotome-style).
 * 'auto' uses the most extreme lightness as background.
 */
export function splitBackground(p: readonly string[], which: 'dark' | 'light' | 'auto' = 'auto') {
  const sorted = sortByLightness(p);
  const dark = sorted[0], light = sorted[sorted.length - 1];
  const bg = which === 'dark' ? dark
    : which === 'light' ? light
    : lightness(dark) < 1 - lightness(light) ? dark : light;
  return { bg, inks: p.filter(c => c !== bg) };
}

/** Pick the color from `options` with the best contrast against bg (e.g. for text or outlines). */
export const bestContrast = (bg: string, options: readonly string[] = ['#000000', '#ffffff']) =>
  options.reduce((best, c) => (contrast(bg, c) > contrast(bg, best) ? c : best));

/** [r, g, b] in 0..1, e.g. for WebGL uniforms. */
export function rgb01(c: string): [number, number, number] {
  const { r, g, b } = rgb(c) ?? { r: 0, g: 0, b: 0 };
  return [r, g, b];
}

// ---- cosine palettes (Inigo Quilez): color(t) = a + b * cos(2π(c*t + d)) ----
type V3 = [number, number, number];
export type CosinePalette = { a: V3; b: V3; c: V3; d: V3 };

export function cosine({ a, b, c, d }: CosinePalette, t: number) {
  const ch = (k: 0 | 1 | 2) => Math.min(1, Math.max(0, a[k] + b[k] * Math.cos(TAU * (c[k] * t + d[k]))));
  const to = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${to(ch(0))}${to(ch(1))}${to(ch(2))}`;
}

export const cosinePresets = {
  rainbow: { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1, 1, 1], d: [0, 0.33, 0.67] },
  sunset: { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1, 1, 1], d: [0, 0.1, 0.2] },
  ocean: { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1, 1, 1], d: [0.3, 0.2, 0.2] },
  candy: { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1, 1, 0.5], d: [0.8, 0.9, 0.3] },
  ember: { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [1, 0.7, 0.4], d: [0, 0.15, 0.2] },
  earth: { a: [0.8, 0.5, 0.4], b: [0.2, 0.4, 0.2], c: [2, 1, 1], d: [0, 0.25, 0.25] },
  mint: { a: [0.5, 0.5, 0.5], b: [0.5, 0.5, 0.5], c: [2, 1, 0], d: [0.5, 0.2, 0.25] },
} satisfies Record<string, CosinePalette>;
