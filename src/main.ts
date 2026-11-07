import { Pane } from 'tweakpane';
import type { Ctx, Engine, Sketch } from './runtime/types';
import { mountP5 } from './runtime/engines/p5';
import { mountGlsl } from './runtime/engines/glsl';
import { buildPane, initValues } from './runtime/params';
import { createRng } from './lib/random';
import { canvasToPng, download, recordMp4, stamp } from './runtime/export';

const modules = import.meta.glob<{ default: Sketch }>('/sketches/*/sketch.ts');
const sketchIds = Object.keys(modules)
  .map(p => p.split('/')[2])
  .sort()
  .reverse();
const load = async (id: string) => (await modules[`/sketches/${id}/sketch.ts`]()).default;

/** Dev = local repo with the write API; prod = static build anyone can open. */
const DEV = import.meta.env.DEV;
// Bundled into the build so prod needs no server. In dev, thumbs/snapshots are read live from disk instead.
const sources = import.meta.glob<string>('/sketches/*/sketch.ts', { query: '?raw', import: 'default' });
const thumbs = import.meta.glob<string>('/sketches/*/thumb.webp', { eager: true, query: '?url', import: 'default' });
const snapshotFiles = import.meta.glob<Saved>('/sketches/*/snapshots/*.json', { import: 'default' });
const thumbUrl = (id: string) => (DEV ? `/sketches/${id}/thumb.webp?${Date.now()}` : thumbs[`/sketches/${id}/thumb.webp`]);

const app = document.getElementById('app')!;
let cleanup: (() => void) | undefined;

window.addEventListener('hashchange', route);
route();

function route() {
  cleanup?.();
  cleanup = undefined;
  app.className = '';
  const id = decodeURIComponent(location.hash.replace(/^#\/?/, '').split('?')[0]);
  if (id && sketchIds.includes(id)) void viewer(id);
  else void gallery();
}

// ---------- gallery ----------

async function gallery() {
  app.innerHTML = `<header class="top"><h1>Sketches</h1><span class="muted">${sketchIds.length} sketches${DEV ? ' · <code>pnpm new &lt;name&gt; [p5|glsl]</code>' : ''}</span></header><main class="grid"></main>`;
  const grid = app.querySelector('.grid')!;
  // Render every card immediately; titles fill in as the sketch modules load (in parallel).
  sketchIds.forEach((id, i) => {
    const a = document.createElement('a');
    a.className = 'card';
    a.href = `#/${id}`;
    const src = thumbUrl(id);
    a.innerHTML = `<div class="thumb">${src ? `<img src="${src}" width="480" height="480" decoding="async" loading="${i < 8 ? 'eager' : 'lazy'}" onerror="this.remove()">` : ''}</div>
      <div class="info"><strong>${id}</strong><span class="muted">${id}</span></div>`;
    grid.appendChild(a);
    load(id).then(
      s => { a.querySelector('strong')!.textContent = s.meta.title; a.querySelector('.muted')!.textContent = `${s.engine} · ${id}`; },
      () => { a.querySelector('.muted')!.textContent = `error · ${id}`; },
    );
  });
}

// ---------- viewer ----------

type Saved = { params?: Record<string, unknown>; seed?: number };
const storeKey = (id: string) => `sketch:${id}`;
const readSaved = (id: string): Saved => {
  try { return JSON.parse(localStorage.getItem(storeKey(id)) ?? '{}'); } catch { return {}; }
};
/** Shared links carry state in the hash: #/<id>?s=<base64url JSON>. */
const readUrlState = (): Saved | undefined => {
  const s = new URLSearchParams(location.hash.split('?')[1] ?? '').get('s');
  if (!s) return;
  try { return JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))); } catch { return; }
};
const shareUrl = (id: string, s: Saved) => {
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(s)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${location.origin}${location.pathname}#/${id}?s=${b64}`;
};
const writeSaved = (id: string, s: Saved) => {
  try { localStorage.setItem(storeKey(id), JSON.stringify(s)); } catch {}
};

