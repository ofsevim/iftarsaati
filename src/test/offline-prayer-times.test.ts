import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TURKEY_CITIES, type PrayerTimes } from "@/data/cities";
import { fetchMonthlyPrayerTimes, fetchPrayerTimesForDate } from "@/lib/prayer-api";

const city = TURKEY_CITIES.find((item) => item.name === "İstanbul")!;
const times: PrayerTimes = {
  Fajr: "05:00", Sunrise: "06:30", Dhuhr: "12:00",
  Asr: "15:00", Maghrib: "18:00", Isha: "20:00",
};

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 8, 12));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("offline prayer data", () => {
  it("uses exact-date cached times after the old 48-hour limit when offline", async () => {
    localStorage.setItem("daily_İstanbul_08-10-2026", JSON.stringify({
      data: times,
      ts: Date.now() - 72 * 60 * 60 * 1000,
    }));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const result = fetchPrayerTimesForDate(city, new Date(2026, 9, 8));
    await vi.runAllTimersAsync();
    expect(await result).toEqual(times);
  });

  it("stores monthly calendar days under their daily offline keys", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{
        date: {
          gregorian: { year: "2026", month: { number: 10 }, day: "9" },
          hijri: { year: "1448", month: { number: 4 }, day: "27" },
        },
        timings: Object.fromEntries(Object.entries(times).map(([key, value]) => [key, `${value} (+03)`])),
      }] }),
    }));

    await fetchMonthlyPrayerTimes(city, new Date(2026, 9, 9), new Date(2026, 9, 9));
    const cached = JSON.parse(localStorage.getItem("daily_İstanbul_09-10-2026") || "null");
    expect(cached?.data.Maghrib).toBe("18:00");
  });

  it("promotes a previously cached monthly calendar to daily offline keys", async () => {
    const dateKey = "2026-10-09";
    localStorage.setItem(`monthly_İstanbul_${dateKey}_${dateKey}`, JSON.stringify({
      data: [{ dateKey, dateLabel: "9 Ekim", times }],
      ts: Date.now(),
    }));

    await fetchMonthlyPrayerTimes(city, new Date(2026, 9, 9), new Date(2026, 9, 9));
    const cached = JSON.parse(localStorage.getItem("daily_İstanbul_09-10-2026") || "null");
    expect(cached?.data.Maghrib).toBe("18:00");
  });
});
