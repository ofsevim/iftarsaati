const CACHE_NAME = 'iftar-vakti-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.png',
  '/favicon-48.png',
];

// Install: statik dosyaları cache'le
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: eski cache'leri temizle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Sadece aynı origin'deki istekleri cache'le.
// API (cross-origin) isteklerine dokunma — doğrudan ağa gönder.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cross-origin istekler (API vb.) — service worker araya girmesin
  if (url.origin !== self.location.origin) {
    return; // Tarayıcının varsayılan davranışına bırak
  }

  // Aynı origin (statik dosyalar) — network first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Sadece başarılı yanıtları cache'le
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
