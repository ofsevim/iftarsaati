import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { computeCountdown, parsePrayerTimeOnDate } from "@/lib/prayer-countdown";
import { findNearestCity, getCurrentPrayer } from "@/lib/prayer-api";
import { TURKEY_CITIES, type PrayerTimes } from "@/data/cities";
import Imsakiye from "@/components/Imsakiye";
import Widget from "@/pages/Widget";

const sampleTimes: PrayerTimes = {
  Fajr: "05:00",
  Sunrise: "06:30",
  Dhuhr: "12:30",
  Asr: "15:45",
  Maghrib: "18:30",
  Isha: "19:50",
};

describe("prayer-countdown", () => {
  it("validates HH:MM strings strictly", () => {
    const base = new Date(2026, 2, 10);
    expect(parsePrayerTimeOnDate(base, "05:30")).toEqual(new Date(2026, 2, 10, 5, 30, 0, 0));
    expect(parsePrayerTimeOnDate(base, "24:00")).toBeNull();
    expect(parsePrayerTimeOnDate(base, "12:60")).toBeNull();
    expect(parsePrayerTimeOnDate(base, "invalid")).toBeNull();
  });

  it("shows Bayram celebration only in smart_iftar mode and normal next prayer in next_prayer mode", () => {
    const nowOnBayram = new Date(2026, 2, 20, 10, 0, 0);

    const smart = computeCountdown({
      now: nowOnBayram,
      prayerTimes: sampleTimes,
      tomorrowFajr: "04:58",
      targetMode: "smart_iftar",
      bayramDateKey: "2026-03-20",
    });
    expect(smart.mode).toBe("bayram");
    expect(smart.passed).toBe(true);
    expect(smart.unavailable).toBe(false);

    const next = computeCountdown({
      now: nowOnBayram,
      prayerTimes: sampleTimes,
      tomorrowFajr: "04:58",
      targetMode: "next_prayer",
      bayramDateKey: "2026-03-20",
    });
    expect(next.mode).toBe("Dhuhr");
    expect(next.passed).toBe(false);
    expect(next.hours).toBe(2);
    expect(next.minutes).toBe(30);
  });

  it("marks countdown unavailable instead of inventing +8h/+12h when tomorrowFajr is missing", () => {
    const lateNight = new Date(2026, 2, 10, 22, 0, 0);

    const smart = computeCountdown({
      now: lateNight,
      prayerTimes: sampleTimes,
      tomorrowFajr: null,
      targetMode: "smart_iftar",
    });
    expect(smart.unavailable).toBe(true);
    expect(smart.mode).toBe("Fajr");

    const next = computeCountdown({
      now: lateNight,
      prayerTimes: sampleTimes,
      tomorrowFajr: null,
      targetMode: "next_prayer",
    });
    expect(next.unavailable).toBe(true);
    expect(next.mode).toBe("Fajr");
  });

  it("handles invalid prayer times cleanly without NaN", () => {
    const result = computeCountdown({
      now: new Date(2026, 2, 10, 14, 0, 0),
      prayerTimes: { ...sampleTimes, Maghrib: "--:--" },
      tomorrowFajr: "05:00",
      targetMode: "smart_iftar",
    });
    expect(result.unavailable).toBe(true);
    expect(Number.isNaN(result.hours)).toBe(false);
  });

  it("exposes isMaghribWindow during the 4-minute iftar window", () => {
    const atMaghrib = new Date(2026, 2, 10, 18, 32, 0);

    const smart = computeCountdown({
      now: atMaghrib,
      prayerTimes: sampleTimes,
      tomorrowFajr: "04:58",
      targetMode: "smart_iftar",
    });
    expect(smart.isMaghribWindow).toBe(true);
    expect(smart.passed).toBe(true);

    const next = computeCountdown({
      now: atMaghrib,
      prayerTimes: sampleTimes,
      tomorrowFajr: "04:58",
      targetMode: "next_prayer",
    });
    expect(next.isMaghribWindow).toBe(true);
    expect(next.mode).toBe("Isha");
  });
});

describe("haversine & current prayer boundaries", () => {
  it("guards against empty city list in findNearestCity", () => {
    expect(() => findNearestCity(41, 29, [])).toThrow();
    expect(findNearestCity(38.4237, 27.1428, TURKEY_CITIES).name).toBe("İzmir");
  });

  it("computes active prayer across all time boundaries", () => {
    expect(getCurrentPrayer(sampleTimes, new Date(2026, 2, 10, 4, 30))).toBeNull();
    expect(getCurrentPrayer(sampleTimes, new Date(2026, 2, 10, 5, 0))).toBe("Fajr");
    expect(getCurrentPrayer(sampleTimes, new Date(2026, 2, 10, 14, 0))).toBe("Dhuhr");
    expect(getCurrentPrayer(sampleTimes, new Date(2026, 2, 10, 21, 0))).toBe("Isha");
  });
});

describe("Imsakiye component states", () => {
  it("shows loading state when loading prop is true", () => {
    render(<Imsakiye city={TURKEY_CITIES[0]} period={null} loading={true} />);
    expect(screen.getByText("İmsakiye yükleniyor...")).toBeInTheDocument();
  });

  it("renders Kadir Gecesi badge and Turkish Bayram labels", () => {
    render(
      <Imsakiye
        city={TURKEY_CITIES[0]}
        todayKey="2026-03-16"
        loading={false}
        period={{
          startDateKey: "2026-03-16",
          kadirDateKey: "2026-03-16",
          bayramDateKey: "2026-03-20",
          days: [
            { dateKey: "2026-03-16", dateLabel: "16 Mart", times: sampleTimes },
            { dateKey: "2026-03-20", dateLabel: "20 Mart", times: sampleTimes },
          ],
        }}
      />
    );
    expect(screen.getByText("Kadir Gecesi")).toBeInTheDocument();
    expect(screen.getByText(/Ramazan Bayramı/)).toBeInTheDocument();
    expect(screen.getByText(/Bayram Namazı: 07:08/)).toBeInTheDocument();
  });
});

describe("Widget page", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 10, 18, 32, 0));
    localStorage.clear();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/timings/")) {
        return {
          ok: true,
          json: async () => ({
            code: 200,
            data: {
              timings: sampleTimes,
              date: { hijri: { year: "1447", month: { number: 10, en: "Shawwal" }, day: "1" } },
            },
          }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ code: 200, data: [] }),
      } as Response;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    window.history.replaceState({}, "", "/");
  });

  it("matches Turkish city query case-insensitively and shows non-Ramadan maghrib message", async () => {
    window.history.replaceState({}, "", "/widget?city=izmir");

    render(<Widget />);
    await act(async () => {});
    expect(screen.getByText("İzmir")).toBeInTheDocument();
    expect(screen.getByText("Akşam Vakti Girdi 🌙")).toBeInTheDocument();
  });
});
