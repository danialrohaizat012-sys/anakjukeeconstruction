/* AJC Construction — Sistem Tapak (frontend)
   Lapisan data: window.AJCBackend.request(method, path, body) — lihat demo-backend.js */
'use strict';

/* ================= Konstan ================= */
const TZ = 'Asia/Kuala_Lumpur';
const ITEM_TYPES = ['Pintu Sliding', 'Pintu Swing', 'Pintu Folding', 'Tingkap Sliding', 'Tingkap Casement', 'Tingkap Top Hung',
  'Panel Tetap (Fixed)', 'Shower Screen', 'Partition Kaca', 'Cermin', 'Louvre', 'Lain-lain'];
const GLASS = ['Clear 6mm', 'Tinted 6mm', 'Frosted 6mm', 'Tempered 10mm', 'Tempered 12mm', 'Laminated 8.38mm', 'Reflective 6mm', 'Cermin 5mm'];
const FRAME = ['Hitam', 'Silver / Natural', 'Putih', 'Champagne', 'Bronze', 'Wood grain'];
const LOCS = ['Ruang tamu', 'Dapur', 'Bilik utama', 'Bilik 2', 'Bilik 3', 'Bilik air', 'Balkoni', 'Tangga', 'Pintu utama'];
const STATUS = { ukur: 'Ukur', fabrikasi: 'Fabrikasi', pasang: 'Pasang', siap: 'Siap' };
const STATUS_HINT = { ukur: 'Ukuran tapak', fabrikasi: 'Dalam bengkel', pasang: 'Pemasangan', siap: 'Selesai' };
const STEP = { ukur: 1, fabrikasi: 2, pasang: 3, siap: 4 };

const state = { me: null, clockTimer: null, projTab: 'ukuran', installPrompt: null };

/* ================= Utiliti ================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtNum = (n, d = 0) => Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }) : '—');
const fmtDate = (iso) => new Date(iso).toLocaleDateString('ms-MY', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' });
const fmtDateTime = (iso) => `${fmtDate(iso)}, ${fmtTime(iso)}`;
const fmtHours = (h) => { if (h == null) return '—'; const m = Math.round(h * 60); return `${Math.floor(m / 60)}j ${String(m % 60).padStart(2, '0')}m`; };
const ymd = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });
const todayLong = () => new Date().toLocaleDateString('ms-MY', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const mapLink = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;
const area = (m) => (m.width_mm * m.height_mm * m.qty) / 1e6;
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
const initials = (n) => String(n || '?').split(/\s+/).filter((w) => w && !/^(bin|binti|bt|b\.|a\/l|a\/p)$/i.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const firstName = (n) => String(n || '').split(/\s+/)[0];
const greeting = () => {
  const h = Number(new Date().toLocaleString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }));
  return h < 12 ? 'Selamat pagi' : h < 15 ? 'Selamat tengah hari' : h < 19 ? 'Selamat petang' : 'Selamat malam';
};
function timeAgo(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return 'baru tadi';
  if (s < 3600) return `${Math.floor(s / 60)} min lalu`;
  if (s < 86400 && ymd(iso) === ymd(Date.now())) return `${Math.floor(s / 3600)} jam lalu`;
  if (ymd(iso) === ymd(Date.now() - 864e5)) return `semalam, ${fmtTime(iso)}`;
  return fmtDate(iso);
}
// mm → kaki-inci, dibundarkan ke ¼" terdekat (cth: 2400 → 7' 10½")
function ftIn(mm) {
  if (!(mm > 0)) return '';
  let ft = Math.floor(mm / 25.4 / 12);
  let inch = Math.round((mm / 25.4 - ft * 12) * 4) / 4;
  if (inch >= 12) { ft += 1; inch -= 12; }
  const whole = Math.floor(inch), frac = { 0: '', 0.25: '¼', 0.5: '½', 0.75: '¾' }[inch - whole];
  return `${ft}' ${whole}${frac}"`;
}
// No. telefon Malaysia → format wa.me (cth: 012-345 6789 → 60123456789)
const waNumber = (phone) => { let d = String(phone || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '6' + d; return d.length >= 10 ? d : ''; };

/* ================= Ikon ================= */
const I = (d, w = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  home: I('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>'),
  punch: I('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>'),
  proj: I('<path d="M3 21V10l9-6 9 6v11"/><path d="M8 21v-7h8v7M3 21h18"/>'),
  rec: I('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M7 13h4M7 17h7"/>'),
  staff: I('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.5c2.3.2 3.8 1.8 4.5 4.5"/>'),
  acct: I('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3"/><path d="M6.5 18.5c1.3-2 3.2-3 5.5-3s4.2 1 5.5 3"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>', 2.4),
  minus: I('<path d="M5 12h14"/>', 2.4),
  x: I('<path d="M6 6l12 12M18 6L6 18"/>', 2.2),
  pin: I('<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>'),
  print: I('<path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2"/><rect x="6" y="14" width="12" height="7"/>'),
  edit: I('<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>'),
  trash: I('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  dl: I('<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>'),
  back: I('<path d="M15 6l-6 6 6 6"/>'),
  chev: I('<path d="M9 6l6 6-6 6"/>'),
  search: I('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
  gps: I('<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3"/>'),
  power: I('<path d="M12 3v8"/><path d="M6.3 7.3a8 8 0 1 0 11.4 0"/>', 2.2),
  ruler: I('<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>'),
  map: I('<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>'),
  out: I('<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>'),
  check: I('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 2.6),
  alert: I('<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18h.01"/>'),
  layers: I('<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>'),
  camera: I('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  copy: I('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
  phone: I('<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2"/>'),
  install: I('<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M12 7v7M9 11l3 3 3-3M10 18h4"/>'),
  wifiOff: I('<path d="M2 8.8a15 15 0 0 1 4.2-2.6M9.8 5.2A15 15 0 0 1 22 8.8M5 12.5a10 10 0 0 1 4-2.2M15.5 10.6a10 10 0 0 1 3.5 1.9M8.5 16a5 5 0 0 1 7 0M12 20h.01M3 3l18 18"/>'),
  wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>',
};

/* ================= API ================= */
async function api(path, opts = {}) {
  const method = opts.method || (opts.body ? 'POST' : 'GET');
  try {
    return await window.AJCBackend.request(method, path, opts.body);
  } catch (e) {
    if (e.status === 401 && path !== '/api/login') { state.me = null; renderLogin(); throw new Error('Sila log masuk semula'); }
    throw e;
  }
}
const IS_DEMO = () => window.AJCBackend && window.AJCBackend.mode === 'demo';
async function hydratePhotos(root = document) {
  for (const img of $$('img[data-photo]', root)) {
    const id = img.dataset.photo; img.removeAttribute('data-photo');
    try { img.src = await api(`/api/photos/${encodeURIComponent(id)}`); img.hidden = false; } catch { img.alt = 'Gambar tidak dijumpai'; }
  }
}
function downloadText(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(link); link.click(); link.parentNode.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/* ================= Maklum balas ================= */
function toast(msg, bad = false) {
  const t = $('#toast'); t.textContent = msg; t.className = bad ? 'bad' : ''; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 3200);
}
async function busy(btn, fn) {
  btn.disabled = true; btn.classList.add('loading');
  try { return await fn(); } catch (e) { toast(e.message, true); } finally { btn.disabled = false; btn.classList.remove('loading'); }
}
// Skrin pengesahan penuh selepas punch (dengan getaran telefon)
function celebrate({ ok = true, title, sub }) {
  const el = document.createElement('div');
  el.className = `done ${ok ? '' : 'warn'}`;
  el.setAttribute('role', 'alert');
  el.innerHTML = `<div class="done-card"><div class="done-ic">${ok ? ICON.check : ICON.alert}</div><h2>${esc(title)}</h2><p>${esc(sub)}</p><span class="done-tap">Tekan untuk tutup</span></div>`;
  document.body.appendChild(el);
  try { navigator.vibrate && navigator.vibrate(ok ? 40 : [80, 60, 80]); } catch {}
  const close = () => { if (!el.parentNode) return; el.classList.add('out'); setTimeout(() => el.parentNode && el.parentNode.removeChild(el), 220); };
  el.onclick = close; setTimeout(close, ok ? 2200 : 4000);
}

/* ================= GPS ================= */
function getPosition() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Telefon ini tidak menyokong GPS'));
    if (!window.isSecureContext) return reject(new Error('GPS hanya berfungsi melalui HTTPS.'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }),
      (e) => reject(new Error(e.code === 1 ? 'Akses lokasi ditolak. Benarkan "Location" untuk laman ini dalam tetapan browser.' :
        e.code === 3 ? 'GPS mengambil masa terlalu lama. Cuba di kawasan terbuka.' : 'Lokasi tidak dapat dikesan.')),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  });
}

/* ================= Modal / bottom sheet ================= */
function openModal(html, onMount) {
  const dlg = $('#modal'); $('#modal-body').innerHTML = html;
  dlg.onclick = (e) => { if (e.target === dlg) closeModal(); }; // klik latar untuk tutup
  if (!dlg.open) dlg.showModal();
  $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', () => dlg.close()));
  onMount && onMount(dlg);
}
const closeModal = () => $('#modal').open && $('#modal').close();
function confirmBox(title, text, okLabel = 'Padam', danger = true) {
  return new Promise((resolve) => {
    openModal(`<div class="confirm"><div class="confirm-ic ${danger ? 'bad' : ''}">${danger ? ICON.trash : ICON.alert}</div><h2>${esc(title)}</h2><p class="muted">${esc(text)}</p></div>
      <div class="modal-foot"><button class="btn" data-close>Batal</button><button class="btn ${danger ? 'danger-solid' : 'primary'}" id="cf-ok">${esc(okLabel)}</button></div>`, (dlg) => {
      let ok = false;
      $('#cf-ok').onclick = () => { ok = true; dlg.close(); };
      dlg.addEventListener('close', () => resolve(ok), { once: true });
    });
  });
}

/* ================= Gambar ================= */
function resizeImage(file, max = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', max <= 1000 ? 0.7 : 0.82));
    };
    img.onerror = () => reject(new Error('Gambar tidak dapat dibaca'));
    img.src = url;
  });
}

