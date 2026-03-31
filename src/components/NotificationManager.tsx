import { useState, useEffect } from "react";
import { Bell, BellOff, X, BellRing } from "lucide-react";
import { fetchPrayerTimesForDate } from "@/lib/prayer-api";
import type { City, PrayerTimes } from "@/data/cities";
import { PRAYER_LABELS } from "@/data/cities";

type NotifPref = {
  enabled: boolean;
  minutes: Record<keyof PrayerTimes, number>;
};

const DEFAULT_PREF: NotifPref = {
  enabled: false,
  minutes: {
    Fajr: 30,
    Sunrise: 15,
    Dhuhr: 15,
    Asr: 15,
    Maghrib: 30,
    Isha: 15,
  },
};

function loadPref(): NotifPref {
  try {
    const raw = localStorage.getItem("notif-pref");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.iftarMinutes !== undefined) {
        return {
          ...DEFAULT_PREF,
          enabled: parsed.enabled,
          minutes: {
            ...DEFAULT_PREF.minutes,
            Maghrib: parsed.iftarMinutes,
            Fajr: parsed.sahurMinutes,
          }
        };
      }
      return { ...DEFAULT_PREF, ...parsed };
    }
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

async function buildNotifications(
  pref: NotifPref,
  city: City,
  todayTimes: PrayerTimes | undefined,
  isRamadan: boolean | undefined
): Promise<{ title: string; body: string; triggerAt: number }[]> {
  const notifications: { title: string; body: string; triggerAt: number }[] = [];
  const now = new Date();

  for (let i = 0; i < 3; i++) {
    const dayDate = new Date(now);
    dayDate.setDate(now.getDate() + i);

    let times: PrayerTimes | undefined | null;

    if (i === 0) {
      times = todayTimes;
    } else {
      try {
        times = await fetchPrayerTimesForDate(city, dayDate);
      } catch {
        continue;
      }
    }

    if (!times) continue;

    const keys = Object.keys(PRAYER_LABELS) as (keyof PrayerTimes)[];
    for (const key of keys) {
      const mins = pref.minutes[key];
      if (mins === -1) continue; // Bildirim kapalıysa bu vakti atla

      const timeStr = times[key];
      if (!timeStr) continue;

      const [h, m] = timeStr.split(":").map(Number);
      const prayerDate = new Date(dayDate);
      prayerDate.setHours(h, m, 0, 0);

      const triggerAt = prayerDate.getTime() - mins * 60 * 1000;

      if (triggerAt > now.getTime()) {
        const isIftar = key === "Maghrib";
        const isSahur = key === "Fajr";
        
        const label = isIftar && isRamadan ? "İftar" : isSahur && isRamadan ? "Sahur" : PRAYER_LABELS[key];
        let title = `${label} Vakti`;
        let body = `${city.name} için ${label.toLowerCase()} vaktine ${mins} dakika kaldı!`;

        if (isIftar && isRamadan) {
          title = "🌙 İftar Yaklaşıyor";
          body = `${city.name} için iftara ${mins} dakika kaldı!`;
        } else if (isSahur && isRamadan) {
          title = "🍽️ Sahur Vakti";
          body = `${city.name} için sahura (imsak) ${mins} dakika kaldı!`;
        }

        notifications.push({
          title,
          body,
          triggerAt,
        });
      }
    }
  }

  return notifications;
}

async function sendScheduleToSW(
  pref: NotifPref,
  city: City,
  todayTimes: PrayerTimes | undefined,
  isRamadan: boolean | undefined
): Promise<number> {
  const reg = await navigator.serviceWorker.ready;
  if (!reg.active) return 0;

  const notifications = await buildNotifications(pref, city, todayTimes, isRamadan);

  reg.active.postMessage({
    type: notifications.length > 0 ? "SCHEDULE_NOTIFICATIONS" : "CANCEL_NOTIFICATIONS",
    notifications,
  });

  return notifications.length;
}

async function sendTestNotification() {
  const reg = await navigator.serviceWorker.ready;
  if (!reg.active) return;
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
  prayerTimes?: PrayerTimes;
  city: City;
  isRamadan?: boolean;
}

const NotificationManager = ({ prayerTimes, city, isRamadan }: NotificationManagerProps) => {
  const [pref, setPref] = useState<NotifPref>(loadPref);
  const [showSettings, setShowSettings] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [scheduled, setScheduled] = useState<number>(0);
  const [permission, setPermission] = useState<NotificationPermission>(
    canNotify() ? Notification.permission : "denied"
  );

  useEffect(() => {
    if (!pref.enabled || permission !== "granted" || !canNotify()) return;

    let cancelled = false;
    sendScheduleToSW(pref, city, prayerTimes, isRamadan).then((count) => {
      if (!cancelled) setScheduled(count);
    });

    return () => { cancelled = true; };
  }, [pref, permission, prayerTimes, city, isRamadan]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handler = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PLAY_SOUND') {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(() => {});
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

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

  const updateMinutes = (key: keyof PrayerTimes, value: number) => {
    const newPref = {
      ...pref,
      minutes: { ...pref.minutes, [key]: value },
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
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {(Object.keys(PRAYER_LABELS) as (keyof PrayerTimes)[]).map((key) => (
                    <div key={key}>
                      <label className="text-xs text-cream-muted block mb-1">
                        {key === "Maghrib" && isRamadan ? "İftardan önce (dk)" : key === "Fajr" && isRamadan ? "Sahurdan önce (dk)" : `${PRAYER_LABELS[key]} Vaktinden önce (dk)`}
                      </label>
                      <select
                        value={pref.minutes[key]}
                        onChange={(e) => updateMinutes(key, Number(e.target.value))}
                        className="w-full bg-slate-900 border border-gold/30 rounded-lg px-2 py-1.5 text-sm text-cream outline-none cursor-pointer"
                        style={{ colorScheme: 'dark' }}
                      >
                        <option value={-1} className="bg-slate-900 text-cream">Bildirim Kapalı</option>
                        {[0, 5, 10, 15, 30, 45, 60].map((v) => (
                          <option key={v} value={v} className="bg-slate-900 text-cream">
                            {v === 0 ? "Tam vaktinde" : `${v} dakika önce`}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}



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
