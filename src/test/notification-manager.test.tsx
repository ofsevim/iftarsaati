import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NotificationManager from "@/components/NotificationManager";
import { TURKEY_CITIES, type PrayerTimes } from "@/data/cities";
import { fetchPrayerTimesForDate } from "@/lib/prayer-api";

const native = vi.hoisted(() => ({
  scheduleReminders: vi.fn().mockResolvedValue(undefined),
  scheduleTestReminder: vi.fn().mockResolvedValue(undefined),
  cancelAll: vi.fn().mockResolvedValue(undefined),
  getStatus: vi.fn().mockResolvedValue({ permission: "granted", exactAlarmsSupported: true, exactAlarmsAllowed: true }),
  requestPermission: vi.fn(),
  openSettings: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { getPlatform: () => "android" },
  registerPlugin: () => native,
}));
vi.mock("@/lib/prayer-api", () => ({
  fetchPrayerTimesForDate: vi.fn(),
}));

const times: PrayerTimes = {
  Fajr: "05:00", Sunrise: "06:30", Dhuhr: "12:00",
  Asr: "15:00", Maghrib: "18:00", Isha: "20:00",
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("notif-pref", JSON.stringify({
    enabled: true,
    minutes: { Fajr: 30, Sunrise: 15, Dhuhr: 15, Asr: 15, Maghrib: 30, Isha: 15 },
  }));
  vi.clearAllMocks();
  vi.mocked(fetchPrayerTimesForDate).mockResolvedValue(times);
});

afterEach(() => vi.useRealTimers());

describe("native notifications", () => {
  it("sends a test alarm without replacing real reminders", async () => {
    render(<NotificationManager city={TURKEY_CITIES[0]} prayerTimes={times} />);
    fireEvent.click(screen.getByRole("button", { name: "Bildirim ayarlari" }));
    const testButton = await screen.findByRole("button", { name: "Test bildirimi gonder" });
    await waitFor(() => expect(native.scheduleReminders).toHaveBeenCalled());
    native.scheduleReminders.mockClear();

    fireEvent.click(testButton);

    await waitFor(() => expect(native.scheduleTestReminder).toHaveBeenCalledOnce());
    expect(native.scheduleReminders).not.toHaveBeenCalled();
  });

  it("renews the rolling schedule while the app remains open", async () => {
    vi.useFakeTimers();
    render(<NotificationManager city={TURKEY_CITIES[0]} prayerTimes={times} />);
    await act(async () => {});
    expect(native.scheduleReminders).toHaveBeenCalledOnce();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
    });
    expect(native.scheduleReminders).toHaveBeenCalledTimes(2);
  });

  it("keeps persisted alarms when prayer data is temporarily unavailable", async () => {
    vi.mocked(fetchPrayerTimesForDate).mockResolvedValue(null);
    render(<NotificationManager city={TURKEY_CITIES[0]} />);
    await act(async () => {});
    expect(native.getStatus).toHaveBeenCalled();
    expect(native.cancelAll).not.toHaveBeenCalled();
    expect(native.scheduleReminders).not.toHaveBeenCalled();
  });

  it("does not replace a complete schedule with a partial week", async () => {
    vi.mocked(fetchPrayerTimesForDate).mockResolvedValueOnce(null);
    render(<NotificationManager city={TURKEY_CITIES[0]} prayerTimes={times} />);
    await act(async () => {});
    expect(native.scheduleReminders).not.toHaveBeenCalled();
  });
});