/* ================= Lakaran bukaan (elevation + garisan dimensi) ================= */
function defaultPanels(type) {
  if (/Folding/.test(type)) return 4;
  if (/Sliding|Shower|Partition/.test(type)) return 2;
  return 1;
}
function drawing(m, { dims = true } = {}) {
  const W = m.width_mm, H = m.height_mm;
  const box = dims ? { w: 92, h: 96, x: 22, y: 4 } : { w: 104, h: 104, x: 8, y: 8 };
  const s = Math.min(box.w / W, box.h / H);
  const w = W * s, h = H * s, x = box.x + (box.w - w) / 2, y = box.y + (box.h - h) / 2;
  const n = Math.max(1, Math.min(8, m.panels || defaultPanels(m.item_type)));
  const t = m.item_type || '';
  let g = '';
  const pw = w / n;
  for (let i = 1; i < n; i++) g += `<line x1="${x + pw * i}" y1="${y}" x2="${x + pw * i}" y2="${y + h}" stroke="#1b6db4" stroke-width="1.2"/>`;
  for (let i = 0; i < n; i++) {
    const px = x + pw * i, cx = px + pw / 2, cy = y + h / 2, a = Math.min(pw * 0.28, 9);
    if (/Sliding|Shower/.test(t)) {
      const d = i % 2 ? -1 : 1;
      g += `<path d="M${cx - a * d} ${cy}H${cx + a * d}M${cx + a * d - 3 * d} ${cy - 3}L${cx + a * d} ${cy}L${cx + a * d - 3 * d} ${cy + 3}" stroke="#123f73" stroke-width="1.3" fill="none"/>`;
    } else if (/Swing|Casement/.test(t)) {
      const hinge = i % 2 ? px + pw : px, far = i % 2 ? px : px + pw;
      g += `<path d="M${far} ${y}L${hinge} ${cy}L${far} ${y + h}" stroke="#7b8794" stroke-width="1" stroke-dasharray="3 2" fill="none"/>`;
    } else if (/Top Hung/.test(t)) {
      g += `<path d="M${px} ${y + h}L${cx} ${y}L${px + pw} ${y + h}" stroke="#7b8794" stroke-width="1" stroke-dasharray="3 2" fill="none"/>`;
    } else if (/Folding/.test(t)) {
      g += `<path d="M${px} ${y + h}L${cx} ${y + h - Math.min(8, pw / 2)}L${px + pw} ${y + h}" stroke="#123f73" stroke-width="1.1" fill="none"/>`;
    } else if (/Louvre/.test(t)) {
      for (let k = 1; k < 6; k++) g += `<line x1="${px + 2}" y1="${y + (h * k) / 6}" x2="${px + pw - 2}" y2="${y + (h * k) / 6}" stroke="#7b8794" stroke-width="1"/>`;
    } else if (/Cermin/.test(t)) {
      g += `<path d="M${px + pw * 0.25} ${y + h * 0.2}l${pw * 0.2} ${-h * 0.08}M${px + pw * 0.25} ${y + h * 0.32}l${pw * 0.35} ${-h * 0.14}" stroke="#7fb0e0" stroke-width="1.4" fill="none"/>`;
    }
  }
  const dimG = dims ? `<g stroke="#64748b" stroke-width=".8"><line x1="${x}" y1="${y + h + 6}" x2="${x + w}" y2="${y + h + 6}"/><line x1="${x}" y1="${y + h + 3}" x2="${x}" y2="${y + h + 9}"/><line x1="${x + w}" y1="${y + h + 3}" x2="${x + w}" y2="${y + h + 9}"/>
    <line x1="${x - 6}" y1="${y}" x2="${x - 6}" y2="${y + h}"/><line x1="${x - 9}" y1="${y}" x2="${x - 3}" y2="${y}"/><line x1="${x - 9}" y1="${y + h}" x2="${x - 3}" y2="${y + h}"/></g>
    <text x="${x + w / 2}" y="${y + h + 17}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" font-weight="700" fill="#0f1b2d">${W}</text>
    <text transform="translate(${x - 10} ${y + h / 2}) rotate(-90)" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" font-weight="700" fill="#0f1b2d">${H}</text>` : '';
  return `<svg viewBox="0 0 120 ${dims ? 124 : 120}" role="img" aria-label="${esc(t)} ${W} x ${H} mm">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#e3effb" stroke="#0b2545" stroke-width="${dims ? 2 : 2.4}" rx="1"/>${g}${dimG}</svg>`;
}

/* ================= Komponen kecil ================= */
function geoPill(ok, dist) {
  if (ok == null) return '<span class="pill p-na" title="Tapak tiada koordinat GPS">Tiada GPS</span>';
  return ok ? `<span class="pill p-ok" title="${fmtNum(dist)} m dari tapak">Di tapak</span>` : `<span class="pill p-bad" title="Di luar kawasan tapak">${fmtNum(dist)} m</span>`;
}
const pageHead = (title, sub, actions = '') => `<div class="page-head"><div class="ph-text"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${actions ? `<div class="ph-actions">${actions}</div>` : ''}</div>`;
const emptyBox = (icon, title, text) => `<div class="empty"><div class="ill">${icon}</div><h3>${title}</h3><p>${text}</p></div>`;
const avatar = (name, cls = '') => `<span class="avatar ${cls}" aria-hidden="true">${esc(initials(name))}</span>`;
const steps = (status) => `<div class="steps s${STEP[status]}" aria-label="Status: ${STATUS[status]}"><i></i><i></i><i></i><i></i></div>`;
const skeleton = () => `<div class="sk sk-h"></div><div class="sk-row"><div class="sk sk-tile"></div><div class="sk sk-tile"></div><div class="sk sk-tile"></div></div><div class="sk sk-card"></div><div class="sk sk-card"></div>`;

/* ================= Shell & routing ================= */
const defaultRoute = () => (state.me?.role === 'admin' ? 'utama' : 'punch');
const currentRoute = () => location.hash.replace('#', '').split('/')[0] || defaultRoute();
function navItems() {
  const admin = state.me.role === 'admin';
  const t = [];
  if (admin) t.push(['utama', 'Utama', ICON.home]);
  t.push(['punch', 'Punch', ICON.punch], ['projek', 'Projek', ICON.proj], ['rekod', 'Rekod', ICON.rec]);
  t.push(admin ? ['staff', 'Staff', ICON.staff] : ['akaun', 'Akaun', ICON.acct]);
  return t;
}
function shell(content) {
  const r = currentRoute();
  const link = ([k, l, i]) => `<a href="#${k}" class="${r === k ? 'on' : ''}" ${r === k ? 'aria-current="page"' : ''}>${i}<span>${l}</span></a>`;
  const items = navItems();
  const sideItems = state.me.role === 'admin' ? [...items, ['akaun', 'Akaun', ICON.acct]] : items;
  $('#app').innerHTML = `
    <aside class="side">
      <a class="side-logo" href="#${defaultRoute()}" aria-label="Laman utama"><img src="logo.png" alt="AJC Construction"></a>
      <div class="side-label">Menu</div>
      <nav class="side-nav">${sideItems.map(link).join('')}</nav>
      ${IS_DEMO() ? '<div class="side-demo"><b>Mod demo</b><span>Data disimpan dalam peranti ini sahaja.</span></div>' : ''}
      <a class="side-user" href="#akaun">${avatar(state.me.name)}<span><b>${esc(state.me.name)}</b><small>${state.me.role === 'admin' ? 'Pentadbir' : 'Staff tapak'}</small></span></a>
    </aside>
    <div class="content">
      <header class="topbar"><div class="topbar-in">
        <a class="logo" href="#${defaultRoute()}" aria-label="Laman utama"><img src="logo.png" alt="AJC Construction"></a>
        <div class="right">
          ${IS_DEMO() ? '<span class="demo-badge" title="Data disimpan dalam peranti ini sahaja">Demo</span>' : ''}
          <a href="#akaun" class="avatar-link" aria-label="Akaun saya">${avatar(state.me.name)}</a>
        </div>
      </div></header>
      <div class="offline" id="offline" ${navigator.onLine ? 'hidden' : ''}>${ICON.wifiOff}Tiada internet. Data demo masih boleh digunakan.</div>
      <main id="main">${content}</main>
    </div>
    <nav class="tabbar" aria-label="Menu utama"><div class="tabs">${items.map(link).join('')}</div></nav>`;
}
async function router() {
  clearInterval(state.clockTimer);
  closeModal();
  if (!state.me) return renderLogin();
  if (!location.hash) history.replaceState(null, '', `#${defaultRoute()}`);
  const [r, id] = location.hash.replace('#', '').split('/');
  // skeleton hanya jika data lambat (cth: bila disambung ke database sebenar)
  const sk = setTimeout(() => { const m = $('#main'); if (m) m.innerHTML = skeleton(); }, 150);
  try {
    if (r === 'utama' && state.me.role === 'admin') await renderDashboard();
    else if (r === 'projek' && id) await renderProject(Number(id));
    else if (r === 'projek') await renderProjects();
    else if (r === 'rekod') await renderRecords();
    else if (r === 'staff' && state.me.role === 'admin') await renderStaff();
    else if (r === 'akaun') renderAccount();
    else await renderPunch();
    window.scrollTo(0, 0);
  } catch (e) {
    if (state.me) shell(emptyBox(ICON.alert, 'Tidak dapat dimuatkan', esc(e.message)));
  } finally { clearTimeout(sk); }
}
window.addEventListener('hashchange', router);
window.addEventListener('online', () => { const o = $('#offline'); if (o) o.hidden = true; });
window.addEventListener('offline', () => { const o = $('#offline'); if (o) o.hidden = false; });
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); state.installPrompt = e; });

