import type { Ctx, Engine, GlslSketch, ParamDefs } from '../types';

const VERT = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader compile failed');
  return s;
}

export function mountGlsl(el: HTMLElement, sketch: GlslSketch<any>, params: Record<string, any>, ctx: Ctx): Engine {
  const canvas = document.createElement('canvas');
  canvas.width = ctx.width;
  canvas.height = ctx.height;
  el.appendChild(canvas);
  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true })!;

  const paramUniforms = Object.entries(sketch.params as ParamDefs)
    .filter(([, d]) => !('button' in d))
    .map(([k, d]) => `uniform ${'value' in d && typeof d.value === 'string' && d.value.startsWith('#') ? 'vec3' : 'float'} u_${k};`)
    .join('\n');
  const frag = `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_seed;
${paramUniforms}
out vec4 fragColor;
#line 1
${sketch.frag}`;

  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link failed');
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = (name: string) => gl.getUniformLocation(prog, name);
  const mouse = [0, 0];
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    mouse[0] = ((e.clientX - r.left) / r.width) * canvas.width;
    mouse[1] = (1 - (e.clientY - r.top) / r.height) * canvas.height;
  };
  canvas.addEventListener('pointermove', onMove);

  let t = 0, last = performance.now(), playing = true, raf = 0;

  const draw = () => {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(u('u_time'), t);
    gl.uniform2f(u('u_resolution'), canvas.width, canvas.height);
    gl.uniform2f(u('u_mouse'), mouse[0], mouse[1]);
    gl.uniform1f(u('u_seed'), ctx.seed);
    for (const [k, d] of Object.entries(sketch.params as ParamDefs)) {
      if ('button' in d) continue;
      const v = params[k];
      if (typeof v === 'string' && v.startsWith('#')) gl.uniform3fv(u(`u_${k}`), hexToRgb(v));
      else if ('options' in d) gl.uniform1f(u(`u_${k}`), d.options.indexOf(v));
      else gl.uniform1f(u(`u_${k}`), Number(v));
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const tick = () => {
    const now = performance.now();
    if (playing) t += (now - last) / 1000;
    last = now;
    draw();
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return {
    canvas,
    renderFrame(time) { t = time; draw(); },
    play() { playing = true; last = performance.now(); if (!raf) raf = requestAnimationFrame(tick); },
    pause() { playing = false; cancelAnimationFrame(raf); raf = 0; },
    reset() { t = 0; },
    button(name) { sketch.onButton?.(name); },
    destroy() { cancelAnimationFrame(raf); canvas.removeEventListener('pointermove', onMove); canvas.remove(); },
  };
}
