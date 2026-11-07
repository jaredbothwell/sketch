import { defineP5, type Ctx } from "../../src/runtime/types";
import { TAU, dist, gradientFn, loopNoise, splitBackground } from "../../src/lib";

const LOOP = 6;

export default defineP5({
  meta: { title: "Grid", size: [800, 800], fps: 60, loop: LOOP },
  params: {
    palette: { palette: true, value: 0 },
    lines: { value: 24, min: 2, max: 120, step: 1 },
    direction: { value: "both", options: ["both", "horizontal", "vertical"] },
    margin: { value: 60, min: 0, max: 200, step: 1 },
    weight: { value: 2, min: 0.5, max: 12, step: 0.5 },
    wave: { value: "radial", options: ["radial", "diagonal", "noise", "none"] },
    amplitude: { value: 12, min: 0, max: 80 },
    frequency: { value: 2, min: 0, max: 10 },
    color: { value: "gradient", options: ["gradient", "alternate", "single"] },
    speed: { value: 1, min: 0, max: 4, step: 1, label: "loops / 6s" },
    resolution: { value: 120, min: 2, max: 400, step: 1, label: "points / line" },
  },
  draw(p, params, t, ctx) {
    const { bg, inks } = splitBackground(params.palette);
    const grad = gradientFn(inks);
    p.background(bg);
    p.noFill();
    p.strokeWeight(params.weight);
    p.strokeJoin(p.ROUND);

    // One loop every LOOP seconds (× speed), so video exports loop seamlessly.
    const phase = (t / LOOP) * TAU * params.speed;
    const m = params.margin;
    const size = p.width - m * 2;

    // Every point of every line is pushed by the same 2D field,
    // so horizontal and vertical lines stay connected at their crossings.
    const point = (u: number, v: number): [number, number] => {
      const [dx, dy] = offset(params, ctx, u, v, phase, t);
      return [m + u * size + dx, m + v * size + dy];
    };

    const families: ("h" | "v")[] =
      params.direction === "both" ? ["h", "v"] : params.direction === "horizontal" ? ["h"] : ["v"];

    for (const fam of families) {
      for (let i = 0; i < params.lines; i++) {
        const a = params.lines === 1 ? 0.5 : i / (params.lines - 1); // which line, 0..1

        // 1. Color per line.
        const ink =
          params.color === "gradient" ? grad(a)
          : params.color === "alternate" ? inks[i % inks.length]
          : inks[0];
        p.stroke(ink);

        // 2. Walk along the line, sampling the displaced points.
        p.beginShape();
        for (let s = 0; s <= params.resolution; s++) {
          const b = s / params.resolution; // position along the line, 0..1
          const [x, y] = fam === "h" ? point(b, a) : point(a, b);
          p.vertex(x, y);
        }
        p.endShape();
      }
    }
  },
});

/** Displacement in pixels at grid position (u, v). */
function offset(
  params: { wave: string; amplitude: number; frequency: number; speed: number },
  ctx: Ctx, u: number, v: number, phase: number, t: number,
): [number, number] {
  const A = params.amplitude, f = params.frequency;
  switch (params.wave) {
    case "radial": {
      // Ripples spreading from the center, pushing lines outward/inward.
      const d = dist(u, v, 0.5, 0.5) || 1e-6;
      const k = Math.sin(d * f * TAU - phase);
      return [((u - 0.5) / d) * k * A, ((v - 0.5) / d) * k * A];
    }
    case "diagonal": {
      const k = Math.sin((u + v) * f * Math.PI - phase);
      return [k * A, k * A];
    }
    case "noise": {
      // 4D loop noise: organic warping that still repeats exactly every loop.
      const loop = LOOP / (params.speed || 1);
      const tt = params.speed ? t : 0; // speed 0 = frozen
      return [
        loopNoise(ctx.rng.noise4, u * f, v * f, tt, loop, 0.6) * A,
        loopNoise(ctx.rng.noise4, u * f + 17.3, v * f - 4.1, tt, loop, 0.6) * A,
      ];
    }
    default:
      return [0, 0];
  }
}