/* ================= Log masuk ================= */
function renderLogin() {
  $('#app').innerHTML = `<div class="login">
    <section class="login-brand">
      <div class="lb-in">
        <span class="lb-badge">Aluminium & Glass Specialist</span>
        <h1>Setiap ukuran tepat.<br>Setiap tapak direkod.</h1>
        <p>Sistem dalaman AJC Construction untuk ukuran tapak dan kehadiran staff.</p>
        <ul class="lb-feat">
          <li>${ICON.ruler}<span>Ukuran mm & kaki-inci dengan lakaran automatik</span></li>
          <li>${ICON.gps}<span>Punch in / out dengan semakan GPS tapak</span></li>
          <li>${ICON.layers}<span>Ringkasan pesanan kaca & helaian bengkel</span></li>
        </ul>
      </div>
    </section>
    <section class="login-form">
      <form id="lf" autocomplete="on">
        <img class="lf-logo" src="logo.png" alt="AJC Construction">
        <div><h2>Log masuk</h2><p class="muted small" style="margin:4px 0 0">Gunakan akaun yang diberi oleh pentadbir.</p></div>
        <label class="f">Username<input id="lu" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="cth: ali" required></label>
        <label class="f">Kata laluan<input id="lp" name="password" type="password" autocomplete="current-password" placeholder="••••••" required></label>
        <div class="err" id="le" hidden></div>
        <button class="btn primary lg" id="lbtn">Log masuk</button>
        ${IS_DEMO() ? `<div class="demo-hint"><b>Mod demo</b> · tekan untuk cuba:
          <div class="demo-acc"><button type="button" data-demo="admin|ajc12345">${avatar('Pentadbir AJC')}<span><b>Pentadbir</b><small>admin</small></span></button>
          <button type="button" data-demo="ali|ali123">${avatar('Ali Ahmad')}<span><b>Staff tapak</b><small>ali</small></span></button></div></div>` : ''}
      </form>
      <div class="lf-foot">© AJC Construction</div>
    </section>
  </div>`;
  const submit = async () => {
    const btn = $('#lbtn'); btn.disabled = true; btn.classList.add('loading');
    try {
      state.me = await api('/api/login', { body: { username: $('#lu').value, password: $('#lp').value } });
      history.replaceState(null, '', `#${defaultRoute()}`); router();
    } catch (err) { $('#le').textContent = err.message; $('#le').hidden = false; btn.disabled = false; btn.classList.remove('loading'); }
  };
  $$('[data-demo]').forEach((b) => (b.onclick = () => { const [u, pw] = b.dataset.demo.split('|'); $('#lu').value = u; $('#lp').value = pw; submit(); }));
  $('#lf').onsubmit = (e) => { e.preventDefault(); submit(); };
}

/* ================= Dashboard (admin) ================= */
async function renderDashboard() {
  const d = await api('/api/dashboard');
  const kpi = (label, value, icon, tone = '', href = '') => `<${href ? `a href="${href}"` : 'div'} class="kpi ${tone}">
    <div class="kpi-ic">${icon}</div><div class="kpi-l">${label}</div><div class="kpi-v">${value}</div></${href ? 'a' : 'div'}>`;
  const feedItem = (f) => {
    const ic = f.type === 'measure' ? ICON.ruler : f.type === 'in' ? ICON.punch : ICON.out;
    const verb = f.type === 'measure' ? 'mengukur' : f.type === 'in' ? 'punch in di' : 'punch out dari';
    const what = f.type === 'measure' ? `<b>${esc(f.text)}</b> · ${esc(f.sub)}` : `<b>${esc(f.project_name || 'Bengkel / Pejabat')}</b> ${f.ok === false ? `<span class="pill p-bad">${fmtNum(f.dist)} m</span>` : ''}`;
    return `<li class="feed-i ${f.type}"><span class="feed-ic">${ic}</span><div><div>${esc(firstName(f.user_name))} ${verb} ${what}</div>
      <small>${timeAgo(f.at)}${f.type === 'measure' && f.project_name ? ` · ${esc(f.project_name)}` : ''}</small></div></li>`;
  };
  shell(`
    ${pageHead(`${greeting()}, ${esc(firstName(state.me.name))}`, todayLong(),
      `<button class="btn" id="d-staff">${ICON.staff}<span>Tambah staff</span></button><button class="btn primary" id="d-proj">${ICON.plus}<span>Projek baru</span></button>`)}
    <div class="kpis">
      ${kpi('Bertugas sekarang', `${d.on_duty.length}<small> / ${d.staff_total}</small>`, ICON.punch, 'k-ok', '#rekod')}
      ${kpi('Projek aktif', d.active_projects, ICON.proj, '', '#projek')}
      ${kpi('Kaca dalam proses', `${fmtNum(d.active_area_m2, 1)}<small> m²</small>`, ICON.layers)}
      ${kpi('Amaran GPS · 7 hari', d.gps_alerts_7d, ICON.alert, d.gps_alerts_7d ? 'k-bad' : '', '#rekod')}
    </div>
    <div class="dash-grid">
      <section class="card">
        <div class="card-head"><h2>Sedang bertugas</h2><span class="live"><span class="dot"></span>Langsung</span></div>
        ${d.on_duty.length ? `<ul class="duty">${d.on_duty.map((a) => `<li>${avatar(a.user_name)}<div class="duty-t"><b>${esc(a.user_name)}</b>
          <small>${a.project_id ? `<a href="#projek/${a.project_id}">${esc(a.project_name)}</a>` : 'Bengkel / Pejabat'}</small></div>
          <div class="duty-r"><span class="mono">${fmtTime(a.in_at)}</span>${geoPill(a.in_ok, a.in_dist_m)}</div></li>`).join('')}</ul>`
          : `<p class="muted small">Tiada staff bertugas sekarang.</p>`}
      </section>
      <section class="card">
        <div class="card-head"><h2>Aktiviti terkini</h2></div>
        ${d.feed.length ? `<ul class="feed">${d.feed.map(feedItem).join('')}</ul>` : '<p class="muted small">Belum ada aktiviti.</p>'}
      </section>
    </div>
    <section class="stack">
      <div class="section-head"><h2>Aliran projek</h2><a href="#projek">Semua projek ${ICON.chev}</a></div>
      <div class="pipeline">${Object.entries(STATUS).map(([k, l]) => {
        const list = d.by_status[k] || [];
        return `<div class="pcol c-${k}"><div class="pcol-h"><span class="pill st-${k}">${l}</span><b>${list.length}</b></div>
          <div class="pcol-sub">${STATUS_HINT[k]}</div>
          ${list.slice(0, 4).map((p) => `<a class="pcard" href="#projek/${p.id}"><b>${esc(p.name)}</b><small><span class="mono">${fmtNum(p.area_m2, 1)} m²</span> · ${p.item_count} ukuran</small></a>`).join('')}
          ${list.length > 4 ? `<a class="pmore" href="#projek">+ ${list.length - 4} lagi</a>` : ''}
          ${list.length ? '' : '<div class="pnone">Tiada projek</div>'}</div>`;
      }).join('')}</div>
    </section>`);
  $('#d-proj').onclick = () => projectForm();
  $('#d-staff').onclick = () => staffForm();
}

