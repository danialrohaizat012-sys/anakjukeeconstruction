/* AJC Construction — Sistem Tapak (frontend) */
'use strict';

const TZ = 'Asia/Kuala_Lumpur';
const ITEM_TYPES = ['Pintu Sliding', 'Pintu Swing', 'Pintu Folding', 'Tingkap Sliding', 'Tingkap Casement', 'Tingkap Top Hung',
  'Panel Tetap (Fixed)', 'Shower Screen', 'Partition Kaca', 'Cermin', 'Louvre', 'Lain-lain'];
const GLASS = ['Clear 5mm', 'Clear 6mm', 'Tinted 6mm', 'Frosted 6mm', 'Tempered 8mm', 'Tempered 10mm', 'Tempered 12mm',
  'Laminated 6.38mm', 'Laminated 8.38mm', 'Reflective 6mm', 'Cermin 5mm'];
const FRAME = ['Silver / Natural', 'Hitam', 'Putih', 'Champagne', 'Bronze', 'Wood grain'];
const STATUS = { ukur: 'Ukur', fabrikasi: 'Fabrikasi', pasang: 'Pasang', siap: 'Siap' };

const state = { me: null, clockTimer: null };
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtNum = (n, d = 0) => Number(n || 0).toLocaleString('en-MY', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }) : '—');
const fmtDate = (iso) => new Date(iso).toLocaleDateString('ms-MY', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const fmtDateTime = (iso) => `${fmtDate(iso)}, ${fmtTime(iso)}`;
const fmtHours = (h) => { if (h == null) return '—'; const m = Math.round(h * 60); return `${Math.floor(m / 60)}j ${String(m % 60).padStart(2, '0')}m`; };
const ymd = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ });
const mapLink = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };

const ICON = {
  punch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>',
  proj: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V10l9-6 9 6v11"/><path d="M8 21v-7h8v7M3 21h18"/></svg>',
  rec: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M7 13h4M7 17h7"/></svg>',
  staff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.3-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.5c2.3.2 3.8 1.8 4.5 4.5"/></svg>',
  acct: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3"/><path d="M6.5 18.5c1.3-2 3.2-3 5.5-3s4.2 1 5.5 3"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2"/><rect x="6" y="14" width="12" height="7"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
};

Object.assign(ICON, {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  gps: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3"/></svg>',
  power: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 3v8"/><path d="M6.3 7.3a8 8 0 1 0 11.4 0"/></svg>',
  ruler: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg>',
  out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2"/></svg>',
});
const initials = (n) => String(n || '?').split(/\s+/).filter((w) => !/^(bin|binti|bt|b\.)$/i.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const greeting = () => { const h = Number(new Date().toLocaleString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false })); return h < 12 ? 'Selamat pagi' : h < 15 ? 'Selamat tengah hari' : h < 19 ? 'Selamat petang' : 'Selamat malam'; };
const firstName = (n) => String(n || '').split(/\s+/)[0];
const STEP = { ukur: 1, fabrikasi: 2, pasang: 3, siap: 4 };
const emptyBox = (icon, title, text) => `<div class="empty"><div class="ill">${icon}</div><h3>${title}</h3>${text}</div>`;

/* ---------- API ---------- */
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
// Gambar dimuat selepas render (backend demo simpan gambar dalam storan peranti)
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
function toast(msg, bad = false) {
  const t = $('#toast'); t.textContent = msg; t.className = bad ? 'bad' : ''; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 3200);
}
async function busy(btn, fn) {
  btn.disabled = true;
  try { return await fn(); } catch (e) { toast(e.message, true); } finally { btn.disabled = false; }
}

/* ---------- GPS ---------- */
function getPosition() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Telefon ini tidak menyokong GPS'));
    if (!window.isSecureContext) return reject(new Error('GPS hanya berfungsi melalui HTTPS. Sila buka sistem melalui alamat https://'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy) }),
      (e) => reject(new Error(e.code === 1 ? 'Akses lokasi ditolak. Benarkan "Location" untuk laman ini dalam tetapan pelayar.' :
        e.code === 3 ? 'GPS mengambil masa terlalu lama. Cuba di kawasan terbuka.' : 'Lokasi tidak dapat dikesan.')),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  });
}

/* ---------- Modal ---------- */
function openModal(html, onMount) {
  const dlg = $('#modal'); $('#modal-body').innerHTML = html;
  dlg.showModal();
  $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', () => dlg.close()));
  onMount && onMount(dlg);
}
const closeModal = () => $('#modal').open && $('#modal').close();
function confirmBox(title, text, okLabel = 'Padam') {
  return new Promise((resolve) => {
    openModal(`<div class="modal-head"><h2>${esc(title)}</h2></div><p>${esc(text)}</p>
      <div class="modal-foot"><button class="btn" data-close>Batal</button><button class="btn primary" id="cf-ok">${esc(okLabel)}</button></div>`, (dlg) => {
      let ok = false;
      $('#cf-ok').onclick = () => { ok = true; dlg.close(); };
      dlg.addEventListener('close', () => resolve(ok), { once: true });
    });
  });
}

/* ---------- Image resize ---------- */
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

