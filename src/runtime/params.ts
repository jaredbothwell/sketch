import { Pane } from 'tweakpane';
import type { ParamDefs } from './types';

/** Initial values from defs, overlaid with any saved values that still match the schema. */
export function initValues(defs: ParamDefs, saved?: Record<string, unknown>) {
  const v: Record<string, any> = {};
  for (const [k, d] of Object.entries(defs)) {
    if ('button' in d) continue;
    v[k] = saved && typeof saved[k] === typeof d.value ? saved[k] : d.value;
  }
  return v;
}

export function buildPane(
  pane: Pane,
  defs: ParamDefs,
  values: Record<string, any>,
  onChange: () => void,
  onButton: (name: string) => void,
) {
  const f = pane.addFolder({ title: 'Params' });
  for (const [k, d] of Object.entries(defs)) {
    const label = d.label ?? k;
    if ('button' in d) {
      f.addButton({ title: label }).on('click', () => onButton(k));
    } else if ('options' in d) {
      f.addBinding(values, k, { label, options: Object.fromEntries(d.options.map(o => [o, o])) }).on('change', onChange);
    } else if (typeof d.value === 'number') {
      const { min, max, step } = d as { min?: number; max?: number; step?: number };
      f.addBinding(values, k, { label, min, max, step }).on('change', onChange);
    } else {
      f.addBinding(values, k, { label }).on('change', onChange);
    }
  }
  return f;
}