/* ================= Punch in / out ================= */
async function renderPunch() {
  const [{ open }, projects, mine] = await Promise.all([
    api('/api/attendance/status'),
    api('/api/projects'),
    api(`/api/attendance?from=${encodeURIComponent(new Date(Date.now() - 6 * 864e5).toISOString())}`),
  ]);
  const active = projects.filter((p) => p.status !== 'siap');
  const last = store.get('ajc_last_project') || '';
  const myRows = mine.filter((r) => r.user_id === state.me.id);
  const weekHours = myRows.reduce((a, r) => a + (r.hours || 0), 0);
  const days = new Set(myRows.map((r) => ymd(r.in_at))).size;
  shell(`
    <div class="punch-grid">
    <section class="hero ${open ? 'on-duty' : ''}">
      <div class="hero-top">
        <div class="greet">${greeting()},<b>${esc(firstName(state.me.name))}</b></div>
        <span class="glass"><span class="dot ${open ? '' : 'idle'}"></span>${open ? 'Sedang bertugas' : 'Belum punch in'}</span>
      </div>
      <div class="clock" id="clock">--:--</div>
      <div class="date">${todayLong()}</div>
      ${open ? `
        <div class="shift-info">
          <div><div class="k">Masuk</div><div class="v mono">${fmtTime(open.in_at)}</div></div>
          <div><div class="k">Tempoh</div><div class="v mono" id="elapsed">—</div></div>
          <div class="wide"><div class="k">Lokasi</div><div class="v">${esc(open.project_name || 'Bengkel / Pejabat')}</div></div>
        </div>
        <div class="punch-wrap"><button class="punch-btn out" id="pbtn">${ICON.power}<span>Punch Out</span><small>Tamat kerja</small></button></div>
      ` : `
        <div class="hero-select"><label for="pproj">Lokasi kerja hari ini</label>
          <select id="pproj"><option value="">Bengkel / Pejabat</option>
          ${active.map((p) => `<option value="${p.id}" ${String(p.id) === last ? 'selected' : ''}>${esc(p.name)}${p.lat == null ? ' (tiada GPS)' : ''}</option>`).join('')}</select></div>
        <div class="punch-wrap"><button class="punch-btn" id="pbtn">${ICON.power}<span>Punch In</span><small>Mula kerja</small></button></div>
      `}
      <div class="gps-line" id="gps">${ICON.gps}<span>Lokasi GPS direkod bila anda tekan butang</span></div>
    </section>
    <section class="stack">
      <div class="mini-stats"><div><small>Jam 7 hari</small><b class="mono">${fmtHours(weekHours)}</b></div><div><small>Hari bekerja</small><b class="mono">${days}</b></div></div>
      <div class="section-head"><h2>7 hari lepas</h2><a href="#rekod">Lihat semua ${ICON.chev}</a></div>
      ${myRows.length ? `<div class="rec-list">${myRows.slice(0, 6).map((r) => recItem(r)).join('')}</div>`
        : emptyBox(ICON.punch, 'Belum ada rekod', 'Tekan <b>Punch In</b> bila mula kerja.')}
    </section>
    </div>`);
  const tick = () => {
    const now = new Date();
    $('#clock').textContent = now.toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
    if (open && $('#elapsed')) $('#elapsed').textContent = fmtHours((now - new Date(open.in_at)) / 36e5);
  };
  tick(); state.clockTimer = setInterval(tick, 1000 * 15);

  $('#pbtn').onclick = (e) => busy(e.currentTarget, async () => {
    const gpsTxt = $('#gps span'); $('#gps').classList.add('seeking'); gpsTxt.textContent = 'Mengesan lokasi GPS…';
    let pos;
    try { pos = await getPosition(); } catch (err) { $('#gps').classList.remove('seeking'); gpsTxt.textContent = err.message; throw err; }
    gpsTxt.textContent = `Lokasi dikesan · ketepatan ±${pos.acc} m`;
    const at = fmtTime(new Date().toISOString());
    if (open) {
      const r = await api('/api/attendance/out', { body: pos });
      celebrate(r.inside === false ? { ok: false, title: `Punch out ${at}`, sub: `Direkod, tetapi anda ${fmtNum(r.dist)} m dari tapak.` }
        : { title: `Punch out ${at}`, sub: `Terima kasih, ${firstName(state.me.name)}. Jumpa esok!` });
    } else {
      const pid = $('#pproj').value; store.set('ajc_last_project', pid);
      const r = await api('/api/attendance/in', { body: { ...pos, project_id: pid || null } });
      celebrate(r.ok === false ? { ok: false, title: `Punch in ${at}`, sub: `Amaran: anda ${fmtNum(r.dist)} m dari tapak. Admin akan nampak rekod ini.` }
        : { title: `Punch in ${at}`, sub: r.ok ? `Di tapak · ${fmtNum(r.dist)} m dari lokasi projek` : 'Selamat bekerja!' });
    }
    renderPunch();
  });
}
function recItem(r, showName = false) {
  const d = new Date(r.in_at);
  const gps = (lat, lng, ok, dist) => (lat == null ? '' : `<a href="${mapLink(lat, lng)}" target="_blank" rel="noopener" title="Buka peta">${geoPill(ok, dist)}</a>`);
  return `<div class="rec">
    <div class="day"><b>${d.toLocaleDateString('en-GB', { timeZone: TZ, day: 'numeric' })}</b><span>${d.toLocaleDateString('ms-MY', { timeZone: TZ, weekday: 'short' })}</span></div>
    <div class="what">
      <div class="t">${showName ? `${esc(r.user_name)} · ` : ''}${esc(r.project_name || 'Bengkel / Pejabat')}</div>
      <div class="s"><span class="mono">${fmtTime(r.in_at)} → ${r.out_at ? fmtTime(r.out_at) : '…'}</span>${gps(r.in_lat, r.in_lng, r.in_ok, r.in_dist_m)}${r.out_at ? gps(r.out_lat, r.out_lng, r.out_ok, r.out_dist_m) : ''}</div>
      ${r.note ? `<div class="s">${esc(r.note)}</div>` : ''}
    </div>
    <div class="hrs">${r.out_at ? `${fmtHours(r.hours)}<small>jam</small>` : '<span class="pill p-ok">Aktif</span>'}</div>
  </div>`;
}

/* ================= Projek: senarai ================= */
async function renderProjects() {
  let st = store.get('ajc_pst') || '';
  const q0 = store.get('ajc_pq') || '';
  shell(`
    ${pageHead('Projek', 'Ukuran tapak dan status setiap projek', `<button class="btn primary" id="newp">${ICON.plus}<span>Projek baru</span></button>`)}
    <div class="toolbar">
      <div class="search">${ICON.search}<input id="pq" type="search" placeholder="Cari projek, pelanggan atau item (cth: shower)" value="${esc(q0)}" aria-label="Cari projek"></div>
      <div class="seg" id="pst" role="tablist"></div>
    </div>
    <div class="list cols" id="plist"></div>`);
  const load = async () => {
    const q = $('#pq').value.trim();
    store.set('ajc_pq', q); store.set('ajc_pst', st);
    const all = await api(`/api/projects?q=${encodeURIComponent(q)}`);
    const count = (k) => (k ? all.filter((p) => p.status === k).length : all.length);
    $('#pst').innerHTML = [['', 'Semua'], ...Object.entries(STATUS)].map(([k, l]) => `<button role="tab" aria-selected="${st === k}" class="${st === k ? 'on' : ''}" data-st="${k}">${l}<span>${count(k)}</span></button>`).join('');
    const rows = st ? all.filter((p) => p.status === st) : all;
    $('#plist').innerHTML = rows.length ? rows.map((p) => `
      <a class="card proj" href="#projek/${p.id}">
        <div class="top"><span class="code">${esc(p.code)}</span><span class="pill st-${p.status}">${STATUS[p.status]}</span></div>
        <h3>${esc(p.name)}</h3>
        <div class="addr">${ICON.pin}<span>${esc([p.client, p.address].filter(Boolean).join(' · ') || 'Tiada alamat')}</span></div>
        ${steps(p.status)}
        <div class="meta"><span><b>${p.item_count}</b> ukuran</span><span><b>${p.unit_count}</b> unit</span><span><b>${fmtNum(p.area_m2, 2)}</b> m²</span><span class="upd">${timeAgo(p.updated_at)}</span></div>
      </a>`).join('') : emptyBox(ICON.proj, q || st ? 'Tiada projek sepadan' : 'Belum ada projek', q || st ? 'Cuba carian atau status lain.' : 'Tekan <b>Projek baru</b> untuk mula rekod ukuran tapak.');
  };
  let t; $('#pq').oninput = () => { clearTimeout(t); t = setTimeout(load, 200); };
  $('#pst').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; st = b.dataset.st; load(); };
  $('#newp').onclick = () => projectForm();
  await load();
}

function projectForm(p = null) {
  openModal(`
    <div class="modal-head"><div><div class="eyebrow">${p ? esc(p.code) : 'Projek baru'}</div><h2>${p ? 'Edit projek' : 'Cipta projek'}</h2></div><button class="btn icon ghost" data-close aria-label="Tutup">${ICON.x}</button></div>
    <form id="pf" class="form">
      <div class="fsec">
        <label class="f">Nama projek *<input id="pf-name" required value="${esc(p?.name)}" placeholder="cth: Rumah Teres En. Hafiz, Bangi"></label>
        <div class="grid2">
          <label class="f">Pelanggan<input id="pf-client" value="${esc(p?.client)}" placeholder="Nama pelanggan"></label>
          <label class="f">No. telefon<input id="pf-phone" type="tel" inputmode="tel" value="${esc(p?.phone)}" placeholder="01x-xxx xxxx"></label>
        </div>
        <label class="f">Alamat tapak<textarea id="pf-address" rows="2">${esc(p?.address)}</textarea></label>
      </div>
      <div class="fsec">
        <div class="fsec-h">Status projek</div>
        <div class="seg seg-fill" id="pf-status">${Object.entries(STATUS).map(([k, l]) => `<button type="button" data-v="${k}" class="${(p?.status || 'ukur') === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      </div>
      <div class="fsec">
        <div class="fsec-h">${ICON.gps}Lokasi GPS tapak</div>
        <p class="muted small" style="margin:0">Digunakan untuk semak punch in staff. Tekan butang di bawah semasa berada di tapak.</p>
        <button type="button" class="btn" id="pf-here">${ICON.pin}<span>Guna lokasi saya sekarang</span></button>
        <div class="grid3">
          <label class="f">Latitude<input id="pf-lat" inputmode="decimal" value="${p?.lat ?? ''}" placeholder="3.0000"></label>
          <label class="f">Longitude<input id="pf-lng" inputmode="decimal" value="${p?.lng ?? ''}" placeholder="101.000"></label>
          <label class="f">Radius (m)<input id="pf-rad" type="number" min="30" max="5000" value="${p?.radius_m ?? 200}"></label>
        </div>
      </div>
      <details class="fsec" ${p?.notes ? 'open' : ''}><summary>Lagi: kod projek & nota</summary>
        <label class="f">Kod projek<span class="hint">Kosongkan untuk dijana automatik</span><input id="pf-code" value="${esc(p?.code)}"></label>
        <label class="f">Nota<textarea id="pf-notes" rows="2">${esc(p?.notes)}</textarea></label>
      </details>
      <div class="modal-foot"><button type="button" class="btn" data-close>Batal</button><button class="btn primary" id="pf-save">${ICON.check}<span>${p ? 'Simpan' : 'Cipta projek'}</span></button></div>
    </form>`, () => {
    let status = p?.status || 'ukur';
    $('#pf-status').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; status = b.dataset.v; $$('#pf-status button').forEach((x) => x.classList.toggle('on', x === b)); };
    $('#pf-here').onclick = (e) => busy(e.currentTarget, async () => {
      const pos = await getPosition();
      $('#pf-lat').value = pos.lat.toFixed(6); $('#pf-lng').value = pos.lng.toFixed(6);
      toast(`Lokasi tapak ditetapkan (±${pos.acc} m)`);
    });
    $('#pf').onsubmit = (e) => { e.preventDefault(); busy($('#pf-save'), async () => {
      const body = { name: $('#pf-name').value, client: $('#pf-client').value, phone: $('#pf-phone').value, address: $('#pf-address').value,
        code: $('#pf-code').value, status, lat: $('#pf-lat').value, lng: $('#pf-lng').value, radius_m: $('#pf-rad').value, notes: $('#pf-notes').value };
      if (p) { await api(`/api/projects/${p.id}`, { method: 'PATCH', body }); closeModal(); toast('Projek disimpan'); renderProject(p.id); }
      else { const r = await api('/api/projects', { body }); closeModal(); toast('Projek dicipta'); state.projTab = 'ukuran'; location.hash = `#projek/${r.id}`; }
    }); };
  });
}

