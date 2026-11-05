// AJC Construction — Sistem Dalaman (Ukuran & Kehadiran)
// Node.js 22.13+ sahaja. Tiada library luaran diperlukan.
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'public');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------- Database ----------
const db = new DatabaseSync(path.join(DATA_DIR, 'ajc.db'));
db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'staff',           -- admin | staff
  pass_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  client TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  lat REAL, lng REAL,
  radius_m INTEGER NOT NULL DEFAULT 200,
  status TEXT NOT NULL DEFAULT 'ukur',          -- ukur | fabrikasi | pasang | siap
  notes TEXT DEFAULT '',
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS measurements (
  id INTEGER PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  location TEXT NOT NULL,                       -- cth: "Pintu utama", "Bilik 2 - tingkap"
  item_type TEXT NOT NULL,
  width_mm INTEGER NOT NULL,
  height_mm INTEGER NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  panels INTEGER,
  glass TEXT DEFAULT '',
  frame_color TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  photo TEXT,
  measured_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  in_at TEXT NOT NULL,
  in_lat REAL, in_lng REAL, in_acc REAL, in_dist_m REAL, in_ok INTEGER,
  out_at TEXT,
  out_lat REAL, out_lng REAL, out_acc REAL, out_dist_m REAL, out_ok INTEGER,
  note TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_att_user ON attendance(user_id, in_at);
CREATE INDEX IF NOT EXISTS idx_meas_proj ON measurements(project_id);
`);

// ---------- Helpers ----------
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(pw, salt, 64).toString('hex');
  return `${salt}:${h}`;
}
function checkPassword(pw, stored) {
  const [salt, h] = String(stored).split(':');
  if (!salt || !h) return false;
  const test = crypto.scryptSync(pw, salt, 64);
  return crypto.timingSafeEqual(test, Buffer.from(h, 'hex'));
}
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
const num = (v) => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v));
const str = (v, max = 500) => String(v ?? '').trim().slice(0, max);
const nowIso = () => new Date().toISOString();

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

// Seed admin pertama
if (!db.prepare('SELECT COUNT(*) c FROM users').get().c) {
  const pw = process.env.ADMIN_PASSWORD || 'ajc12345';
  db.prepare('INSERT INTO users (username,name,role,pass_hash) VALUES (?,?,?,?)')
    .run('admin', 'Pentadbir AJC', 'admin', hashPassword(pw));
  console.log(`[AJC] Akaun admin dicipta -> username: admin  password: ${pw}  (sila tukar selepas log masuk)`);
}

// ---------- HTTP plumbing ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };

function send(res, status, body, headers = {}) {
  const isBuf = Buffer.isBuffer(body) || typeof body === 'string';
  res.writeHead(status, { 'Content-Type': isBuf ? 'text/plain; charset=utf-8' : 'application/json', 'Cache-Control': 'no-store', ...headers });
  res.end(isBuf ? body : JSON.stringify(body));
}
function readBody(req, limit = 10 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new HttpError(413, 'Fail terlalu besar')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new HttpError(400, 'Data tidak sah')); }
    });
    req.on('error', reject);
  });
}
function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function currentUser(req) {
  const token = parseCookies(req).ajc_sess;
  if (!token) return null;
  const row = db.prepare(`SELECT u.id,u.username,u.name,u.phone,u.role,u.active,s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?`).get(token);
  if (!row || row.expires_at < Date.now() || !row.active) return null;
  return row;
}
function savePhoto(dataUrl) {
  const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(dataUrl || '');
  if (!m) return null;
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), Buffer.from(m[2], 'base64'));
  return name;
}
function removePhoto(name) {
  if (name && /^[\w.-]+$/.test(name)) fs.rm(path.join(UPLOAD_DIR, name), { force: true }, () => {});
}

// ---------- Routes ----------
const routes = [];
const route = (method, pattern, opts, handler) => {
  if (typeof opts === 'function') { handler = opts; opts = {}; }
  const keys = []; const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ method, re, keys, handler, auth: opts.auth ?? 'user' });
};
const requireAdmin = (u) => { if (u.role !== 'admin') throw new HttpError(403, 'Hanya admin dibenarkan'); };

// Auth
route('POST', '/api/login', { auth: 'none' }, async ({ body, res }) => {
  const u = db.prepare('SELECT * FROM users WHERE username=? COLLATE NOCASE').get(str(body.username, 60));
  if (!u || !u.active || !checkPassword(String(body.password || ''), u.pass_hash)) throw new HttpError(401, 'Username atau kata laluan salah');
  const token = crypto.randomBytes(32).toString('hex');
  const days = 30;
  db.prepare('INSERT INTO sessions (token,user_id,expires_at) VALUES (?,?,?)').run(token, u.id, Date.now() + days * 864e5);
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  res.setHeader('Set-Cookie', `ajc_sess=${token}; HttpOnly; Path=/; Max-Age=${days * 86400}; SameSite=Lax${process.env.SECURE_COOKIE === '1' ? '; Secure' : ''}`);
  return { id: u.id, username: u.username, name: u.name, role: u.role };
});
route('POST', '/api/logout', { auth: 'none' }, ({ req, res }) => {
  const t = parseCookies(req).ajc_sess; if (t) db.prepare('DELETE FROM sessions WHERE token=?').run(t);
  res.setHeader('Set-Cookie', 'ajc_sess=; Path=/; Max-Age=0'); return { ok: true };
});
route('GET', '/api/me', ({ user }) => ({ id: user.id, username: user.username, name: user.name, phone: user.phone, role: user.role }));
route('POST', '/api/me/password', ({ user, body }) => {
  const u = db.prepare('SELECT pass_hash FROM users WHERE id=?').get(user.id);
  if (!checkPassword(String(body.current || ''), u.pass_hash)) throw new HttpError(400, 'Kata laluan semasa salah');
  if (String(body.next || '').length < 6) throw new HttpError(400, 'Kata laluan baru mesti sekurang-kurangnya 6 aksara');
  db.prepare('UPDATE users SET pass_hash=? WHERE id=?').run(hashPassword(body.next), user.id);
  return { ok: true };
});

// Staff (admin)
route('GET', '/api/users', ({ user }) => {
  requireAdmin(user);
  return db.prepare('SELECT id,username,name,phone,role,active,created_at FROM users ORDER BY active DESC, name').all();
});
route('POST', '/api/users', ({ user, body }) => {
  requireAdmin(user);
  const username = str(body.username, 40).toLowerCase();
  if (!/^[a-z0-9._-]{3,}$/.test(username)) throw new HttpError(400, 'Username: min 3 aksara, huruf kecil/nombor sahaja');
  if (String(body.password || '').length < 6) throw new HttpError(400, 'Kata laluan min 6 aksara');
  if (!str(body.name)) throw new HttpError(400, 'Nama diperlukan');
  try {
    const r = db.prepare('INSERT INTO users (username,name,phone,role,pass_hash) VALUES (?,?,?,?,?)')
      .run(username, str(body.name, 100), str(body.phone, 30), body.role === 'admin' ? 'admin' : 'staff', hashPassword(body.password));
    return { id: Number(r.lastInsertRowid) };
  } catch { throw new HttpError(400, 'Username sudah digunakan'); }
});
route('PATCH', '/api/users/:id', ({ user, body, params }) => {
  requireAdmin(user);
  const id = Number(params.id);
  const t = db.prepare('SELECT * FROM users WHERE id=?').get(id); if (!t) throw new HttpError(404, 'Staff tidak dijumpai');
  if (id === user.id && (body.active === false || body.role === 'staff')) throw new HttpError(400, 'Anda tidak boleh nyahaktif / turunkan akaun sendiri');
  db.prepare('UPDATE users SET name=?, phone=?, role=?, active=? WHERE id=?').run(
    body.name !== undefined ? str(body.name, 100) : t.name,
    body.phone !== undefined ? str(body.phone, 30) : t.phone,
    body.role ? (body.role === 'admin' ? 'admin' : 'staff') : t.role,
    body.active !== undefined ? (body.active ? 1 : 0) : t.active, id);
  if (body.password) {
    if (String(body.password).length < 6) throw new HttpError(400, 'Kata laluan min 6 aksara');
    db.prepare('UPDATE users SET pass_hash=? WHERE id=?').run(hashPassword(body.password), id);
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);
  }
  if (body.active === false) db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);
  return { ok: true };
});

// Projects
const STATUSES = ['ukur', 'fabrikasi', 'pasang', 'siap'];
function projectFields(body, old = {}) {
  const pick = (k, f) => (body[k] !== undefined ? f(body[k]) : old[k]);
  const p = {
    code: pick('code', (v) => str(v, 30)), name: pick('name', (v) => str(v, 150)), client: pick('client', (v) => str(v, 150)),
    phone: pick('phone', (v) => str(v, 30)), address: pick('address', (v) => str(v, 400)),
    lat: pick('lat', num), lng: pick('lng', num), radius_m: pick('radius_m', (v) => Math.max(30, Math.min(5000, num(v) || 200))),
    status: pick('status', (v) => (STATUSES.includes(v) ? v : 'ukur')), notes: pick('notes', (v) => str(v, 2000)),
  };
  if (!p.name) throw new HttpError(400, 'Nama projek diperlukan');
  for (const k in p) if (p[k] === undefined) p[k] = null;
  return p;
}
route('GET', '/api/projects', ({ query }) => {
  const q = `%${str(query.get('q'), 100)}%`;
  const status = query.get('status');
  return db.prepare(`
    SELECT p.*, COUNT(m.id) AS item_count, COALESCE(SUM(m.qty),0) AS unit_count,
      COALESCE(SUM(m.width_mm*m.height_mm*m.qty),0)/1e6 AS area_m2
    FROM projects p LEFT JOIN measurements m ON m.project_id=p.id
    WHERE (p.name LIKE ?1 OR p.client LIKE ?1 OR p.address LIKE ?1 OR IFNULL(p.code,'') LIKE ?1
      OR EXISTS (SELECT 1 FROM measurements x WHERE x.project_id=p.id AND (x.location LIKE ?1 OR x.item_type LIKE ?1)))
      AND (?2 IS NULL OR p.status=?2)
    GROUP BY p.id ORDER BY p.updated_at DESC`).all(q, STATUSES.includes(status) ? status : null);
});
route('POST', '/api/projects', ({ user, body }) => {
  const p = projectFields(body);
  const r = db.prepare(`INSERT INTO projects (code,name,client,phone,address,lat,lng,radius_m,status,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(p.code || '', p.name, p.client || '', p.phone || '', p.address || '', p.lat, p.lng, p.radius_m || 200, p.status || 'ukur', p.notes || '', user.id);
  const id = Number(r.lastInsertRowid);
  if (!p.code) db.prepare('UPDATE projects SET code=? WHERE id=?').run(`AJC-${new Date().getFullYear()}-${String(id).padStart(3, '0')}`, id);
  return { id };
});
route('GET', '/api/projects/:id', ({ params }) => {
  const p = db.prepare('SELECT p.*, u.name AS created_by_name FROM projects p LEFT JOIN users u ON u.id=p.created_by WHERE p.id=?').get(Number(params.id));
  if (!p) throw new HttpError(404, 'Projek tidak dijumpai');
  p.measurements = db.prepare(`SELECT m.*, u.name AS measured_by_name FROM measurements m LEFT JOIN users u ON u.id=m.measured_by WHERE project_id=? ORDER BY m.id`).all(p.id);
  return p;
});
route('PATCH', '/api/projects/:id', ({ body, params }) => {
  const old = db.prepare('SELECT * FROM projects WHERE id=?').get(Number(params.id));
  if (!old) throw new HttpError(404, 'Projek tidak dijumpai');
  const p = projectFields(body, old);
  db.prepare(`UPDATE projects SET code=?,name=?,client=?,phone=?,address=?,lat=?,lng=?,radius_m=?,status=?,notes=?,updated_at=? WHERE id=?`)
    .run(p.code, p.name, p.client, p.phone, p.address, p.lat, p.lng, p.radius_m, p.status, p.notes, nowIso(), old.id);
  return { ok: true };
});
route('DELETE', '/api/projects/:id', ({ user, params }) => {
  requireAdmin(user);
  const id = Number(params.id);
  for (const m of db.prepare('SELECT photo FROM measurements WHERE project_id=?').all(id)) removePhoto(m.photo);
  db.prepare('DELETE FROM projects WHERE id=?').run(id);
  return { ok: true };
});

