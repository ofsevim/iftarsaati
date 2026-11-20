import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, X, BellRing } from "lucide-react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { fetchPrayerTimesForDate, type PrayerTimesWithMeta } from "@/lib/prayer-api";
import { formatLocalDateKey, parsePrayerTimeOnDate } from "@/lib/prayer-countdown";
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

type AppNotificationPermission = NotificationPermission | "default";

type ReminderSchedulerStatus = {
  permission: AppNotificationPermission;
  exactAlarmsSupported: boolean;
  exactAlarmsAllowed: boolean;
};

type NativeSettingsScreen = "notifications" | "exactAlarms";

type ReminderSchedulerPlugin = {
  scheduleReminders(options: {
    notifications: ScheduledNotification[];
    renewal: { city: string; lat: number; lng: number; minutes: NotifPref["minutes"] };
  }): Promise<void>;
  scheduleTestReminder(options: { notification: ScheduledNotification }): Promise<void>;
  cancelAll(): Promise<void>;
  getStatus(): Promise<ReminderSchedulerStatus>;
  requestPermission(): Promise<ReminderSchedulerStatus>;
  openSettings(options: { screen: NativeSettingsScreen }): Promise<{ opened: boolean; screen: NativeSettingsScreen }>;
};

const ReminderScheduler = registerPlugin<ReminderSchedulerPlugin>("ReminderScheduler");
const webTimerIds: number[] = [];
let webTestTimerId: number | null = null;
let scheduleEpoch = 0;

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
          enabled: Boolean(parsed.enabled),
          minutes: {
            ...DEFAULT_PREF.minutes,
            Maghrib: Number(parsed.iftarMinutes ?? DEFAULT_PREF.minutes.Maghrib),
            Fajr: Number(parsed.sahurMinutes ?? DEFAULT_PREF.minutes.Fajr),
          },
        };
      }
      return {
        ...DEFAULT_PREF,
        ...parsed,
        minutes: { ...DEFAULT_PREF.minutes, ...(parsed.minutes ?? {}) },
      };
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

function getWebPermissionState(): AppNotificationPermission {
  return canNotifyOnWeb() ? Notification.permission : "denied";
}

function createReminderId(dayDate: Date, prayerKey: keyof PrayerTimes): number {
  const keyIndex = (Object.keys(PRAYER_LABELS) as (keyof PrayerTimes)[]).indexOf(prayerKey);
  const yy = String(dayDate.getFullYear()).slice(-2);
  const mm = String(dayDate.getMonth() + 1).padStart(2, "0");
  const dd = String(dayDate.getDate()).padStart(2, "0");
  return Number(`${yy}${mm}${dd}${String(keyIndex).padStart(2, "0")}`);
}

function formatReminderMessage(
  city: City,
  key: keyof PrayerTimes,
  mins: number,
  dayIsRamadan: boolean | undefined
): { title: string; body: string; channel: ScheduledNotification["channel"] } {
  const isIftar = key === "Maghrib";
  const isSahur = key === "Fajr";

  if (isIftar && dayIsRamadan) {
    return {
      title: mins === 0 ? "İftar Vakti" : "İftar Yaklaşıyor",
      body: mins === 0
        ? `${city.name} için iftar vakti girdi.`
        : `${city.name} için iftara ${mins} dakika kaldı.`,
      channel: "special",
    };
  }

  if (isSahur && dayIsRamadan) {
    return {
      title: "Sahur Vakti",
      body: mins === 0
        ? `${city.name} için sahur vakti girdi.`
        : `${city.name} için sahura ${mins} dakika kaldı.`,
      channel: "special",
    };
  }

  const label = PRAYER_LABELS[key];
  const lowerLabel = label.toLocaleLowerCase("tr-TR");
  return {
    title: `${label} Vakti`,
    body: mins === 0
      ? `${city.name} için ${lowerLabel} vakti girdi.`
      : `${city.name} için ${lowerLabel} vaktine ${mins} dakika kaldı.`,
    channel: "main",
  };
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
      return [];
    }

    for (const key of keys) {
      const mins = pref.minutes[key];
      if (!Number.isFinite(mins) || mins < 0) {
        continue;
      }

      const prayerDate = parsePrayerTimeOnDate(dayDate, times[key]);
      if (!prayerDate) {
        continue;
      }

      const triggerAt = prayerDate.getTime() - mins * 60 * 1000;
      if (triggerAt <= now.getTime()) {
        continue;
      }

      const dayIsRamadan = i === 0 ? isRamadan : (times as PrayerTimesWithMeta).hijri?.isRamadan ?? isRamadan;
      const { title, body, channel } = formatReminderMessage(city, key, mins, dayIsRamadan);

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
  isRamadan: boolean | undefined,
  isCurrent: () => boolean
): Promise<number | null> {
  const notifications = await buildNotifications(pref, city, todayTimes, isRamadan);
  if (!isCurrent()) return null;

  if (notifications.length === 0) {
    if (Object.values(pref.minutes).every((minutes) => minutes < 0)) {
      await cancelScheduledNotifications();
      return 0;
    }
    return null;
  }

  if (isNativePlatform()) {
    await ReminderScheduler.scheduleReminders({
      notifications,
      renewal: { city: city.name, lat: city.lat, lng: city.lng, minutes: pref.minutes },
    });
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
        console.error("Web bildirimi gösterilemedi:", error);
      }
    }, delay);

    webTimerIds.push(timerId);
  });

  return notifications.length;
}

