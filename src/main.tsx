import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Samsung tarayıcısı için basitleştirilmiş Service Worker kaydı
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('Service Worker başarıyla kaydedildi:', registration);
        })
        .catch((error) => {
          console.error('Service Worker kaydı başarısız:', error);
        });
    });
  }
}

// Service Worker'ı kaydet
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
