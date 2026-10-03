import { Pane } from 'tweakpane';
import type { ParamDefs } from './types';
import { palettes } from '../lib/color';

const isPalette = (v: unknown): v is string[] => Array.isArray(v) && v.every(c => typeof c === 'string');
const paletteIndex = (colors: string[]) => palettes.findIndex(p => p.join() === colors.join());

/** Initial values from defs, overlaid with any saved values that still match the schema. */
export function initValues(defs: ParamDefs, saved?: Record<string, unknown>) {
  const v: Record<string, any> = {};
  for (const [k, d] of Object.entries(defs)) {
    if ('button' in d) continue;
    if ('palette' in d) v[k] = isPalette(saved?.[k]) ? saved[k] : palettes[d.value % palettes.length];
    else v[k] = saved && typeof saved[k] === typeof d.value ? saved[k] : d.value;
  }
  return v;
}

function swatch(colors: string[]) {
  const el = document.createElement('div');
  el.className = 'swatch';
  el.innerHTML = colors.map(c => `<span style="background:${c}" title="${c}"></span>`).join('');
  return el;
}

/**
 * Builds controls for a sketch's params. Returns sync(), which must be called after
 * `values` is replaced externally (snapshot restore, reset) so palette pickers catch up.
 */
export function buildPane(
  pane: Pane,
  defs: ParamDefs,
  values: Record<string, any>,
  onChange: () => void,
  onButton: (name: string) => void,
) {
  const f = pane.addFolder({ title: 'Params' });
  const syncs: (() => void)[] = [];

  for (const [k, d] of Object.entries(defs)) {
    const label = d.label ?? k;
    if ('button' in d) {
      f.addButton({ title: label }).on('click', () => onButton(k));
    } else if ('palette' in d) {
      const proxy = { index: Math.max(0, paletteIndex(values[k])) };
      const binding = f.addBinding(proxy, 'index', { label, min: 0, max: palettes.length - 1, step: 1 });
      // Host the swatch in a blade so Tweakpane keeps it in order with the other controls.
      const holder = f.addBlade({ view: 'separator' });
      const sw = swatch(values[k]);
      holder.element.replaceChildren(sw);
      const set = (i: number) => {
        values[k] = palettes[i];
        sw.innerHTML = swatch(values[k]).innerHTML;
        onChange();
      };
      binding.on('change', e => set(e.value));
      f.addButton({ title: `Shuffle ${label}` }).on('click', () => {
        proxy.index = Math.floor(Math.random() * palettes.length);
        set(proxy.index);
        binding.refresh();
      });
      syncs.push(() => {
        const i = paletteIndex(values[k]);
        if (i >= 0) proxy.index = i;
        sw.innerHTML = swatch(values[k]).innerHTML;
        binding.refresh();
      });
    } else if ('options' in d) {
      f.addBinding(values, k, { label, options: Object.fromEntries(d.options.map(o => [o, o])) }).on('change', onChange);
    } else if (typeof d.value === 'number') {
      const { min, max, step } = d as { min?: number; max?: number; step?: number };
      f.addBinding(values, k, { label, min, max, step }).on('change', onChange);
    } else {
      f.addBinding(values, k, { label }).on('change', onChange);
    }
  }
  return { folder: f, sync: () => syncs.forEach(s => s()) };
}