/* ---------- Opening drawing (elevation sketch with dimension lines) ---------- */
function defaultPanels(type) {
  if (/Folding/.test(type)) return 4;
  if (/Sliding|Shower/.test(type)) return 2;
  return 1;
}
function drawing(m, size = 120) {
  const W = m.width_mm, H = m.height_mm;
  const areaW = 92, areaH = 96, ox = 22, oy = 4;
  const s = Math.min(areaW / W, areaH / H);
  const w = W * s, h = H * s, x = ox + (areaW - w) / 2, y = oy + (areaH - h) / 2;
  const n = Math.max(1, Math.min(8, m.panels || defaultPanels(m.item_type)));
  const t = m.item_type;
  let g = '';
  const pw = w / n;
  for (let i = 1; i < n; i++) g += `<line x1="${x + pw * i}" y1="${y}" x2="${x + pw * i}" y2="${y + h}" stroke="#1b6db4" stroke-width="1.2"/>`;
  for (let i = 0; i < n; i++) {
    const px = x + pw * i, cx = px + pw / 2, cy = y + h / 2, a = Math.min(pw * 0.28, 9);
    if (/Sliding|Shower/.test(t)) {
      const d = i % 2 ? -1 : 1;
      g += `<path d="M${cx - a * d} ${cy}H${cx + a * d}M${cx + a * d - 3 * d} ${cy - 3}L${cx + a * d} ${cy}L${cx + a * d - 3 * d} ${cy + 3}" stroke="#16508f" stroke-width="1.2" fill="none"/>`;
    } else if (/Swing|Casement/.test(t)) {
      const hinge = i % 2 ? px + pw : px, far = i % 2 ? px : px + pw;
      g += `<path d="M${far} ${y}L${hinge} ${cy}L${far} ${y + h}" stroke="#a7a9ad" stroke-width="1" stroke-dasharray="3 2" fill="none"/>`;
    } else if (/Top Hung/.test(t)) {
      g += `<path d="M${px} ${y + h}L${cx} ${y}L${px + pw} ${y + h}" stroke="#a7a9ad" stroke-width="1" stroke-dasharray="3 2" fill="none"/>`;
    } else if (/Folding/.test(t)) {
      g += `<path d="M${px} ${y + h}L${cx} ${y + h - Math.min(8, pw / 2)}L${px + pw} ${y + h}" stroke="#16508f" stroke-width="1" fill="none"/>`;
    } else if (/Louvre/.test(t)) {
      for (let k = 1; k < 6; k++) g += `<line x1="${px + 2}" y1="${y + (h * k) / 6}" x2="${px + pw - 2}" y2="${y + (h * k) / 6}" stroke="#a7a9ad" stroke-width="1"/>`;
    }
  }
  return `<svg viewBox="0 0 120 124" width="${size}" role="img" aria-label="${esc(t)} ${W} x ${H} mm">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#e9f2fb" stroke="#0e2f55" stroke-width="2"/>${g}
    <g stroke="#5d6877" stroke-width=".8"><line x1="${x}" y1="${y + h + 6}" x2="${x + w}" y2="${y + h + 6}"/><line x1="${x}" y1="${y + h + 3}" x2="${x}" y2="${y + h + 9}"/><line x1="${x + w}" y1="${y + h + 3}" x2="${x + w}" y2="${y + h + 9}"/>
    <line x1="${x - 6}" y1="${y}" x2="${x - 6}" y2="${y + h}"/><line x1="${x - 9}" y1="${y}" x2="${x - 3}" y2="${y}"/><line x1="${x - 9}" y1="${y + h}" x2="${x - 3}" y2="${y + h}"/></g>
    <text x="${x + w / 2}" y="${y + h + 17}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" fill="#18212c">${W}</text>
    <text transform="translate(${x - 10} ${y + h / 2}) rotate(-90)" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" fill="#18212c">${H}</text>
  </svg>`;
}

/* ---------- Shell & routing ---------- */
function tabsHtml() {
  const r = location.hash.replace('#', '').split('/')[0] || 'punch';
  const t = [['punch', 'Punch', ICON.punch], ['projek', 'Projek', ICON.proj], ['rekod', 'Rekod', ICON.rec]];
  if (state.me.role === 'admin') t.push(['staff', 'Staff', ICON.staff]);
  t.push(['akaun', 'Akaun', ICON.acct]);
  return `<nav class="tabs">${t.map(([k, l, i]) => `<a href="#${k}" class="${r === k ? 'on' : ''}">${i}<span>${l}</span></a>`).join('')}</nav>`;
}
function shell(content) {
  $('#app').innerHTML = `
    <header class="topbar"><div class="topbar-in">
      <a class="logo" href="#punch" aria-label="Laman utama"><img src="logo.png" alt="AJC Construction"></a>
      ${tabsHtml()}
      <div class="right">
        ${IS_DEMO() ? '<span class="demo-badge" title="Data disimpan dalam peranti ini sahaja">Demo</span>' : ''}
        <a href="#akaun" class="avatar" title="${esc(state.me.name)}" aria-label="Akaun saya">${esc(initials(state.me.name))}</a>
      </div>
    </div></header>
    <main id="main">${content}</main>
    <div class="tabbar">${tabsHtml()}</div>`;
}
async function router() {
  clearInterval(state.clockTimer);
  closeModal();
  if (!state.me) return renderLogin();
  const [r, id] = location.hash.replace('#', '').split('/');
  try {
    if (r === 'projek' && id) return await renderProject(Number(id));
    if (r === 'projek') return await renderProjects();
    if (r === 'rekod') return await renderRecords();
    if (r === 'staff' && state.me.role === 'admin') return await renderStaff();
    if (r === 'akaun') return renderAccount();
    return await renderPunch();
  } catch (e) { if (state.me) { shell(`<div class="empty"><h3>Tidak dapat dimuatkan</h3><p>${esc(e.message)}</p></div>`); } }
}
window.addEventListener('hashchange', router);

/* ---------- Login ---------- */
function renderLogin() {
  $('#app').innerHTML = `<div class="login"><div>
    <form id="lf" autocomplete="on">
      <div class="brand"><img src="logo.png" alt="AJC Construction"><p>Ukuran tapak & kehadiran staff</p></div>
      <label class="f">Username<input id="lu" name="username" autocomplete="username" autocapitalize="none" placeholder="cth: ali" required></label>
      <label class="f">Kata laluan<input id="lp" name="password" type="password" autocomplete="current-password" placeholder="••••••" required></label>
      <div class="err" id="le" hidden></div>
      ${IS_DEMO() ? `<div class="demo-hint"><b>Mod demo</b> · tekan untuk isi:<br><button type="button" class="linkbtn" data-demo="admin|ajc12345">admin</button> pentadbir &nbsp; <button type="button" class="linkbtn" data-demo="ali|ali123">ali</button> staff</div>` : ''}
      <button class="btn primary" style="min-height:50px">Log masuk</button>
    </form>
    <div class="foot">AJC Construction · Aluminium & Glass</div>
  </div></div>`;
  $$('[data-demo]').forEach((b) => (b.onclick = () => { const [u, pw] = b.dataset.demo.split('|'); $('#lu').value = u; $('#lp').value = pw; }));
  $('#lf').onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('#lf button.primary');
    btn.disabled = true;
    try {
      state.me = await api('/api/login', { body: { username: $('#lu').value, password: $('#lp').value } });
      if (!location.hash) location.hash = '#punch'; router();
    } catch (err) { $('#le').textContent = err.message; $('#le').hidden = false; } finally { btn.disabled = false; }
  };
}

