import { useState, useEffect } from "react";
import { Bell, BellOff, X, BellRing } from "lucide-react";

type NotifPref = {
  enabled: boolean;
  iftarMinutes: number;
  sahurMinutes: number;
};

const DEFAULT_PREF: NotifPref = {
  enabled: false,
  iftarMinutes: 30,
  sahurMinutes: 30,
};

function loadPref(): NotifPref {
  try {
    const raw = localStorage.getItem("notif-pref");
    if (raw) return { ...DEFAULT_PREF, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_PREF;
}

function savePref(pref: NotifPref) {
  try {
    localStorage.setItem("notif-pref", JSON.stringify(pref));
  } catch {}
}

function canNotify(): boolean {
  return "Notification" in window && "serviceWorker" in navigator;
}

/**
 * Vakit bilgisini Service Worker'a gönderir.
 */
async function sendScheduleToSW(
  pref: NotifPref,
  iftarTime: string | undefined,
  sahurTime: string | undefined,
  cityName: string
) {
  const reg = await navigator.serviceWorker.ready;
  if (!reg.active) return;

  const notifications: { title: string; body: string; triggerAt: number }[] = [];
  const now = new Date();

  const parseTimeToday = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d;
  };

  if (iftarTime) {
    const iftarDate = parseTimeToday(iftarTime);
    const triggerAt = iftarDate.getTime() - pref.iftarMinutes * 60 * 1000;
    if (triggerAt > now.getTime()) {
      notifications.push({
        title: "🌙 İftar Yaklaşıyor",
        body: `${cityName} için iftara ${pref.iftarMinutes} dakika kaldı!`,
        triggerAt,
      });
    }
  }

  if (sahurTime) {
    const sahurDate = parseTimeToday(sahurTime);
    // Sahur sabah erken — eğer şu an akşamsa yarına al
    if (sahurDate.getTime() <= now.getTime()) {
      sahurDate.setDate(sahurDate.getDate() + 1);
    }
    const triggerAt = sahurDate.getTime() - pref.sahurMinutes * 60 * 1000;
    if (triggerAt > now.getTime()) {
      notifications.push({
        title: "🍽️ Sahur Vakti",
        body: `${cityName} için sahura ${pref.sahurMinutes} dakika kaldı!`,
        triggerAt,
      });
    }
  }

  reg.active.postMessage({
    type: notifications.length > 0 ? "SCHEDULE_NOTIFICATIONS" : "CANCEL_NOTIFICATIONS",
    notifications,
  });

  return notifications.length;
}

async function sendTestNotification() {
  const reg = await navigator.serviceWorker.ready;
  if (!reg.active) return;
  // 3 saniye sonra test bildirimi
  reg.active.postMessage({
    type: "SCHEDULE_NOTIFICATIONS",
    notifications: [
      {
        title: "🌙 İftar Vakti — Test",
        body: "Bildirimler çalışıyor! Vakti gelince bildirim alacaksınız.",
        triggerAt: Date.now() + 3000,
      },
    ],
  });
}

function cancelSWNotifications() {
  navigator.serviceWorker.ready.then((reg) => {
    reg.active?.postMessage({ type: "CANCEL_NOTIFICATIONS" });
  });
}

interface NotificationManagerProps {
  iftarTime?: string;
  sahurTime?: string;
  cityName: string;
}

const NotificationManager = ({ iftarTime, sahurTime, cityName }: NotificationManagerProps) => {
  const [pref, setPref] = useState<NotifPref>(loadPref);
  const [showSettings, setShowSettings] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [scheduled, setScheduled] = useState<number>(0);
  const [permission, setPermission] = useState<NotificationPermission>(
    canNotify() ? Notification.permission : "denied"
  );

  // Vakit veya ayar değişince SW'ye yeni zamanlama gönder
  useEffect(() => {
    if (!pref.enabled || permission !== "granted" || !canNotify()) return;
    sendScheduleToSW(pref, iftarTime, sahurTime, cityName).then((count) => {
      setScheduled(count ?? 0);
    });
    return () => cancelSWNotifications();
  }, [pref, permission, iftarTime, sahurTime, cityName]);

  const handleToggle = async () => {
    if (!canNotify()) return;

    if (!pref.enabled) {
      if (Notification.permission === "default") {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== "granted") return;
      } else if (Notification.permission === "denied") {
        return;
      }
      const newPref = { ...pref, enabled: true };
      setPref(newPref);
      savePref(newPref);
    } else {
      const newPref = { ...pref, enabled: false };
      setPref(newPref);
      savePref(newPref);
      cancelSWNotifications();
      setScheduled(0);
    }
  };

  const handleTest = () => {
    sendTestNotification();
    setTestSent(true);
    setTimeout(() => setTestSent(false), 5000);
  };

  const updateMinutes = (type: "iftar" | "sahur", value: number) => {
    const newPref = {
      ...pref,
      [type === "iftar" ? "iftarMinutes" : "sahurMinutes"]: value,
    };
    setPref(newPref);
    savePref(newPref);
  };

  if (!canNotify()) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="glass-card gold-border p-2.5 flex items-center gap-1.5 text-xs transition-colors hover:text-gold"
        aria-label="Bildirim ayarları"
        title="Bildirim ayarları"
      >
        {pref.enabled ? (
          <Bell className="w-4 h-4 text-gold" />
        ) : (
          <BellOff className="w-4 h-4 text-cream-muted" />
        )}
      </button>

      {showSettings && (
        <div className="absolute top-full mt-2 right-0 w-72 bg-[#0d1217] backdrop-blur-xl rounded-2xl border gold-border p-4 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-cream">Bildirimler</span>
            <button onClick={() => setShowSettings(false)} className="text-cream-muted hover:text-gold">
              <X className="w-4 h-4" />
            </button>
          </div>

          {permission === "denied" ? (
            <p className="text-xs text-cream-muted">
              Bildirimler tarayıcı tarafından engellenmiş. Tarayıcı ayarlarından izin verin.
            </p>
          ) : (
            <>
              <button
                onClick={handleToggle}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm mb-3 transition-colors ${
                  pref.enabled
                    ? "bg-[hsl(36,55%,55%,0.15)] text-gold border border-[hsl(36,55%,55%,0.3)]"
                    : "bg-white/5 text-cream-muted border border-white/10"
                }`}
              >
                <span>{pref.enabled ? "Açık" : "Kapalı"}</span>
                <div
                  className={`w-8 h-4 rounded-full relative transition-colors ${
                    pref.enabled ? "bg-gold/40" : "bg-white/20"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${
                      pref.enabled ? "right-0.5 bg-gold" : "left-0.5 bg-white/50"
                    }`}
                  />
                </div>
              </button>

              {pref.enabled && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-cream-muted block mb-1">
                      İftardan önce (dk)
                    </label>
                    <select
                      value={pref.iftarMinutes}
                      onChange={(e) => updateMinutes("iftar", Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-cream outline-none"
                    >
                      {[5, 10, 15, 30, 45, 60].map((v) => (
                        <option key={v} value={v}>
                          {v} dakika
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-cream-muted block mb-1">
                      Sahurdan önce (dk)
                    </label>
                    <select
                      value={pref.sahurMinutes}
                      onChange={(e) => updateMinutes("sahur", Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-cream outline-none"
                    >
                      {[5, 10, 15, 30, 45, 60].map((v) => (
                        <option key={v} value={v}>
                          {v} dakika
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div className="text-[11px] text-cream-muted/60 pt-1">
                    {scheduled > 0
                      ? `✓ ${scheduled} bildirim zamanlandı`
                      : "Bugünkü vakitler geçmiş — yarın otomatik zamanlanacak"}
                  </div>

                  {/* Test button */}
                  <button
                    onClick={handleTest}
                    disabled={testSent}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-colors bg-white/5 border border-white/10 text-cream-muted hover:text-gold hover:border-[hsl(36,55%,55%,0.3)] disabled:opacity-50"
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    {testSent ? "3 saniye içinde gelecek..." : "Test Bildirimi Gönder"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationManager;
