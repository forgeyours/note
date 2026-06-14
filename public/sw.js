const CACHE_NAME = 'forgeyours-notes-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon.svg?v=2'
];

// Install Event: cache core bootstrap files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching core local shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: clear old cache stores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((allCaches) => {
      return Promise.all(
        allCaches.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Purging legacy cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Stale-While-Revalidate or cache-first for static content
self.addEventListener('fetch', (event) => {
  // Only intercept same-origin or font/external assets. Skip POST requests (like AI chat gateway)
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip dev hot reloader websockets or special browser extensions
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached immediately if found, and update request in the background
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // If valid response, save clone to cache for subsequent visits
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((err) => {
          console.log('[Service Worker] Offline fetch fallback:', err);
          // If network failed and we have cache, cachedResponse solves it
          return cachedResponse || new Response('Offline: Resource not available', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });

      return cachedResponse || fetchPromise;
    })
  );
});
