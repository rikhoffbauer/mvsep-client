import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve, relative, sep } from 'node:path';

const root = resolve('dist');
// Documentation is served from the Vercel domain root, never a project subpath.
const base = '/';
const pages = [];
async function walk(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) await walk(path);
    else if (path.endsWith('.html')) pages.push(path);
  }
}
await walk(root);
if (pages.length < 20) throw new Error(`Expected at least 20 generated pages; found ${pages.length}`);

const errors = [];
let checked = 0;
for (const page of pages) {
  const html = await readFile(page, 'utf8');
  for (const [, raw] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(?:https?:|mailto:|tel:|data:|javascript:|#)/.test(raw)) continue;
    const path = decodeURI(raw.split(/[?#]/, 1)[0]);
    if (!path) continue;
    if (!path.startsWith('/')) continue; // non-root-relative link
    if (path.startsWith('/mvsep-client/')) {
      errors.push(`${relative(root, page)}: obsolete GitHub Pages prefix ${raw}`);
      continue;
    }
    const fromRoot = path.slice(base.length).replace(/^\/+/, '');
    const target = resolve(root, fromRoot);
    if (!target.startsWith(root + sep) && target !== root) {
      errors.push(`${relative(root, page)}: URL escapes docs root ${raw}`);
      continue;
    }
    let exists = false;
    for (const candidate of [target, join(target, 'index.html')]) {
      try { if ((await stat(candidate)).isFile()) { exists = true; break; } }
      catch { /* try another candidate */ }
    }
    checked++;
    if (!exists) errors.push(`${relative(root, page)}: unresolved ${raw}`);
  }
}
if (errors.length) {
  console.error(errors.slice(0, 40).join('\n'));
  throw new Error(`${errors.length} broken local links/assets`);
}
console.log(`Internal-link check passed: ${pages.length} pages, ${checked} links/assets checked`);
