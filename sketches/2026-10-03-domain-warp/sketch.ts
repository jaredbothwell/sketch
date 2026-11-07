import { defineGlsl } from '../../src/runtime/types';

export default defineGlsl({
  meta: { title: 'Domain Warp', size: [1000, 1000], fps: 60, loop: 8, tags: ['shader', 'fbm'] },
  params: {
    scale: { value: 2.5, min: 0.5, max: 10 },
    warp: { value: 4, min: 0, max: 10 },
    speed: { value: 0.15, min: 0, max: 1 },
    octaves: { value: 5, min: 1, max: 8, step: 1 },
    palette: { palette: true, value: 0 },
  },
  frag: /* glsl */ `
// Sin-free hash (Dave Hoskins): stable at large coordinates, no blocky artifacts.
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx + u_seed * 0.1317) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 8; i++) {
    if (float(i) >= u_octaves) break;
    v += a * noise(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p;
    a *= 0.5;
  }
  return v;
}
// Palette colors sorted dark → light: [0] = shadow, [2] = mid, [4] = highlight.
void sortedPalette(out vec3 c[5]) {
  for (int i = 0; i < 5; i++) c[i] = u_palette[i];
  for (int i = 0; i < 4; i++)
    for (int j = 0; j < 4 - i; j++)
      if (dot(c[j], vec3(0.2126, 0.7152, 0.0722)) > dot(c[j + 1], vec3(0.2126, 0.7152, 0.0722))) {
        vec3 tmp = c[j]; c[j] = c[j + 1]; c[j + 1] = tmp;
      }
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.y * u_scale;
  float t = u_time * u_speed;
  vec2 q = vec2(fbm(uv + t), fbm(uv + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(uv + u_warp * q + vec2(1.7, 9.2) + t), fbm(uv + u_warp * q + vec2(8.3, 2.8)));
  float f = fbm(uv + u_warp * r);
  vec3 c[5];
  sortedPalette(c);
  vec3 col = mix(c[0], c[2], smoothstep(0.2, 0.7, f));
  col = mix(col, c[4], smoothstep(0.6, 0.95, f * length(q)));
  fragColor = vec4(pow(col, vec3(0.9)), 1.0);
}`,
});
