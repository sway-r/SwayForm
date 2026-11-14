import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.txt': 'text/plain',
};

// Same routes vercel.json sends to the portal on learning.swayform.net.
const PORTAL_ROUTES = [/^\/$/, /^\/login$/, /^\/learn(\/.*)?$/, /^\/account$/, /^\/help(\/.*)?$/, /^\/settings$/, /^\/my-robot$/, /^\/admin$/, /^\/workspace$/];

// Starts you signed in as a guest so there is no login screen and no backend.
// With --admin (node preview-portal.mjs --admin) it starts you in the admin view
// instead, so every lab is unlocked with answers shown. Local preview only.
const ADMIN = process.argv.includes('--admin');
// There is no backend here, so a sign-out can never be "confirmed". Clear any
// leftover pending sign-out, or the login screen disables Continue as Guest.
const CLEAR_PENDING_LOGOUT = `<script>try{localStorage.removeItem('swayform.portal.logout-pending');const u=new URL(location.href);if(u.searchParams.get('logout')==='pending'){u.searchParams.delete('logout');history.replaceState(null,'',u)}}catch(e){}</script>`;
const GUEST = CLEAR_PENDING_LOGOUT + (ADMIN
  ? `<script>try{localStorage.setItem('swayform.portal.session',JSON.stringify({mode:'admin',displayName:'Local Preview (admin view)',startedAt:new Date().toISOString()}))}catch(e){}</script>`
  : `<script>try{const s=JSON.parse(localStorage.getItem('swayform.portal.session')||'null');if(!s||s.mode==='admin')localStorage.setItem('swayform.portal.session',JSON.stringify({mode:'guest',displayName:'Local Preview',startedAt:new Date().toISOString()}))}catch(e){}</script>`);

function send(res, code, type, body) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { return send(res, 400, 'text/plain', 'Bad request'); }

  // Let sign-out finish locally (only guest sessions exist in preview).
  if (p === '/api/auth/logout') return send(res, 200, 'application/json', '{"ok":true}');
  if (p === '/api/auth/session') return send(res, 200, 'application/json', '{"session":null}');
  if (p.startsWith('/api/')) return send(res, 404, 'application/json', '{"error":"No backend in local preview"}');

  if (PORTAL_ROUTES.some((re) => re.test(p))) {
    const html = fs.readFileSync(path.join(ROOT, 'portal', 'index.html'), 'utf8')
      .replace('<script src="/site-data.js"></script>', GUEST + '\n<script src="/site-data.js"></script>');
    return send(res, 200, TYPES['.html'], html);
  }

  const file = path.join(ROOT, p);
  const parts = path.relative(ROOT, file).split(path.sep);
  if (parts[0] === '..' || parts.some((s) => s.startsWith('.') || s === 'node_modules')) return send(res, 404, 'text/plain', 'Not found');

  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'text/plain', 'Not found');
    send(res, 200, TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', data);
  });
}).listen(PORT, '127.0.0.1', () => console.log(`Learning Portal preview${ADMIN ? ' (admin view)' : ''}: http://localhost:${PORT}/learn`));
