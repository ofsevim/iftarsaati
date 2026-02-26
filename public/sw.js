const CACHE_NAME = 'iftar-vakti-v5';
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

// Install: statik dosyaları cache'le
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

/**
 * Fetch stratejisi:
 * - Cross-origin API istekleri (aladhan.com vb.) → SW müdahale ETMEZ, doğrudan ağa gider.
 * - Navigation istekleri → network-first, offline ise cache'den index.html.
 * - Same-origin statik dosyalar → cache-first.
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ✅ Cross-origin istekleri (API çağrıları dahil) asla yakalama.
  // Bu, mobil tarayıcılardaki "bağlantı sıfırlandı" sorununu önler.
  if (url.origin !== self.location.origin) {
    return; // SW müdahale etmiyor, tarayıcı doğrudan isteği yönetiyor.
  }

  // Navigation istekleri (sayfa yükleme)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Same-origin statik dosyalar: cache-first
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request)
          .then((response) => {
            if (event.request.method === 'GET' && response.ok) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(event.request, responseToCache))
                .catch(() => {});
            }
            return response;
          });
      })
      .catch(() => {
        return new Response('Çevrimdışı', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      })
  );
});

// Message handler
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Bildirim zamanlama: sayfa vakit bilgisini gönderir, SW arka planda zamanlar.
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATIONS') {
    const { notifications } = event.data; // [{ title, body, triggerAt }]

    // Önceki zamanlanmış timer'ları temizle
    if (self._notifTimers) {
      self._notifTimers.forEach((id) => clearTimeout(id));
    }
    self._notifTimers = [];

    if (!notifications || !notifications.length) return;

    notifications.forEach((n) => {
      const delay = n.triggerAt - Date.now();
      if (delay <= 0 || delay > 24 * 60 * 60 * 1000) return;

      const timerId = setTimeout(() => {
        self.registration.showNotification(n.title, {
          body: n.body,
          icon: '/icon-192.png',
          badge: '/favicon-48.png',
          tag: n.title,
          vibrate: [200, 100, 200],
          requireInteraction: true,
        });
      }, delay);

      self._notifTimers.push(timerId);
    });
  }

  // Bildirimleri iptal et
  if (event.data && event.data.type === 'CANCEL_NOTIFICATIONS') {
    if (self._notifTimers) {
      self._notifTimers.forEach((id) => clearTimeout(id));
      self._notifTimers = [];
    }
  }
});

// Bildirime tıklanınca uygulamayı aç
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Zaten açık bir pencere varsa ona odaklan
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Yoksa yeni pencere aç
      return self.clients.openWindow('/');
    })
  );
});
