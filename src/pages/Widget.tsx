import { useState, useEffect, useCallback } from "react";
import { Moon } from "lucide-react";
import { TURKEY_CITIES, type City, type PrayerTimes } from "@/data/cities";
import { fetchPrayerTimes, fetchPrayerTimesForDate, getTimeUntilIftarThenImsak } from "@/lib/prayer-api";

/**
 * Minimal widget sayfası — iframe ile embed edilebilir.
 * URL: /widget?city=İstanbul
 * Arka plan transparan, sadece sayaç gösterir.
 */
const Widget = () => {
  const params = new URLSearchParams(window.location.search);
  const cityName = params.get("city") || "İstanbul";
  const city: City = TURKEY_CITIES.find((c) => c.name === cityName) || TURKEY_CITIES.find((c) => c.name === "İstanbul")!;

  useEffect(() => {
    document.body.classList.add("widget-mode");
    return () => document.body.classList.remove("widget-mode");
  }, []);

  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [tomorrowFajr, setTomorrowFajr] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    passed: boolean;
    mode: "iftar" | "imsak";
  }>({ hours: 0, minutes: 0, seconds: 0, passed: false, mode: "iftar" });

  const loadTimes = useCallback(async () => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const [todayTimes, tomorrowTimes] = await Promise.all([
      fetchPrayerTimes(city),
      fetchPrayerTimesForDate(city, tomorrow),
    ]);
    if (todayTimes) setPrayerTimes(todayTimes);
    setTomorrowFajr(tomorrowTimes?.Fajr ?? null);
  }, [city]);

  useEffect(() => { loadTimes(); }, [loadTimes]);

  useEffect(() => {
    if (!prayerTimes) return;
    const update = () => {
      setCountdown(getTimeUntilIftarThenImsak(prayerTimes.Maghrib, tomorrowFajr ?? undefined, { todayFajrTime: prayerTimes.Fajr }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [prayerTimes, tomorrowFajr]);

  const pad = (n: number) => String(n).padStart(2, "0");

  const label =
    countdown.passed
      ? "Hayırlı İftarlar! 🌙"
      : countdown.mode === "imsak"
        ? "Sahura Kalan"
        : "İftara Kalan";

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent p-2">
      <div
        className="rounded-2xl border p-4 text-center w-full max-w-xs"
        style={{
          background: "rgba(15, 20, 25, 0.85)",
          borderColor: "hsl(36, 55%, 55%, 0.3)",
          boxShadow: "0 8px 32px rgba(20,20,20,0.4)",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <Moon className="w-4 h-4" style={{ color: "hsl(36, 55%, 55%)" }} />
          <span
            className="text-sm font-bold"
            style={{ color: "hsl(36, 55%, 55%)", fontFamily: "'Playfair Display', serif" }}
          >
            İftar Vakti
          </span>
        </div>

        {/* City */}
        <div className="text-xs mb-2" style={{ color: "hsl(40, 20%, 80%)" }}>
          {city.name}
        </div>

        {/* Label */}
        <div className="text-xs mb-2" style={{ color: "hsl(36, 60%, 70%)" }}>
          {label}
        </div>

        {/* Countdown */}
        {!countdown.passed && (
          <div className="flex items-center justify-center gap-1">
            <span
              className="text-2xl font-bold tabular-nums"
              style={{ color: "hsl(36, 60%, 70%)", fontFamily: "'Inter', sans-serif" }}
            >
              {pad(countdown.hours)}:{pad(countdown.minutes)}:{pad(countdown.seconds)}
            </span>
          </div>
        )}

        {/* Prayer times mini */}
        {prayerTimes && (
          <div className="flex justify-between mt-3 text-[10px]" style={{ color: "hsl(40, 20%, 80%)" }}>
            <div className="text-center">
              <div style={{ color: "hsl(36, 60%, 70%)" }}>İmsak</div>
              <div>{prayerTimes.Fajr}</div>
            </div>
            <div className="text-center">
              <div style={{ color: "hsl(36, 60%, 70%)" }}>Öğle</div>
              <div>{prayerTimes.Dhuhr}</div>
            </div>
            <div className="text-center">
              <div style={{ color: "hsl(36, 60%, 70%)" }}>İkindi</div>
              <div>{prayerTimes.Asr}</div>
            </div>
            <div className="text-center">
              <div style={{ color: "hsl(36, 60%, 70%)" }}>Akşam</div>
              <div>{prayerTimes.Maghrib}</div>
            </div>
          </div>
        )}

        {/* Branding */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-2 text-[9px] opacity-50 hover:opacity-80 transition-opacity"
          style={{ color: "hsl(36, 55%, 55%)" }}
        >
          iftarvakti.app
        </a>
      </div>
    </div>
  );
};

export default Widget;