// Measurements
function measurementFields(body, old = {}) {
  const pick = (k, f) => (body[k] !== undefined ? f(body[k]) : old[k]);
  const m = {
    location: pick('location', (v) => str(v, 150)), item_type: pick('item_type', (v) => str(v, 60)),
    width_mm: pick('width_mm', (v) => Math.round(num(v) || 0)), height_mm: pick('height_mm', (v) => Math.round(num(v) || 0)),
    qty: pick('qty', (v) => Math.max(1, Math.round(num(v) || 1))), panels: pick('panels', (v) => (num(v) ? Math.round(num(v)) : null)),
    glass: pick('glass', (v) => str(v, 80)), frame_color: pick('frame_color', (v) => str(v, 60)), notes: pick('notes', (v) => str(v, 2000)),
  };
  if (!m.location) throw new HttpError(400, 'Lokasi / label diperlukan');
  if (!m.item_type) throw new HttpError(400, 'Jenis item diperlukan');
  if (!(m.width_mm > 0 && m.width_mm < 20000) || !(m.height_mm > 0 && m.height_mm < 20000)) throw new HttpError(400, 'Lebar dan tinggi mesti antara 1 – 20000 mm');
  for (const k in m) if (m[k] === undefined) m[k] = null;
  return m;
}
const touchProject = (id) => db.prepare('UPDATE projects SET updated_at=? WHERE id=?').run(nowIso(), id);
route('POST', '/api/projects/:id/measurements', ({ user, body, params }) => {
  const pid = Number(params.id);
  if (!db.prepare('SELECT 1 FROM projects WHERE id=?').get(pid)) throw new HttpError(404, 'Projek tidak dijumpai');
  const m = measurementFields(body);
  const photo = body.photo ? savePhoto(body.photo) : null;
  const r = db.prepare(`INSERT INTO measurements (project_id,location,item_type,width_mm,height_mm,qty,panels,glass,frame_color,notes,photo,measured_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(pid, m.location, m.item_type, m.width_mm, m.height_mm, m.qty, m.panels, m.glass || '', m.frame_color || '', m.notes || '', photo, user.id);
  touchProject(pid);
  return { id: Number(r.lastInsertRowid) };
});
route('PATCH', '/api/measurements/:id', ({ body, params }) => {
  const old = db.prepare('SELECT * FROM measurements WHERE id=?').get(Number(params.id));
  if (!old) throw new HttpError(404, 'Ukuran tidak dijumpai');
  const m = measurementFields(body, old);
  let photo = old.photo;
  if (body.photo === null) { removePhoto(old.photo); photo = null; }
  else if (typeof body.photo === 'string' && body.photo.startsWith('data:')) { removePhoto(old.photo); photo = savePhoto(body.photo); }
  db.prepare(`UPDATE measurements SET location=?,item_type=?,width_mm=?,height_mm=?,qty=?,panels=?,glass=?,frame_color=?,notes=?,photo=?,updated_at=? WHERE id=?`)
    .run(m.location, m.item_type, m.width_mm, m.height_mm, m.qty, m.panels, m.glass, m.frame_color, m.notes, photo, nowIso(), old.id);
  touchProject(old.project_id);
  return { ok: true };
});
route('DELETE', '/api/measurements/:id', ({ params }) => {
  const old = db.prepare('SELECT * FROM measurements WHERE id=?').get(Number(params.id));
  if (!old) throw new HttpError(404, 'Ukuran tidak dijumpai');
  removePhoto(old.photo);
  db.prepare('DELETE FROM measurements WHERE id=?').run(old.id);
  touchProject(old.project_id);
  return { ok: true };
});

// Attendance
function geoCheck(projectId, lat, lng) {
  if (!projectId) return { dist: null, ok: null };
  const p = db.prepare('SELECT lat,lng,radius_m FROM projects WHERE id=?').get(projectId);
  if (!p) throw new HttpError(404, 'Projek tidak dijumpai');
  if (p.lat == null || p.lng == null) return { dist: null, ok: null };
  const dist = Math.round(haversine(lat, lng, p.lat, p.lng));
  return { dist, ok: dist <= p.radius_m ? 1 : 0 };
}
function needCoords(body) {
  const lat = num(body.lat), lng = num(body.lng);
  if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new HttpError(400, 'Lokasi GPS diperlukan. Sila benarkan akses lokasi.');
  return { lat, lng, acc: num(body.acc) };
}
const openShift = (uid) => db.prepare(`SELECT a.*, p.name AS project_name FROM attendance a LEFT JOIN projects p ON p.id=a.project_id WHERE user_id=? AND out_at IS NULL ORDER BY in_at DESC LIMIT 1`).get(uid);
route('GET', '/api/attendance/status', ({ user }) => ({ open: openShift(user.id) || null }));
route('POST', '/api/attendance/in', ({ user, body }) => {
  if (openShift(user.id)) throw new HttpError(400, 'Anda sudah punch in. Sila punch out dahulu.');
  const { lat, lng, acc } = needCoords(body);
  const pid = num(body.project_id);
  const g = geoCheck(pid, lat, lng);
  db.prepare(`INSERT INTO attendance (user_id,project_id,in_at,in_lat,in_lng,in_acc,in_dist_m,in_ok,note) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(user.id, pid, nowIso(), lat, lng, acc, g.dist, g.ok, str(body.note, 300));
  return { open: openShift(user.id), dist: g.dist, ok: g.ok };
});
route('POST', '/api/attendance/out', ({ user, body }) => {
  const s = openShift(user.id); if (!s) throw new HttpError(400, 'Anda belum punch in.');
  const { lat, lng, acc } = needCoords(body);
  const g = geoCheck(s.project_id, lat, lng);
  db.prepare(`UPDATE attendance SET out_at=?,out_lat=?,out_lng=?,out_acc=?,out_dist_m=?,out_ok=?, note=CASE WHEN ?<>'' THEN TRIM(note||' '||?) ELSE note END WHERE id=?`)
    .run(nowIso(), lat, lng, acc, g.dist, g.ok, str(body.note, 300), str(body.note, 300), s.id);
  return { ok: true, dist: g.dist, inside: g.ok };
});
function attendanceRows(user, query) {
  const from = query.get('from'), to = query.get('to');
  let uid = num(query.get('user_id'));
  if (user.role !== 'admin') uid = user.id;
  return db.prepare(`
    SELECT a.*, u.name AS user_name, p.name AS project_name,
      CASE WHEN a.out_at IS NOT NULL THEN (julianday(a.out_at)-julianday(a.in_at))*24 END AS hours
    FROM attendance a JOIN users u ON u.id=a.user_id LEFT JOIN projects p ON p.id=a.project_id
    WHERE (?1 IS NULL OR a.user_id=?1) AND (?2 IS NULL OR a.in_at >= ?2) AND (?3 IS NULL OR a.in_at < ?3)
    ORDER BY a.in_at DESC LIMIT 2000`).all(uid, from || null, to || null);
}
route('GET', '/api/attendance', ({ user, query }) => attendanceRows(user, query));
route('GET', '/api/attendance.csv', ({ user, query, res }) => {
  const rows = attendanceRows(user, query);
  const tz = 'Asia/Kuala_Lumpur';
  const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { timeZone: tz, hour12: false }) : '');
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Staff', 'Projek', 'Masuk', 'Keluar', 'Jam', 'Lokasi masuk (lat,lng)', 'Jarak masuk (m)', 'Dalam kawasan (masuk)', 'Lokasi keluar (lat,lng)', 'Jarak keluar (m)', 'Dalam kawasan (keluar)', 'Nota'];
  const yn = (v) => (v == null ? '' : v ? 'Ya' : 'Tidak');
  const lines = [head.map(esc).join(',')].concat(rows.map((r) => [r.user_name, r.project_name, fmt(r.in_at), fmt(r.out_at), r.hours != null ? r.hours.toFixed(2) : '',
    r.in_lat != null ? `${r.in_lat},${r.in_lng}` : '', r.in_dist_m, yn(r.in_ok), r.out_lat != null ? `${r.out_lat},${r.out_lng}` : '', r.out_dist_m, yn(r.out_ok), r.note].map(esc).join(',')));
  res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="kehadiran-ajc.csv"' });
  res.end('﻿' + lines.join('\r\n'));
  return undefined;
});

