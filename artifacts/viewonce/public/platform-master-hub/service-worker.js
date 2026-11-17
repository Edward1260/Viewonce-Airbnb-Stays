const HUB_SCOPE = new URL("./", self.location.href).pathname;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Hub pages and authentication responses are intentionally never cached.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(HUB_SCOPE) ||
    url.pathname.includes("/api/")
  ) {
    return;
  }
  event.respondWith(fetch(request));
});