async function sendTestNotification() {
  if (isNativePlatform()) {
    await ReminderScheduler.scheduleTestReminder({
      notification: {
        id: 99999901,
        title: "Vakt-i Şerif Test",
        body: "Bildirimler çalışıyor.",
        triggerAt: Date.now() + 3000,
        channel: "main",
      },
    });
    return;
  }

  if (webTestTimerId !== null) {
    window.clearTimeout(webTestTimerId);
  }
  webTestTimerId = window.setTimeout(() => {
    webTestTimerId = null;
    try {
      new Notification("Vakt-i Şerif Test", {
        body: "Bildirimler çalışıyor. Ayarlı web bildirimleri de bu yolla tetiklenecek.",
        icon: "/icon-192.png",
        badge: "/favicon-48.png",
        tag: "web-test-notification",
        requireInteraction: true,
      });
    } catch (error) {
      console.error("Web test bildirimi gösterilemedi:", error);
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
  const [testError, setTestError] = useState<string | null>(null);
  const [scheduled, setScheduled] = useState<number>(0);
  const [permission, setPermission] = useState<AppNotificationPermission | null>(() =>
    isNativePlatform() ? null : getWebPermissionState()
  );
  const [schedulerStatus, setSchedulerStatus] = useState<ReminderSchedulerStatus | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const lastScheduledDateRef = useRef<string>("");
  const lastRenewAtRef = useRef<number>(0);
  const testSentTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (testSentTimerRef.current !== null) {
        window.clearTimeout(testSentTimerRef.current);
      }
      if (webTestTimerId !== null) {
        window.clearTimeout(webTestTimerId);
        webTestTimerId = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!showSettings) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowSettings(false);
        settingsButtonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showSettings]);

  useEffect(() => {
    let cancelled = false;

    const syncPermission = async () => {
      if (isNativePlatform()) {
        try {
          const status = await ReminderScheduler.getStatus();
          if (!cancelled) {
            setSchedulerStatus(status);
            setPermission(status.permission);
          }
        } catch (error) {
          console.error("Native bildirim durumu alınamadı:", error);
          if (!cancelled) {
            setSchedulerStatus(null);
            setPermission("default");
          }
        }
        return;
      }

      if (!cancelled) {
        setPermission(getWebPermissionState());
      }
    };

    const handleVisibilityOrFocus = () => {
      if (!document.hidden) {
        void syncPermission();
      }
    };

    void syncPermission();
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, []);

  useEffect(() => {
    if (permission === null) return;
    if (!pref.enabled || permission !== "granted" || !canNotify()) {
      scheduleEpoch++;
      lastScheduledDateRef.current = "";
      lastRenewAtRef.current = 0;
      void cancelScheduledNotifications().catch((error) => {
        console.error("Bildirim iptal hatası:", error);
      });
      setScheduled(0);
      return;
    }

    let cancelled = false;
    const renew = () => {
      const epoch = ++scheduleEpoch;
      const isCurrent = () => !cancelled && epoch === scheduleEpoch;
      lastScheduledDateRef.current = formatLocalDateKey(new Date());
      lastRenewAtRef.current = Date.now();
      scheduleNotifications(pref, city, prayerTimes, isRamadan, isCurrent)
        .then((count) => {
          if (isCurrent() && count !== null) setScheduled(count);
        })
        .catch((error) => {
          console.error("Bildirim planlama hatası:", error);
          if (isCurrent()) setScheduled(0);
        });
    };
    renew();
    const refreshTimer = window.setInterval(renew, 24 * 60 * 60 * 1000);
    const refreshWhenVisible = () => {
      if (document.hidden) return;
      const todayKey = formatLocalDateKey(new Date());
      const elapsed = Date.now() - lastRenewAtRef.current;
      if (todayKey !== lastScheduledDateRef.current || elapsed >= 60 * 60 * 1000) {
        renew();
      }
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);

    return () => {
      cancelled = true;
      scheduleEpoch++;
      window.clearInterval(refreshTimer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  }, [pref, permission, prayerTimes, city, isRamadan]);

  const handleToggle = async () => {
    if (!canNotify()) {
      return;
    }

    if (!pref.enabled) {
      if (isNativePlatform()) {
        try {
          const status = await ReminderScheduler.requestPermission();
          setSchedulerStatus(status);
          setPermission(status.permission);

          if (status.permission !== "granted") {
            return;
          }
        } catch (error) {
          console.error("Native bildirim izni alınamadı:", error);
          return;
        }
      } else {
        try {
          if (Notification.permission === "default") {
            const result = await Notification.requestPermission();
            setPermission(result);
            if (result !== "granted") {
              return;
            }
          } else if (Notification.permission === "denied") {
            return;
          }
        } catch {
          return;
        }
      }

      const newPref = { ...pref, enabled: true };
      setPref(newPref);
      savePref(newPref);
    } else {
      const newPref = { ...pref, enabled: false };
      setPref(newPref);
      savePref(newPref);
      try {
        await cancelScheduledNotifications();
      } catch (error) {
        console.error("Bildirim iptal hatası:", error);
      }
      setScheduled(0);
    }
  };

  const handleTest = async () => {
    if (permission !== "granted") {
      setTestError("Önce bildirim izni vermeniz gerekiyor.");
      return;
    }
    setTestError(null);
    if (!isNativePlatform()) {
      playSound();
    }
    try {
      await sendTestNotification();
      setTestSent(true);
      if (testSentTimerRef.current !== null) {
        window.clearTimeout(testSentTimerRef.current);
      }
      testSentTimerRef.current = window.setTimeout(() => {
        setTestSent(false);
        testSentTimerRef.current = null;
      }, 5000);
    } catch (error) {
      console.error("Test bildirimi gönderilemedi:", error);
      setTestError("Test bildirimi planlanamadı.");
    }
  };

  const handleOpenNativeSettings = async (screen: NativeSettingsScreen) => {
    if (!isNativePlatform()) {
      return;
    }

    try {
      await ReminderScheduler.openSettings({ screen });
    } catch (error) {
      console.error("Native ayarlar açılamadı:", error);
    }
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
    <div
      className="notification-control"
      ref={containerRef}
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
          setShowSettings(false);
        }
      }}
    >
      <button
        ref={settingsButtonRef}
        onClick={() => setShowSettings(!showSettings)}
        aria-expanded={showSettings}
        aria-controls={showSettings ? "notification-settings" : undefined}
        className="col-start-3 row-start-1 glass-card size-11 grid place-items-center hover:text-gold touch-manipulation"
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
        <section
          id="notification-settings"
          aria-label="Bildirim ayarları"
          className="notification-control-panel col-span-full row-start-2 min-w-0 bg-popover rounded-2xl border p-3 sm:p-4 shadow-xl z-50"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-cream">Bildirimler</span>
            <button
              onClick={() => {
                setShowSettings(false);
                settingsButtonRef.current?.focus();
              }}
              className="size-11 shrink-0 rounded-xl text-cream-muted hover:text-gold transition-colors touch-manipulation grid place-items-center"
              aria-label="Bildirim ayarlarını kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {permission === "denied" ? (
            <div className="space-y-3">
              <p className="text-xs text-cream-muted">
                Bildirim izni kapalı. Cihaz veya tarayıcı ayarlarından izin vermeniz gerekiyor.
              </p>

              {isNativePlatform() && (
                <button
                  onClick={() => void handleOpenNativeSettings("notifications")}
                  className="w-full min-h-11 rounded-xl border bg-muted px-3 py-2 text-xs text-cream-muted transition-colors hover:border-gold/40 hover:text-gold"
                >
                  Bildirim ayarlarını aç
                </button>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={handleToggle}
                role="switch"
                aria-checked={pref.enabled}
                aria-label="Vakit bildirimleri"
                className={`w-full min-h-11 flex items-center justify-between px-3 py-2 rounded-xl border text-sm mb-3 transition-colors ${
                  pref.enabled
                    ? "bg-selection text-gold border-gold/40"
                    : "bg-muted text-cream-muted"
                }`}
              >
                <span>{pref.enabled ? "Açık" : "Kapalı"}</span>
                <div
                  className={`w-8 h-4 rounded-full relative transition-colors ${
                    pref.enabled ? "bg-gold/40" : "bg-foreground/20"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${
                      pref.enabled ? "right-0.5 bg-gold" : "left-0.5 bg-muted-foreground"
                    }`}
                  />
                </div>
              </button>

              {pref.enabled && (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {(Object.keys(PRAYER_LABELS) as (keyof PrayerTimes)[]).map((key) => (
                    <div key={key}>
                      <label htmlFor={`notification-minutes-${key}`} className="text-xs text-cream-muted block mb-1">
                        {key === "Maghrib" && isRamadan
                          ? "İftardan önce (dk)"
                          : key === "Fajr" && isRamadan
                            ? "Sahurdan önce (dk)"
                            : `${PRAYER_LABELS[key]} vaktinden önce (dk)`}
                      </label>
                      <select
                        id={`notification-minutes-${key}`}
                        value={pref.minutes[key]}
                        onChange={(e) => updateMinutes(key, Number(e.target.value))}
                        className="w-full min-h-11 bg-card border rounded-lg px-2 py-1.5 text-base text-cream cursor-pointer"
                      >
                        <option value={-1}>Bildirim kapalı</option>
                        {[0, 5, 10, 15, 30, 45, 60].map((v) => (
                          <option key={v} value={v}>
                            {v === 0 ? "Tam vaktinde" : `${v} dakika önce`}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}

                  <div className="text-xs text-cream-muted">
                    Şu an planlanan bildirim: {scheduled}
                  </div>

                  {!isNativePlatform() && (
                    <div className="text-xs text-cream-muted">
                      Tarayıcıda planlı bildirimler sekme uyursa veya kapanırsa aksayabilir.
                    </div>
                  )}

                  {isNativePlatform() && schedulerStatus?.exactAlarmsSupported && !schedulerStatus.exactAlarmsAllowed && (
                    <div className="space-y-2">
                      <div className="text-xs text-warning">
                        Android tam-zaman alarm izni kapalıysa bildirimler birkaç dakika gecikebilir.
                      </div>
                      <button
                        onClick={() => void handleOpenNativeSettings("exactAlarms")}
                        className="w-full min-h-11 rounded-xl border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning transition-colors hover:border-warning/60"
                      >
                        Tam-zaman alarm ayarını aç
                      </button>
                    </div>
                  )}

                  {testError && (
                    <div className="text-xs text-destructive" role="alert">
                      {testError}
                    </div>
                  )}

                  <button
                    onClick={handleTest}
                    disabled={testSent}
                    className="w-full min-h-11 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs transition-colors bg-muted border text-cream-muted hover:text-gold hover:border-gold/40 disabled:opacity-50"
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    {testSent ? "3 saniye içinde gelecek..." : "Test bildirimi gönder"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
};

export default NotificationManager;
