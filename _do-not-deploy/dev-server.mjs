// Local preview of deploy/ with live reload: node _do-not-deploy/dev-server.mjs [port]
// Serves folder URLs from their index.html the way Netlify does (/reality/ ->
// reality/index.html), answers byte-range requests so <video> can seek, and
// reloads open pages whenever a file under deploy/ changes. No dependencies.
import { createServer } from 'node:http';
import { createReadStream, statSync, watch, readFileSync } from 'node:fs';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'deploy');
const PORT = Number(process.argv[2]) || 5500;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.mp4': 'video/mp4',
};
const RELOAD = '<script>new EventSource("/__reload").onmessage=()=>location.reload()</script>';
const clients = new Set();

let timer;
watch(ROOT, { recursive: true }, () => {
  clearTimeout(timer);
  timer = setTimeout(() => clients.forEach((res) => res.write('data: reload\n\n')), 120);
});

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  let path = normalize(join(ROOT, decodeURIComponent(url.pathname)));
  if (!path.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  let stat;
  try {
    stat = statSync(path);
    if (stat.isDirectory()) {
      // Netlify redirects /reality to /reality/, so relative links resolve from inside the folder
      if (!url.pathname.endsWith('/')) { res.writeHead(301, { Location: `${url.pathname}/${url.search}` }).end(); return; }
      path = join(path, 'index.html');
      stat = statSync(path);
    }
  } catch {
    try { stat = statSync((path = `${path}.html`)); } catch {
      path = join(ROOT, '404.html');
      res.writeHead(404, { 'Content-Type': TYPES['.html'] }).end(readFileSync(path, 'utf8').replace('</body>', `${RELOAD}</body>`));
      return;
    }
  }

  const type = TYPES[extname(path).toLowerCase()] || 'application/octet-stream';
  if (type.startsWith('text/html')) {
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(readFileSync(path, 'utf8').replace('</body>', `${RELOAD}</body>`));
    return;
  }

  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (range) {
    const start = range[1] ? Number(range[1]) : stat.size - Number(range[2]);
    const end = range[1] && range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
    res.writeHead(206, {
      'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1,
      'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Cache-Control': 'no-store',
    });
    createReadStream(path, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
  createReadStream(path).pipe(res);
}).listen(PORT, () => console.log(`Scanity preview: http://localhost:${PORT}/  (reality: http://localhost:${PORT}/reality/)`));
