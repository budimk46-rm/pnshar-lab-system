const CACHE_NAME = 'pnshar-lab-v3';
const ASSETS_TO_CACHE = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isOwnAsset = url.origin === self.location.origin;

  if (event.request.method !== 'GET' || !isOwnAsset) {
    // Biarkan API call (Gemini, Google Sheets) langsung ke network, tidak di-cache
    return;
  }

  const isHTML = event.request.mode === 'navigate' ||
                 event.request.destination === 'document' ||
                 url.pathname.endsWith('.html') ||
                 url.pathname.endsWith('/');

  if (isHTML) {
    // NETWORK-FIRST untuk HTML: selalu coba ambil versi terbaru dulu.
    // Cache hanya dipakai kalau benar-benar tidak ada koneksi internet.
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // CACHE-FIRST untuk aset statis (icon, manifest) supaya loading cepat,
  // tetap update cache di background untuk kunjungan berikutnya.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
          });
          return networkResponse;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
