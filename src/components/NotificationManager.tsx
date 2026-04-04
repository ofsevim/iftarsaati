import { useEffect, useState } from "react";
import { Bell, BellOff, X, BellRing } from "lucide-react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { fetchPrayerTimesForDate } from "@/lib/prayer-api";
import type { City, PrayerTimes } from "@/data/cities";
import { PRAYER_LABELS } from "@/data/cities";

type NotifPref = {
  enabled: boolean;
  minutes: Record<keyof PrayerTimes, number>;
};

type ScheduledNotification = {
  id: number;
  title: string;
  body: string;
  triggerAt: number;
  channel: "main" | "special" | "azan";
};

type ReminderSchedulerPlugin = {
  scheduleReminders(options: { notifications: ScheduledNotification[] }): Promise<void>;
  cancelAll(): Promise<void>;
};

const ReminderScheduler = registerPlugin<ReminderSchedulerPlugin>("ReminderScheduler");
const webTimerIds: number[] = [];

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

function isNativePlatform(): boolean {
  try {
    return Capacitor.getPlatform() !== "web";
  } catch {
    return false;
  }
}

function canNotifyOnWeb(): boolean {
  return "Notification" in window;
}

function canNotify(): boolean {
  return isNativePlatform() || canNotifyOnWeb();
}

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
          },
        };
      }
      return { ...DEFAULT_PREF, ...parsed };
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_PREF;
}

function savePref(pref: NotifPref) {
  try {
    localStorage.setItem("notif-pref", JSON.stringify(pref));
  } catch {
    // ignore storage errors
  }
}

function getPermissionState(): NotificationPermission {
  if (isNativePlatform()) {
    return "granted";
  }
  return canNotifyOnWeb() ? Notification.permission : "denied";
}

function createReminderId(dayDate: Date, prayerKey: keyof PrayerTimes): number {
  const keyIndex = (Object.keys(PRAYER_LABELS) as (keyof PrayerTimes)[]).indexOf(prayerKey);
  const yy = String(dayDate.getFullYear()).slice(-2);
  const mm = String(dayDate.getMonth() + 1).padStart(2, "0");
  const dd = String(dayDate.getDate()).padStart(2, "0");
  return Number(`${yy}${mm}${dd}${String(keyIndex).padStart(2, "0")}`);
}

async function buildNotifications(
  pref: NotifPref,
  city: City,
  todayTimes: PrayerTimes | undefined,
  isRamadan: boolean | undefined
): Promise<ScheduledNotification[]> {
  const notifications: ScheduledNotification[] = [];
  const now = new Date();
  const keys = Object.keys(PRAYER_LABELS) as (keyof PrayerTimes)[];

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(now);
    dayDate.setDate(now.getDate() + i);

    let times: PrayerTimes | undefined | null = todayTimes;
    if (i > 0) {
      try {
        times = await fetchPrayerTimesForDate(city, dayDate);
      } catch {
        times = null;
      }
    }

    if (!times) {
      continue;
    }

    for (const key of keys) {
      const mins = pref.minutes[key];
      if (mins === -1) {
        continue;
      }

      const timeStr = times[key];
      if (!timeStr) {
        continue;
      }

      const [h, m] = timeStr.split(":").map(Number);
      const prayerDate = new Date(dayDate);
      prayerDate.setHours(h, m, 0, 0);

      const triggerAt = prayerDate.getTime() - mins * 60 * 1000;
      if (triggerAt <= now.getTime()) {
        continue;
      }

      const isIftar = key === "Maghrib";
      const isSahur = key === "Fajr";
      const label = isIftar && isRamadan ? "Iftar" : isSahur && isRamadan ? "Sahur" : PRAYER_LABELS[key];

      let title = `${label} Vakti`;
      let body = `${city.name} icin ${label.toLowerCase()} vaktine ${mins} dakika kaldi.`;
      let channel: ScheduledNotification["channel"] = "main";

      if (isIftar && isRamadan) {
        title = "Iftar Yaklasiyor";
        body = `${city.name} icin iftara ${mins} dakika kaldi.`;
        channel = "special";
      } else if (isSahur && isRamadan) {
        title = "Sahur Vakti";
        body = `${city.name} icin sahura ${mins} dakika kaldi.`;
        channel = "special";
      }

      notifications.push({
        id: createReminderId(dayDate, key),
        title,
        body,
        triggerAt,
        channel,
      });
    }
  }

  return notifications;
}

async function scheduleNotifications(
  pref: NotifPref,
  city: City,
  todayTimes: PrayerTimes | undefined,
  isRamadan: boolean | undefined
): Promise<number> {
  const notifications = await buildNotifications(pref, city, todayTimes, isRamadan);

  if (isNativePlatform()) {
    if (notifications.length === 0) {
      await ReminderScheduler.cancelAll();
      return 0;
    }
    await ReminderScheduler.scheduleReminders({ notifications });
    return notifications.length;
  }

  webTimerIds.forEach((id) => window.clearTimeout(id));
  webTimerIds.length = 0;

  notifications.forEach((notification) => {
    const delay = notification.triggerAt - Date.now();
    if (delay <= 0) {
      return;
    }

    const timerId = window.setTimeout(() => {
      try {
        new Notification(notification.title, {
          body: notification.body,
          icon: "/icon-192.png",
          badge: "/favicon-48.png",
          tag: `${notification.id}-${notification.triggerAt}`,
          requireInteraction: true,
        });
      } catch (error) {
        console.error("Web bildirimi gosterilemedi:", error);
      }
    }, delay);

    webTimerIds.push(timerId);
  });

  return notifications.length;
}

