/* AJC Sistem Tapak — backend DEMO dalam browser.
   Semua data disimpan dalam localStorage peranti ini sahaja (tidak dikongsi antara telefon).
   Ia meniru API yang sama dengan backend sebenar, jadi bila Supabase disambung nanti,
   hanya fail ini yang perlu diganti. */
'use strict';
(function () {
  const KEY = 'ajc_demo_db_v2';
  const SESSION = 'ajc_demo_session';
  const STATUSES = ['ukur', 'fabrikasi', 'pasang', 'siap'];

  class ApiError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
  const now = () => new Date().toISOString();
  const num = (v) => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v));
  const str = (v, max = 500) => String(v ?? '').trim().slice(0, max);
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };
  // Kata laluan demo disimpan sebagai hash ringkas (bukan keselamatan sebenar — demo sahaja).
  const hash = (pw) => { let h = 5381; for (const c of String(pw)) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return 'd' + (h >>> 0).toString(36); };
  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000, r = (d) => (d * Math.PI) / 180;
    const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  /* ---------- Data contoh ---------- */
  function seed() {
    // Masa contoh dalam waktu Malaysia (UTC+8), tanpa mengira zon waktu peranti
    const t = (daysAgo, h, m) => {
      const day = new Date(Date.now() - daysAgo * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
      return new Date(`${day}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+08:00`).toISOString();
    };
    const ago = (mins) => new Date(Date.now() - mins * 6e4).toISOString();
    const db = { seq: { users: 4, projects: 4, measurements: 13, attendance: 8 }, photos: {}, users: [
      { id: 1, username: 'admin', name: 'Pentadbir AJC', phone: '', role: 'admin', pass: hash('ajc12345'), active: true, created_at: now() },
      { id: 2, username: 'ali', name: 'Ali bin Ahmad', phone: '013-111 2222', role: 'staff', pass: hash('ali123'), active: true, created_at: now() },
      { id: 3, username: 'faiz', name: 'Faiz Hakimi', phone: '017-333 4444', role: 'staff', pass: hash('faiz123'), active: true, created_at: now() },
      { id: 4, username: 'zul', name: 'Zulkifli Hassan', phone: '011-555 6666', role: 'staff', pass: hash('zul123'), active: true, created_at: now() },
    ], projects: [
      { id: 1, code: 'AJC-2026-001', name: 'Rumah Teres En. Hafiz, Seksyen 9 Bangi', client: 'Hafiz Rahman', phone: '012-345 6789',
        address: 'No. 12, Jalan 9/3, Seksyen 9, 43650 Bandar Baru Bangi', lat: 2.9936, lng: 101.7876, radius_m: 200, status: 'ukur',
        notes: 'Contoh demo. Pelanggan minta semua frame hitam.', created_by: 1, created_at: t(3, 10, 0), updated_at: t(0, 9, 0) },
      { id: 2, code: 'AJC-2026-002', name: 'Kedai Kopi Seri Kajang', client: 'Pn. Lim', phone: '019-876 5432', address: 'Jalan Besar, 43000 Kajang',
        lat: 2.9927, lng: 101.7909, radius_m: 150, status: 'fabrikasi', notes: 'Contoh demo.', created_by: 1, created_at: t(8, 9, 0), updated_at: t(2, 15, 0) },
      { id: 3, code: 'AJC-2026-003', name: 'Banglo Dr. Aminah, Putrajaya', client: 'Dr. Aminah', phone: '', address: 'Presint 16, Putrajaya',
        lat: null, lng: null, radius_m: 200, status: 'siap', notes: 'Contoh demo.', created_by: 1, created_at: t(30, 9, 0), updated_at: t(10, 17, 0) },
      { id: 4, code: 'AJC-2026-004', name: 'Pejabat Tetuan Rahim & Co, Shah Alam', client: 'Tetuan Rahim & Co', phone: '03-5511 2233',
        address: 'Tingkat 3, Plaza Seksyen 13, 40100 Shah Alam', lat: 3.0733, lng: 101.5185, radius_m: 200, status: 'pasang',
        notes: 'Contoh demo. Pemasangan partition kaca bilik mesyuarat.', created_by: 1, created_at: t(14, 9, 0), updated_at: t(1, 16, 20) },
    ], measurements: [
      [1, 1, 'Ruang tamu – pintu ke laman', 'Pintu Sliding', 2400, 2100, 1, 2, 'Tempered 10mm', 'Hitam', 'Lantai tak rata 5mm sebelah kiri'],
      [2, 1, 'Bilik air utama', 'Shower Screen', 1200, 1900, 1, 2, 'Tempered 10mm', 'Silver / Natural', ''],
      [3, 1, 'Bilik 2', 'Tingkap Casement', 1200, 1200, 2, 2, 'Tinted 6mm', 'Hitam', ''],
      [4, 1, 'Dapur', 'Pintu Swing', 900, 2100, 1, 1, 'Frosted 6mm', 'Hitam', 'Buka ke luar, engsel kanan'],
      [5, 1, 'Tangga', 'Panel Tetap (Fixed)', 600, 1800, 3, 1, 'Laminated 8.38mm', 'Hitam', ''],
      [6, 2, 'Depan kedai', 'Pintu Folding', 3600, 2400, 1, 4, 'Tempered 12mm', 'Hitam', 'Perlu buang grill lama'],
      [7, 2, 'Tingkap sisi', 'Panel Tetap (Fixed)', 1500, 1200, 2, 1, 'Tempered 10mm', 'Hitam', ''],
      [8, 3, 'Ruang tamu', 'Pintu Sliding', 3000, 2400, 1, 3, 'Laminated 8.38mm', 'Champagne', ''],
      [9, 3, 'Bilik utama', 'Tingkap Sliding', 1800, 1500, 2, 2, 'Reflective 6mm', 'Champagne', ''],
      [10, 4, 'Bilik mesyuarat', 'Partition Kaca', 4200, 2700, 1, 4, 'Tempered 12mm', 'Hitam', 'Frameless, pintu swing di tengah'],
      [11, 4, 'Bilik mesyuarat – pintu', 'Pintu Swing', 900, 2100, 1, 1, 'Tempered 12mm', 'Hitam', 'Patch fitting'],
      [12, 4, 'Bilik pengarah', 'Partition Kaca', 3000, 2700, 1, 3, 'Frosted 6mm', 'Hitam', ''],
      [13, 4, 'Pantri', 'Tingkap Top Hung', 900, 600, 2, 1, 'Clear 6mm', 'Hitam', ''],
    ].map(([id, project_id, location, item_type, width_mm, height_mm, qty, panels, glass, frame_color, notes]) =>
      ({ id, project_id, location, item_type, width_mm, height_mm, qty, panels, glass, frame_color, notes, photo: null, measured_by: id % 3 === 0 ? 3 : 2,
        created_at: id > 9 ? t(1, 10, id) : id < 6 ? ago(300 - id * 40) : t(2, 11, id), updated_at: id > 9 ? t(1, 10, id) : id < 6 ? ago(300 - id * 40) : t(2, 11, id) })),
    attendance: [
      [1, 2, 1, t(1, 8, 2), t(1, 17, 35), 2.9935, 101.7875, 16, true],
      [2, 3, 1, t(1, 8, 15), t(1, 17, 30), 2.9934, 101.7877, 25, true],
      [3, 2, 2, t(2, 8, 5), t(2, 18, 0), 2.9926, 101.7908, 15, true],
      [4, 3, 2, t(2, 9, 40), t(2, 17, 0), 3.0012, 101.7701, 2060, false],
      [5, 2, null, t(3, 8, 30), t(3, 17, 10), 2.9900, 101.7800, null, null],
      [6, 3, null, t(3, 8, 45), t(3, 17, 5), 2.9901, 101.7801, null, null],
      [7, 3, 2, ago(170), null, 2.9928, 101.7911, 22, true],
      [8, 4, 4, ago(215), null, 3.0731, 101.5183, 25, true],
    ].map(([id, user_id, project_id, in_at, out_at, lat, lng, dist, ok]) => ({ id, user_id, project_id, in_at, in_lat: lat, in_lng: lng, in_acc: 12,
      in_dist_m: dist, in_ok: ok, out_at, out_lat: out_at ? lat : null, out_lng: out_at ? lng : null, out_acc: out_at ? 10 : null,
      out_dist_m: out_at ? dist : null, out_ok: out_at ? ok : null, note: '' })) };
    return db;
  }

  let db;
  function load() {
    if (db) return db;
    try { db = JSON.parse(ls.get(KEY)); } catch { db = null; }
    if (!db || !db.users) { db = seed(); save(); }
    return db;
  }
  function save() {
    if (!ls.set(KEY, JSON.stringify(db))) throw new ApiError(507, 'Storan peranti penuh. Buang beberapa gambar atau reset data demo di menu Akaun.');
  }
  const nextId = (t) => (db.seq[t] = (db.seq[t] || 0) + 1);
  const userById = (id) => db.users.find((u) => u.id === id);
  const pub = (u) => u && { id: u.id, username: u.username, name: u.name, phone: u.phone, role: u.role, active: u.active, created_at: u.created_at };

  function me() {
    const id = Number(ls.get(SESSION));
    const u = userById(id);
    return u && u.active ? u : null;
  }
  const requireAdmin = (u) => { if (u.role !== 'admin') throw new ApiError(403, 'Hanya admin dibenarkan'); };
  function touch(pid) { const p = db.projects.find((x) => x.id === pid); if (p) p.updated_at = now(); }
  function savePhoto(dataUrl) {
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(dataUrl || '')) return null;
    const id = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    db.photos[id] = dataUrl; return id;
  }

  function projectFields(body, old = {}) {
    const pick = (k, f) => (body[k] !== undefined ? f(body[k]) : old[k]);
    const p = {
      code: pick('code', (v) => str(v, 30)) ?? '', name: pick('name', (v) => str(v, 150)), client: pick('client', (v) => str(v, 150)) ?? '',
      phone: pick('phone', (v) => str(v, 30)) ?? '', address: pick('address', (v) => str(v, 400)) ?? '',
      lat: pick('lat', num) ?? null, lng: pick('lng', num) ?? null, radius_m: pick('radius_m', (v) => Math.max(30, Math.min(5000, num(v) || 200))) ?? 200,
      status: pick('status', (v) => (STATUSES.includes(v) ? v : 'ukur')) ?? 'ukur', notes: pick('notes', (v) => str(v, 2000)) ?? '',
    };
    if (!p.name) throw new ApiError(400, 'Nama projek diperlukan');
    return p;
  }
  function measurementFields(body, old = {}) {
    const pick = (k, f) => (body[k] !== undefined ? f(body[k]) : old[k]);
    const m = {
      location: pick('location', (v) => str(v, 150)), item_type: pick('item_type', (v) => str(v, 60)),
      width_mm: pick('width_mm', (v) => Math.round(num(v) || 0)), height_mm: pick('height_mm', (v) => Math.round(num(v) || 0)),
      qty: pick('qty', (v) => Math.max(1, Math.round(num(v) || 1))) ?? 1, panels: pick('panels', (v) => (num(v) ? Math.round(num(v)) : null)) ?? null,
      glass: pick('glass', (v) => str(v, 80)) ?? '', frame_color: pick('frame_color', (v) => str(v, 60)) ?? '', notes: pick('notes', (v) => str(v, 2000)) ?? '',
    };
    if (!m.location) throw new ApiError(400, 'Lokasi / label diperlukan');
    if (!m.item_type) throw new ApiError(400, 'Jenis item diperlukan');
    if (!(m.width_mm > 0 && m.width_mm < 20000) || !(m.height_mm > 0 && m.height_mm < 20000)) throw new ApiError(400, 'Lebar dan tinggi mesti antara 1 – 20000 mm');
    return m;
  }
  function geoCheck(pid, lat, lng) {
    if (!pid) return { dist: null, ok: null };
    const p = db.projects.find((x) => x.id === pid);
    if (!p) throw new ApiError(404, 'Projek tidak dijumpai');
    if (p.lat == null || p.lng == null) return { dist: null, ok: null };
    const dist = Math.round(haversine(lat, lng, p.lat, p.lng));
    return { dist, ok: dist <= p.radius_m };
  }
  function needCoords(b) {
    const lat = num(b.lat), lng = num(b.lng);
    if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new ApiError(400, 'Lokasi GPS diperlukan. Sila benarkan akses lokasi.');
    return { lat, lng, acc: num(b.acc) };
  }
  const projectName = (id) => db.projects.find((p) => p.id === id)?.name ?? null;
  const openShift = (uid) => {
    const a = db.attendance.filter((x) => x.user_id === uid && !x.out_at).sort((x, y) => (x.in_at < y.in_at ? 1 : -1))[0];
    return a ? { ...a, project_name: projectName(a.project_id) } : null;
  };
  function attendanceRows(u, q) {
    let uid = num(q.user_id); if (u.role !== 'admin') uid = u.id;
    return db.attendance
      .filter((a) => (uid == null || a.user_id === uid) && (!q.from || a.in_at >= q.from) && (!q.to || a.in_at < q.to))
      .sort((x, y) => (x.in_at < y.in_at ? 1 : -1))
      .map((a) => ({ ...a, user_name: userById(a.user_id)?.name, project_name: projectName(a.project_id),
        hours: a.out_at ? (new Date(a.out_at) - new Date(a.in_at)) / 36e5 : null }));
  }

  /* ---------- Routes (sama dengan API sebenar) ---------- */
  const routes = [
    ['POST', /^\/api\/login$/, false, (b) => {
      const u = db.users.find((x) => x.username.toLowerCase() === str(b.username, 60).toLowerCase());
      if (!u || !u.active || u.pass !== hash(b.password || '')) throw new ApiError(401, 'Username atau kata laluan salah');
      ls.set(SESSION, String(u.id)); return pub(u);
    }],
    ['POST', /^\/api\/logout$/, false, () => { ls.del(SESSION); return { ok: true }; }],
    ['GET', /^\/api\/me$/, true, (b, u) => pub(u)],
    ['POST', /^\/api\/me\/password$/, true, (b, u) => {
      if (u.pass !== hash(b.current || '')) throw new ApiError(400, 'Kata laluan semasa salah');
      if (String(b.next || '').length < 6) throw new ApiError(400, 'Kata laluan baru mesti sekurang-kurangnya 6 aksara');
      u.pass = hash(b.next); save(); return { ok: true };
    }],
    ['GET', /^\/api\/users$/, true, (b, u) => { requireAdmin(u); return [...db.users].sort((x, y) => (y.active - x.active) || x.name.localeCompare(y.name)).map(pub); }],
    ['POST', /^\/api\/users$/, true, (b, u) => {
      requireAdmin(u);
      const username = str(b.username, 40).toLowerCase();
      if (!/^[a-z0-9._-]{3,}$/.test(username)) throw new ApiError(400, 'Username: min 3 aksara, huruf kecil/nombor sahaja');
      if (String(b.password || '').length < 6) throw new ApiError(400, 'Kata laluan min 6 aksara');
      if (!str(b.name)) throw new ApiError(400, 'Nama diperlukan');
      if (db.users.some((x) => x.username === username)) throw new ApiError(400, 'Username sudah digunakan');
      const id = nextId('users');
      db.users.push({ id, username, name: str(b.name, 100), phone: str(b.phone, 30), role: b.role === 'admin' ? 'admin' : 'staff', pass: hash(b.password), active: true, created_at: now() });
      save(); return { id };
    }],
    ['PATCH', /^\/api\/users\/(\d+)$/, true, (b, u, [id]) => {
      requireAdmin(u);
      const t = userById(Number(id)); if (!t) throw new ApiError(404, 'Staff tidak dijumpai');
      if (t.id === u.id && (b.active === false || b.role === 'staff')) throw new ApiError(400, 'Anda tidak boleh nyahaktif / turunkan akaun sendiri');
      if (b.password && String(b.password).length < 6) throw new ApiError(400, 'Kata laluan min 6 aksara');
      if (b.name !== undefined) t.name = str(b.name, 100);
      if (b.phone !== undefined) t.phone = str(b.phone, 30);
      if (b.role) t.role = b.role === 'admin' ? 'admin' : 'staff';
      if (b.active !== undefined) t.active = !!b.active;
      if (b.password) t.pass = hash(b.password);
      save(); return { ok: true };
    }],
    ['GET', /^\/api\/projects$/, true, (b, u, m, q) => {
      const s = str(q.q, 100).toLowerCase(), st = STATUSES.includes(q.status) ? q.status : null;
      const has = (v) => String(v || '').toLowerCase().includes(s);
      return db.projects
        .filter((p) => (!st || p.status === st) && (!s || has(p.name) || has(p.client) || has(p.address) || has(p.code) ||
          db.measurements.some((x) => x.project_id === p.id && (has(x.location) || has(x.item_type)))))
        .sort((x, y) => (x.updated_at < y.updated_at ? 1 : -1))
        .map((p) => {
          const ms = db.measurements.filter((x) => x.project_id === p.id);
          return { ...p, item_count: ms.length, unit_count: ms.reduce((a, x) => a + x.qty, 0), area_m2: ms.reduce((a, x) => a + (x.width_mm * x.height_mm * x.qty) / 1e6, 0) };
        });
    }],
    ['POST', /^\/api\/projects$/, true, (b, u) => {
      const p = projectFields(b); const id = nextId('projects');
      db.projects.push({ id, ...p, code: p.code || `AJC-${new Date().getFullYear()}-${String(id).padStart(3, '0')}`, created_by: u.id, created_at: now(), updated_at: now() });
      save(); return { id };
    }],
    ['GET', /^\/api\/projects\/(\d+)$/, true, (b, u, [id]) => {
      const p = db.projects.find((x) => x.id === Number(id)); if (!p) throw new ApiError(404, 'Projek tidak dijumpai');
      return { ...p, created_by_name: userById(p.created_by)?.name,
        measurements: db.measurements.filter((x) => x.project_id === p.id).sort((x, y) => x.id - y.id).map((x) => ({ ...x, measured_by_name: userById(x.measured_by)?.name })) };
    }],
    ['PATCH', /^\/api\/projects\/(\d+)$/, true, (b, u, [id]) => {
      const p = db.projects.find((x) => x.id === Number(id)); if (!p) throw new ApiError(404, 'Projek tidak dijumpai');
      Object.assign(p, projectFields(b, p), { updated_at: now() }); save(); return { ok: true };
    }],
    ['DELETE', /^\/api\/projects\/(\d+)$/, true, (b, u, [id]) => {
      requireAdmin(u); const pid = Number(id);
      db.measurements.filter((x) => x.project_id === pid).forEach((x) => x.photo && delete db.photos[x.photo]);
      db.measurements = db.measurements.filter((x) => x.project_id !== pid);
      db.projects = db.projects.filter((x) => x.id !== pid);
      db.attendance.forEach((a) => { if (a.project_id === pid) a.project_id = null; });
      save(); return { ok: true };
    }],
    ['POST', /^\/api\/projects\/(\d+)\/measurements$/, true, (b, u, [id]) => {
      const pid = Number(id); if (!db.projects.some((x) => x.id === pid)) throw new ApiError(404, 'Projek tidak dijumpai');
      const m = measurementFields(b); const mid = nextId('measurements');
      db.measurements.push({ id: mid, project_id: pid, ...m, photo: b.photo ? savePhoto(b.photo) : null, measured_by: u.id, created_at: now(), updated_at: now() });
      touch(pid); save(); return { id: mid };
    }],
    ['PATCH', /^\/api\/measurements\/(\d+)$/, true, (b, u, [id]) => {
      const old = db.measurements.find((x) => x.id === Number(id)); if (!old) throw new ApiError(404, 'Ukuran tidak dijumpai');
      const m = measurementFields(b, old);
      let photo = old.photo;
      if (b.photo === null) photo = null;
      else if (typeof b.photo === 'string' && b.photo.startsWith('data:')) photo = savePhoto(b.photo);
      if (photo !== old.photo && old.photo) delete db.photos[old.photo];
      Object.assign(old, m, { photo, updated_at: now() }); touch(old.project_id); save(); return { ok: true };
    }],
    ['DELETE', /^\/api\/measurements\/(\d+)$/, true, (b, u, [id]) => {
      const old = db.measurements.find((x) => x.id === Number(id)); if (!old) throw new ApiError(404, 'Ukuran tidak dijumpai');
      if (old.photo) delete db.photos[old.photo];
      db.measurements = db.measurements.filter((x) => x !== old); touch(old.project_id); save(); return { ok: true };
    }],
    ['GET', /^\/api\/photos\/([\w-]+)$/, true, (b, u, [id]) => {
      if (!db.photos[id]) throw new ApiError(404, 'Gambar tidak dijumpai'); return db.photos[id];
    }],
    ['GET', /^\/api\/attendance\/status$/, true, (b, u) => ({ open: openShift(u.id) })],
    ['POST', /^\/api\/attendance\/in$/, true, (b, u) => {
      if (openShift(u.id)) throw new ApiError(400, 'Anda sudah punch in. Sila punch out dahulu.');
      const { lat, lng, acc } = needCoords(b); const pid = num(b.project_id); const g = geoCheck(pid, lat, lng);
      db.attendance.push({ id: nextId('attendance'), user_id: u.id, project_id: pid, in_at: now(), in_lat: lat, in_lng: lng, in_acc: acc, in_dist_m: g.dist, in_ok: g.ok,
        out_at: null, out_lat: null, out_lng: null, out_acc: null, out_dist_m: null, out_ok: null, note: str(b.note, 300) });
      save(); return { open: openShift(u.id), dist: g.dist, ok: g.ok };
    }],
    ['POST', /^\/api\/attendance\/out$/, true, (b, u) => {
      const s = openShift(u.id); if (!s) throw new ApiError(400, 'Anda belum punch in.');
      const { lat, lng, acc } = needCoords(b); const g = geoCheck(s.project_id, lat, lng);
      Object.assign(db.attendance.find((x) => x.id === s.id), { out_at: now(), out_lat: lat, out_lng: lng, out_acc: acc, out_dist_m: g.dist, out_ok: g.ok });
      save(); return { ok: true, dist: g.dist, inside: g.ok };
    }],
    ['GET', /^\/api\/attendance$/, true, (b, u, m, q) => attendanceRows(u, q)],
    // Ringkasan untuk dashboard admin
    ['GET', /^\/api\/dashboard$/, true, (b, u) => {
      requireAdmin(u);
      const since7 = new Date(Date.now() - 7 * 864e5).toISOString();
      const area = (pid) => db.measurements.filter((x) => x.project_id === pid).reduce((a, x) => a + (x.width_mm * x.height_mm * x.qty) / 1e6, 0);
      const projects = [...db.projects].sort((x, y) => (x.updated_at < y.updated_at ? 1 : -1))
        .map((p) => ({ id: p.id, code: p.code, name: p.name, client: p.client, status: p.status, updated_at: p.updated_at,
          item_count: db.measurements.filter((x) => x.project_id === p.id).length, area_m2: area(p.id) }));
      const active = projects.filter((p) => p.status !== 'siap');
      const feed = [
        ...db.measurements.map((m) => ({ type: 'measure', at: m.updated_at, user_name: userById(m.measured_by)?.name, project_id: m.project_id,
          project_name: projectName(m.project_id), text: `${m.item_type} ${m.width_mm} × ${m.height_mm} mm`, sub: m.location })),
        ...db.attendance.flatMap((a) => [
          { type: 'in', at: a.in_at, user_name: userById(a.user_id)?.name, project_id: a.project_id, project_name: projectName(a.project_id), ok: a.in_ok, dist: a.in_dist_m },
          ...(a.out_at ? [{ type: 'out', at: a.out_at, user_name: userById(a.user_id)?.name, project_id: a.project_id, project_name: projectName(a.project_id), ok: a.out_ok, dist: a.out_dist_m }] : []),
        ]),
      ].filter((f) => f.at <= now()).sort((x, y) => (x.at < y.at ? 1 : -1)).slice(0, 8);
      return {
        staff_total: db.users.filter((x) => x.active).length,
        on_duty: db.attendance.filter((a) => !a.out_at).sort((x, y) => (x.in_at < y.in_at ? -1 : 1))
          .map((a) => ({ user_id: a.user_id, user_name: userById(a.user_id)?.name, project_id: a.project_id, project_name: projectName(a.project_id), in_at: a.in_at, in_ok: a.in_ok, in_dist_m: a.in_dist_m })),
        by_status: Object.fromEntries(STATUSES.map((st) => [st, projects.filter((p) => p.status === st)])),
        active_projects: active.length,
        active_area_m2: active.reduce((a, p) => a + p.area_m2, 0),
        gps_alerts_7d: db.attendance.filter((a) => a.in_at >= since7 && (a.in_ok === false || a.out_ok === false)).length,
        feed,
      };
    }],
  ];

  async function request(method, path, body = {}) {
    load();
    const url = new URL(path, 'http://x');
    for (const [m, re, auth, fn] of routes) {
      if (m !== method) continue;
      const match = re.exec(url.pathname); if (!match) continue;
      const u = me();
      if (auth && !u) throw new ApiError(401, 'Sila log masuk');
      // Salin data supaya UI tidak ubah "database" secara langsung
      return JSON.parse(JSON.stringify(fn(body || {}, u, match.slice(1), Object.fromEntries(url.searchParams))));
    }
    throw new ApiError(404, 'Tidak dijumpai');
  }
  function reset() { ls.del(KEY); ls.del(SESSION); db = null; }

  window.AJCBackend = { mode: 'demo', request, reset, ApiError };
})();
