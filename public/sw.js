const CACHE_NAME = "vakt-i-serif-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-192.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/favicon.png",
  "/favicon-48.png",
  "/robots.txt",
];
const OPTIONAL_ASSETS = [
  "/og-image.png",
  "/screenshot-narrow.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        await cache.addAll(STATIC_ASSETS);
        await Promise.allSettled(OPTIONAL_ASSETS.map((url) => cache.add(url)));
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error("SW precache hatası:", error);
        throw error;
      })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(cacheNames.filter((name) => name.startsWith("vakt-i-serif-") && name !== CACHE_NAME).map((name) => caches.delete(name)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Cross-origin API isteklerini olduğu gibi ağa bırak.
  if (url.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", copy)).catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches.match("/index.html").then(
            (cached) =>
              cached ||
              new Response("Çevrimdışı", {
                status: 503,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
              })
          )
        )
    );
    return;
  }

  event.respondWith(
    caches
      .match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((response) => {
          if (event.request.method === "GET" && response.ok && response.type === "basic") {
            const responseToCache = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseToCache))
              .catch(() => {});
          }

          return response;
        });
      })
      .catch(
        () =>
          new Response("Çevrimdışı", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          })
      )
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
