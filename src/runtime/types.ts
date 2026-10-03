import type p5 from 'p5';

export type NumberParam = { value: number; min?: number; max?: number; step?: number; label?: string };
export type BoolParam = { value: boolean; label?: string };
export type ColorParam = { value: `#${string}`; label?: string };
export type SelectParam = { value: string; options: string[]; label?: string };
export type ButtonParam = { button: true; label?: string };
export type ParamDef = NumberParam | BoolParam | ColorParam | SelectParam | ButtonParam;
export type ParamDefs = Record<string, ParamDef>;

/** Live values: buttons are omitted, everything else maps to its value type. */
export type ParamValues<P extends ParamDefs> = {
  [K in keyof P as P[K] extends ButtonParam ? never : K]: P[K] extends { value: infer V }
    ? V extends `#${string}` ? string : V
    : never;
};

export type Meta = {
  title: string;
  /** Canvas size in pixels. */
  size?: [number, number];
  fps?: number;
  /** Loop length in seconds; used as the default video duration. */
  loop?: number;
  tags?: string[];
};

export type Ctx = { seed: number; width: number; height: number };

export type P5Sketch<P extends ParamDefs = ParamDefs> = {
  engine: 'p5';
  meta: Meta;
  params: P;
  setup?: (p: p5, params: ParamValues<P>, ctx: Ctx) => void;
  /** t = seconds since start (deterministic during export). */
  draw: (p: p5, params: ParamValues<P>, t: number, ctx: Ctx) => void;
  onButton?: (name: string, p: p5, params: ParamValues<P>, ctx: Ctx) => void;
};

export type GlslSketch<P extends ParamDefs = ParamDefs> = {
  engine: 'glsl';
  meta: Meta;
  params: P;
  /**
   * GLSL ES 3.00 fragment shader body (no #version line). Provided uniforms:
   * u_time, u_resolution, u_mouse, u_seed, plus one `u_<name>` per param
   * (number/bool -> float, color -> vec3, select -> float index).
   */
  frag: string;
  onButton?: (name: string) => void;
};

export type Sketch = P5Sketch<any> | GlslSketch<any>;

export const defineP5 = <P extends ParamDefs>(s: Omit<P5Sketch<P>, 'engine'>): P5Sketch<P> => ({ engine: 'p5', ...s });
export const defineGlsl = <P extends ParamDefs>(s: Omit<GlslSketch<P>, 'engine'>): GlslSketch<P> => ({ engine: 'glsl', ...s });

/** What every engine provides to the viewer. */
export interface Engine {
  canvas: HTMLCanvasElement;
  /** Render a single frame at time t (seconds); used for deterministic export. */
  renderFrame(t: number): void;
  play(): void;
  pause(): void;
  /** Re-run setup (e.g. after a seed change). */
  reset(): void;
  button(name: string): void;
  destroy(): void;
}
