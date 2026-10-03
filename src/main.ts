import { Pane } from 'tweakpane';
import type { Ctx, Engine, Sketch } from './runtime/types';
import { mountP5 } from './runtime/engines/p5';
import { mountGlsl } from './runtime/engines/glsl';
import { buildPane, initValues } from './runtime/params';
import { canvasToPng, download, recordMp4, stamp } from './runtime/export';

const modules = import.meta.glob<{ default: Sketch }>('/sketches/*/sketch.ts');
const sketchIds = Object.keys(modules)
  .map(p => p.split('/')[2])
  .sort()
  .reverse();
const load = async (id: string) => (await modules[`/sketches/${id}/sketch.ts`]()).default;

const app = document.getElementById('app')!;
let cleanup: (() => void) | undefined;

window.addEventListener('hashchange', route);
route();

function route() {
  cleanup?.();
  cleanup = undefined;
  const id = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  if (id && sketchIds.includes(id)) void viewer(id);
  else void gallery();
}

// ---------- gallery ----------

async function gallery() {
  app.innerHTML = `<header class="top"><h1>Sketches</h1><span class="muted">${sketchIds.length} sketches · <code>pnpm new &lt;name&gt; [p5|glsl]</code></span></header><main class="grid"></main>`;
  const grid = app.querySelector('.grid')!;
  for (const id of sketchIds) {
    const s = await load(id).catch(() => undefined);
    const a = document.createElement('a');
    a.className = 'card';
    a.href = `#/${id}`;
    a.innerHTML = `<div class="thumb"><img src="/sketches/${id}/thumb.png?${Date.now()}" onerror="this.remove()"></div>
      <div class="info"><strong>${s?.meta.title ?? id}</strong><span class="muted">${s?.engine ?? 'error'} · ${id}</span></div>`;
    grid.appendChild(a);
  }
}

// ---------- viewer ----------

type Saved = { params?: Record<string, unknown>; seed?: number };
const storeKey = (id: string) => `sketch:${id}`;
const readSaved = (id: string): Saved => {
  try { return JSON.parse(localStorage.getItem(storeKey(id)) ?? '{}'); } catch { return {}; }
};
const writeSaved = (id: string, s: Saved) => {
  try { localStorage.setItem(storeKey(id), JSON.stringify(s)); } catch {}
};

