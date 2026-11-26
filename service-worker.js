const CACHE = 'aseo-airbnb-v7';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './logo.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;   // la sincronización (Google) nunca se guarda en caché
  const keep = res => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
  if (req.mode === 'navigate') {
    // La página: primero internet (para recibir actualizaciones de la app); sin internet, la copia guardada.
    e.respondWith(fetch(req).then(keep).catch(() => caches.match(req).then(h => h || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(keep).catch(() => caches.match('./index.html'))));
});