// ---------- Server ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) {
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = r.re.exec(url.pathname); if (!m) continue;
        const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
        const user = currentUser(req);
        if (r.auth !== 'none' && !user) throw new HttpError(401, 'Sila log masuk');
        const body = ['POST', 'PATCH', 'PUT'].includes(req.method) ? await readBody(req) : {};
        const out = await r.handler({ req, res, user, body, params, query: url.searchParams });
        if (out !== undefined && !res.writableEnded) send(res, 200, out);
        return;
      }
      throw new HttpError(404, 'Tidak dijumpai');
    }
    if (url.pathname.startsWith('/uploads/')) {
      if (!currentUser(req)) throw new HttpError(401, 'Sila log masuk');
      const name = path.basename(url.pathname);
      const file = path.join(UPLOAD_DIR, name);
      if (!/^[\w.-]+$/.test(name) || !fs.existsSync(file)) throw new HttpError(404, 'Tidak dijumpai');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(name)] || 'application/octet-stream', 'Cache-Control': 'private, max-age=86400' });
      return fs.createReadStream(file).pipe(res);
    }
    // Static
    let p = path.normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
    let file = path.join(PUBLIC_DIR, p || 'index.html');
    if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(PUBLIC_DIR, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': file.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600' });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error(e);
    if (!res.headersSent) send(res, status, { error: status === 500 ? 'Ralat pelayan' : e.message });
    else res.end();
  }
});
server.listen(PORT, () => console.log(`[AJC] Sistem berjalan di http://localhost:${PORT}`));