/* ---------- Punch in / out ---------- */
async function renderPunch() {
  const [{ open }, projects, mine] = await Promise.all([
    api('/api/attendance/status'),
    api('/api/projects'),
    api(`/api/attendance?from=${encodeURIComponent(new Date(Date.now() - 6 * 864e5).toISOString())}`),
  ]);
  const active = projects.filter((p) => p.status !== 'siap');
  const last = store.get('ajc_last_project') || '';
  const myRows = mine.filter((r) => r.user_id === state.me.id).slice(0, 6);
  const recItem = (r) => {
    const d = new Date(r.in_at);
    return `<div class="rec">
      <div class="day"><b>${d.toLocaleDateString('en-GB', { timeZone: TZ, day: 'numeric' })}</b><span>${d.toLocaleDateString('ms-MY', { timeZone: TZ, weekday: 'short' })}</span></div>
      <div class="what"><div class="t">${esc(r.project_name || 'Bengkel / Pejabat')}</div>
        <div class="s"><span class="mono">${fmtTime(r.in_at)} – ${r.out_at ? fmtTime(r.out_at) : '…'}</span>${geoPill(r.in_ok, r.in_dist_m)}</div></div>
      <div class="hrs">${r.out_at ? fmtHours(r.hours) : '<span class="pill p-ok">Aktif</span>'}<small>${r.out_at ? 'jam' : ''}</small></div>
    </div>`;
  };
  shell(`
    <section class="hero ${open ? 'on-duty' : ''}">
      <div class="hero-top">
        <div class="greet"><span id="greet">${greeting()}</span>,<b>${esc(firstName(state.me.name))}</b></div>
        <span class="glass"><span class="dot ${open ? '' : 'idle'}"></span>${open ? 'Sedang bertugas' : 'Belum punch in'}</span>
      </div>
      <div class="clock" id="clock">--:--</div>
      <div class="date" id="cdate"></div>
      ${open ? `
        <div class="shift-info">
          <div><div class="k">Masuk</div><div class="v mono">${fmtTime(open.in_at)}</div></div>
          <div><div class="k">Tempoh</div><div class="v mono" id="elapsed">—</div></div>
          <div style="grid-column:1/-1"><div class="k">Lokasi</div><div class="v">${esc(open.project_name || 'Bengkel / Pejabat')}</div></div>
        </div>
        <div class="punch-wrap"><button class="punch-btn out" id="pbtn">${ICON.power}Punch Out<small>Tamat kerja</small></button></div>
      ` : `
        <div class="hero-select"><label for="pproj">Lokasi kerja hari ini</label>
          <select id="pproj"><option value="">Bengkel / Pejabat</option>
          ${active.map((p) => `<option value="${p.id}" ${String(p.id) === last ? 'selected' : ''}>${esc(p.name)}${p.lat == null ? ' (tiada GPS)' : ''}</option>`).join('')}</select></div>
        <div class="punch-wrap"><button class="punch-btn" id="pbtn">${ICON.power}Punch In<small>Mula kerja</small></button></div>
      `}
      <div class="gps-line" id="gps">${ICON.gps}<span>Lokasi GPS direkod bila anda tekan butang</span></div>
    </section>
    <section class="stack">
      <div class="section-head"><h2>Minggu ini</h2><a href="#rekod">Lihat semua</a></div>
      ${myRows.length ? `<div class="rec-list">${myRows.map(recItem).join('')}</div>`
        : emptyBox(ICON.punch, 'Belum ada rekod', 'Tekan <b>Punch In</b> bila mula kerja.')}
    </section>`);
  const tick = () => {
    const now = new Date();
    $('#clock').textContent = now.toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
    $('#cdate').textContent = now.toLocaleDateString('ms-MY', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (open && $('#elapsed')) $('#elapsed').textContent = fmtHours((now - new Date(open.in_at)) / 36e5);
  };
  tick(); state.clockTimer = setInterval(tick, 1000 * 15);

  $('#pbtn').onclick = (e) => busy(e.currentTarget, async () => {
    const gpsTxt = $('#gps span'); gpsTxt.textContent = 'Mengesan lokasi GPS…';
    let pos;
    try { pos = await getPosition(); } catch (err) { gpsTxt.textContent = err.message; throw err; }
    gpsTxt.textContent = `Lokasi dikesan · ketepatan ±${pos.acc} m`;
    if (open) {
      const r = await api('/api/attendance/out', { body: pos });
      toast(r.inside === false ? `Punch out direkod — ${fmtNum(r.dist)} m dari tapak` : 'Punch out berjaya. Terima kasih!');
    } else {
      const pid = $('#pproj').value; store.set('ajc_last_project', pid);
      const r = await api('/api/attendance/in', { body: { ...pos, project_id: pid || null } });
      toast(r.ok === false ? `Punch in direkod — AMARAN: ${fmtNum(r.dist)} m dari tapak` : 'Punch in berjaya. Selamat bekerja!', r.ok === false);
    }
    renderPunch();
  });
}
function geoPill(ok, dist) {
  if (ok == null) return '<span class="pill p-na" title="Tapak tiada koordinat GPS">GPS</span>';
  return ok ? `<span class="pill p-ok" title="${fmtNum(dist)} m dari tapak">Di tapak</span>` : `<span class="pill p-bad" title="Di luar kawasan tapak">${fmtNum(dist)} m</span>`;
}

/* ---------- Projects ---------- */
async function renderProjects() {
  const q = store.get('ajc_pq') || '', st = store.get('ajc_pst') || '';
  shell(`
    <div class="page-head"><div><h1>Projek</h1><p>Ukuran tapak setiap projek</p></div><button class="btn primary" id="newp">${ICON.plus}Projek baru</button></div>
    <div class="stack">
      <div class="search">${ICON.search}<input id="pq" type="search" placeholder="Cari projek, pelanggan atau item (cth: shower)" value="${esc(q)}"></div>
      <div class="chips" id="pst">${[['', 'Semua'], ...Object.entries(STATUS)].map(([k, l]) => `<button class="chip ${st === k ? 'on' : ''}" data-st="${k}">${l}</button>`).join('')}</div>
    </div>
    <div class="list cols" id="plist"></div>`);
  const load = async () => {
    const q = $('#pq').value.trim(), st = $('.chip.on').dataset.st;
    store.set('ajc_pq', q); store.set('ajc_pst', st);
    const rows = await api(`/api/projects?q=${encodeURIComponent(q)}${st ? `&status=${st}` : ''}`);
    $('#plist').innerHTML = rows.length ? rows.map((p) => `
      <a class="card proj" href="#projek/${p.id}">
        <div class="top"><span class="code">${esc(p.code)}</span><span class="pill st-${p.status}">${STATUS[p.status]}</span></div>
        <h3>${esc(p.name)}</h3>
        <div class="addr">${ICON.pin}<span>${esc([p.client, p.address].filter(Boolean).join(' · ') || 'Tiada alamat')}</span></div>
        <div class="steps s${STEP[p.status]}"><i></i><i></i><i></i><i></i></div>
        <div class="meta"><span><b>${p.item_count}</b> ukuran</span><span><b>${p.unit_count}</b> unit</span><span><b>${fmtNum(p.area_m2, 2)}</b> m²</span></div>
      </a>`).join('') : emptyBox(ICON.proj, q || st ? 'Tiada projek sepadan' : 'Belum ada projek', q || st ? 'Cuba carian lain.' : 'Tekan <b>Projek baru</b> untuk mula rekod ukuran tapak.');
  };
  let t; $('#pq').oninput = () => { clearTimeout(t); t = setTimeout(load, 250); };
  $('#pst').onclick = (e) => { const b = e.target.closest('.chip'); if (!b) return; $$('.chip').forEach((c) => c.classList.toggle('on', c === b)); load(); };
  $('#newp').onclick = () => projectForm();
  load();
}

function projectForm(p = null) {
  openModal(`
    <div class="modal-head"><h2>${p ? 'Edit projek' : 'Projek baru'}</h2><button class="btn ghost" data-close aria-label="Tutup">✕</button></div>
    <form id="pf" class="stack">
      <label class="f">Nama projek *<input id="pf-name" required value="${esc(p?.name)}" placeholder="cth: Rumah Teres En. Hafiz, Bangi"></label>
      <div class="grid2">
        <label class="f">Pelanggan<input id="pf-client" value="${esc(p?.client)}"></label>
        <label class="f">No. telefon<input id="pf-phone" type="tel" value="${esc(p?.phone)}"></label>
      </div>
      <label class="f">Alamat tapak<textarea id="pf-address">${esc(p?.address)}</textarea></label>
      <div class="grid2">
        <label class="f">Kod projek<span class="hint">Kosongkan untuk auto</span><input id="pf-code" value="${esc(p?.code)}"></label>
        <label class="f">Status<select id="pf-status">${Object.entries(STATUS).map(([k, l]) => `<option value="${k}" ${p?.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      </div>
      <fieldset class="card stack" style="margin:0">
        <legend class="eyebrow">Lokasi GPS tapak (untuk punch in)</legend>
        <div class="grid3">
          <label class="f">Latitude<input id="pf-lat" inputmode="decimal" value="${p?.lat ?? ''}"></label>
          <label class="f">Longitude<input id="pf-lng" inputmode="decimal" value="${p?.lng ?? ''}"></label>
          <label class="f">Radius (m)<input id="pf-rad" type="number" min="30" max="5000" value="${p?.radius_m ?? 200}"></label>
        </div>
        <button type="button" class="btn" id="pf-here">${ICON.pin}Guna lokasi saya sekarang</button>
        <span class="muted small">Tekan semasa berada di tapak. Staff yang punch in lebih jauh dari radius akan ditanda "luar kawasan".</span>
      </fieldset>
      <label class="f">Nota<textarea id="pf-notes">${esc(p?.notes)}</textarea></label>
      <div class="err" id="pf-err" hidden></div>
      <div class="modal-foot"><button type="button" class="btn" data-close>Batal</button><button class="btn primary">${p ? 'Simpan' : 'Cipta projek'}</button></div>
    </form>`, () => {
    $('#pf-here').onclick = (e) => busy(e.currentTarget, async () => {
      const pos = await getPosition();
      $('#pf-lat').value = pos.lat.toFixed(6); $('#pf-lng').value = pos.lng.toFixed(6);
      toast(`Lokasi tapak ditetapkan (±${pos.acc} m)`);
    });
    $('#pf').onsubmit = (e) => { e.preventDefault(); busy($('#pf button.primary'), async () => {
      const body = { name: $('#pf-name').value, client: $('#pf-client').value, phone: $('#pf-phone').value, address: $('#pf-address').value,
        code: $('#pf-code').value, status: $('#pf-status').value, lat: $('#pf-lat').value, lng: $('#pf-lng').value, radius_m: $('#pf-rad').value, notes: $('#pf-notes').value };
      if (p) { await api(`/api/projects/${p.id}`, { method: 'PATCH', body }); closeModal(); toast('Projek disimpan'); renderProject(p.id); }
      else { const r = await api('/api/projects', { body }); closeModal(); toast('Projek dicipta'); location.hash = `#projek/${r.id}`; }
    }); };
  });
}

