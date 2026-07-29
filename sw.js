const CACHE_NAME = 'pnshar-lab-v4';
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
    return;
  }

  const isHTML = event.request.mode === 'navigate' ||
                 event.request.destination === 'document' ||
                 url.pathname.endsWith('.html') ||
                 url.pathname.endsWith('/');

  if (isHTML) {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(event.request);
        const responseForCache = networkResponse.clone();
        caches.open(CACHE_NAME)
          .then((cache) => cache.put(event.request, responseForCache))
          .catch(() => {});
        return networkResponse;
      } catch (err) {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        throw err;
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) {
      fetch(event.request).then((networkResponse) => {
        const responseForCache = networkResponse.clone();
        caches.open(CACHE_NAME)
          .then((cache) => cache.put(event.request, responseForCache))
          .catch(() => {});
      }).catch(() => {});
      return cached;
    }
    try {
      const networkResponse = await fetch(event.request);
      const responseForCache = networkResponse.clone();
      caches.open(CACHE_NAME)
        .then((cache) => cache.put(event.request, responseForCache))
        .catch(() => {});
      return networkResponse;
    } catch (err) {
      throw err;
    }
  })());
});