async function api(path: string, body?: unknown) {
  const r = await fetch(`/__api/${path}`, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
const pngBase64 = async (c: HTMLCanvasElement) => {
  const buf = new Uint8Array(await (await canvasToPng(c)).arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
};

async function viewer(id: string) {
  const sketch = await load(id);
  app.innerHTML = `<header class="top"><a href="#/">← gallery</a><h1>${sketch.meta.title}</h1><span class="muted">${sketch.engine} · sketches/${id}/</span><span class="status muted"></span></header>
    <main class="viewer"><div class="stage"><div class="canvas-wrap"></div><pre class="error" hidden></pre></div><aside class="panel"></aside></main>`;
  const wrap = app.querySelector<HTMLElement>('.canvas-wrap')!;
  const errEl = app.querySelector<HTMLElement>('.error')!;
  const statusEl = app.querySelector<HTMLElement>('.status')!;
  const status = (msg: string) => { statusEl.textContent = msg; };

  const saved = readSaved(id);
  const values = initValues(sketch.params, saved.params);
  const [width, height] = sketch.meta.size ?? [800, 800];
  const ctx: Ctx = { seed: saved.seed ?? 1, width, height };
  const persist = () => writeSaved(id, { params: values, seed: ctx.seed });

  let engine: Engine | undefined;
  const mount = () => {
    engine?.destroy();
    engine = undefined;
    wrap.innerHTML = '';
    errEl.hidden = true;
    try {
      engine = sketch.engine === 'p5' ? mountP5(wrap, sketch, values, ctx) : mountGlsl(wrap, sketch, values, ctx);
    } catch (e) {
      errEl.textContent = String((e as Error).message ?? e);
      errEl.hidden = false;
    }
  };
  mount();

  // Auto-thumbnail for the gallery if this sketch doesn't have one yet.
  const thumbTimer = setTimeout(async () => {
    const r = await fetch(`/sketches/${id}/thumb.png`, { method: 'HEAD' });
    if ((!r.ok || !r.headers.get('content-type')?.includes('image')) && engine) {
      await api('thumb', { id, png: await pngBase64(engine.canvas) }).catch(() => {});
    }
  }, 1500);

  // ----- controls -----
  const pane = new Pane({ container: app.querySelector<HTMLElement>('.panel')!, title: 'Controls' });
  buildPane(pane, sketch.params, values, persist, name => engine?.button(name));

  const sys = { seed: ctx.seed, playing: true, seconds: sketch.meta.loop ?? 5, fps: sketch.meta.fps ?? 60, snapshot: '' };
  const sf = pane.addFolder({ title: 'Sketch' });
  sf.addBinding(sys, 'playing', { label: 'play (space)' }).on('change', e => (e.value ? engine?.play() : engine?.pause()));
  sf.addBinding(sys, 'seed', { step: 1, min: 0 }).on('change', e => { ctx.seed = e.value; persist(); mount(); });
  sf.addButton({ title: 'Random seed (r)' }).on('click', () => { sys.seed = Math.floor(Math.random() * 1e6); pane.refresh(); });
  sf.addButton({ title: 'Restart' }).on('click', () => engine?.reset());
  sf.addButton({ title: 'Reset params' }).on('click', () => { Object.assign(values, initValues(sketch.params)); pane.refresh(); persist(); });

  const ef = pane.addFolder({ title: 'Export' });
  const savePng = async () => {
    if (!engine) return;
    download(await canvasToPng(engine.canvas), `${id}-${ctx.seed}-${stamp()}.png`);
  };
  const snapshot = async () => {
    if (!engine) return;
    const name = stamp();
    await api('snapshot', { id, name, png: await pngBase64(engine.canvas), state: { params: values, seed: ctx.seed } });
    status(`saved snapshots/${name}`);
    refreshSnapshots();
  };
  ef.addButton({ title: 'PNG (s)' }).on('click', savePng);
  ef.addButton({ title: 'Snapshot to repo (S)' }).on('click', snapshot);
  ef.addButton({ title: 'Set as gallery thumbnail' }).on('click', async () => {
    if (engine) { await api('thumb', { id, png: await pngBase64(engine.canvas) }); status('thumbnail updated'); }
  });
  ef.addBinding(sys, 'seconds', { min: 0.5, max: 120, step: 0.5, label: 'video sec' });
  ef.addBinding(sys, 'fps', { options: { 24: 24, 30: 30, 60: 60 } });
  ef.addButton({ title: 'Record MP4' }).on('click', async () => {
    if (!engine) return;
    if (!('VideoEncoder' in window)) return status('WebCodecs not supported in this browser');
    const blob = await recordMp4(engine, sys.seconds, sys.fps, p => status(`recording ${Math.round(p * 100)}%`));
    download(blob, `${id}-${ctx.seed}-${stamp()}.mp4`);
    status('video saved');
    sys.playing = true;
    pane.refresh();
  });

  // Snapshots: restore params + seed from sketches/<id>/snapshots/*.json
  const snapFolder = pane.addFolder({ title: 'Snapshots', expanded: false });
  let snapList: ReturnType<typeof snapFolder.addBlade> | undefined;
  async function refreshSnapshots() {
    const names: string[] = await api(`snapshots?id=${encodeURIComponent(id)}`).catch(() => []);
    snapList?.dispose();
    if (!names.length) return;
    snapList = snapFolder.addBlade({
      view: 'list', label: 'restore', value: '',
      options: [{ text: '—', value: '' }, ...names.map(n => ({ text: n, value: n }))],
    });
    (snapList as any).on('change', async (e: { value: string }) => {
      if (!e.value) return;
      const s: Saved = await (await fetch(`/sketches/${id}/snapshots/${e.value}.json`)).json();
      Object.assign(values, initValues(sketch.params, s.params));
      sys.seed = s.seed ?? sys.seed;
      pane.refresh();
      status(`restored ${e.value}`);
    });
  }
  refreshSnapshots();

  const onKey = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('input, textarea, select')) return;
    if (e.key === ' ') { e.preventDefault(); sys.playing = !sys.playing; pane.refresh(); }
    else if (e.key === 'r') { sys.seed = Math.floor(Math.random() * 1e6); pane.refresh(); }
    else if (e.key === 's') void savePng();
    else if (e.key === 'S') void snapshot();
  };
  window.addEventListener('keydown', onKey);

  cleanup = () => {
    clearTimeout(thumbTimer);
    window.removeEventListener('keydown', onKey);
    pane.dispose();
    engine?.destroy();
  };
}
