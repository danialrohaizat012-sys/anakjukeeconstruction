/* AJC Sistem Tapak — service worker
   Network-first untuk fail app (sentiasa versi terbaru bila ada internet), cache sebagai sandaran bila offline.
   Fon Google: cache-first. Tukar VERSION bila struktur fail berubah. */
const VERSION = 'ajc-v4';
const ASSETS = ['./', 'index.html', 'style.css', 'app.js', 'demo-backend.js', 'logo.png', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const put = (res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; };
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then(put).catch(() => caches.match(req).then((r) => r || caches.match('index.html'))));
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.match(req).then((r) => r || fetch(req).then(put)));
  }
});
