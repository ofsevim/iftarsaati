import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function safeStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Safari private mode vb. durumlarda sessizce geç
  }
}

function isIOS(): boolean {
  const win = window as unknown as { MSStream?: unknown };
  const isClassicIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !win.MSStream;
  const isIPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isClassicIOS || isIPadOS;
}

function isNativeApp(): boolean {
  return Capacitor.getPlatform() !== "web";
}

function isStandalone(): boolean {
  if (isNativeApp()) return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissed = safeStorageGet("pwa-install-dismissed");
    if (dismissed) return;

    if (isIOS()) {
      setIsIOSDevice(true);
      // iOS cihazlarda 2 saniye sonra göster
      const timer = setTimeout(() => setShowPrompt(true), 2000);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch {
      // Kullanıcı iptal veya tarayıcı hatası
    } finally {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    safeStorageSet("pwa-install-dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <section aria-labelledby="install-title" className="w-full max-w-2xl mb-6 glass-card gold-border p-4 print:hidden">
      <div className="flex items-start gap-3 mb-3">
        <Download className="size-5 shrink-0 mt-0.5 text-gold" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 id="install-title" className="font-display text-gold font-semibold mb-1">
            Uygulamayı Yükle
          </h3>
          <p className="text-sm text-cream-muted">
            {isIOSDevice
              ? "Vakt-i Şerif'i ana ekranınıza ekleyerek tek dokunuşla erişin."
              : "Vakt-i Şerif'e ana ekranınızdan erişin."}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="size-11 shrink-0 rounded-xl text-cream-muted hover:text-gold transition-colors touch-manipulation grid place-items-center"
          aria-label="Yükleme önerisini kapat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {isIOSDevice ? (
        <div className="space-y-2">
          <div className="bg-night-light p-2.5 rounded-xl text-sm text-cream-muted flex items-center gap-2">
            <Share className="w-4 h-4 text-gold shrink-0" aria-hidden="true" />
            <span>
              Safari'de <strong className="text-gold">Paylaş</strong> simgesine dokunun ve <strong className="text-gold">'Ana Ekrana Ekle'</strong>yi seçin.
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="w-full min-h-11 rounded-xl gold-border px-4 text-sm font-medium text-gold hover:bg-gold/10 transition-colors touch-manipulation"
          >
            Anladım
          </button>
        </div>
      ) : (
        <button
          onClick={handleInstall}
          className="w-full min-h-11 rounded-xl gold-border px-4 text-sm font-medium text-gold hover:bg-gold/10 transition-colors touch-manipulation"
        >
          Yükle
        </button>
      )}
    </section>
  );
};

export default InstallPrompt;
