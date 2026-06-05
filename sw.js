const CACHE = 'fme-v1';
const ASSETS = ['/', '/index.html'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ));
    self.clients.claim();
});

// cache-first for same-origin, network-only for CDN (Tailwind)
self.addEventListener('fetch', e => {
    if (!e.request.url.startsWith(self.location.origin)) return;
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request))
    );
});
