import type { PrayerTimes } from "@/data/cities";

export type CountdownMode = "Fajr" | "Sunrise" | "Dhuhr" | "Asr" | "Maghrib" | "Isha" | "bayram";
export type CountdownTarget = "smart_iftar" | "next_prayer";

export interface CountdownState {
  hours: number;
  minutes: number;
  seconds: number;
  passed: boolean;
  mode: CountdownMode;
  unavailable: boolean;
  isMaghribWindow: boolean;
}

export function formatLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parsePrayerTimeOnDate(base: Date, timeStr: string | null | undefined): Date | null {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), hours, minutes, 0, 0);
}

export function computeCountdown({
  now,
  prayerTimes,
  tomorrowFajr,
  targetMode,
  bayramDateKey,
}: {
  now: Date;
  prayerTimes: PrayerTimes;
  tomorrowFajr: string | null;
  targetMode: CountdownTarget;
  bayramDateKey?: string | null;
}): CountdownState {
  const fajrToday = parsePrayerTimeOnDate(now, prayerTimes.Fajr);
  const maghribToday = parsePrayerTimeOnDate(now, prayerTimes.Maghrib);

  const maghribEnd = maghribToday ? new Date(maghribToday.getTime() + 4 * 60 * 1000) : null;
  const isMaghribWindow = Boolean(
    maghribToday &&
      maghribEnd &&
      now.getTime() >= maghribToday.getTime() &&
      now.getTime() <= maghribEnd.getTime()
  );

  if (bayramDateKey && formatLocalDateKey(now) === bayramDateKey && targetMode === "smart_iftar") {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      passed: true,
      mode: "bayram",
      unavailable: false,
      isMaghribWindow,
    };
  }

  if (!fajrToday || !maghribToday || !maghribEnd) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      passed: false,
      mode: "Maghrib",
      unavailable: true,
      isMaghribWindow: false,
    };
  }

  if (targetMode === "smart_iftar" && isMaghribWindow) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      passed: true,
      mode: "Maghrib",
      unavailable: false,
      isMaghribWindow: true,
    };
  }

  let targetTime: Date | null = null;
  let mode: CountdownMode = "Maghrib";

  if (targetMode === "smart_iftar") {
    if (now.getTime() < fajrToday.getTime()) {
      targetTime = fajrToday;
      mode = "Fajr";
    } else if (now.getTime() < maghribToday.getTime()) {
      targetTime = maghribToday;
      mode = "Maghrib";
    } else {
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      targetTime = parsePrayerTimeOnDate(tomorrow, tomorrowFajr);
      mode = "Fajr";
    }
  } else {
    const prayers: { name: Exclude<CountdownMode, "bayram">; time: Date | null }[] = [
      { name: "Fajr", time: fajrToday },
      { name: "Sunrise", time: parsePrayerTimeOnDate(now, prayerTimes.Sunrise) },
      { name: "Dhuhr", time: parsePrayerTimeOnDate(now, prayerTimes.Dhuhr) },
      { name: "Asr", time: parsePrayerTimeOnDate(now, prayerTimes.Asr) },
      { name: "Maghrib", time: maghribToday },
      { name: "Isha", time: parsePrayerTimeOnDate(now, prayerTimes.Isha) },
    ];

    const nextPrayer = prayers.find((p) => p.time !== null && p.time.getTime() > now.getTime());
    if (nextPrayer && nextPrayer.time) {
      targetTime = nextPrayer.time;
      mode = nextPrayer.name;
    } else {
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      targetTime = parsePrayerTimeOnDate(tomorrow, tomorrowFajr);
      mode = "Fajr";
    }
  }

  if (!targetTime) {
    return {
      hours: 0,
      minutes: 0,
      seconds: 0,
      passed: false,
      mode,
      unavailable: true,
      isMaghribWindow,
    };
  }

  const diff = Math.max(0, targetTime.getTime() - now.getTime());
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    passed: false,
    mode,
    unavailable: false,
    isMaghribWindow,
  };
}
