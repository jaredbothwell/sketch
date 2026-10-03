import p5 from 'p5';
import type { Ctx, Engine, P5Sketch } from '../types';
import { createRng } from '../../lib/random';

export function mountP5(el: HTMLElement, sketch: P5Sketch<any>, params: Record<string, any>, ctx: Ctx): Engine {
  let t = 0;
  let last = 0;
  let playing = true;
  let canvas!: HTMLCanvasElement;

  const seed = (p: p5) => { p.randomSeed(ctx.seed); p.noiseSeed(ctx.seed); };

  const inst = new p5((p: p5) => {
    p.setup = () => {
      const c = p.createCanvas(ctx.width, ctx.height);
      canvas = c.elt as HTMLCanvasElement;
      p.pixelDensity(1);
      p.frameRate(sketch.meta.fps ?? 60);
      seed(p);
      sketch.setup?.(p, params, ctx);
      last = performance.now();
    };
    p.draw = () => {
      if (playing) {
        const now = performance.now();
        t += (now - last) / 1000;
        last = now;
      }
      sketch.draw(p, params, t, ctx);
    };
  }, el);

  return {
    get canvas() { return canvas; },
    renderFrame(time) { t = time; inst.redraw(); },
    play() { playing = true; last = performance.now(); inst.loop(); },
    pause() { playing = false; inst.noLoop(); },
    reset() { t = 0; seed(inst); ctx.rng = createRng(ctx.seed); sketch.setup?.(inst, params, ctx); },
    button(name) { sketch.onButton?.(name, inst, params, ctx); },
    destroy() { inst.remove(); },
  };
}
