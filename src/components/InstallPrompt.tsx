import { useState, useEffect } from "react";
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
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream
  );
}

function isStandalone(): boolean {
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
    if (isStandalone()) {
      setShowPrompt(false);
      return;
    }

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

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowPrompt(false);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    safeStorageSet("pwa-install-dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-in slide-in-from-bottom-5">
      <div className="glass-card gold-border p-4 shadow-2xl relative">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-cream-muted hover:text-gold transition-colors"
          aria-label="Kapat"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🌙</span>
          </div>
          <div>
            <h3 className="font-display text-gold font-semibold mb-1">
              Uygulamayı Yükle
            </h3>
            <p className="text-sm text-cream-muted">
              {isIOSDevice
                ? "İftar Vakti'ni ana ekranınıza ekleyerek tek tıkla erişin"
                : "İftar Vakti'ni telefonunuza yükleyerek hızlı erişim sağlayın"}
            </p>
          </div>
        </div>

        {isIOSDevice ? (
          <div className="space-y-2">
            <div className="bg-night-light/70 p-2.5 rounded-xl border gold-border text-xs text-cream-muted flex items-center gap-2">
              <Share className="w-4 h-4 text-gold shrink-0" />
              <span>
                Safari'de <strong className="text-gold">Paylaş</strong> simgesine dokunun ve <strong className="text-gold">'Ana Ekrana Ekle'</strong>yi seçin.
              </span>
            </div>
            <button
              onClick={handleDismiss}
              className="w-full glass-card gold-border px-4 py-2 text-xs font-medium text-gold hover:bg-gold/10 transition-colors"
            >
              Anladım
            </button>
          </div>
        ) : (
          <button
            onClick={handleInstall}
            className="w-full glass-card gold-border px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium text-gold hover:bg-gold/10 transition-colors"
          >
            <Download className="w-4 h-4" />
            Yükle
          </button>
        )}
      </div>
    </div>
  );
};

export default InstallPrompt;
