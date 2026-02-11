import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Samsung tarayıcısı için gelişmiş Service Worker kaydı
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    // Samsung tarayıcısı tespiti
    const isSamsungBrowser = /SamsungBrowser/i.test(navigator.userAgent);
    
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        // Samsung için özel ayarlar
        updateViaCache: isSamsungBrowser ? 'none' : 'imports'
      })
      .then((registration) => {
        console.log('Service Worker başarıyla kaydedildi:', registration);
        
        // Samsung tarayıcısı için güncelleme kontrolü
        if (isSamsungBrowser && registration.waiting) {
          console.log('Samsung tarayıcısı için güncelleme mevcut');
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        
        // Güncelleme kontrolü
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('Yeni Service Worker yüklendi');
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('Service Worker kaydı başarısız:', error);
        
        // Samsung tarayıcısında hata durumunda Service Worker'ı devre dışı bırak
        if (isSamsungBrowser) {
          console.log('Samsung tarayıcısı için Service Worker devre dışı bırakıldı');
          // Service Worker cache'ini temizle
          if ('caches' in window) {
            caches.keys().then(cacheNames => {
              cacheNames.forEach(cacheName => {
                caches.delete(cacheName);
              });
            });
          }
        }
      });
    });
    
    // Samsung tarayıcısı için offline durum kontrolü
    if (isSamsungBrowser) {
      window.addEventListener('online', () => {
        console.log('Samsung tarayıcısı çevrimiçi');
      });
      
      window.addEventListener('offline', () => {
        console.log('Samsung tarayıcısı çevrimdışı');
      });
    }
  }
}

// Service Worker'ı kaydet
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
