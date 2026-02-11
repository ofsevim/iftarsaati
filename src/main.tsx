import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

function isProblematicBrowser(): boolean {
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
  const isOldAndroidChrome = /Android/i.test(ua) && /Chrome\/([0-6][0-9]|7[0-9])\./i.test(ua);
  return (isIOS && isSafari) || isOldAndroidChrome;
}

async function cleanupServiceWorkersAndCaches() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  } catch (err) {
    console.warn("SW unregister hatası:", err);
  }

  if ("caches" in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("iftar-vakti-"))
          .map((k) => caches.delete(k))
      );
    } catch (err) {
      console.warn("Cache temizleme hatası:", err);
    }
  }
}

// Problemli cihazlarda SW kapalı, diğerlerinde aktif.
function initServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    if (isProblematicBrowser()) {
      await cleanupServiceWorkersAndCaches();
      console.log("Problemli tarayıcı tespit edildi: Service Worker devre dışı.");
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        console.log("Service Worker başarıyla kaydedildi:", registration);
      })
      .catch((error) => {
        console.error("Service Worker kaydı başarısız:", error);
      });
  });
}

initServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
