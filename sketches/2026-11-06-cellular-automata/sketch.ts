import { defineP5 } from '../../src/runtime/types';

// Rules as [survive lo, survive hi, birth lo, birth hi, default density %].
const rules: Record<string, [number, number, number, number, number?]> = {
  conway: [2, 3, 3, 3], maze: [1, 5, 3, 3], coral: [4, 8, 3, 3, 15], anneal: [3, 6, 4, 8, 50],
  'day & night': [3, 8, 3, 6, 50], diamoeba: [5, 8, 5, 8, 50], '34 life': [3, 4, 3, 4],
  morley: [2, 4, 3, 6, 40], seeds: [0, 0, 2, 2, 5], stains: [2, 3, 3, 6, 20],
};

let cols = 0, rows = 0, cell = 0, ruleKey = '';
let grid: Uint8Array, next: Uint8Array, trail: Float32Array;

export default defineP5({
  meta: { title: 'Cellular Automata', size: [1000, 1000], fps: 15, loop: 20, tags: ['simulation', 'grid'] },
  params: {
    rule: { value: 'conway', options: [...Object.keys(rules), 'custom'] },
    cell: { value: 6, min: 3, max: 16, step: 1, label: 'cell size' },
    trail: { value: 12, min: 1, max: 30, step: 1, label: 'trail length' },
    density: { value: 30, min: 5, max: 80, step: 1, label: 'density %' },
    survLo: { value: 2, min: 0, max: 8, step: 1, label: 'survive lo' },
    survHi: { value: 3, min: 0, max: 8, step: 1, label: 'survive hi' },
    birthLo: { value: 3, min: 0, max: 8, step: 1, label: 'birth lo' },
    birthHi: { value: 3, min: 0, max: 8, step: 1, label: 'birth hi' },
    reseed: { button: true, label: 'Reseed' },
  },
  setup(p, params, ctx) { reset(p, params, ctx.rng.float); },
  draw(p, params, _t, ctx) {
    if (params.cell !== cell || params.rule !== ruleKey) reset(p, params, ctx.rng.float);
    const r = params.rule === 'custom' ? [params.survLo, params.survHi, params.birthLo, params.birthHi] : rules[params.rule];
    const [sLo, sHi, bLo, bHi] = r;

    p.background(0, 25);
    p.noStroke();
    for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) {
      const i = x * rows + y;
      if (grid[i]) { trail[i] = params.trail; p.fill(255, 80, 40); }
      else if (trail[i] > 0) { trail[i]--; const k = trail[i] / params.trail; p.fill(60 * k, 80 * k, 120 * k); }
      else continue;
      p.rect(x * cell, y * cell, cell, cell);
    }

    for (let x = 0; x < cols; x++) for (let y = 0; y < rows; y++) {
      let n = 0;
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        if (i || j) n += grid[((x + i + cols) % cols) * rows + ((y + j + rows) % rows)];
      }
      const alive = grid[x * rows + y];
      next[x * rows + y] = alive ? +(n >= sLo && n <= sHi) : +(n >= bLo && n <= bHi);
    }
    [grid, next] = [next, grid];
  },
  onButton(name, p, params, ctx) { if (name === 'reseed') reset(p, params, ctx.rng.float); },
});

function reset(p: import('p5'), params: { cell: number; rule: string; density: number }, rand: () => number) {
  cell = params.cell; ruleKey = params.rule;
  cols = Math.floor(p.width / cell); rows = Math.floor(p.height / cell);
  const density = (params.rule !== 'custom' && rules[params.rule][4]) || params.density;
  grid = new Uint8Array(cols * rows).map(() => +(rand() < density / 100));
  next = new Uint8Array(cols * rows);
  trail = new Float32Array(cols * rows);
  p.background(0);
}
