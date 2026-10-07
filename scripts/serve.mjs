#!/usr/bin/env node
// Zero-dependency static server for the repository root, so the site can read the plugin's markdown files.
// Usage: node scripts/serve.mjs [port]   (default 4173), then open http://localhost:4173/site/
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, dirname, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2] || process.env.PORT || 4173);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.md': 'text/markdown', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/') { res.writeHead(302, { Location: '/site/' }); return res.end(); }
  if (path.endsWith('/')) path += 'index.html';
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT + sep) || file.includes(`${sep}.git${sep}`)) { res.writeHead(403); return res.end('Forbidden'); }
  try {
    if (!(await stat(file)).isFile()) throw new Error('not a file');
    res.writeHead(200, { 'Content-Type': `${TYPES[extname(file)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-cache' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Мозг 1С: http://localhost:${PORT}/site/  (Ctrl+C - остановить)`));
