// Service worker Penilaian Praktik (ruangk3.com/penilaian/).
// Naikkan VERSION setiap kali file di folder ini diubah.
const VERSION = 'penilaian-v7';
const SHELL = ['./', './index.html', './manifest.webmanifest', './vendor/jspdf.umd.min.js', './vendor/jspdf.plugin.autotable.min.js'];
const FIREBASE = [
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' }))));
    await Promise.all(FIREBASE.map(u => c.add(new Request(u, { mode: 'cors' })).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('penilaian-') && k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/firebaseio\.com|firebasedatabase\.app|googleapis\.com\/identitytoolkit|securetoken\.googleapis\.com/.test(url.href)) return;
  if (url.origin === location.origin && url.pathname.startsWith('/penilaian/')) {
    // berkas aplikasi: versi terbaru bila online, cache bila offline
    e.respondWith((async () => {
      const c = await caches.open(VERSION);
      try {
        const res = await fetch(req, { cache: 'no-cache' });
        if (res.ok) c.put(req, res.clone());
        return res;
      } catch (err) {
        return (await c.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? c.match('./index.html') : Response.error());
      }
    })());
    return;
  }
  if (/gstatic\.com|fonts\.googleapis\.com/.test(url.host)) {
    e.respondWith((async () => {
      const c = await caches.open(VERSION);
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    })());
  }
});
