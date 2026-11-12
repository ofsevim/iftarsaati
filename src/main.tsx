import { Capacitor } from "@capacitor/core";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

function isProblematicBrowser(): boolean {
  const ua = navigator.userAgent || "";
  // Sadece çok eski Android Chrome sürümleri (v79 altı) için SW devre dışı bırakılır
  const isOldAndroidChrome = /Android/i.test(ua) && /Chrome\/([0-6][0-9]|7[0-9])\./i.test(ua);
  return Boolean(isOldAndroidChrome);
}

async function cleanupServiceWorkersAndCaches() {
  const staleCachePrefixes = ["iftar-vakti-", "vakt-i-serif-"];

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
          .filter((k) => staleCachePrefixes.some((prefix) => k.startsWith(prefix)))
          .map((k) => caches.delete(k))
      );
    } catch (err) {
      console.warn("Cache temizleme hatası:", err);
    }
  }
}

// Native Capacitor kabuğunda veya eski Chrome sürümlerinde SW kapalıdır.
function initServiceWorker() {
  if (!import.meta.env.PROD) return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    if (Capacitor.getPlatform() !== "web" || isProblematicBrowser()) {
      await cleanupServiceWorkersAndCaches();
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((error) => {
        console.error("Service Worker kaydı başarısız:", error);
      });
  });
}

initServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
