// Guarda la app en el teléfono para que abra sin internet.
// Sube el número de VERSION cada vez que cambie la lista de archivos.
const VERSION = 'bitacora-v2';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// Abre al instante con lo guardado si internet tarda más de 2.5 s.
// Si internet responde rápido, usa la versión nueva. Siempre actualiza lo guardado en segundo plano.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  const work = (async () => {
    const cache = await caches.open(VERSION);
    const cached = (await cache.match(e.request, { ignoreSearch: true })) ||
      (e.request.mode === 'navigate' ? await cache.match('index.html') : undefined);
    const net = fetch(e.request)
      .then(r => { if (r && r.ok) cache.put(e.request, r.clone()); return r; })
      .catch(() => null);
    e.waitUntil(net);
    if (!cached) return (await net) || Response.error();
    const timeout = new Promise(res => setTimeout(() => res(null), 2500));
    return (await Promise.race([net, timeout])) || cached;
  })();
  e.respondWith(work);
});