/* ================= Projek: butiran ================= */
function groupBy(ms, key) {
  const g = {};
  for (const m of ms) { const k = m[key] || 'Tidak dinyatakan'; g[k] = g[k] || { units: 0, area: 0 }; g[k].units += m.qty; g[k].area += area(m); }
  return Object.entries(g).sort((a, b) => b[1].area - a[1].area);
}
function summaryText(p) {
  const ms = p.measurements;
  const lines = ['*AJC Construction — Ukuran Tapak*', `${p.name} (${p.code})`];
  if (p.client) lines.push(`Pelanggan: ${p.client}`);
  lines.push('');
  ms.forEach((m, i) => {
    lines.push(`${i + 1}. ${m.location} — ${m.item_type}`);
    lines.push(`   ${m.width_mm} × ${m.height_mm} mm${m.qty > 1 ? ` × ${m.qty} unit` : ''}${m.glass ? ` · ${m.glass}` : ''}${m.frame_color ? ` · ${m.frame_color}` : ''}`);
  });
  lines.push('', `Jumlah: ${ms.reduce((a, m) => a + m.qty, 0)} unit · ${fmtNum(ms.reduce((a, m) => a + area(m), 0), 2)} m²`);
  return lines.join('\n');
}
async function renderProject(id) {
  const p = await api(`/api/projects/${id}`);
  const ms = p.measurements;
  const units = ms.reduce((a, m) => a + m.qty, 0);
  const total = ms.reduce((a, m) => a + area(m), 0);
  const isAdmin = state.me.role === 'admin';
  const tab = state.projTab;
  const wa = waNumber(p.phone);
  const text = summaryText(p);
  const sumTable = (title, rows) => `<div class="card"><h3 style="margin-bottom:10px">${title}</h3><div class="tbl-wrap flat"><table>
    <thead><tr><th>Item</th><th class="num">Unit</th><th class="num">m²</th></tr></thead>
    <tbody>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num mono">${v.units}</td><td class="num mono">${fmtNum(v.area, 2)}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td>Jumlah</td><td class="num mono">${units}</td><td class="num mono">${fmtNum(total, 2)}</td></tr></tfoot></table></div></div>`;

  shell(`
    <a href="#projek" class="crumb no-print">${ICON.back}Semua projek</a>
    <section class="card p-hero">
      <div class="print-only"><img src="logo.png" alt="AJC Construction" style="height:44px"><h2 style="margin-top:8px">Helaian Ukuran Tapak</h2></div>
      <div class="title">
        <div><div class="code mono muted small">${esc(p.code)}</div><h1>${esc(p.name)}</h1></div>
        <span class="pill st-${p.status}">${STATUS[p.status]}</span>
      </div>
      <div class="no-print status-track">${steps(p.status)}<div class="steps-l" role="group" aria-label="Tukar status">${Object.entries(STATUS).map(([k, l]) => `<button type="button" data-st="${k}" class="${p.status === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      <div class="info">
        <div><div class="eyebrow">Pelanggan</div>${esc(p.client || '—')}${p.phone ? `<div class="mono muted small">${esc(p.phone)}</div>` : ''}</div>
        <div><div class="eyebrow">Alamat tapak</div>${esc(p.address || '—')}</div>
        ${p.notes ? `<div class="wide"><div class="eyebrow">Nota</div>${esc(p.notes)}</div>` : ''}
      </div>
      <div class="actions no-print">
        <button class="btn" id="pedit">${ICON.edit}<span>Edit</span></button>
        ${p.lat != null ? `<a class="btn" target="_blank" rel="noopener" href="https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes">${ICON.pin}<span>Waze</span></a>
          <a class="btn" target="_blank" rel="noopener" href="${mapLink(p.lat, p.lng)}">${ICON.map}<span>Maps</span></a>` : ''}
        ${p.phone ? `<a class="btn" href="tel:${esc(p.phone.replace(/\s/g, ''))}">${ICON.phone}<span>Telefon</span></a>` : ''}
        <button class="btn" id="pprint">${ICON.print}<span>Cetak</span></button>
        ${isAdmin ? `<button class="btn danger" id="pdel">${ICON.trash}<span>Padam</span></button>` : ''}
      </div>
      ${p.lat == null ? `<div class="notice no-print">${ICON.gps}<span>Tiada GPS tapak. Tekan <b>Edit</b> dan tetapkan lokasi supaya punch in staff boleh disemak.</span></div>` : ''}
    </section>

    <div class="stats"><div><div class="eyebrow">Ukuran</div><div class="v">${ms.length}</div></div>
      <div><div class="eyebrow">Unit</div><div class="v">${units}</div></div>
      <div><div class="eyebrow">Kaca</div><div class="v">${fmtNum(total, 1)}<small> m²</small></div></div></div>

    <div class="tabs-row no-print">
      <div class="seg" id="ptab" role="tablist"><button role="tab" aria-selected="${tab === 'ukuran'}" data-t="ukuran" class="${tab === 'ukuran' ? 'on' : ''}">Ukuran<span>${ms.length}</span></button><button role="tab" aria-selected="${tab === 'ringkasan'}" data-t="ringkasan" class="${tab === 'ringkasan' ? 'on' : ''}">Ringkasan</button></div>
      <button class="btn primary hide-m" id="addm">${ICON.plus}<span>Tambah ukuran</span></button>
    </div>

    <div class="no-print" ${tab === 'ukuran' ? '' : 'hidden'}>
      <div class="list meas-list">
      ${ms.length ? ms.map((m, i) => `
        <article class="card meas">
          <div class="dwg">${drawing(m)}</div>
          <div class="meas-b">
            <div class="meas-h">
              <div style="min-width:0"><div class="eyebrow">${String(i + 1).padStart(2, '0')} · ${esc(m.item_type)}</div><h3>${esc(m.location)}</h3></div>
              <div class="acts"><button class="btn icon ghost" data-edit="${m.id}" aria-label="Edit ukuran">${ICON.edit}</button><button class="btn icon ghost danger" data-del="${m.id}" aria-label="Padam ukuran">${ICON.trash}</button></div>
            </div>
            <div class="size">${fmtNum(m.width_mm)}<span class="x">×</span>${fmtNum(m.height_mm)}<span class="u">mm</span>${m.qty > 1 ? `<span class="q">× ${m.qty}</span>` : ''}</div>
            <div class="imp">${ftIn(m.width_mm)} × ${ftIn(m.height_mm)}</div>
            <div class="tags">${m.panels ? `<span class="tag">${m.panels} panel</span>` : ''}${m.glass ? `<span class="tag t-glass">${esc(m.glass)}</span>` : ''}${m.frame_color ? `<span class="tag">Frame ${esc(m.frame_color)}</span>` : ''}<span class="tag mono">${fmtNum(area(m), 2)} m²</span></div>
            ${m.notes ? `<div class="note">${esc(m.notes)}</div>` : ''}
            <div class="meas-f">${m.photo ? `<img class="thumb" data-photo="${esc(m.photo)}" alt="Gambar ${esc(m.location)}" data-zoom>` : ''}
              <span class="by">${avatar(m.measured_by_name, 'xs')}${esc(firstName(m.measured_by_name) || '—')} · ${timeAgo(m.updated_at)}</span></div>
          </div>
        </article>`).join('') : emptyBox(ICON.ruler, 'Belum ada ukuran', 'Tekan <b>Tambah ukuran</b> dan masukkan lebar × tinggi dalam milimeter.')}
      </div>
    </div>

    <div class="no-print" ${tab === 'ringkasan' ? '' : 'hidden'}>
      ${ms.length ? `<div class="sum-grid">
        ${sumTable('Pesanan kaca', groupBy(ms, 'glass'))}
        ${sumTable('Ikut jenis item', groupBy(ms, 'item_type'))}
        ${sumTable('Ikut warna frame', groupBy(ms, 'frame_color'))}
        <div class="card share">
          <h3>Kongsi ringkasan</h3>
          <p class="muted small" style="margin:0">Hantar senarai ukuran ke pelanggan, bengkel atau pembekal kaca.</p>
          <pre class="share-pre">${esc(text)}</pre>
          <div class="actions">
            <a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(text)}">${ICON.wa}<span>WhatsApp</span></a>
            ${wa ? `<a class="btn" target="_blank" rel="noopener" href="https://wa.me/${wa}?text=${encodeURIComponent(text)}">${ICON.wa}<span>Hantar ke pelanggan</span></a>` : ''}
            <button class="btn" id="pcopy">${ICON.copy}<span>Salin teks</span></button>
          </div>
        </div>
      </div>` : emptyBox(ICON.layers, 'Tiada data lagi', 'Ringkasan dijana automatik selepas ukuran ditambah.')}
    </div>

    <button class="fab no-print" id="fab" aria-label="Tambah ukuran" ${tab === 'ukuran' ? '' : 'hidden'}>${ICON.plus}</button>

    <div class="print-only">
      <table class="print-tbl"><thead><tr><th>#</th><th>Lokasi</th><th>Jenis</th><th class="num">Lebar (mm)</th><th class="num">Tinggi (mm)</th><th class="num">Unit</th><th class="num">Panel</th><th>Kaca</th><th>Frame</th><th class="num">m²</th><th>Nota</th></tr></thead><tbody>
      ${ms.map((m, i) => `<tr><td>${i + 1}</td><td>${esc(m.location)}</td><td>${esc(m.item_type)}</td><td class="num mono">${m.width_mm}</td><td class="num mono">${m.height_mm}</td><td class="num">${m.qty}</td><td class="num">${m.panels || ''}</td><td>${esc(m.glass)}</td><td>${esc(m.frame_color)}</td><td class="num mono">${fmtNum(area(m), 2)}</td><td>${esc(m.notes)}</td></tr>`).join('')}
      <tr><td colspan="5"><b>Jumlah</b></td><td class="num"><b>${units}</b></td><td colspan="3"></td><td class="num mono"><b>${fmtNum(total, 2)}</b></td><td></td></tr>
      </tbody></table>
      <p class="small">Dicetak ${fmtDateTime(new Date().toISOString())} · Diukur oleh: ____________ · Disemak oleh: ____________</p>
    </div>`);

  hydratePhotos($('#main'));
  $$('.steps-l button').forEach((b) => (b.onclick = async () => {
    if (b.dataset.st === p.status) return;
    try { await api(`/api/projects/${id}`, { method: 'PATCH', body: { status: b.dataset.st } }); toast(`Status: ${STATUS[b.dataset.st]}`); renderProject(id); } catch (err) { toast(err.message, true); }
  }));
  $('#ptab').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; state.projTab = b.dataset.t; renderProject(id); };
  $('#pedit').onclick = () => projectForm(p);
  $('#pprint').onclick = () => window.print();
  $('#addm').onclick = () => measurementForm(p.id);
  $('#fab').onclick = () => measurementForm(p.id);
  if ($('#pcopy')) $('#pcopy').onclick = async () => toast((await copyText(text)) ? 'Teks disalin' : 'Tidak dapat menyalin. Pilih teks secara manual.');
  if ($('#pdel')) $('#pdel').onclick = async () => {
    if (!(await confirmBox('Padam projek ini?', `"${p.name}" dan ${ms.length} ukuran akan dipadam kekal.`, 'Padam projek'))) return;
    try { await api(`/api/projects/${id}`, { method: 'DELETE' }); toast('Projek dipadam'); location.hash = '#projek'; } catch (e) { toast(e.message, true); }
  };
  $('#main').addEventListener('click', async (e) => {
    const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]'), z = e.target.closest('[data-zoom]');
    if (ed) measurementForm(p.id, ms.find((m) => m.id === Number(ed.dataset.edit)));
    if (z) openModal(`<div class="modal-head"><h2>Gambar tapak</h2><button class="btn icon ghost" data-close aria-label="Tutup">${ICON.x}</button></div><img class="zoom" src="${z.src}" alt="">`);
    if (del) {
      const m = ms.find((x) => x.id === Number(del.dataset.del));
      if (!(await confirmBox('Padam ukuran?', `${m.location} — ${m.width_mm} × ${m.height_mm} mm`))) return;
      try { await api(`/api/measurements/${m.id}`, { method: 'DELETE' }); toast('Ukuran dipadam'); renderProject(id); } catch (err) { toast(err.message, true); }
    }
  });
}

/* ================= Borang ukuran ================= */
function measurementForm(projectId, m = null) {
  let photo; // undefined = tiada perubahan, null = buang, string = baru
  let type = m?.item_type || store.get('ajc_last_type') || ITEM_TYPES[0];
  if (!ITEM_TYPES.includes(type)) type = ITEM_TYPES[0];
  let qty = m?.qty ?? 1;
  let panels = m?.panels ?? null;
  const tile = (t) => `<button type="button" role="radio" aria-checked="${t === type}" class="type ${t === type ? 'on' : ''}" data-type="${esc(t)}">
    ${drawing({ width_mm: 1000, height_mm: /Pintu|Shower|Partition/.test(t) ? 1900 : /Top Hung|Louvre/.test(t) ? 800 : 1200, item_type: t }, { dims: false })}<span>${esc(t)}</span></button>`;
  const qchips = (list, target, current) => `<div class="qchips" data-target="${target}">${list.map((x) => `<button type="button" class="qchip ${x === current ? 'on' : ''}" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>`;
  openModal(`
    <div class="modal-head"><div><div class="eyebrow">${m ? 'Edit ukuran' : 'Ukuran baru'}</div><h2>${m ? esc(m.location) : 'Tambah ukuran'}</h2></div><button class="btn icon ghost" data-close aria-label="Tutup">${ICON.x}</button></div>
    <form id="mf" class="form" novalidate>
      <div class="fsec"><div class="fsec-h"><span class="n">1</span>Lokasi bukaan</div>
        <input id="mf-loc" value="${esc(m?.location)}" placeholder="cth: Ruang tamu – pintu ke laman" aria-label="Lokasi bukaan">
        ${qchips(LOCS, 'mf-loc', m?.location)}
      </div>
      <div class="fsec"><div class="fsec-h"><span class="n">2</span>Jenis item</div>
        <div class="types" role="radiogroup" aria-label="Jenis item" id="mf-types">${ITEM_TYPES.map(tile).join('')}</div>
      </div>
      <div class="fsec"><div class="fsec-h"><span class="n">3</span>Saiz bukaan</div>
        <div class="dims">
          <label class="dim"><span>Lebar</span><div class="unit-in"><input id="mf-w" class="dim-input" type="number" inputmode="numeric" min="1" max="20000" value="${m?.width_mm ?? ''}" placeholder="0"><em>mm</em></div><small id="mf-wi">&nbsp;</small></label>
          <span class="times">×</span>
          <label class="dim"><span>Tinggi</span><div class="unit-in"><input id="mf-h" class="dim-input" type="number" inputmode="numeric" min="1" max="20000" value="${m?.height_mm ?? ''}" placeholder="0"><em>mm</em></div><small id="mf-hi">&nbsp;</small></label>
        </div>
        <div class="warn-line" id="mf-warn" hidden></div>
        <div class="preview"><div class="dwg" id="mf-dwg"></div>
          <div class="pv-side">
            <div class="stp"><span>Kuantiti</span><div class="stepper"><button type="button" data-s="qty" data-d="-1" aria-label="Kurang kuantiti">${ICON.minus}</button><output id="mf-qty">${qty}</output><button type="button" data-s="qty" data-d="1" aria-label="Tambah kuantiti">${ICON.plus}</button></div></div>
            <div class="stp"><span>Panel</span><div class="stepper"><button type="button" data-s="pan" data-d="-1" aria-label="Kurang panel">${ICON.minus}</button><output id="mf-pan">${panels ?? 'Auto'}</output><button type="button" data-s="pan" data-d="1" aria-label="Tambah panel">${ICON.plus}</button></div></div>
            <div class="area-live" id="mf-area"></div>
          </div>
        </div>
      </div>
      <div class="fsec"><div class="fsec-h"><span class="n">4</span>Spesifikasi</div>
        <label class="f">Jenis kaca<input id="mf-glass" value="${esc(m?.glass)}" placeholder="Pilih di bawah atau taip"></label>
        ${qchips(GLASS, 'mf-glass', m?.glass)}
        <label class="f">Warna frame<input id="mf-frame" value="${esc(m?.frame_color)}" placeholder="Pilih di bawah atau taip"></label>
        ${qchips(FRAME, 'mf-frame', m?.frame_color)}
        <label class="f">Nota<textarea id="mf-notes" rows="2" placeholder="cth: lantai tak rata 5mm, buang grill lama, bukaan ke kiri">${esc(m?.notes)}</textarea></label>
      </div>
      <div class="fsec"><div class="fsec-h"><span class="n">5</span>Gambar tapak</div>
        <div class="photo-row">
          <label class="photo-drop" for="mf-photo">${ICON.camera}<span>Ambil / pilih gambar</span></label>
          <input id="mf-photo" type="file" accept="image/*" capture="environment" class="sr-only">
          <div class="photo-prev" id="mf-pw" ${m?.photo ? '' : 'hidden'}><img id="mf-prev" alt="Pratonton gambar" ${m?.photo ? `data-photo="${esc(m.photo)}"` : ''}><button type="button" class="btn icon" id="mf-rmphoto" aria-label="Buang gambar">${ICON.x}</button></div>
        </div>
      </div>
      <div class="err" id="mf-err" hidden></div>
      <div class="modal-foot">
        ${m ? '<button type="button" class="btn" data-close>Batal</button>' : '<button type="button" class="btn" id="mf-more">Simpan & tambah lagi</button>'}
        <button class="btn primary" id="mf-save">${ICON.check}<span>Simpan</span></button>
      </div>
    </form>`, (dlg) => {
    hydratePhotos(dlg);
    const upd = () => {
      const w = Number($('#mf-w').value), h = Number($('#mf-h').value);
      $('#mf-wi').textContent = w > 0 ? `≈ ${ftIn(w)}` : ' ';
      $('#mf-hi').textContent = h > 0 ? `≈ ${ftIn(h)}` : ' ';
      $('#mf-qty').textContent = qty; $('#mf-pan').textContent = panels ?? 'Auto';
      if (w > 0 && h > 0) {
        $('#mf-dwg').innerHTML = drawing({ width_mm: w, height_mm: h, item_type: type, panels });
        $('#mf-area').innerHTML = `<span>${fmtNum((w * h) / 1e6, 3)} m² / unit</span><b>${fmtNum((w * h * qty) / 1e6, 2)} m²</b>`;
      } else {
        $('#mf-dwg').innerHTML = `<div class="dwg-empty">${ICON.ruler}<span>Lakaran muncul di sini</span></div>`;
        $('#mf-area').innerHTML = '<span>Masukkan lebar & tinggi</span>';
      }
      // amaran lembut: nilai yang mungkin salah unit
      let warn = '';
      if ((w && w < 100) || (h && h < 100)) warn = 'Nilai sangat kecil. Pastikan saiz dalam milimeter (mm), bukan cm atau kaki.';
      else if (w > 6000 || h > 4500) warn = 'Saiz sangat besar. Sila semak semula sebelum simpan.';
      $('#mf-warn').innerHTML = warn ? `${ICON.alert}<span>${warn}</span>` : ''; $('#mf-warn').hidden = !warn;
    };
    ['#mf-w', '#mf-h'].forEach((s) => $(s).addEventListener('input', upd)); upd();
    $('#mf-types').onclick = (e) => {
      const b = e.target.closest('.type'); if (!b) return;
      type = b.dataset.type;
      $$('#mf-types .type').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
      upd();
    };
    $('#mf').addEventListener('click', (e) => {
      const st = e.target.closest('[data-s]');
      if (st) {
        const d = Number(st.dataset.d);
        if (st.dataset.s === 'qty') qty = Math.max(1, Math.min(999, qty + d));
        else panels = panels == null ? (d > 0 ? 1 : null) : panels + d < 1 ? null : Math.min(8, panels + d);
        upd(); return;
      }
      const qc = e.target.closest('.qchip');
      if (qc) {
        const wrap = qc.parentElement; const input = $(`#${wrap.dataset.target}`);
        input.value = qc.dataset.v; $$('.qchip', wrap).forEach((x) => x.classList.toggle('on', x === qc));
      }
    });
    $('#mf-photo').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try { photo = await resizeImage(f, IS_DEMO() ? 1000 : 1600); $('#mf-prev').src = photo; $('#mf-pw').hidden = false; } catch (err) { toast(err.message, true); }
    };
    $('#mf-rmphoto').onclick = () => { photo = null; $('#mf-pw').hidden = true; $('#mf-photo').value = ''; };
    const save = async (again) => {
      const fail = (msg, el) => { $('#mf-err').textContent = msg; $('#mf-err').hidden = false; el && el.focus(); throw new Error(msg); };
      $('#mf-err').hidden = true;
      if (!$('#mf-loc').value.trim()) fail('Sila isi lokasi bukaan.', $('#mf-loc'));
      if (!(Number($('#mf-w').value) > 0)) fail('Sila isi lebar dalam mm.', $('#mf-w'));
      if (!(Number($('#mf-h').value) > 0)) fail('Sila isi tinggi dalam mm.', $('#mf-h'));
      const body = { location: $('#mf-loc').value, item_type: type, width_mm: $('#mf-w').value, height_mm: $('#mf-h').value,
        qty, panels, glass: $('#mf-glass').value, frame_color: $('#mf-frame').value, notes: $('#mf-notes').value };
      if (photo !== undefined) body.photo = photo;
      if (m) await api(`/api/measurements/${m.id}`, { method: 'PATCH', body });
      else await api(`/api/projects/${projectId}/measurements`, { body });
      store.set('ajc_last_type', type);
      state.projTab = 'ukuran';
      if (again) {
        toast(`Disimpan: ${body.location}`);
        // kekalkan jenis, kaca & frame untuk bukaan seterusnya
        ['#mf-loc', '#mf-w', '#mf-h', '#mf-notes', '#mf-photo'].forEach((s) => ($(s).value = ''));
        qty = 1; panels = null; photo = undefined; $('#mf-pw').hidden = true;
        $$('.qchips[data-target="mf-loc"] .qchip').forEach((x) => x.classList.remove('on'));
        upd(); dlg.scrollTop = 0; $('#mf-loc').focus();
        renderProject(projectId);
      } else { closeModal(); toast('Ukuran disimpan'); renderProject(projectId); }
    };
    $('#mf').onsubmit = (e) => { e.preventDefault(); busy($('#mf-save'), () => save(false)); };
    if ($('#mf-more')) $('#mf-more').onclick = (e) => busy(e.currentTarget, () => save(true));
  });
}

/* ================= Rekod kehadiran ================= */
async function renderRecords() {
  const isAdmin = state.me.role === 'admin';
  const today = ymd(Date.now());
  const from = store.get('ajc_rf') || ymd(Date.now() - 6 * 864e5), to = store.get('ajc_rt') || today, uid = store.get('ajc_ru') || '';
  const users = isAdmin ? await api('/api/users') : [];
  shell(`
    ${pageHead('Rekod kehadiran', isAdmin ? 'Punch in / out semua staff dengan semakan GPS' : 'Rekod punch anda', `<button type="button" class="btn" id="rcsv">${ICON.dl}<span>Excel (CSV)</span></button>`)}
    <section class="card filters">
      <div class="seg" id="rquick"><button data-r="0">Hari ini</button><button data-r="6">7 hari</button><button data-r="29">30 hari</button></div>
      <div class="filter-fields">
        <label class="f">Dari<input id="rf" type="date" value="${from}"></label>
        <label class="f">Hingga<input id="rt" type="date" value="${to}"></label>
        ${isAdmin ? `<label class="f wide">Staff<select id="ru"><option value="">Semua staff</option>${users.map((u) => `<option value="${u.id}" ${String(u.id) === uid ? 'selected' : ''}>${esc(u.name)}${u.active ? '' : ' (tidak aktif)'}</option>`).join('')}</select></label>` : ''}
      </div>
    </section>
    <div id="rsum"></div>
    <div id="rtbl"></div>`);
  const load = async () => {
    const f = $('#rf').value, t = $('#rt').value, u = isAdmin ? $('#ru').value : '';
    store.set('ajc_rf', f); store.set('ajc_rt', t); if (isAdmin) store.set('ajc_ru', u);
    $$('#rquick button').forEach((b) => b.classList.toggle('on', t === today && f === ymd(Date.now() - Number(b.dataset.r) * 864e5)));
    const qs = new URLSearchParams();
    if (f) qs.set('from', new Date(`${f}T00:00:00+08:00`).toISOString());
    if (t) qs.set('to', new Date(new Date(`${t}T00:00:00+08:00`).getTime() + 864e5).toISOString());
    if (u) qs.set('user_id', u);
    const rows = await api(`/api/attendance?${qs}`);
    $('#rcsv').onclick = () => {
      const c = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const dt = (iso) => (iso ? new Date(iso).toLocaleString('en-GB', { timeZone: TZ, hour12: false }) : '');
      const yn = (v) => (v == null ? '' : v ? 'Ya' : 'Tidak');
      const head = ['Staff', 'Projek', 'Masuk', 'Keluar', 'Jam', 'Lokasi masuk', 'Jarak masuk (m)', 'Dalam kawasan (masuk)', 'Lokasi keluar', 'Jarak keluar (m)', 'Dalam kawasan (keluar)', 'Nota'];
      const lines = [head.map(c).join(',')].concat(rows.map((r) => [r.user_name, r.project_name || 'Bengkel / Pejabat', dt(r.in_at), dt(r.out_at), r.hours != null ? r.hours.toFixed(2) : '',
        r.in_lat != null ? `${r.in_lat},${r.in_lng}` : '', r.in_dist_m, yn(r.in_ok), r.out_lat != null ? `${r.out_lat},${r.out_lng}` : '', r.out_dist_m, yn(r.out_ok), r.note].map(c).join(',')));
      downloadText(`kehadiran-ajc-${f}-hingga-${t}.csv`, '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
      toast('Fail CSV dimuat turun');
    };
    const total = rows.reduce((a, r) => a + (r.hours || 0), 0);
    const outside = rows.filter((r) => r.in_ok === false || r.out_ok === false).length;
    const per = {};
    rows.forEach((r) => { const x = (per[r.user_name] = per[r.user_name] || { h: 0, d: new Set(), n: 0, bad: 0 }); x.h += r.hours || 0; x.d.add(ymd(r.in_at)); x.n += 1; if (r.in_ok === false || r.out_ok === false) x.bad += 1; });
    $('#rsum').innerHTML = `<div class="stats"><div><div class="eyebrow">Rekod</div><div class="v">${rows.length}</div></div>
      <div><div class="eyebrow">Jumlah jam</div><div class="v">${fmtNum(total, 1)}<small> j</small></div></div>
      <div class="${outside ? 'bad' : ''}"><div class="eyebrow">Luar kawasan</div><div class="v">${outside}</div></div></div>
      ${isAdmin && Object.keys(per).length > 1 ? `<div class="people">${Object.entries(per).sort((a, b) => b[1].h - a[1].h).map(([n, v]) => `<div class="person-card">${avatar(n)}<div><b>${esc(n)}</b><small>${v.d.size} hari · ${v.n} punch${v.bad ? ` · <span class="txt-bad">${v.bad} amaran</span>` : ''}</small></div><span class="mono">${fmtHours(v.h)}</span></div>`).join('')}</div>` : ''}`;
    $('#rtbl').innerHTML = rows.length ? `<div class="rec-list">${rows.map((r) => recItem(r, isAdmin)).join('')}</div>` : emptyBox(ICON.rec, 'Tiada rekod', 'Tiada punch in dalam tempoh ini.');
  };
  ['#rf', '#rt', '#ru'].forEach((s) => $(s) && ($(s).onchange = () => load().catch((e) => toast(e.message, true))));
  $('#rquick').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; $('#rf').value = ymd(Date.now() - Number(b.dataset.r) * 864e5); $('#rt').value = today; load(); };
  await load();
}

/* ================= Staff (admin) ================= */
async function renderStaff() {
  const users = await api('/api/users');
  shell(`
    ${pageHead('Staff', `${users.filter((u) => u.active).length} akaun aktif`, `<button class="btn primary" id="news">${ICON.plus}<span>Tambah staff</span></button>`)}
    <div class="staff-grid">
      ${users.map((u) => `<div class="card staff-card ${u.active ? '' : 'inactive'}">
        ${avatar(u.name, 'lg')}
        <div class="sc-b"><b>${esc(u.name)}</b><small class="mono">@${esc(u.username)}${u.phone ? ` · ${esc(u.phone)}` : ''}</small>
          <div class="sc-tags"><span class="pill ${u.role === 'admin' ? 'st-ukur' : 'p-na'}">${u.role === 'admin' ? 'Admin' : 'Staff tapak'}</span>${u.active ? '' : '<span class="pill p-bad">Tidak aktif</span>'}</div></div>
        <div class="sc-a">${u.phone ? `<a class="btn icon" href="tel:${esc(u.phone.replace(/\s/g, ''))}" aria-label="Telefon ${esc(u.name)}">${ICON.phone}</a>` : ''}<button class="btn" data-u="${u.id}">Urus</button></div>
      </div>`).join('')}
    </div>
    <p class="muted small" style="margin:0">Staff log masuk dengan username & kata laluan yang anda tetapkan. Hanya admin boleh urus staff dan padam projek.</p>`);
  $('#news').onclick = () => staffForm();
  $$('[data-u]').forEach((b) => (b.onclick = () => staffForm(users.find((u) => u.id === Number(b.dataset.u)))));
}
function staffForm(u = null) {
  openModal(`
    <div class="modal-head"><div><div class="eyebrow">${u ? 'Urus akaun' : 'Akaun baru'}</div><h2>${u ? esc(u.name) : 'Tambah staff'}</h2></div><button class="btn icon ghost" data-close aria-label="Tutup">${ICON.x}</button></div>
    <form id="sf" class="form">
      <div class="fsec">
        <label class="f">Nama penuh *<input id="sf-name" required value="${esc(u?.name)}" placeholder="cth: Ali bin Ahmad"></label>
        <div class="grid2">
          <label class="f">Username *<input id="sf-user" required ${u ? 'disabled' : ''} autocapitalize="none" spellcheck="false" value="${esc(u?.username)}" placeholder="cth: ali"></label>
          <label class="f">Telefon<input id="sf-phone" type="tel" value="${esc(u?.phone)}" placeholder="01x-xxx xxxx"></label>
        </div>
        <label class="f">${u ? 'Kata laluan baru' : 'Kata laluan *'}<span class="hint">${u ? 'Kosongkan jika tiada perubahan' : 'Sekurang-kurangnya 6 aksara'}</span><input id="sf-pass" type="text" autocomplete="new-password" ${u ? '' : 'required minlength="6"'}></label>
      </div>
      <div class="fsec"><div class="fsec-h">Peranan</div>
        <div class="seg seg-fill" id="sf-role"><button type="button" data-v="staff" class="${u?.role !== 'admin' ? 'on' : ''}">Staff tapak</button><button type="button" data-v="admin" class="${u?.role === 'admin' ? 'on' : ''}">Admin</button></div>
        <p class="muted small" style="margin:0">Admin boleh lihat dashboard, kehadiran semua staff, urus staff dan padam projek.</p>
      </div>
      ${u ? `<label class="switch"><input id="sf-active" type="checkbox" ${u.active ? 'checked' : ''}><span class="sw" aria-hidden="true"></span><span><b>Akaun aktif</b><small>Matikan untuk halang staff log masuk</small></span></label>` : ''}
      <div class="modal-foot"><button type="button" class="btn" data-close>Batal</button><button class="btn primary" id="sf-save">${ICON.check}<span>Simpan</span></button></div>
    </form>`, () => {
    let role = u?.role || 'staff';
    $('#sf-role').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; role = b.dataset.v; $$('#sf-role button').forEach((x) => x.classList.toggle('on', x === b)); };
    $('#sf').onsubmit = (e) => { e.preventDefault(); busy($('#sf-save'), async () => {
      const body = { name: $('#sf-name').value, phone: $('#sf-phone').value, role };
      if ($('#sf-pass').value) body.password = $('#sf-pass').value;
      if (u) { body.active = $('#sf-active').checked; await api(`/api/users/${u.id}`, { method: 'PATCH', body }); }
      else { body.username = $('#sf-user').value; await api('/api/users', { body }); }
      closeModal(); toast('Staff disimpan');
      if (currentRoute() === 'staff') renderStaff(); else router();
    }); };
  });
}

/* ================= Akaun ================= */
function renderAccount() {
  shell(`
    <section class="card acct-hero">
      ${avatar(state.me.name, 'xl')}
      <div><h2>${esc(state.me.name)}</h2><div class="muted small"><span class="mono">@${esc(state.me.username)}</span> · ${state.me.role === 'admin' ? 'Pentadbir' : 'Staff tapak'}</div></div>
    </section>
    <div class="acct-grid">
      <form class="card form" id="cp">
        <h3>Tukar kata laluan</h3>
        <label class="f">Kata laluan semasa<input id="cp-cur" type="password" autocomplete="current-password" required></label>
        <label class="f">Kata laluan baru<input id="cp-new" type="password" autocomplete="new-password" minlength="6" required></label>
        <div><button class="btn primary">Tukar kata laluan</button></div>
      </form>
      <div class="stack">
        <section class="card form">
          <h3>Pasang di telefon</h3>
          <p class="muted small" style="margin:0">Buka sistem terus dari skrin utama telefon seperti app biasa. Boleh dibuka walaupun tiada internet.</p>
          <div><button class="btn" id="install">${ICON.install}<span>Pasang app</span></button></div>
          <p class="muted small" id="install-help" hidden style="margin:0">iPhone: tekan butang <b>Share</b> di Safari, kemudian <b>Add to Home Screen</b>. Android: menu ⋮ di Chrome, kemudian <b>Install app</b>.</p>
        </section>
        ${IS_DEMO() ? '<section class="card form"><h3>Data demo</h3><p class="muted small" style="margin:0">Data demo hanya disimpan dalam browser peranti ini. Reset akan memulihkan data contoh.</p><div><button class="btn" id="demo-reset">Reset data demo</button></div></section>' : ''}
        <button class="btn danger" id="logout">${ICON.out}<span>Log keluar</span></button>
      </div>
    </div>`);
  $('#cp').onsubmit = (e) => { e.preventDefault(); busy($('#cp button'), async () => {
    await api('/api/me/password', { body: { current: $('#cp-cur').value, next: $('#cp-new').value } });
    $('#cp').reset(); toast('Kata laluan ditukar');
  }); };
  $('#install').onclick = async () => {
    if (state.installPrompt) { state.installPrompt.prompt(); state.installPrompt = null; } else $('#install-help').hidden = false;
  };
  if ($('#demo-reset')) $('#demo-reset').onclick = async () => {
    if (!(await confirmBox('Reset data demo?', 'Semua projek, ukuran dan rekod kehadiran dalam peranti ini akan kembali kepada data contoh.', 'Reset data', false))) return;
    window.AJCBackend.reset(); state.me = null; history.replaceState(null, '', location.pathname); renderLogin(); toast('Data demo direset');
  };
  $('#logout').onclick = async () => { await api('/api/logout', { body: {} }).catch(() => {}); state.me = null; history.replaceState(null, '', location.pathname); renderLogin(); };
}

/* ================= Mula ================= */
(async () => {
  try { state.me = await api('/api/me'); router(); } catch { renderLogin(); }
})();
// Service worker: app boleh dibuka tanpa internet (HTTPS sahaja, cth. GitHub Pages)
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
