const CACHE_NAME = 'iftar-vakti-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.png',
  '/favicon-48.png',
  '/og-image.png',
  '/robots.txt'
];

// Basitleştirilmiş install - tüm tarayıcılar için
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.log('Cache ekleme hatası:', err);
        self.skipWaiting();
      })
  );
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
    ).then(() => self.clients.claim())
  );
});

// Basitleştirilmiş fetch stratejisi - Samsung uyumluluğu için
self.addEventListener('fetch', (event) => {
  // Navigation istekleri için özel işlem
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Diğer istekler için cache-first stratejisi
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then((response) => {
            // Sadece GET isteklerini ve başarılı yanıtları cache'le
            if (event.request.method === 'GET' && response.ok) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(event.request, responseToCache))
                .catch(err => console.log('Cache put error:', err));
            }
            return response;
          })
          .catch((error) => {
            console.log('Fetch failed:', error);
            // Samsung için özel hata mesajı
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            return new Response('Bağlantı hatası', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// Samsung tarayıcısı için message handler
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
