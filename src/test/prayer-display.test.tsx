import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Index from "@/pages/Index";
import type { PrayerTimes } from "@/data/cities";

const api = vi.hoisted(() => ({
  fetchPrayerTimes: vi.fn(),
  fetchPrayerTimesForDate: vi.fn(),
  fetchMonthlyPrayerTimes: vi.fn(),
  fetchUpcomingRamadanPeriod: vi.fn(),
}));

vi.mock("@/lib/prayer-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/prayer-api")>()),
  ...api,
}));
vi.mock("@/components/Imsakiye", () => ({
  default: ({ period }: { period: { startDateKey: string } | null }) =>
    <div data-testid="ramadan-period">{period?.startDateKey ?? "no period"}</div>,
}));
vi.mock("@/components/DailyContentCard", () => ({ default: () => null }));
vi.mock("@/components/NotificationManager", () => ({ default: () => null }));

const times = (maghrib: string): PrayerTimes => ({
  Fajr: "05:00", Sunrise: "06:30", Dhuhr: "12:00",
  Asr: "15:00", Maghrib: maghrib, Isha: "20:00",
});

beforeEach(() => {
  localStorage.clear();
  api.fetchUpcomingRamadanPeriod.mockResolvedValue(null);
  api.fetchPrayerTimesForDate.mockResolvedValue(times("18:01"));
  api.fetchMonthlyPrayerTimes.mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("prayer display", () => {
  it("does not label the previous city's times as the newly selected city", async () => {
    api.fetchPrayerTimes.mockImplementation((city: { name: string }) =>
      city.name === "İstanbul" ? Promise.resolve(times("18:00")) : new Promise(() => {}),
    );

    render(<Index />);
    expect(await screen.findByText("18:00")).toBeInTheDocument();
    await act(async () => {});

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Ankara" }));
    });
    expect(screen.queryByText("18:00")).not.toBeInTheDocument();
  });

  it("reloads today's times when a tab remains open across midnight", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 8, 23, 59, 50));
    api.fetchPrayerTimes.mockImplementation(() =>
      Promise.resolve(times(new Date().getDate() === 8 ? "18:00" : "18:10")),
    );

    render(<Index />);
    await act(async () => {});
    expect(screen.getByText("18:00")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(screen.getByText("18:10")).toBeInTheDocument();
  });

  it("ignores a slower response from a previously selected city", async () => {
    let resolveIstanbul!: (value: PrayerTimes) => void;
    api.fetchPrayerTimes.mockImplementation((city: { name: string }) =>
      city.name === "İstanbul"
        ? new Promise<PrayerTimes>((resolve) => { resolveIstanbul = resolve; })
        : Promise.resolve(times("19:00")),
    );

    render(<Index />);
    fireEvent.click(screen.getByRole("button", { name: "Ankara" }));
    expect(await screen.findByText("19:00")).toBeInTheDocument();
    await act(async () => resolveIstanbul(times("18:00")));
    expect(screen.queryByText("18:00")).not.toBeInTheDocument();
  });

  it("does not show the previous city's Ramadan period after a city switch", async () => {
    api.fetchPrayerTimes.mockResolvedValue(times("18:00"));
    api.fetchUpcomingRamadanPeriod.mockImplementation((city: { name: string }) =>
      city.name === "İstanbul"
        ? Promise.resolve({ startDateKey: "2027-02-08", bayramDateKey: "2027-03-10", days: [] })
        : new Promise(() => {}),
    );

    render(<Index />);
    expect(await screen.findByText("2027-02-08")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Ankara" }));
    });
    expect(screen.getByTestId("ramadan-period")).toHaveTextContent("no period");
  });
});
