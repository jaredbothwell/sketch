# Sketch repo: agent guide

Creative-coding sketches (p5.js and GLSL) with a shared viewer. Works for Claude Code, Codex, and humans.

## Run
- `pnpm dev` starts the viewer at http://localhost:5173 (gallery at `#/`, a sketch at `#/<id>`)
- `pnpm new <name> [p5|glsl]` scaffolds `sketches/YYYY-MM-DD-<name>/`
- `pnpm typecheck` runs tsc. Run it after editing.

## Layout
- `sketches/<id>/sketch.ts`: the sketch (default export from `defineP5` or `defineGlsl`)
- `sketches/<id>/notes.md`: intent and ideas. Read it before changing a sketch, and update it afterwards.
- `sketches/<id>/snapshots/*.png|json`: saved states (params + seed), written by the viewer
- `sketches/<id>/thumb.png`: gallery thumbnail
- `src/runtime/`: the sketch contract (`types.ts`), engines, params UI, export
- `src/main.ts`: gallery and viewer. `vite.config.ts` holds the dev API that writes snapshots.

## Sketch contract
- `meta`: `{ title, size: [w, h], fps, loop }`. `loop` is the default video length in seconds.
- `params`: each entry becomes a control, and its live value is passed to the sketch:
  - number `{ value, min, max, step }` → slider
  - color `{ value: '#rrggbb' }` → color picker
  - boolean `{ value: true }` → checkbox
  - select `{ value, options: [...] }` → dropdown
  - button `{ button: true }` → calls `onButton(name, ...)`
  - palette `{ palette: true, value: <index> }` → palette picker + shuffle; the sketch receives `string[]` (5 hex colors)
- p5: `setup(p, params, ctx)` and `draw(p, params, t, ctx)`. Use the `t` argument (seconds) for animation, not `millis()`/`frameCount`, so video export stays deterministic. For randomness use `ctx.rng` (or `p.random`/`p.noise`); both are seeded from `ctx.seed`, and `ctx.rng` is re-created on restart.
- glsl: `frag` is a GLSL ES 3.00 body without `#version`. Uniforms are injected: `u_time`, `u_resolution`, `u_mouse`, `u_seed`, and `u_<param>` (float, vec3 for colors, float index for selects, `vec3[5]` for palettes). Write to `fragColor`.

## Shared library: `src/lib` (import from `'../../src/lib'`)
Check here before writing your own helper. If you write something reusable, add it here.
- `math.ts`: `clamp lerp invLerp remap smoothstep fract mod pingpong damp loopT`, shaping functions `bias gain impulse parabola pulse`, `ease.*` easing, `TAU`
- `random.ts`: `createRng(seed)` (as `ctx.rng`), with `float range int chance sign pick weighted shuffle gaussian onCircle inCircle fork noise2/3/4`. Noise helpers: `fbm ridged warp curl2 loopNoise` (pass `ctx.rng.noise3`, or `noise4` for `loopNoise`)
- `color.ts`: `palettes` (curated + 200 nice-color-palettes), `gradient gradientFn ramp mix` (OKLab/OKLCH), `adjust lighten darken saturate rotateHue withAlpha`, `splitBackground` → `{ bg, inks }`, `bestContrast sortByLightness rgb01`, cosine palettes `cosine(cosinePresets.sunset, t)`
- `grid.ts`: `grid` (cells with `cx cy u v`), `hexGrid hexagon`, `subdivide` (recursive rects), `poissonDisk`, `phyllotaxis`

## Conventions
- To branch an idea, copy the folder to a new dated id instead of overwriting a sketch that has snapshots.
- Expose interesting constants as params rather than hard-coding them.
- Keep each sketch self-contained. Shared helpers go in `src/runtime/`.

## Dev vs deployed
- `pnpm dev` is the local workspace: the `/__api` plugin writes snapshots/thumbnails into the repo, and `pnpm new` is shown.
- `pnpm build` makes a static site in `dist/` (deploy anywhere: Netlify, Vercel, GitHub Pages). `src/main.ts` checks `import.meta.env.DEV` and hides the repo-writing tools. Thumbnails, snapshots and sketch source are bundled with `import.meta.glob`.
- Every build has a "code" button (shows `sketch.ts`) and "Copy share link" (params + seed in `#/<id>?s=…`).
- The deployed site uses the thumbnails that are on disk at build time. They're created in dev, either automatically or with "Set as gallery thumbnail".
