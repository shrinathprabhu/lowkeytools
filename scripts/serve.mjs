import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { handleFollow } from '../api/follow.js';
import { build } from './build.mjs';
import { statusPages, renderStatus } from '../lib/status-pages.mjs';
import { mockAnalytics } from '../lib/analytics.mjs';

await build();
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const types = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', svg: 'image/svg+xml', png: 'image/png', ico: 'image/x-icon', xml: 'application/xml', txt: 'text/plain; charset=utf-8', webmanifest: 'application/manifest+json', woff2: 'font/woff2' };
const port = Number(process.env.PORT || 4321);
createServer(async (req, res) => {
  const error = async (code, extra = {}) => {
    let body;
    try { body = await readFile(root + code + '.html', 'utf8'); } catch { body = renderStatus(code); }
    body = mockAnalytics(body);
    res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, follow', ...extra });
    res.end(req.method === 'HEAD' ? undefined : body);
  };
  const url = new URL(req.url, `http://localhost:${port}`);
  if (['/follow', '/follow/', '/api/follow'].includes(url.pathname)) {
    const request = new Request(url, { method: req.method, headers: req.headers, ...(!['GET', 'HEAD'].includes(req.method) ? { body: req, duplex: 'half' } : {}) });
    try {
      const result = await handleFollow(request);
      res.writeHead(result.status, Object.fromEntries(result.headers));
      res.end(req.method === 'HEAD' ? undefined : Buffer.from(await result.arrayBuffer()));
    } catch { await error(500); }
    return;
  }
  if (!['GET', 'HEAD'].includes(req.method)) { await error(405, { Allow: 'GET, HEAD' }); return; }
  let path;
  try { path = decodeURIComponent(url.pathname); } catch { await error(400); return; }
  // Only serve generated public files, never source, dotfiles or parent paths.
  if (path.split('/').some(part => part.startsWith('.') && !(part === '.well-known' && path.startsWith('/.well-known/'))) || path.includes('\\')) { await error(404); return; }
  const statusMatch = path.match(/^\/(\d{3})(?:\.html)?$/);
  if (statusMatch && statusPages[statusMatch[1]]) { await error(Number(statusMatch[1])); return; }
  try {
    const file = path === '/' ? 'index.html' : path.slice(1);
    let body = await readFile(root + file);
    if (file.endsWith('.html')) body = mockAnalytics(body.toString());
    res.writeHead(200, { 'Content-Type': types[file.split('.').pop()] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (failure) {
    await error(['ENOENT', 'ENOTDIR', 'EISDIR'].includes(failure.code) ? 404 : 500);
  }
}).listen(port, '127.0.0.1', () => console.log(`Preview: http://localhost:${port}`));
