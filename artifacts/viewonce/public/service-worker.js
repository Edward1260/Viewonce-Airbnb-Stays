const APP_BASE = new URL('./', self.location.href).pathname;
const STATIC_CACHE = 'viewonce-static-v3';
const DYNAMIC_CACHE = 'viewonce-dynamic-v3';
const STATIC_FILES = [
  APP_BASE,
  `${APP_BASE}welcome.html`,
  `${APP_BASE}index.html`,
  `${APP_BASE}styles.css`,
  `${APP_BASE}router.js`,
  `${APP_BASE}store.js`,
  `${APP_BASE}api.js`,
  `${APP_BASE}pwa.js`,
  `${APP_BASE}manifest.json`,
  `${APP_BASE}offline.html`,
  `${APP_BASE}images/icon-192.png`,
  `${APP_BASE}images/icon-512.png`
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => ![STATIC_CACHE, DYNAMIC_CACHE].includes(cacheName))
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (url.pathname.startsWith(`${APP_BASE}api/`) || url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.destination === 'style' || request.destination === 'script' || request.destination === 'image') {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (request.destination === 'image') {
      return caches.match(`${APP_BASE}images/icon-192.png`);
    }
    throw error;
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const isPrivateHubPage = new URL(request.url).pathname.includes('/platform-master-hub/');
    if (response.ok && !request.url.includes('/api/') && !isPrivateHubPage) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      return caches.match(`${APP_BASE}offline.html`)
        .then((offline) => offline || new Response('Offline', { status: 503 }));
    }
    throw error;
  }
}