async function api(path: string, body?: unknown) {
  const r = await fetch(`/__api/${path}`, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
/** Gallery thumbnail: 480px WebP, much lighter than a full-size PNG. */
const thumbBase64 = async (c: HTMLCanvasElement) => {
  const k = Math.min(1, 480 / Math.max(c.width, c.height));
  const t = document.createElement('canvas');
  t.width = Math.round(c.width * k); t.height = Math.round(c.height * k);
  t.getContext('2d')!.drawImage(c, 0, 0, t.width, t.height);
  const blob = await new Promise<Blob>(r => t.toBlob(b => r(b!), 'image/webp', 0.82));
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
};
const pngBase64 = async (c: HTMLCanvasElement) => {
  const buf = new Uint8Array(await (await canvasToPng(c)).arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
};

async function viewer(id: string) {
  const sketch = await load(id);
  app.className = 'viewer-page';
  app.innerHTML = `<header class="top"><a href="#/">← gallery</a><h1>${sketch.meta.title}</h1><span class="muted">${sketch.engine} · sketches/${id}/</span><button class="code-btn">code</button><span class="status muted"></span></header>
    <dialog class="code"><form method="dialog"><button>close</button></form><pre></pre></dialog>
    <main class="viewer"><div class="stage"><div class="canvas-wrap"></div><pre class="error" hidden></pre></div><aside class="panel"></aside></main>`;
  const wrap = app.querySelector<HTMLElement>('.canvas-wrap')!;
  const errEl = app.querySelector<HTMLElement>('.error')!;
  const statusEl = app.querySelector<HTMLElement>('.status')!;
  const status = (msg: string) => { statusEl.textContent = msg; };

  const saved = readUrlState() ?? readSaved(id);

  const codeDlg = app.querySelector<HTMLDialogElement>('dialog.code')!;
  app.querySelector('.code-btn')!.addEventListener('click', async () => {
    codeDlg.querySelector('pre')!.textContent = await sources[`/sketches/${id}/sketch.ts`]();
    codeDlg.showModal();
  });
  const values = initValues(sketch.params, saved.params);
  const [width, height] = sketch.meta.size ?? [800, 800];
  const seed = saved.seed ?? 1;
  const ctx: Ctx = { seed, width, height, rng: createRng(seed) };
  const persist = () => writeSaved(id, { params: values, seed: ctx.seed });

  let engine: Engine | undefined;
  const mount = () => {
    engine?.destroy();
    engine = undefined;
    wrap.innerHTML = '';
    errEl.hidden = true;
    ctx.rng = createRng(ctx.seed);
    try {
      engine = sketch.engine === 'p5' ? mountP5(wrap, sketch, values, ctx) : mountGlsl(wrap, sketch, values, ctx);
    } catch (e) {
      errEl.textContent = String((e as Error).message ?? e);
      errEl.hidden = false;
    }
  };
  mount();

  // Auto-thumbnail for the gallery if this sketch doesn't have one yet (dev only).
  const thumbTimer = DEV && setTimeout(async () => {
    const r = await fetch(`/sketches/${id}/thumb.webp`, { method: 'HEAD' });
    if ((!r.ok || !r.headers.get('content-type')?.includes('image')) && engine) {
      await api('thumb', { id, webp: await thumbBase64(engine.canvas) }).catch(() => {});
    }
  }, 1500);

  // ----- controls -----
  const pane = new Pane({ container: app.querySelector<HTMLElement>('.panel')!, title: 'Controls' });
  const params = buildPane(pane, sketch.params, values, persist, name => engine?.button(name));

  const sys = { seed: ctx.seed, playing: true, seconds: sketch.meta.loop ?? 5, fps: sketch.meta.fps ?? 60, snapshot: '' };
  const sf = pane.addFolder({ title: 'Sketch' });
  sf.addBinding(sys, 'playing', { label: 'play (space)' }).on('change', e => (e.value ? engine?.play() : engine?.pause()));
  sf.addBinding(sys, 'seed', { step: 1, min: 0 }).on('change', e => { ctx.seed = e.value; persist(); mount(); });
  sf.addButton({ title: 'Random seed (r)' }).on('click', () => { sys.seed = Math.floor(Math.random() * 1e6); pane.refresh(); });
  sf.addButton({ title: 'Restart' }).on('click', () => engine?.reset());
  sf.addButton({ title: 'Copy share link' }).on('click', async () => {
    const url = shareUrl(id, { params: values, seed: ctx.seed });
    history.replaceState(null, '', url);
    await navigator.clipboard.writeText(url).then(() => status('link copied'), () => status('link in address bar'));
  });
  sf.addButton({ title: 'Reset params' }).on('click', () => { Object.assign(values, initValues(sketch.params)); params.sync(); pane.refresh(); persist(); });

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
  if (DEV) {
    ef.addButton({ title: 'Snapshot to repo (S)' }).on('click', snapshot);
    ef.addButton({ title: 'Set as gallery thumbnail' }).on('click', async () => {
      if (engine) { await api('thumb', { id, webp: await thumbBase64(engine.canvas) }); status('thumbnail updated'); }
    });
  }
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
    const prefix = `/sketches/${id}/snapshots/`;
    const names: string[] = DEV
      ? await api(`snapshots?id=${encodeURIComponent(id)}`).catch(() => [])
      : Object.keys(snapshotFiles).filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length, -5)).sort().reverse();
    snapList?.dispose();
    if (!names.length) return;
    snapList = snapFolder.addBlade({
      view: 'list', label: 'restore', value: '',
      options: [{ text: '—', value: '' }, ...names.map(n => ({ text: n, value: n }))],
    });
    (snapList as any).on('change', async (e: { value: string }) => {
      if (!e.value) return;
      const s: Saved = DEV
        ? await (await fetch(`/sketches/${id}/snapshots/${e.value}.json`)).json()
        : await snapshotFiles[`/sketches/${id}/snapshots/${e.value}.json`]();
      Object.assign(values, initValues(sketch.params, s.params));
      sys.seed = s.seed ?? sys.seed;
      params.sync();
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
    else if (e.key === 'S' && DEV) void snapshot();
  };
  window.addEventListener('keydown', onKey);

  cleanup = () => {
    if (thumbTimer) clearTimeout(thumbTimer);
    window.removeEventListener('keydown', onKey);
    pane.dispose();
    engine?.destroy();
  };
}
