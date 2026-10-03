import { defineGlsl } from '../../src/runtime/types';

export default defineGlsl({
  meta: { title: '__TITLE__', size: [800, 800], fps: 60, loop: 6 },
  params: {
    scale: { value: 3, min: 0.5, max: 20 },
    tint: { value: '#ff7a3d' },
  },
  frag: /* glsl */ `
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  float d = length(uv) * u_scale;
  float v = 0.5 + 0.5 * sin(d * 6.2831 - u_time * 2.0);
  fragColor = vec4(u_tint * v, 1.0);
}`,
});
