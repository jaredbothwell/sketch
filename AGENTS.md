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
- p5: `setup(p, params, ctx)` and `draw(p, params, t, ctx)`. Use the `t` argument (seconds) for animation, not `millis()`/`frameCount`, so video export stays deterministic. Use `p.random`/`p.noise`, which are seeded from `ctx.seed`.
- glsl: `frag` is a GLSL ES 3.00 body without `#version`. Uniforms are injected: `u_time`, `u_resolution`, `u_mouse`, `u_seed`, and `u_<param>` (float, vec3 for colors, float index for selects). Write to `fragColor`.

## Conventions
- To branch an idea, copy the folder to a new dated id instead of overwriting a sketch that has snapshots.
- Expose interesting constants as params rather than hard-coding them.
- Keep each sketch self-contained. Shared helpers go in `src/runtime/`.