async function sendTestNotification() {
  if (isNativePlatform()) {
    await ReminderScheduler.scheduleReminders({
      notifications: [
        {
          id: 99999901,
          title: "IftarSaati App Test",
          body: "Bildirimler calisiyor. Ayarli bildirimler de artik native olarak planlaniyor.",
          triggerAt: Date.now() + 3000,
          channel: "main",
        },
      ],
    });
    return;
  }

  window.setTimeout(() => {
    try {
      new Notification("IftarSaati App Test", {
        body: "Bildirimler calisiyor. Ayarli web bildirimleri de bu yolla tetiklenecek.",
        icon: "/icon-192.png",
        badge: "/favicon-48.png",
        tag: "web-test-notification",
        requireInteraction: true,
      });
    } catch (error) {
      console.error("Web test bildirimi gosterilemedi:", error);
    }
  }, 3000);
}

async function cancelScheduledNotifications() {
  if (isNativePlatform()) {
    await ReminderScheduler.cancelAll();
    return;
  }

  webTimerIds.forEach((id) => window.clearTimeout(id));
  webTimerIds.length = 0;
}

function playSound() {
  const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
  audio.play().catch((err) => {
    console.warn("Ses calma hatasi. Etkilesim gerekiyor:", err);
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
  const [permission, setPermission] = useState<NotificationPermission>(getPermissionState);

  useEffect(() => {
    if (!pref.enabled || permission !== "granted" || !canNotify()) {
      return;
    }

    let cancelled = false;

    scheduleNotifications(pref, city, prayerTimes, isRamadan)
      .then((count) => {
        if (!cancelled) {
          setScheduled(count);
        }
      })
      .catch((error) => {
        console.error("Bildirim planlama hatasi:", error);
        if (!cancelled) {
          setScheduled(0);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pref, permission, prayerTimes, city, isRamadan]);

  const handleToggle = async () => {
    if (!canNotify()) {
      return;
    }

    if (!pref.enabled) {
      if (!isNativePlatform()) {
        if (Notification.permission === "default") {
          const result = await Notification.requestPermission();
          setPermission(result);
          if (result !== "granted") {
            return;
          }
        } else if (Notification.permission === "denied") {
          return;
        }
      }

      const newPref = { ...pref, enabled: true };
      setPref(newPref);
      savePref(newPref);
      setPermission(getPermissionState());
    } else {
      const newPref = { ...pref, enabled: false };
      setPref(newPref);
      savePref(newPref);
      await cancelScheduledNotifications();
      setScheduled(0);
    }
  };

  const handleTest = async () => {
    if (!isNativePlatform()) {
      playSound();
    }
    await sendTestNotification();
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

  if (!canNotify()) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="glass-card gold-border p-2.5 flex items-center gap-1.5 text-xs transition-colors hover:text-gold"
        aria-label="Bildirim ayarlari"
        title="Bildirim ayarlari"
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
              Bildirim izni kapali. Telefon ayarlarindan izin vermeniz gerekiyor.
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
                <span>{pref.enabled ? "Acik" : "Kapali"}</span>
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
                        {key === "Maghrib" && isRamadan
                          ? "Iftardan once (dk)"
                          : key === "Fajr" && isRamadan
                            ? "Sahurdan once (dk)"
                            : `${PRAYER_LABELS[key]} vaktinden once (dk)`}
                      </label>
                      <select
                        value={pref.minutes[key]}
                        onChange={(e) => updateMinutes(key, Number(e.target.value))}
                        className="w-full bg-slate-900 border border-gold/30 rounded-lg px-2 py-1.5 text-sm text-cream outline-none cursor-pointer"
                        style={{ colorScheme: "dark" }}
                      >
                        <option value={-1} className="bg-slate-900 text-cream">Bildirim kapali</option>
                        {[0, 5, 10, 15, 30, 45, 60].map((v) => (
                          <option key={v} value={v} className="bg-slate-900 text-cream">
                            {v === 0 ? "Tam vaktinde" : `${v} dakika once`}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}

                  <div className="text-[11px] text-cream-muted/70">
                    Su an planlanan bildirim: {scheduled}
                  </div>

                  <button
                    onClick={handleTest}
                    disabled={testSent}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-colors bg-white/5 border border-white/10 text-cream-muted hover:text-gold hover:border-[hsl(36,55%,55%,0.3)] disabled:opacity-50"
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    {testSent ? "3 saniye icinde gelecek..." : "Test bildirimi gonder"}
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
