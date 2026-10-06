// Service worker aplikasi Riksa Uji (ruangk3.com/riksa/).
// Naikkan VERSION setiap kali file aplikasi diubah supaya HP petugas mengambil versi baru.
const VERSION = 'riksa-v5';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './js/app.js', './js/panduan.js', './js/firebase.js', './js/report.js', './js/hydrant-report.js', './js/fire-alarm-report.js',
  './vendor/docx.iife.js', './icons/icon-192.png', './icons/icon-512.png',
];
const FIREBASE = [
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })))); // 'reload' = abaikan cache HTTP GitHub Pages (max-age 10 menit)
    // pustaka Firebase: gagal diunduh tidak menggagalkan instalasi (akan dicoba lagi saat dipakai)
    await Promise.all(FIREBASE.map(u => c.add(new Request(u, { mode: 'cors' })).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('riksa-') && k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // jangan sentuh lalu lintas data Firebase (database, login)
  if (/firebaseio\.com|firebasedatabase\.app|googleapis\.com\/identitytoolkit|securetoken\.googleapis\.com/.test(url.href)) return;

  const sameApp = url.origin === location.origin && url.pathname.startsWith('/riksa/');
  if (sameApp) {
    // berkas aplikasi: ambil versi terbaru bila online, pakai cache bila offline
    e.respondWith((async () => {
      const c = await caches.open(VERSION);
      try {
        const res = await fetch(req, { cache: 'no-cache' }); // selalu cek versi terbaru ke server (304 bila sama)
        if (res.ok) c.put(req, res.clone());
        return res;
      } catch (err) {
        return (await c.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? c.match('./index.html') : Response.error());
      }
    })());
    return;
  }
  // pustaka & font dari CDN: cache dulu, lalu jaringan
  if (/gstatic\.com|fonts\.googleapis\.com|cdn\.jsdelivr\.net|unpkg\.com/.test(url.host)) {
    e.respondWith((async () => {
      const c = await caches.open(VERSION);
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') c.put(req, res.clone());
        return res;
      } catch (err) { return Response.error(); }
    })());
  }
});
