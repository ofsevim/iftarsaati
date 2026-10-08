import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TURKEY_CITIES } from "@/data/cities";
import { fetchUpcomingRamadanPeriod } from "@/lib/prayer-api";

const timings = {
  Fajr: "05:00 (+03)", Sunrise: "06:30 (+03)", Dhuhr: "12:00 (+03)",
  Asr: "15:00 (+03)", Maghrib: "18:00 (+03)", Isha: "20:00 (+03)",
};

function row(year: number, month: number, day: number, hijriYear: number, hijriMonth: number) {
  return {
    date: {
      gregorian: { year: String(year), month: { number: month }, day: String(day) },
      hijri: { year: String(hijriYear), month: { number: hijriMonth }, day: "1" },
    },
    timings,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const match = url.match(/hijriCalendar\/(\d+)\/(\d+)/);
    const hijriYear = Number(match?.[1]);
    const month = Number(match?.[2]);
    const data = hijriYear === 1448
      ? month === 9 ? [row(2027, 2, 8, 1448, 9)] : [row(2027, 3, 10, 1448, 10)]
      : month === 9 ? [row(2028, 1, 28, 1449, 9)] : [row(2028, 2, 27, 1449, 10)];
    return { ok: true, json: async () => ({ data }) };
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Ramadan period selection", () => {
  it("chooses the nearest active or upcoming period and moves on after Eid", async () => {
    const city = TURKEY_CITIES.find((item) => item.name === "İstanbul")!;
    const early = await fetchUpcomingRamadanPeriod(city, new Date(2027, 0, 15));
    expect(early?.startDateKey).toBe("2027-02-08");

    const late = await fetchUpcomingRamadanPeriod(city, new Date(2027, 11, 15));
    expect(late?.startDateKey).toBe("2028-01-28");
  });

  it("continues to the next candidate when one calendar request fails", async () => {
    vi.useFakeTimers();
    const originalFetch = fetch as ReturnType<typeof vi.fn>;
    vi.stubGlobal("fetch", vi.fn((url: string) =>
      url.includes("/1448/9?")
        ? Promise.reject(new Error("calendar unavailable"))
        : originalFetch(url),
    ));
    const city = TURKEY_CITIES.find((item) => item.name === "İstanbul")!;
    const result = fetchUpcomingRamadanPeriod(city, new Date(2027, 11, 15));
    await vi.runAllTimersAsync();
    expect((await result)?.startDateKey).toBe("2028-01-28");
  });
});
