#!/usr/bin/env node
// Usage: pnpm new <name> [p5|glsl]
import fs from 'node:fs';
import path from 'node:path';

const [name, engine = 'p5'] = process.argv.slice(2);
if (!name || !['p5', 'glsl'].includes(engine)) {
  console.error('usage: pnpm new <name> [p5|glsl]');
  process.exit(1);
}
const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const date = new Date().toISOString().slice(0, 10);
const id = `${date}-${slug}`;
const dir = path.join('sketches', id);
if (fs.existsSync(dir)) {
  console.error(`${dir} already exists`);
  process.exit(1);
}
const title = name.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
fs.mkdirSync(dir, { recursive: true });
const fill = f => fs.readFileSync(f, 'utf8').replaceAll('__TITLE__', title);
fs.writeFileSync(path.join(dir, 'sketch.ts'), fill(`templates/${engine}/sketch.ts`));
fs.writeFileSync(path.join(dir, 'notes.md'), fill('templates/notes.md'));
console.log(`created ${dir}  →  http://localhost:5173/#/${id}`);
