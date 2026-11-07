import { defineGlsl } from '../../src/runtime/types';

export default defineGlsl({
  meta: { title: 'Shader Gradient', size: [1000, 1000], fps: 60, loop: 21, tags: ['shader', 'gradient'] },
  params: {
    speed: { value: 0.3, min: 0, max: 2, step: 0.01 },
    freq: { value: 3, min: 0.5, max: 10, step: 0.1, label: 'frequency' },
    colorA: { value: '#1a0d26' },
    colorB: { value: '#4d1a66' },
    colorC: { value: '#e66633' },
    colorD: { value: '#0d9980' },
  },
  frag: /* glsl */ `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * u_speed;
  float mixer = sin(uv.x * u_freq + t) * cos(uv.y * u_freq - t * 0.7) * 0.5 + 0.5;
  vec3 color = mix(mix(u_colorA, u_colorB, uv.x + sin(t) * 0.2),
                   mix(u_colorC, u_colorD, uv.y + cos(t * 0.5) * 0.2), mixer);
  fragColor = vec4(color, 1.0);
}`,
});
