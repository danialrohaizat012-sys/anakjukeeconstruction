// AJC Construction — Sistem Dalaman (Ukuran & Kehadiran)
// Backend API. Berjalan sebagai Vercel Function (api/index.js) atau server Node biasa (server.js).
// Storan: PostgreSQL (Neon / Supabase / mana-mana Postgres) melalui DATABASE_URL.
'use strict';
const crypto = require('node:crypto');
const { Pool } = require('pg');

const CONN = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!CONN) console.error('[AJC] DATABASE_URL tidak ditetapkan. Sila sambungkan database Postgres.');
const pool = new Pool({
  connectionString: CONN,
  max: Number(process.env.PG_POOL_MAX || 3),
  ssl: /localhost|127\.0\.0\.1|sslmode=disable/.test(CONN || '') ? false : { rejectUnauthorized: false },
});
const q = async (sql, params = []) => (await pool.query(sql, params)).rows;
const one = async (sql, params = []) => (await q(sql, params))[0];

// ---------- Schema (dicipta automatik kali pertama) ----------
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'staff',
  pass_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  client TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  lat DOUBLE PRECISION, lng DOUBLE PRECISION,
  radius_m INTEGER NOT NULL DEFAULT 200,
  status TEXT NOT NULL DEFAULT 'ukur',
  notes TEXT NOT NULL DEFAULT '',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  mime TEXT NOT NULL,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS measurements (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  item_type TEXT NOT NULL,
  width_mm INTEGER NOT NULL,
  height_mm INTEGER NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  panels INTEGER,
  glass TEXT NOT NULL DEFAULT '',
  frame_color TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  photo TEXT REFERENCES photos(id) ON DELETE SET NULL,
  measured_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  in_at TIMESTAMPTZ NOT NULL,
  in_lat DOUBLE PRECISION, in_lng DOUBLE PRECISION, in_acc DOUBLE PRECISION, in_dist_m DOUBLE PRECISION, in_ok BOOLEAN,
  out_at TIMESTAMPTZ,
  out_lat DOUBLE PRECISION, out_lng DOUBLE PRECISION, out_acc DOUBLE PRECISION, out_dist_m DOUBLE PRECISION, out_ok BOOLEAN,
  note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_att_user ON attendance(user_id, in_at);
CREATE INDEX IF NOT EXISTS idx_meas_proj ON measurements(project_id);
`;
let ready = null;
function init() {
  if (!ready) {
    ready = (async () => {
      await pool.query(SCHEMA);
      const { c } = await one('SELECT COUNT(*)::int AS c FROM users');
      if (!c) {
        const pw = process.env.ADMIN_PASSWORD || 'ajc12345';
        await q('INSERT INTO users (username,name,role,pass_hash) VALUES ($1,$2,$3,$4) ON CONFLICT (username) DO NOTHING',
          ['admin', 'Pentadbir AJC', 'admin', hashPassword(pw)]);
        console.log('[AJC] Akaun admin dicipta -> username: admin (sila tukar kata laluan selepas log masuk)');
      }
    })().catch((e) => { ready = null; throw e; });
  }
  return ready;
}

// ---------- Helpers ----------
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
}
function checkPassword(pw, stored) {
  const [salt, h] = String(stored).split(':');
  if (!salt || !h) return false;
  return crypto.timingSafeEqual(crypto.scryptSync(pw, salt, 64), Buffer.from(h, 'hex'));
}
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
const num = (v) => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v));
const str = (v, max = 500) => String(v ?? '').trim().slice(0, max);
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
}
async function readBody(req) {
  // Vercel mungkin sudah parse body; jika tidak, baca stream.
  if (req.body !== undefined) {
    if (Buffer.isBuffer(req.body)) req.body = req.body.toString('utf8');
    if (typeof req.body === 'string') { try { return req.body ? JSON.parse(req.body) : {}; } catch { throw new HttpError(400, 'Data tidak sah'); } }
    return req.body || {};
  }
  const limit = 6 * 1024 * 1024;
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
async function currentUser(req) {
  const token = parseCookies(req).ajc_sess;
  if (!token) return null;
  return (await one(`SELECT u.id,u.username,u.name,u.phone,u.role FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token=$1 AND s.expires_at > now() AND u.active`, [token])) || null;
}
async function savePhoto(dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl || '');
  if (!m) return null;
  const id = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  await q('INSERT INTO photos (id,mime,data) VALUES ($1,$2,$3)', [id, m[1], Buffer.from(m[2], 'base64')]);
  return id;
}
const removePhoto = (id) => (id ? q('DELETE FROM photos WHERE id=$1', [id]) : null);

// ---------- Routes ----------
const routes = [];
const route = (method, pattern, opts, handler) => {
  if (typeof opts === 'function') { handler = opts; opts = {}; }
  const keys = []; const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ method, re, keys, handler, auth: opts.auth ?? 'user' });
};
const requireAdmin = (u) => { if (u.role !== 'admin') throw new HttpError(403, 'Hanya admin dibenarkan'); };
const secureCookie = () => (process.env.VERCEL || process.env.SECURE_COOKIE === '1' ? '; Secure' : '');

// Auth
route('POST', '/api/login', { auth: 'none' }, async ({ body, res }) => {
  const u = await one('SELECT * FROM users WHERE lower(username)=lower($1)', [str(body.username, 60)]);
  if (!u || !u.active || !checkPassword(String(body.password || ''), u.pass_hash)) throw new HttpError(401, 'Username atau kata laluan salah');
  const token = crypto.randomBytes(32).toString('hex');
  const days = 30;
  await q(`INSERT INTO sessions (token,user_id,expires_at) VALUES ($1,$2,now() + make_interval(days => $3))`, [token, u.id, days]);
  await q('DELETE FROM sessions WHERE expires_at < now()');
  res.setHeader('Set-Cookie', `ajc_sess=${token}; HttpOnly; Path=/; Max-Age=${days * 86400}; SameSite=Lax${secureCookie()}`);
  return { id: u.id, username: u.username, name: u.name, role: u.role };
});
route('POST', '/api/logout', { auth: 'none' }, async ({ req, res }) => {
  const t = parseCookies(req).ajc_sess; if (t) await q('DELETE FROM sessions WHERE token=$1', [t]);
  res.setHeader('Set-Cookie', `ajc_sess=; Path=/; Max-Age=0${secureCookie()}`); return { ok: true };
});
route('GET', '/api/me', ({ user }) => user);
route('POST', '/api/me/password', async ({ user, body }) => {
  const u = await one('SELECT pass_hash FROM users WHERE id=$1', [user.id]);
  if (!checkPassword(String(body.current || ''), u.pass_hash)) throw new HttpError(400, 'Kata laluan semasa salah');
  if (String(body.next || '').length < 6) throw new HttpError(400, 'Kata laluan baru mesti sekurang-kurangnya 6 aksara');
  await q('UPDATE users SET pass_hash=$1 WHERE id=$2', [hashPassword(body.next), user.id]);
  return { ok: true };
});

// Staff (admin)
route('GET', '/api/users', async ({ user }) => {
  requireAdmin(user);
  return q('SELECT id,username,name,phone,role,active,created_at FROM users ORDER BY active DESC, name');
});
route('POST', '/api/users', async ({ user, body }) => {
  requireAdmin(user);
  const username = str(body.username, 40).toLowerCase();
  if (!/^[a-z0-9._-]{3,}$/.test(username)) throw new HttpError(400, 'Username: min 3 aksara, huruf kecil/nombor sahaja');
  if (String(body.password || '').length < 6) throw new HttpError(400, 'Kata laluan min 6 aksara');
  if (!str(body.name)) throw new HttpError(400, 'Nama diperlukan');
  const r = await one(`INSERT INTO users (username,name,phone,role,pass_hash) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (username) DO NOTHING RETURNING id`,
    [username, str(body.name, 100), str(body.phone, 30), body.role === 'admin' ? 'admin' : 'staff', hashPassword(body.password)]);
  if (!r) throw new HttpError(400, 'Username sudah digunakan');
  return r;
});
route('PATCH', '/api/users/:id', async ({ user, body, params }) => {
  requireAdmin(user);
  const id = Number(params.id);
  const t = await one('SELECT * FROM users WHERE id=$1', [id]); if (!t) throw new HttpError(404, 'Staff tidak dijumpai');
  if (id === user.id && (body.active === false || body.role === 'staff')) throw new HttpError(400, 'Anda tidak boleh nyahaktif / turunkan akaun sendiri');
  await q('UPDATE users SET name=$1, phone=$2, role=$3, active=$4 WHERE id=$5', [
    body.name !== undefined ? str(body.name, 100) : t.name,
    body.phone !== undefined ? str(body.phone, 30) : t.phone,
    body.role ? (body.role === 'admin' ? 'admin' : 'staff') : t.role,
    body.active !== undefined ? !!body.active : t.active, id]);
  if (body.password) {
    if (String(body.password).length < 6) throw new HttpError(400, 'Kata laluan min 6 aksara');
    await q('UPDATE users SET pass_hash=$1 WHERE id=$2', [hashPassword(body.password), id]);
    await q('DELETE FROM sessions WHERE user_id=$1', [id]);
  }
  if (body.active === false) await q('DELETE FROM sessions WHERE user_id=$1', [id]);
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
  for (const k of ['code', 'client', 'phone', 'address', 'notes']) p[k] = p[k] ?? '';
  p.lat = p.lat ?? null; p.lng = p.lng ?? null; p.radius_m = p.radius_m ?? 200; p.status = p.status ?? 'ukur';
  return p;
}
route('GET', '/api/projects', async ({ query }) => {
  const like = `%${str(query.get('q'), 100)}%`;
  const status = query.get('status');
  return q(`
    SELECT p.*, COUNT(m.id)::int AS item_count, COALESCE(SUM(m.qty),0)::int AS unit_count,
      (COALESCE(SUM(m.width_mm::float8*m.height_mm*m.qty),0)/1e6)::float8 AS area_m2
    FROM projects p LEFT JOIN measurements m ON m.project_id=p.id
    WHERE (p.name ILIKE $1 OR p.client ILIKE $1 OR p.address ILIKE $1 OR p.code ILIKE $1
      OR EXISTS (SELECT 1 FROM measurements x WHERE x.project_id=p.id AND (x.location ILIKE $1 OR x.item_type ILIKE $1)))
      AND ($2::text IS NULL OR p.status=$2)
    GROUP BY p.id ORDER BY p.updated_at DESC`, [like, STATUSES.includes(status) ? status : null]);
});
route('POST', '/api/projects', async ({ user, body }) => {
  const p = projectFields(body);
  const { id } = await one(`INSERT INTO projects (code,name,client,phone,address,lat,lng,radius_m,status,notes,created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [p.code, p.name, p.client, p.phone, p.address, p.lat, p.lng, p.radius_m, p.status, p.notes, user.id]);
  if (!p.code) await q('UPDATE projects SET code=$1 WHERE id=$2', [`AJC-${new Date().getFullYear()}-${String(id).padStart(3, '0')}`, id]);
  return { id };
});
route('GET', '/api/projects/:id', async ({ params }) => {
  const p = await one('SELECT p.*, u.name AS created_by_name FROM projects p LEFT JOIN users u ON u.id=p.created_by WHERE p.id=$1', [Number(params.id)]);
  if (!p) throw new HttpError(404, 'Projek tidak dijumpai');
  p.measurements = await q(`SELECT m.*, u.name AS measured_by_name FROM measurements m LEFT JOIN users u ON u.id=m.measured_by WHERE project_id=$1 ORDER BY m.id`, [p.id]);
  return p;
});
route('PATCH', '/api/projects/:id', async ({ body, params }) => {
  const old = await one('SELECT * FROM projects WHERE id=$1', [Number(params.id)]);
  if (!old) throw new HttpError(404, 'Projek tidak dijumpai');
  const p = projectFields(body, old);
  await q(`UPDATE projects SET code=$1,name=$2,client=$3,phone=$4,address=$5,lat=$6,lng=$7,radius_m=$8,status=$9,notes=$10,updated_at=now() WHERE id=$11`,
    [p.code, p.name, p.client, p.phone, p.address, p.lat, p.lng, p.radius_m, p.status, p.notes, old.id]);
  return { ok: true };
});
route('DELETE', '/api/projects/:id', async ({ user, params }) => {
  requireAdmin(user);
  const id = Number(params.id);
  const photos = (await q('SELECT photo FROM measurements WHERE project_id=$1 AND photo IS NOT NULL', [id])).map((r) => r.photo);
  await q('DELETE FROM projects WHERE id=$1', [id]);
  if (photos.length) await q('DELETE FROM photos WHERE id = ANY($1)', [photos]);
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
  for (const k of ['glass', 'frame_color', 'notes']) m[k] = m[k] ?? '';
  m.qty = m.qty ?? 1; m.panels = m.panels ?? null;
  return m;
}
const touchProject = (id) => q('UPDATE projects SET updated_at=now() WHERE id=$1', [id]);
route('POST', '/api/projects/:id/measurements', async ({ user, body, params }) => {
  const pid = Number(params.id);
  if (!(await one('SELECT 1 FROM projects WHERE id=$1', [pid]))) throw new HttpError(404, 'Projek tidak dijumpai');
  const m = measurementFields(body);
  const photo = body.photo ? await savePhoto(body.photo) : null;
  const r = await one(`INSERT INTO measurements (project_id,location,item_type,width_mm,height_mm,qty,panels,glass,frame_color,notes,photo,measured_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [pid, m.location, m.item_type, m.width_mm, m.height_mm, m.qty, m.panels, m.glass, m.frame_color, m.notes, photo, user.id]);
  await touchProject(pid);
  return r;
});
route('PATCH', '/api/measurements/:id', async ({ body, params }) => {
  const old = await one('SELECT * FROM measurements WHERE id=$1', [Number(params.id)]);
  if (!old) throw new HttpError(404, 'Ukuran tidak dijumpai');
  const m = measurementFields(body, old);
  let photo = old.photo;
  if (body.photo === null) photo = null;
  else if (typeof body.photo === 'string' && body.photo.startsWith('data:')) photo = await savePhoto(body.photo);
  await q(`UPDATE measurements SET location=$1,item_type=$2,width_mm=$3,height_mm=$4,qty=$5,panels=$6,glass=$7,frame_color=$8,notes=$9,photo=$10,updated_at=now() WHERE id=$11`,
    [m.location, m.item_type, m.width_mm, m.height_mm, m.qty, m.panels, m.glass, m.frame_color, m.notes, photo, old.id]);
  if (photo !== old.photo) await removePhoto(old.photo);
  await touchProject(old.project_id);
  return { ok: true };
});
route('DELETE', '/api/measurements/:id', async ({ params }) => {
  const old = await one('SELECT * FROM measurements WHERE id=$1', [Number(params.id)]);
  if (!old) throw new HttpError(404, 'Ukuran tidak dijumpai');
  await q('DELETE FROM measurements WHERE id=$1', [old.id]);
  await removePhoto(old.photo);
  await touchProject(old.project_id);
  return { ok: true };
});
route('GET', '/api/photos/:id', async ({ params, res }) => {
  const p = await one('SELECT mime, data FROM photos WHERE id=$1', [params.id]);
  if (!p) throw new HttpError(404, 'Gambar tidak dijumpai');
  res.writeHead(200, { 'Content-Type': p.mime, 'Cache-Control': 'private, max-age=604800, immutable' });
  res.end(p.data);
});

// Attendance
async function geoCheck(projectId, lat, lng) {
  if (!projectId) return { dist: null, ok: null };
  const p = await one('SELECT lat,lng,radius_m FROM projects WHERE id=$1', [projectId]);
  if (!p) throw new HttpError(404, 'Projek tidak dijumpai');
  if (p.lat == null || p.lng == null) return { dist: null, ok: null };
  const dist = Math.round(haversine(lat, lng, p.lat, p.lng));
  return { dist, ok: dist <= p.radius_m };
}
function needCoords(body) {
  const lat = num(body.lat), lng = num(body.lng);
  if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new HttpError(400, 'Lokasi GPS diperlukan. Sila benarkan akses lokasi.');
  return { lat, lng, acc: num(body.acc) };
}
const openShift = async (uid) => (await one(`SELECT a.*, p.name AS project_name FROM attendance a LEFT JOIN projects p ON p.id=a.project_id
  WHERE user_id=$1 AND out_at IS NULL ORDER BY in_at DESC LIMIT 1`, [uid])) || null;
route('GET', '/api/attendance/status', async ({ user }) => ({ open: await openShift(user.id) }));
route('POST', '/api/attendance/in', async ({ user, body }) => {
  if (await openShift(user.id)) throw new HttpError(400, 'Anda sudah punch in. Sila punch out dahulu.');
  const { lat, lng, acc } = needCoords(body);
  const pid = num(body.project_id);
  const g = await geoCheck(pid, lat, lng);
  await q(`INSERT INTO attendance (user_id,project_id,in_at,in_lat,in_lng,in_acc,in_dist_m,in_ok,note) VALUES ($1,$2,now(),$3,$4,$5,$6,$7,$8)`,
    [user.id, pid, lat, lng, acc, g.dist, g.ok, str(body.note, 300)]);
  return { open: await openShift(user.id), dist: g.dist, ok: g.ok };
});
route('POST', '/api/attendance/out', async ({ user, body }) => {
  const s = await openShift(user.id); if (!s) throw new HttpError(400, 'Anda belum punch in.');
  const { lat, lng, acc } = needCoords(body);
  const g = await geoCheck(s.project_id, lat, lng);
  const note = str(body.note, 300);
  await q(`UPDATE attendance SET out_at=now(),out_lat=$1,out_lng=$2,out_acc=$3,out_dist_m=$4,out_ok=$5,
    note=CASE WHEN $6<>'' THEN trim(note||' '||$6) ELSE note END WHERE id=$7`, [lat, lng, acc, g.dist, g.ok, note, s.id]);
  return { ok: true, dist: g.dist, inside: g.ok };
});
function attendanceRows(user, query) {
  let uid = num(query.get('user_id'));
  if (user.role !== 'admin') uid = user.id;
  const t = (v) => (v && !isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);
  return q(`
    SELECT a.*, u.name AS user_name, p.name AS project_name,
      CASE WHEN a.out_at IS NOT NULL THEN (EXTRACT(EPOCH FROM (a.out_at - a.in_at))/3600)::float8 END AS hours
    FROM attendance a JOIN users u ON u.id=a.user_id LEFT JOIN projects p ON p.id=a.project_id
    WHERE ($1::int IS NULL OR a.user_id=$1) AND ($2::timestamptz IS NULL OR a.in_at >= $2) AND ($3::timestamptz IS NULL OR a.in_at < $3)
    ORDER BY a.in_at DESC LIMIT 2000`, [uid, t(query.get('from')), t(query.get('to'))]);
}
route('GET', '/api/attendance', ({ user, query }) => attendanceRows(user, query));
route('GET', '/api/attendance.csv', async ({ user, query, res }) => {
  const rows = await attendanceRows(user, query);
  const fmt = (d) => (d ? new Date(d).toLocaleString('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour12: false }) : '');
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const yn = (v) => (v == null ? '' : v ? 'Ya' : 'Tidak');
  const head = ['Staff', 'Projek', 'Masuk', 'Keluar', 'Jam', 'Lokasi masuk (lat,lng)', 'Jarak masuk (m)', 'Dalam kawasan (masuk)', 'Lokasi keluar (lat,lng)', 'Jarak keluar (m)', 'Dalam kawasan (keluar)', 'Nota'];
  const lines = [head.map(esc).join(',')].concat(rows.map((r) => [r.user_name, r.project_name, fmt(r.in_at), fmt(r.out_at), r.hours != null ? r.hours.toFixed(2) : '',
    r.in_lat != null ? `${r.in_lat},${r.in_lng}` : '', r.in_dist_m, yn(r.in_ok), r.out_lat != null ? `${r.out_lat},${r.out_lng}` : '', r.out_dist_m, yn(r.out_ok), r.note].map(esc).join(',')));
  res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="kehadiran-ajc.csv"' });
  res.end('﻿' + lines.join('\r\n'));
});

// ---------- Handler ----------
async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  try {
    await init();
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const m = r.re.exec(url.pathname); if (!m) continue;
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      const user = await currentUser(req);
      if (r.auth !== 'none' && !user) throw new HttpError(401, 'Sila log masuk');
      const body = ['POST', 'PATCH', 'PUT'].includes(req.method) ? await readBody(req) : {};
      const out = await r.handler({ req, res, user, body, params, query: url.searchParams });
      if (out !== undefined && !res.writableEnded) send(res, 200, out);
      return;
    }
    throw new HttpError(404, 'Tidak dijumpai');
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error(e);
    if (!res.headersSent) send(res, status, { error: status === 500 ? 'Ralat pelayan. Cuba lagi.' : e.message });
    else res.end();
  }
}
module.exports = { handler, pool };
