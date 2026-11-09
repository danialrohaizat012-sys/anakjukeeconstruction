/* AJC Sistem Tapak — backend DEMO dalam browser.
   Semua data disimpan dalam localStorage peranti ini sahaja (tidak dikongsi antara telefon).
   Ia meniru API yang sama dengan backend sebenar, jadi bila Supabase disambung nanti,
   hanya fail ini yang perlu diganti. */
'use strict';
(function () {
  const KEY = 'ajc_demo_db_v5';
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

  /* ---------- Waktu kerja & lebih masa (OT) ---------- */
  // work[0..6] = Ahad..Sabtu; null = hari rehat. Semua masa dalam waktu Malaysia.
  const DEFAULT_SETTINGS = {
    work: [null, ...Array(5).fill(0).map(() => ({ start: '08:30', end: '17:30' })), { start: '08:30', end: '13:00' }],
    ot_min: 30, ot_round: 15, holidays: [],
  };
  const OT_RATE = { biasa: 1.5, rehat: 2, cuti: 3 };
  const mytDay = (iso) => {
    const d = new Date(new Date(iso).getTime() + 8 * 36e5);
    return { ymd: d.toISOString().slice(0, 10), dow: d.getUTCDay() };
  };
  // OT = masa selepas waktu tamat (hari kerja), atau semua jam (hari rehat / cuti umum).
  // Dibundarkan ke bawah ikut ot_round; kurang daripada ot_min dikira 0.
  function calcOT(inAt, outAt, st) {
    const tin = Date.parse(inAt), tout = Date.parse(outAt);
    const day = mytDay(inAt), sched = st.work[day.dow];
    let raw, kind, end = null;
    if (st.holidays.includes(day.ymd)) { raw = (tout - tin) / 6e4; kind = 'cuti'; }
    else if (!sched) { raw = (tout - tin) / 6e4; kind = 'rehat'; }
    else { end = Date.parse(`${day.ymd}T${sched.end}:00+08:00`); raw = Math.max(0, (tout - Math.max(tin, end)) / 6e4); kind = 'biasa'; }
    let minutes = Math.floor(Math.max(0, raw) / st.ot_round) * st.ot_round;
    if (minutes < st.ot_min) minutes = 0;
    return { minutes, kind, rate: OT_RATE[kind], raw: Math.round(raw), day_end: end ? new Date(end).toISOString() : null };
  }

  /* ---------- Data contoh ---------- */
  function seed() {
    // Masa contoh dalam waktu Malaysia (UTC+8), tanpa mengira zon waktu peranti
    const t = (daysAgo, h, m) => {
      const day = new Date(Date.now() - daysAgo * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
      return new Date(`${day}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+08:00`).toISOString();
    };
    const ago = (mins) => new Date(Date.now() - mins * 6e4).toISOString();
    const wd = (n, h, m) => {
      let back = 0, found = 0;
      while (found < n) { back += 1; const dow = mytDay(new Date(Date.now() - back * 864e5).toISOString()).dow; if (dow >= 1 && dow <= 5) found += 1; }
      return t(back, h, m);
    };
    const db = { seq: { users: 4, projects: 4, measurements: 13, attendance: 8, offices: 2 }, photos: {},
    // Lokasi punch in / out. Koordinat contoh — admin tetapkan lokasi sebenar di menu Staff → Lokasi pejabat.
    offices: [
      { id: 1, name: 'Pejabat AJC', lat: 2.9937, lng: 101.7873, radius_m: 150 },
      { id: 2, name: 'Rumah', lat: 3.0005, lng: 101.7771, radius_m: 100 },
    ],
    users: [
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
      [1, 2, 1, wd(1, 8, 2), wd(1, 17, 35), 2.9935, 101.7875, 28],
      [2, 3, 1, wd(1, 8, 15), wd(1, 20, 20), 2.9934, 101.7877, 55],
      [3, 4, 2, wd(1, 8, 20), wd(1, 17, 40), 3.0006, 101.7772, 15],
      [4, 2, 1, wd(2, 8, 5), wd(2, 19, 10), 2.9938, 101.7874, 16],
      [5, 3, 2, wd(2, 7, 55), wd(2, 17, 35), 3.0004, 101.7770, 15],
      [6, 4, 1, wd(2, 8, 30), wd(2, 21, 0), 2.9936, 101.7872, 15],
      [7, 3, 1, ago(170), null, 2.9938, 101.7871, 24],
      [8, 4, 2, ago(215), null, 3.0005, 101.7772, 11],
    ].map(([id, user_id, office_id, in_at, out_at, lat, lng, dist]) => ({ id, user_id, office_id, project_id: null, in_at, in_lat: lat, in_lng: lng, in_acc: 12,
      in_dist_m: dist, in_ok: true, out_at, out_lat: out_at ? lat : null, out_lng: out_at ? lng : null, out_acc: out_at ? 10 : null,
      out_dist_m: out_at ? dist : null, out_ok: out_at ? true : null, note: '' })),
    settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) };
    // OT contoh: satu menunggu kelulusan, satu diluluskan penuh, satu diluluskan sebahagian
    const otInfo = { 2: ['pending', 'Siapkan fabrikasi frame folding Kedai Kopi', 2, null],
      4: ['approved', 'Pasang partition bilik mesyuarat', 4, null], 6: ['approved', 'Muat naik kaca ke lori untuk esok', 4, 180] };
    db.attendance.forEach((a) => {
      if (!a.out_at) return;
      const c = calcOT(a.in_at, a.out_at, db.settings);
      if (!c.minutes) return;
      const [status, reason, pid, appr] = otInfo[a.id] || ['pending', '', null, null];
      a.ot = { minutes: c.minutes, kind: c.kind, rate: c.rate, status, reason, project_id: pid,
        approved_minutes: status === 'approved' ? (appr ?? c.minutes) : null, decided_by: status === 'pending' ? null : 1, decided_at: status === 'pending' ? null : a.out_at, admin_note: appr ? 'Diluluskan 3 jam sahaja' : '' };
    });
    return db;
  }

  let db;
  function load() {
    if (db) return db;
    try { db = JSON.parse(ls.get(KEY)); } catch { db = null; }
    if (!db || !db.users || !db.offices) { db = seed(); save(); }
    if (!db.settings) db.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
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
  // Cari pejabat terdekat. Punch hanya sah jika staff berada DALAM radius pejabat (tiada toleransi).
  const MAX_ACC = 200; // ketepatan GPS lebih teruk dari ini ditolak
  function officeCheck(lat, lng, acc) {
    const list = db.offices.filter((o) => o.lat != null && o.lng != null);
    if (!list.length) throw new ApiError(400, 'Lokasi pejabat belum ditetapkan. Sila hubungi admin.');
    if (acc != null && acc > MAX_ACC) { const e = new ApiError(400, `Isyarat GPS terlalu lemah (±${Math.round(acc)} m). Tunggu sebentar atau keluar dari bangunan, kemudian cuba lagi.`); e.code = 'WEAK_GPS'; throw e; }
    const [best] = list.map((o) => ({ o, d: Math.round(haversine(lat, lng, o.lat, o.lng)) })).sort((a, b) => a.d - b.d);
    return { office: best.o, dist: best.d, ok: best.d <= best.o.radius_m };
  }
  // Sistem sebenar: semakan VPN dibuat di server berdasarkan IP permintaan. Demo: guna keputusan semakan dari browser.
  function needNet(b) {
    const n = b.net || {};
    if (n.ok !== true) { const e = new ApiError(403, 'Rangkaian tidak disahkan atau VPN dikesan. Matikan VPN dan cuba lagi.'); e.code = 'VPN'; throw e; }
    return { ip: str(n.ip, 60), isp: str(n.isp, 120), country: str(n.country, 4) };
  }
  function needSelfie(b) {
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(b.selfie || '')) throw new ApiError(400, 'Selfie diperlukan untuk punch.');
    if (b.selfie.length > 400000) throw new ApiError(400, 'Gambar selfie terlalu besar.');
    return savePhoto(b.selfie);
  }
  function outsideError(kind, g) {
    const e = new ApiError(403, `Anda berada ${g.dist.toLocaleString('en-MY')} m dari ${g.office.name}. Punch ${kind} hanya boleh dibuat di pejabat.`);
    e.code = 'OUTSIDE'; e.office = g.office.name; e.dist = g.dist;
    return e;
  }
  const officeName = (id) => db.offices.find((o) => o.id === id)?.name ?? null;
  function officeFields(b, old = {}) {
    const pick = (k, f) => (b[k] !== undefined ? f(b[k]) : old[k]);
    const o = { name: pick('name', (v) => str(v, 80)), lat: pick('lat', num) ?? null, lng: pick('lng', num) ?? null,
      radius_m: pick('radius_m', (v) => Math.max(30, Math.min(2000, num(v) || 150))) ?? 150 };
    if (!o.name) throw new ApiError(400, 'Nama lokasi diperlukan');
    if ((o.lat == null) !== (o.lng == null) || (o.lat != null && (Math.abs(o.lat) > 90 || Math.abs(o.lng) > 180))) throw new ApiError(400, 'Latitude dan longitude tidak sah');
    return o;
  }
  function needCoords(b) {
    const lat = num(b.lat), lng = num(b.lng);
    if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new ApiError(400, 'Lokasi GPS diperlukan. Sila benarkan akses lokasi.');
    return { lat, lng, acc: num(b.acc) };
  }
  const projectName = (id) => db.projects.find((p) => p.id === id)?.name ?? null;
  const openShift = (uid) => {
    const a = db.attendance.filter((x) => x.user_id === uid && !x.out_at).sort((x, y) => (x.in_at < y.in_at ? 1 : -1))[0];
    return a ? { ...a, office_name: officeName(a.office_id), project_name: projectName(a.project_id) } : null;
  };
  function attendanceRows(u, q) {
    let uid = num(q.user_id); if (u.role !== 'admin') uid = u.id;
    return db.attendance
      .filter((a) => (uid == null || a.user_id === uid) && (!q.from || a.in_at >= q.from) && (!q.to || a.in_at < q.to))
      .sort((x, y) => (x.in_at < y.in_at ? 1 : -1))
      .map((a) => ({ ...a, user_name: userById(a.user_id)?.name, office_name: officeName(a.office_id), project_name: projectName(a.project_id),
        hours: a.out_at ? (new Date(a.out_at) - new Date(a.in_at)) / 36e5 : null,
        ot: a.ot ? { ...a.ot, project_name: projectName(a.ot.project_id), decided_by_name: a.ot.decided_by ? userById(a.ot.decided_by)?.name : null } : null }));
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
    ['GET', /^\/api\/attendance\/status$/, true, (b, u) => {
      const open = openShift(u.id);
      const today = mytDay(now()), sched = db.settings.work[today.dow];
      return { open, ot_estimate: open ? calcOT(open.in_at, now(), db.settings) : null,
        rules: { min: db.settings.ot_min, round: db.settings.ot_round },
        today: { work: sched, holiday: db.settings.holidays.includes(today.ymd) } };
    }],
    ['POST', /^\/api\/attendance\/in$/, true, (b, u) => {
      if (openShift(u.id)) throw new ApiError(400, 'Anda sudah punch in. Sila punch out dahulu.');
      const { lat, lng, acc } = needCoords(b); const g = officeCheck(lat, lng, acc);
      const net = needNet(b);
      if (!g.ok) throw outsideError('in', g);
      const selfie = needSelfie(b);
      db.attendance.push({ id: nextId('attendance'), user_id: u.id, office_id: g.office.id, project_id: null, in_at: now(), in_lat: lat, in_lng: lng, in_acc: acc, in_selfie: selfie, in_net: net,
        in_dist_m: g.dist, in_ok: g.ok, out_at: null, out_lat: null, out_lng: null, out_acc: null, out_dist_m: null, out_ok: null, note: str(b.note, 300) });
      save(); return { open: openShift(u.id), dist: g.dist, ok: g.ok, office_name: g.office?.name ?? null };
    }],
    ['POST', /^\/api\/attendance\/out$/, true, (b, u) => {
      const s = openShift(u.id); if (!s) throw new ApiError(400, 'Anda belum punch in.');
      const { lat, lng, acc } = needCoords(b); const g = officeCheck(lat, lng, acc);
      const net = needNet(b);
      if (!g.ok) throw outsideError('out', g);
      const selfie = needSelfie(b);
      const outAt = now();
      const c = calcOT(s.in_at, outAt, db.settings);
      const ot = c.minutes ? { minutes: c.minutes, kind: c.kind, rate: c.rate, status: 'pending', reason: str(b.ot_reason, 300), project_id: num(b.ot_project_id),
        approved_minutes: null, decided_by: null, decided_at: null, admin_note: '' } : null;
      Object.assign(db.attendance.find((x) => x.id === s.id), { out_at: outAt, out_lat: lat, out_lng: lng, out_acc: acc, out_dist_m: g.dist, out_ok: g.ok, out_office_id: g.office.id, out_selfie: selfie, out_net: net, ot });
      save(); return { ok: true, dist: g.dist, inside: g.ok, office_name: g.office?.name ?? null, ot };
    }],
    ['GET', /^\/api\/attendance$/, true, (b, u, m, q) => attendanceRows(u, q)],
    ['GET', /^\/api\/offices$/, true, () => db.offices],
    ['GET', /^\/api\/settings$/, true, () => db.settings],
    ['PATCH', /^\/api\/settings$/, true, (b, u) => {
      requireAdmin(u);
      const hhmm = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v || '');
      const st = JSON.parse(JSON.stringify(db.settings));
      if (Array.isArray(b.work)) {
        if (b.work.length !== 7) throw new ApiError(400, 'Jadual kerja tidak sah');
        st.work = b.work.map((d, i) => {
          if (!d) return null;
          if (!hhmm(d.start) || !hhmm(d.end) || d.start >= d.end) throw new ApiError(400, `Waktu kerja hari ${['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'][i]} tidak sah`);
          return { start: d.start, end: d.end };
        });
      }
      if (b.ot_min !== undefined) { const v = num(b.ot_min); if (v == null || v < 0 || v > 240) throw new ApiError(400, 'OT minimum tidak sah'); st.ot_min = v; }
      if (b.ot_round !== undefined) { const v = num(b.ot_round); if (![1, 5, 10, 15, 30, 60].includes(v)) throw new ApiError(400, 'Pembundaran tidak sah'); st.ot_round = v; }
      if (Array.isArray(b.holidays)) {
        if (b.holidays.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d))) throw new ApiError(400, 'Tarikh cuti umum tidak sah');
        st.holidays = [...new Set(b.holidays)].sort();
      }
      db.settings = st; save(); return st;
    }],
    ['PATCH', /^\/api\/overtime\/(\d+)$/, true, (b, u, [id]) => {
      requireAdmin(u);
      const a = db.attendance.find((x) => x.id === Number(id));
      if (!a || !a.ot) throw new ApiError(404, 'Rekod OT tidak dijumpai');
      if (b.action === 'approve') {
        const mins = b.minutes === undefined ? a.ot.minutes : Math.round(num(b.minutes) ?? -1);
        if (!(mins > 0 && mins <= a.ot.minutes)) throw new ApiError(400, `Jam diluluskan mesti antara 1 minit dan ${a.ot.minutes} minit`);
        Object.assign(a.ot, { status: 'approved', approved_minutes: mins });
      } else if (b.action === 'reject') {
        Object.assign(a.ot, { status: 'rejected', approved_minutes: 0 });
      } else if (b.action === 'reset') {
        Object.assign(a.ot, { status: 'pending', approved_minutes: null });
      } else throw new ApiError(400, 'Tindakan tidak sah');
      Object.assign(a.ot, { decided_by: b.action === 'reset' ? null : u.id, decided_at: b.action === 'reset' ? null : now(), admin_note: str(b.note, 200) });
      save(); return { ok: true };
    }],
    ['POST', /^\/api\/offices$/, true, (b, u) => {
      requireAdmin(u); const id = nextId('offices'); db.offices.push({ id, ...officeFields(b) }); save(); return { id };
    }],
    ['PATCH', /^\/api\/offices\/(\d+)$/, true, (b, u, [id]) => {
      requireAdmin(u); const o = db.offices.find((x) => x.id === Number(id)); if (!o) throw new ApiError(404, 'Lokasi tidak dijumpai');
      Object.assign(o, officeFields(b, o)); save(); return { ok: true };
    }],
    ['DELETE', /^\/api\/offices\/(\d+)$/, true, (b, u, [id]) => {
      requireAdmin(u); if (db.offices.length <= 1) throw new ApiError(400, 'Sekurang-kurangnya satu lokasi pejabat diperlukan');
      db.offices = db.offices.filter((x) => x.id !== Number(id)); save(); return { ok: true };
    }],
    // Ringkasan untuk dashboard admin
    ['GET', /^\/api\/dashboard$/, true, (b, u) => {
      requireAdmin(u);
      const area = (pid) => db.measurements.filter((x) => x.project_id === pid).reduce((a, x) => a + (x.width_mm * x.height_mm * x.qty) / 1e6, 0);
      const projects = [...db.projects].sort((x, y) => (x.updated_at < y.updated_at ? 1 : -1))
        .map((p) => ({ id: p.id, code: p.code, name: p.name, client: p.client, status: p.status, updated_at: p.updated_at,
          item_count: db.measurements.filter((x) => x.project_id === p.id).length, area_m2: area(p.id) }));
      const active = projects.filter((p) => p.status !== 'siap');
      const feed = [
        ...db.measurements.map((m) => ({ type: 'measure', at: m.updated_at, user_name: userById(m.measured_by)?.name, project_id: m.project_id,
          project_name: projectName(m.project_id), text: `${m.item_type} ${m.width_mm} × ${m.height_mm} mm`, sub: m.location })),
        ...db.attendance.flatMap((a) => [
          { type: 'in', at: a.in_at, user_name: userById(a.user_id)?.name, place: officeName(a.office_id) },
          ...(a.out_at ? [{ type: 'out', at: a.out_at, user_name: userById(a.user_id)?.name, place: officeName(a.out_office_id ?? a.office_id) }] : []),
        ]),
      ].filter((f) => f.at <= now()).sort((x, y) => (x.at < y.at ? 1 : -1)).slice(0, 8);
      return {
        staff_total: db.users.filter((x) => x.active).length,
        on_duty: db.attendance.filter((a) => !a.out_at).sort((x, y) => (x.in_at < y.in_at ? -1 : 1))
          .map((a) => ({ user_id: a.user_id, user_name: userById(a.user_id)?.name, office_name: officeName(a.office_id), in_at: a.in_at, in_ok: a.in_ok, in_dist_m: a.in_dist_m, in_selfie: a.in_selfie || null })),
        // staff aktif yang belum punch in hari ini (waktu Malaysia)
        not_in_today: (() => {
          const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
          const start = new Date(`${day}T00:00:00+08:00`).toISOString();
          const inToday = new Set(db.attendance.filter((a) => a.in_at >= start).map((a) => a.user_id));
          return db.users.filter((x) => x.active && x.role === 'staff' && !inToday.has(x.id)).map((x) => ({ user_id: x.id, user_name: x.name, phone: x.phone }));
        })(),
        staff_count: db.users.filter((x) => x.active && x.role === 'staff').length,
        ot_pending: db.attendance.filter((a) => a.ot && a.ot.status === 'pending').sort((x, y) => (x.in_at < y.in_at ? 1 : -1))
          .map((a) => ({ id: a.id, user_name: userById(a.user_id)?.name, in_at: a.in_at, out_at: a.out_at, minutes: a.ot.minutes, kind: a.ot.kind, rate: a.ot.rate, reason: a.ot.reason, project_name: projectName(a.ot.project_id), selfie: a.out_selfie || a.in_selfie || null })),
        ot_month_min: (() => {
          const ym = mytDay(now()).ymd.slice(0, 7);
          return db.attendance.filter((a) => a.ot && a.ot.status === 'approved' && mytDay(a.in_at).ymd.startsWith(ym)).reduce((s, a) => s + a.ot.approved_minutes, 0);
        })(),
        by_status: Object.fromEntries(STATUSES.map((st) => [st, projects.filter((p) => p.status === st)])),
        active_projects: active.length,
        active_area_m2: active.reduce((a, p) => a + p.area_m2, 0),
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
