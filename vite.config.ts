import { defineConfig, type Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const SKETCHES = path.resolve('sketches');

/** Dev-only API so the viewer can write snapshots/thumbnails into the repo. */
function sketchApi(): Plugin {
  const dir = (id: string) => {
    const d = path.join(SKETCHES, path.basename(id));
    if (!fs.existsSync(d)) throw new Error(`unknown sketch ${id}`);
    return d;
  };
  const body = (req: any) => new Promise<any>((res, rej) => {
    let s = '';
    req.on('data', (c: Buffer) => (s += c));
    req.on('end', () => { try { res(JSON.parse(s)); } catch (e) { rej(e); } });
  });
  return {
    name: 'sketch-api',
    configureServer(server) {
      server.middlewares.use('/__api', async (req, res) => {
        try {
          const url = new URL(req.url!, 'http://x');
          let out: unknown = { ok: true };
          if (url.pathname === '/snapshot' && req.method === 'POST') {
            const { id, name, png, state } = await body(req);
            const snaps = path.join(dir(id), 'snapshots');
            fs.mkdirSync(snaps, { recursive: true });
            const base = path.join(snaps, path.basename(name));
            fs.writeFileSync(`${base}.png`, Buffer.from(png, 'base64'));
            fs.writeFileSync(`${base}.json`, JSON.stringify(state, null, 2) + '\n');
          } else if (url.pathname === '/thumb' && req.method === 'POST') {
            const { id, png } = await body(req);
            fs.writeFileSync(path.join(dir(id), 'thumb.png'), Buffer.from(png, 'base64'));
          } else if (url.pathname === '/snapshots') {
            const snaps = path.join(dir(url.searchParams.get('id')!), 'snapshots');
            out = fs.existsSync(snaps)
              ? fs.readdirSync(snaps).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort().reverse()
              : [];
          } else {
            res.statusCode = 404;
            return res.end('not found');
          }
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(out));
        } catch (e) {
          res.statusCode = 500;
          res.end(String(e));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [sketchApi()],
  server: {
    open: true,
    // Don't full-reload the page when snapshots/thumbnails are written.
    watch: { ignored: ['**/snapshots/**', '**/thumb.png'] },
  },
});
