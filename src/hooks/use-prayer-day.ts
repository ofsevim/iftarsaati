import { useEffect, useState } from "react";
import type { City } from "@/data/cities";
import {
  fetchPrayerTimes,
  fetchPrayerTimesForDate,
  fetchMonthlyPrayerTimes,
  type PrayerTimesWithMeta,
} from "@/lib/prayer-api";

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

type PrayerDay = {
  key: string;
  times: PrayerTimesWithMeta | null;
  tomorrowFajr: string | null;
};

export function usePrayerDay(city: City) {
  const [dateKey, setDateKey] = useState(() => localDateKey(new Date()));
  const [day, setDay] = useState<PrayerDay | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refreshDate = () => {
      const now = new Date();
      setDateKey(localDateKey(now));
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      timer = setTimeout(refreshDate, Math.max(1, nextMidnight.getTime() - now.getTime()));
    };
    const refreshWhenVisible = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        refreshDate();
      }
    };
    refreshDate();
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  }, []);

  const key = `${city.name}:${dateKey}`;
  useEffect(() => {
    let cancelled = false;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    Promise.all([fetchPrayerTimes(city), fetchPrayerTimesForDate(city, tomorrow)])
      .then(([times, nextDay]) => {
        if (!cancelled) {
          setDay({ key, times, tomorrowFajr: nextDay?.Fajr ?? null });
        }
      })
      .catch((error) => {
        console.error("Namaz vakitleri yüklenemedi:", error);
        if (!cancelled) setDay({ key, times: null, tomorrowFajr: null });
      });

    return () => { cancelled = true; };
  }, [city, dateKey, key]);

  useEffect(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 30);
    void fetchMonthlyPrayerTimes(city, start, end).catch((error) => {
      console.warn("Çevrimdışı takvim önbelleğe alınamadı:", error);
    });
  }, [city, dateKey]);

  const currentDay = day?.key === key ? day : null;
  return {
    dateKey,
    prayerTimes: currentDay?.times ?? null,
    tomorrowFajr: currentDay?.tomorrowFajr ?? null,
    isRamadan: currentDay?.times?.hijri?.isRamadan ?? false,
    loading: currentDay === null,
  };
}
