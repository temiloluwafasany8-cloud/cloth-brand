const CACHE_NAME = 'cloth-brand-v3';
const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Network-first strategy for all requests to ensure updates are always visible
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Cache only manifest and icons
        if (event.request.url.includes('/manifest.json') ||
            event.request.url.includes('/icon-')) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache only for cached assets
        return caches.match(event.request);
      })
  );
});