async function renderProject(id) {
  const p = await api(`/api/projects/${id}`);
  const ms = p.measurements;
  const units = ms.reduce((a, m) => a + m.qty, 0);
  const area = ms.reduce((a, m) => a + (m.width_mm * m.height_mm * m.qty) / 1e6, 0);
  const isAdmin = state.me.role === 'admin';
  shell(`
    <div class="no-print"><a href="#projek" class="btn ghost" style="padding-left:6px">${ICON.back}Semua projek</a></div>
    <section class="card p-hero">
      <div class="print-only"><img src="logo.png" alt="AJC Construction" style="height:44px"><h2 style="margin-top:8px">Helaian Ukuran Tapak</h2></div>
      <div class="title">
        <div style="min-width:0"><div class="code mono muted small">${esc(p.code)}</div><h1>${esc(p.name)}</h1></div>
        <select id="pstatus" class="no-print" aria-label="Status projek">${Object.entries(STATUS).map(([k, l]) => `<option value="${k}" ${p.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <span class="pill st-${p.status} print-only">${STATUS[p.status]}</span>
      </div>
      <div class="steps s${STEP[p.status]} no-print"><i></i><i></i><i></i><i></i></div>
      <div class="steps-l no-print"><span>Ukur</span><span>Fabrikasi</span><span>Pasang</span><span>Siap</span></div>
      <div class="info">
        <div><div class="eyebrow">Pelanggan</div>${esc(p.client || '—')}${p.phone ? `<div class="mono muted small">${esc(p.phone)}</div>` : ''}</div>
        <div><div class="eyebrow">Alamat tapak</div>${esc(p.address || '—')}</div>
        ${p.notes ? `<div style="grid-column:1/-1"><div class="eyebrow">Nota</div>${esc(p.notes)}</div>` : ''}
      </div>
      <div class="actions no-print">
        <button class="btn" id="pedit">${ICON.edit}Edit</button>
        ${p.lat != null ? `<a class="btn" target="_blank" rel="noopener" href="https://waze.com/ul?ll=${p.lat},${p.lng}&navigate=yes">${ICON.pin}Waze</a>
          <a class="btn" target="_blank" rel="noopener" href="${mapLink(p.lat, p.lng)}">${ICON.map}Maps</a>` : ''}
        <button class="btn" id="pprint">${ICON.print}Cetak</button>
        ${isAdmin ? `<button class="btn danger" id="pdel">${ICON.trash}Padam</button>` : ''}
      </div>
      ${p.lat == null ? '<div class="muted small no-print">Tiada GPS tapak. Tekan <b>Edit</b> untuk tetapkan lokasi supaya punch in boleh disemak.</div>' : ''}
    </section>

    <div class="stats"><div><div class="eyebrow">Ukuran</div><div class="v">${ms.length}</div></div>
      <div><div class="eyebrow">Unit</div><div class="v">${units}</div></div>
      <div><div class="eyebrow">Kaca</div><div class="v">${fmtNum(area, 1)}<small> m²</small></div></div></div>

    <div class="section-head no-print"><h2>Senarai ukuran</h2><button class="btn primary" id="addm">${ICON.plus}Tambah ukuran</button></div>
    <div class="list no-print">
      ${ms.length ? ms.map((m, i) => `
        <article class="card meas">
          <div class="dwg">${drawing(m)}</div>
          <div class="stack" style="gap:6px;min-width:0">
            <div class="row between" style="align-items:flex-start;flex-wrap:nowrap">
              <div style="min-width:0"><div class="eyebrow">${String(i + 1).padStart(2, '0')} · ${esc(m.item_type)}</div><h3>${esc(m.location)}</h3></div>
              <div class="acts"><button class="btn ghost" data-edit="${m.id}" aria-label="Edit">${ICON.edit}</button><button class="btn ghost danger" data-del="${m.id}" aria-label="Padam">${ICON.trash}</button></div>
            </div>
            <div class="size">${fmtNum(m.width_mm)}<span class="x">×</span>${fmtNum(m.height_mm)} <span class="muted small">mm</span>${m.qty > 1 ? ` <span class="small">× ${m.qty} unit</span>` : ''}</div>
            <div class="tags">${m.panels ? `<span class="tag">${m.panels} panel</span>` : ''}${m.glass ? `<span class="tag">${esc(m.glass)}</span>` : ''}${m.frame_color ? `<span class="tag">Frame: ${esc(m.frame_color)}</span>` : ''}
              <span class="tag mono">${fmtNum((m.width_mm * m.height_mm * m.qty) / 1e6, 2)} m²</span></div>
            ${m.notes ? `<div class="small">${esc(m.notes)}</div>` : ''}
            <div class="row" style="gap:10px">${m.photo ? `<img class="thumb" data-photo="${esc(m.photo)}" alt="Gambar ${esc(m.location)}" data-zoom>` : ''}
              <span class="muted small">${esc(m.measured_by_name || '—')} · ${fmtDate(m.updated_at)}</span></div>
          </div>
        </article>`).join('') : emptyBox(ICON.ruler, 'Belum ada ukuran', 'Tekan <b>Tambah ukuran</b> dan masukkan lebar × tinggi dalam milimeter.')}
    </div>

    <div class="tbl-wrap print-only"><table><thead><tr><th>#</th><th>Lokasi</th><th>Jenis</th><th class="num">Lebar (mm)</th><th class="num">Tinggi (mm)</th><th class="num">Unit</th><th class="num">Panel</th><th>Kaca</th><th>Frame</th><th class="num">m²</th><th>Nota</th></tr></thead><tbody>
      ${ms.map((m, i) => `<tr><td>${i + 1}</td><td>${esc(m.location)}</td><td>${esc(m.item_type)}</td><td class="num mono">${m.width_mm}</td><td class="num mono">${m.height_mm}</td><td class="num">${m.qty}</td><td class="num">${m.panels || ''}</td><td>${esc(m.glass)}</td><td>${esc(m.frame_color)}</td><td class="num mono">${fmtNum((m.width_mm * m.height_mm * m.qty) / 1e6, 2)}</td><td>${esc(m.notes)}</td></tr>`).join('')}
      <tr><td colspan="5"><b>Jumlah</b></td><td class="num"><b>${units}</b></td><td colspan="3"></td><td class="num mono"><b>${fmtNum(area, 2)}</b></td><td></td></tr>
    </tbody></table><p class="small">Dicetak ${fmtDateTime(new Date().toISOString())} · Disemak oleh: ____________________</p></div>`);

  hydratePhotos($('#main'));
  $('#pstatus').onchange = async (e) => { try { await api(`/api/projects/${id}`, { method: 'PATCH', body: { status: e.target.value } }); toast(`Status: ${STATUS[e.target.value]}`); renderProject(id); } catch (err) { toast(err.message, true); } };
  $('#pedit').onclick = () => projectForm(p);
  $('#pprint').onclick = () => window.print();
  $('#addm').onclick = () => measurementForm(p.id);
  if ($('#pdel')) $('#pdel').onclick = async () => {
    if (!(await confirmBox('Padam projek?', `Projek "${p.name}" dan ${ms.length} ukuran akan dipadam kekal.`))) return;
    try { await api(`/api/projects/${id}`, { method: 'DELETE' }); toast('Projek dipadam'); location.hash = '#projek'; } catch (e) { toast(e.message, true); }
  };
  $('#main').addEventListener('click', async (e) => {
    const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]'), z = e.target.closest('[data-zoom]');
    if (ed) measurementForm(p.id, ms.find((m) => m.id === Number(ed.dataset.edit)));
    if (z) openModal(`<div class="modal-head"><h2>Gambar</h2><button class="btn ghost" data-close aria-label="Tutup">✕</button></div><img src="${z.src}" alt="">`);
    if (del) {
      const m = ms.find((x) => x.id === Number(del.dataset.del));
      if (!(await confirmBox('Padam ukuran?', `${m.location} — ${m.width_mm} × ${m.height_mm} mm`))) return;
      try { await api(`/api/measurements/${m.id}`, { method: 'DELETE' }); toast('Ukuran dipadam'); renderProject(id); } catch (err) { toast(err.message, true); }
    }
  });
}

function measurementForm(projectId, m = null) {
  let photo; // undefined = no change, null = remove, string = new
  openModal(`
    <div class="modal-head"><h2>${m ? 'Edit ukuran' : 'Tambah ukuran'}</h2><button class="btn ghost" data-close aria-label="Tutup">✕</button></div>
    <form id="mf" class="stack">
      <label class="f">Lokasi / label *<input id="mf-loc" required value="${esc(m?.location)}" placeholder="cth: Ruang tamu – pintu ke laman" list="dl-loc"></label>
      <datalist id="dl-loc">${['Pintu utama', 'Ruang tamu', 'Dapur', 'Bilik utama', 'Bilik 2', 'Bilik 3', 'Bilik air utama', 'Bilik air 2', 'Balkoni', 'Tangga', 'Kedai – depan'].map((x) => `<option value="${x}">`).join('')}</datalist>
      <label class="f">Jenis item *<select id="mf-type">${ITEM_TYPES.map((t) => `<option ${m?.item_type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <div class="grid2">
        <label class="f">Lebar (mm) *<input id="mf-w" class="dim-input" type="number" inputmode="numeric" min="1" max="20000" required value="${m?.width_mm ?? ''}" placeholder="0"></label>
        <label class="f">Tinggi (mm) *<input id="mf-h" class="dim-input" type="number" inputmode="numeric" min="1" max="20000" required value="${m?.height_mm ?? ''}" placeholder="0"></label>
      </div>
      <div class="row" style="align-items:flex-end;flex-wrap:nowrap">
        <div class="dwg" id="mf-dwg" style="width:96px;flex:none"></div>
        <div class="area-live" id="mf-area" style="flex:1"></div>
      </div>
      <div class="grid2">
        <label class="f">Kuantiti (unit)<input id="mf-qty" type="number" inputmode="numeric" min="1" value="${m?.qty ?? 1}"></label>
        <label class="f">Bil. panel<input id="mf-pan" type="number" inputmode="numeric" min="1" max="8" value="${m?.panels ?? ''}" placeholder="auto"></label>
      </div>
      <div class="grid2">
        <label class="f">Jenis kaca<input id="mf-glass" list="dl-glass" value="${esc(m?.glass)}" placeholder="cth: Tempered 10mm"></label>
        <label class="f">Warna frame<input id="mf-frame" list="dl-frame" value="${esc(m?.frame_color)}" placeholder="cth: Hitam"></label>
      </div>
      <datalist id="dl-glass">${GLASS.map((x) => `<option value="${x}">`).join('')}</datalist>
      <datalist id="dl-frame">${FRAME.map((x) => `<option value="${x}">`).join('')}</datalist>
      <label class="f">Nota<span class="hint">cth: lantai tak rata 5mm, perlu buang grill lama, arah bukaan kiri</span><textarea id="mf-notes">${esc(m?.notes)}</textarea></label>
      <div class="stack" style="gap:6px">
        <span class="f" style="font-weight:600;font-size:.9rem">Gambar tapak</span>
        <div class="row"><input id="mf-photo" type="file" accept="image/*" capture="environment">
          ${m?.photo ? '<button type="button" class="btn danger" id="mf-rmphoto">Buang gambar</button>' : ''}</div>
        <img id="mf-prev" alt="" style="max-height:160px;width:auto;border-radius:8px" ${m?.photo ? `data-photo="${esc(m.photo)}"` : 'hidden'}>
      </div>
      <div class="modal-foot">
        ${m ? '' : '<button type="button" class="btn" id="mf-more">Simpan & tambah lagi</button>'}
        <button type="button" class="btn" data-close>Batal</button><button class="btn primary" id="mf-save">Simpan</button>
      </div>
    </form>`, () => {
    const upd = () => {
      const w = Number($('#mf-w').value), h = Number($('#mf-h').value), q = Math.max(1, Number($('#mf-qty').value) || 1);
      if (w > 0 && h > 0) {
        $('#mf-dwg').innerHTML = drawing({ width_mm: w, height_mm: h, item_type: $('#mf-type').value, panels: Number($('#mf-pan').value) || null }, 96);
        $('#mf-area').innerHTML = `${fmtNum((w * h) / 1e6, 3)} m² / unit<br><b>${fmtNum((w * h * q) / 1e6, 2)} m²</b> jumlah`;
      } else { $('#mf-dwg').innerHTML = ''; $('#mf-area').textContent = 'Masukkan lebar & tinggi dalam mm'; }
    };
    hydratePhotos($('#modal'));
    ['#mf-w', '#mf-h', '#mf-qty', '#mf-pan', '#mf-type'].forEach((s) => $(s).addEventListener('input', upd)); upd();
    $('#mf-photo').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try { photo = await resizeImage(f, IS_DEMO() ? 1000 : 1600); $('#mf-prev').src = photo; $('#mf-prev').hidden = false; } catch (err) { toast(err.message, true); }
    };
    if ($('#mf-rmphoto')) $('#mf-rmphoto').onclick = () => { photo = null; $('#mf-prev').hidden = true; $('#mf-photo').value = ''; };
    const save = async (again) => {
      if (!$('#mf').reportValidity()) return;
      const body = { location: $('#mf-loc').value, item_type: $('#mf-type').value, width_mm: $('#mf-w').value, height_mm: $('#mf-h').value,
        qty: $('#mf-qty').value, panels: $('#mf-pan').value, glass: $('#mf-glass').value, frame_color: $('#mf-frame').value, notes: $('#mf-notes').value };
      if (photo !== undefined) body.photo = photo;
      if (m) await api(`/api/measurements/${m.id}`, { method: 'PATCH', body });
      else await api(`/api/projects/${projectId}/measurements`, { body });
      toast('Ukuran disimpan');
      if (again) {
        // keep type/glass/frame for the next opening; clear the rest
        ['#mf-loc', '#mf-w', '#mf-h', '#mf-notes', '#mf-photo', '#mf-pan'].forEach((s) => ($(s).value = ''));
        $('#mf-qty').value = 1; photo = undefined; $('#mf-prev').hidden = true; upd(); $('#mf-loc').focus();
        renderProjectQuiet(projectId);
      } else { closeModal(); renderProject(projectId); }
    };
    $('#mf').onsubmit = (e) => { e.preventDefault(); busy($('#mf-save'), () => save(false)); };
    if ($('#mf-more')) $('#mf-more').onclick = (e) => busy(e.currentTarget, () => save(true));
  });
}
// The page behind the open modal can re-render without closing it
const renderProjectQuiet = (id) => renderProject(id);

/* ---------- Attendance records ---------- */
async function renderRecords() {
  const isAdmin = state.me.role === 'admin';
  const today = ymd(Date.now());
  const from = store.get('ajc_rf') || ymd(Date.now() - 6 * 864e5), to = store.get('ajc_rt') || today, uid = store.get('ajc_ru') || '';
  const users = isAdmin ? await api('/api/users') : [];
  shell(`
    <div class="page-head"><div><h1>Rekod kehadiran</h1><p>${isAdmin ? 'Punch in / out semua staff' : 'Rekod punch anda'}</p></div></div>
    <section class="card filters">
      <label class="f">Dari<input id="rf" type="date" value="${from}"></label>
      <label class="f">Hingga<input id="rt" type="date" value="${to}"></label>
      ${isAdmin ? `<label class="f" style="flex:2 1 200px">Staff<select id="ru"><option value="">Semua staff</option>${users.map((u) => `<option value="${u.id}" ${String(u.id) === uid ? 'selected' : ''}>${esc(u.name)}${u.active ? '' : ' (tidak aktif)'}</option>`).join('')}</select></label>` : ''}
      <button type="button" class="btn" id="rcsv">${ICON.dl}Excel (CSV)</button>
    </section>
    <div id="rsum"></div>
    <div id="rtbl"></div>`);
  const load = async () => {
    const f = $('#rf').value, t = $('#rt').value, u = isAdmin ? $('#ru').value : '';
    store.set('ajc_rf', f); store.set('ajc_rt', t); if (isAdmin) store.set('ajc_ru', u);
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
      downloadText(`kehadiran-ajc-${f}-hingga-${t}.csv`, '\ufeff' + lines.join('\r\n'), 'text/csv;charset=utf-8');
    };
    const total = rows.reduce((a, r) => a + (r.hours || 0), 0);
    const outside = rows.filter((r) => r.in_ok === false || r.out_ok === false).length;
    const per = {}; rows.forEach((r) => { per[r.user_name] = per[r.user_name] || { h: 0, d: new Set() }; per[r.user_name].h += r.hours || 0; per[r.user_name].d.add(ymd(r.in_at)); });
    $('#rsum').innerHTML = `<div class="stats"><div><div class="eyebrow">Rekod</div><div class="v">${rows.length}</div></div>
      <div><div class="eyebrow">Jumlah jam</div><div class="v">${fmtNum(total, 1)}<small> j</small></div></div>
      <div><div class="eyebrow">Luar kawasan</div><div class="v" style="color:${outside ? 'var(--bad)' : 'inherit'}">${outside}</div></div></div>
      ${isAdmin && Object.keys(per).length > 1 ? `<div class="tbl-wrap" style="margin-top:12px"><table><thead><tr><th>Staff</th><th class="num">Hari</th><th class="num">Jam</th></tr></thead><tbody>
        ${Object.entries(per).sort((a, b) => b[1].h - a[1].h).map(([n, v]) => `<tr><td><div class="person"><span class="avatar">${esc(initials(n))}</span>${esc(n)}</div></td><td class="num">${v.d.size}</td><td class="num mono">${fmtHours(v.h)}</td></tr>`).join('')}</tbody></table></div>` : ''}`;
    const gps = (lat, lng, ok, dist) => (lat == null ? '' : `<a href="${mapLink(lat, lng)}" target="_blank" rel="noopener" title="Buka peta">${geoPill(ok, dist)}</a>`);
    $('#rtbl').innerHTML = rows.length ? `<div class="rec-list">${rows.map((r) => {
      const d = new Date(r.in_at);
      return `<div class="rec">
        <div class="day"><b>${d.toLocaleDateString('en-GB', { timeZone: TZ, day: 'numeric' })}</b><span>${d.toLocaleDateString('ms-MY', { timeZone: TZ, month: 'short' })}</span></div>
        <div class="what">
          <div class="t">${isAdmin ? `${esc(r.user_name)} · ` : ''}${esc(r.project_name || 'Bengkel / Pejabat')}</div>
          <div class="s"><span>Masuk <b class="mono">${fmtTime(r.in_at)}</b></span>${gps(r.in_lat, r.in_lng, r.in_ok, r.in_dist_m)}
            <span>Keluar <b class="mono">${r.out_at ? fmtTime(r.out_at) : '—'}</b></span>${gps(r.out_lat, r.out_lng, r.out_ok, r.out_dist_m)}</div>
          ${r.note ? `<div class="s">${esc(r.note)}</div>` : ''}
        </div>
        <div class="hrs">${r.out_at ? fmtHours(r.hours) : '<span class="pill p-ok">Aktif</span>'}<small>${r.out_at ? 'jam' : ''}</small></div>
      </div>`; }).join('')}</div>`
      : emptyBox(ICON.rec, 'Tiada rekod', 'Tiada punch in dalam tempoh ini.');
  };
  ['#rf', '#rt', '#ru'].forEach((s) => $(s) && ($(s).onchange = () => load().catch((e) => toast(e.message, true))));
  await load();
}

/* ---------- Staff (admin) ---------- */
async function renderStaff() {
  const users = await api('/api/users');
  shell(`
    <div class="page-head"><div><h1>Staff</h1><p>${users.filter((u) => u.active).length} akaun aktif</p></div><button class="btn primary" id="news">${ICON.plus}Tambah staff</button></div>
    <div class="rec-list">
      ${users.map((u) => `<div class="rec" style="grid-template-columns:auto minmax(0,1fr) auto">
        <span class="avatar" style="${u.active ? '' : 'filter:grayscale(1);opacity:.5'}">${esc(initials(u.name))}</span>
        <div class="what"><div class="t">${esc(u.name)}</div>
          <div class="s"><span class="mono">@${esc(u.username)}</span>${u.phone ? `<span class="mono">${esc(u.phone)}</span>` : ''}
            <span class="pill ${u.role === 'admin' ? 'st-ukur' : 'p-na'}">${u.role === 'admin' ? 'Admin' : 'Staff'}</span>${u.active ? '' : '<span class="pill p-bad">Tidak aktif</span>'}</div></div>
        <button class="btn" data-u="${u.id}">Urus</button>
      </div>`).join('')}
    </div>
    <p class="muted small" style="margin:0">Staff log masuk dengan username & kata laluan yang anda tetapkan. Hanya admin boleh urus staff dan padam projek.</p>`);
  $('#news').onclick = () => staffForm();
  $$('[data-u]').forEach((b) => (b.onclick = () => staffForm(users.find((u) => u.id === Number(b.dataset.u)))));
}
function staffForm(u = null) {
  openModal(`
    <div class="modal-head"><h2>${u ? `Urus ${esc(u.name)}` : 'Tambah staff'}</h2><button class="btn ghost" data-close aria-label="Tutup">✕</button></div>
    <form id="sf" class="stack">
      <label class="f">Nama penuh *<input id="sf-name" required value="${esc(u?.name)}"></label>
      <div class="grid2">
        <label class="f">Username *<input id="sf-user" required ${u ? 'disabled' : ''} autocapitalize="none" value="${esc(u?.username)}" placeholder="cth: ali"></label>
        <label class="f">Telefon<input id="sf-phone" type="tel" value="${esc(u?.phone)}"></label>
      </div>
      <div class="grid2">
        <label class="f">${u ? 'Kata laluan baru' : 'Kata laluan *'}<span class="hint">${u ? 'Kosongkan jika tiada perubahan' : 'Min 6 aksara'}</span><input id="sf-pass" type="text" autocomplete="new-password" ${u ? '' : 'required minlength="6"'}></label>
        <label class="f">Peranan<span class="hint">&nbsp;</span><select id="sf-role"><option value="staff">Staff</option><option value="admin" ${u?.role === 'admin' ? 'selected' : ''}>Admin</option></select></label>
      </div>
      ${u ? `<label class="row" style="gap:8px"><input id="sf-active" type="checkbox" ${u.active ? 'checked' : ''}> Akaun aktif (boleh log masuk)</label>` : ''}
      <div class="modal-foot"><button type="button" class="btn" data-close>Batal</button><button class="btn primary">Simpan</button></div>
    </form>`, () => {
    $('#sf').onsubmit = (e) => { e.preventDefault(); busy($('#sf button.primary'), async () => {
      const body = { name: $('#sf-name').value, phone: $('#sf-phone').value, role: $('#sf-role').value };
      if ($('#sf-pass').value) body.password = $('#sf-pass').value;
      if (u) { body.active = $('#sf-active').checked; await api(`/api/users/${u.id}`, { method: 'PATCH', body }); }
      else { body.username = $('#sf-user').value; await api('/api/users', { body }); }
      closeModal(); toast('Staff disimpan'); renderStaff();
    }); };
  });
}

/* ---------- Account ---------- */
function renderAccount() {
  shell(`
    <section class="card row" style="gap:16px;flex-wrap:nowrap">
      <span class="avatar" style="width:56px;height:56px;font-size:1.1rem">${esc(initials(state.me.name))}</span>
      <div style="min-width:0"><h2>${esc(state.me.name)}</h2><div class="muted small"><span class="mono">@${esc(state.me.username)}</span> · ${state.me.role === 'admin' ? 'Admin' : 'Staff'}</div></div>
    </section>
    <form class="card stack" id="cp">
      <h2>Tukar kata laluan</h2>
      <label class="f">Kata laluan semasa<input id="cp-cur" type="password" autocomplete="current-password" required></label>
      <label class="f">Kata laluan baru<input id="cp-new" type="password" autocomplete="new-password" minlength="6" required></label>
      <div><button class="btn primary">Tukar kata laluan</button></div>
    </form>
    <div><button class="btn danger" id="logout">${ICON.out}Log keluar</button></div>
    ${IS_DEMO() ? `<section class="card stack"><h2>Data demo</h2><p class="muted small" style="margin:0">Data demo hanya disimpan dalam browser peranti ini. Reset akan memadam semua perubahan dan memulihkan data contoh.</p><div><button class="btn" id="demo-reset">Reset data demo</button></div></section>` : ''}`);
  $('#cp').onsubmit = (e) => { e.preventDefault(); busy($('#cp button'), async () => {
    await api('/api/me/password', { body: { current: $('#cp-cur').value, next: $('#cp-new').value } });
    $('#cp').reset(); toast('Kata laluan ditukar');
  }); };
  if ($('#demo-reset')) $('#demo-reset').onclick = async () => {
    if (!(await confirmBox('Reset data demo?', 'Semua projek, ukuran dan rekod kehadiran dalam peranti ini akan kembali kepada data contoh.', 'Reset'))) return;
    window.AJCBackend.reset(); state.me = null; location.hash = ''; renderLogin(); toast('Data demo direset');
  };
  $('#logout').onclick = async () => { await api('/api/logout', { body: {} }).catch(() => {}); state.me = null; location.hash = ''; renderLogin(); };
}

/* ---------- Boot ---------- */
(async () => {
  try { state.me = await api('/api/me'); router(); } catch { renderLogin(); }
})();
