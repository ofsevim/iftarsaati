import { useState, useEffect, useMemo } from "react";
import { Moon } from "lucide-react";
import { TURKEY_CITIES, type City } from "@/data/cities";
import { usePrayerDay } from "@/hooks/use-prayer-day";
import { normalizeForSearch } from "@/lib/utils";
import { computeCountdown, type CountdownState } from "@/lib/prayer-countdown";

const INITIAL_COUNTDOWN: CountdownState = {
  hours: 0,
  minutes: 0,
  seconds: 0,
  passed: false,
  mode: "Maghrib",
  unavailable: false,
  isMaghribWindow: false,
};

/**
 * Minimal widget sayfası — iframe ile embed edilebilir.
 * URL: /widget?city=İstanbul
 * Arka plan transparan, sadece sayaç gösterir.
 */
const Widget = () => {
  const city: City = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const cityName = params.get("city")?.trim();
    const defaultCity = TURKEY_CITIES.find((c) => c.name === "İstanbul")!;
    if (!cityName) return defaultCity;
    const normalized = normalizeForSearch(cityName);
    return (
      TURKEY_CITIES.find((c) => normalizeForSearch(c.name) === normalized) ||
      defaultCity
    );
  }, []);

  useEffect(() => {
    document.body.classList.add("widget-mode");
    return () => document.body.classList.remove("widget-mode");
  }, []);

  const { prayerTimes, tomorrowFajr, isRamadan, loading } = usePrayerDay(city);
  const [countdown, setCountdown] = useState<CountdownState>(INITIAL_COUNTDOWN);

  useEffect(() => {
    if (!prayerTimes) return;
    const update = () => {
      setCountdown(
        computeCountdown({
          now: new Date(),
          prayerTimes,
          tomorrowFajr,
          targetMode: "next_prayer",
        })
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [prayerTimes, tomorrowFajr]);

  const pad = (n: number) => String(n).padStart(2, "0");

  const label = countdown.isMaghribWindow
    ? (isRamadan ? "Hayırlı İftarlar! 🌙" : "Akşam Vakti Girdi 🌙")
    : countdown.mode === "Fajr"
      ? (isRamadan ? "Sahur (İmsak) Vaktine Kalan" : "İmsak Vaktine Kalan")
      : countdown.mode === "Sunrise"
        ? "Güneşin Doğmasına Kalan"
        : countdown.mode === "Dhuhr"
          ? "Öğle Vaktine Kalan"
          : countdown.mode === "Asr"
            ? "İkindi Vaktine Kalan"
            : countdown.mode === "Maghrib"
              ? (isRamadan ? "İftar (Akşam) Vaktine Kalan" : "Akşam Vaktine Kalan")
              : countdown.mode === "Isha"
                ? "Yatsı Vaktine Kalan"
                : "Sonraki Vakte Kalan";

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent p-2">
      <div
        className="rounded-2xl border p-4 text-center w-full max-w-xs"
        style={{
          background: "rgba(15, 20, 25, 0.85)",
          borderColor: "hsla(36, 55%, 55%, 0.3)",
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
            Vakt-i Şerif
          </span>
        </div>

        {/* City */}
        <div className="text-xs mb-2" style={{ color: "hsl(40, 20%, 80%)" }}>
          {city.name}
        </div>

        {loading ? (
          <div className="text-xs py-3 animate-pulse" style={{ color: "hsl(40, 20%, 80%)" }}>
            Vakitler yükleniyor...
          </div>
        ) : !prayerTimes ? (
          <div className="text-xs py-3" style={{ color: "hsl(40, 20%, 80%)" }}>
            Vakit verileri alınamadı.
          </div>
        ) : (
          <>
            {/* Label */}
            <div className="text-xs mb-2" style={{ color: "hsl(36, 60%, 70%)" }}>
              {label}
            </div>

            {/* Countdown */}
            {!countdown.isMaghribWindow && (
              countdown.unavailable ? (
                <div className="text-xs py-1" style={{ color: "hsl(40, 20%, 80%)" }}>
                  Yarının imsak vakti bekleniyor
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1" role="timer" aria-live="polite">
                  <span
                    className="text-2xl font-bold tabular-nums"
                    style={{ color: "hsl(36, 60%, 70%)", fontFamily: "'Inter', sans-serif" }}
                  >
                    {pad(countdown.hours)}:{pad(countdown.minutes)}:{pad(countdown.seconds)}
                  </span>
                </div>
              )
            )}
          </>
        )}

        {/* Prayer times mini */}
        {prayerTimes && (
          <div className="flex justify-between mt-3 text-[10px]" style={{ color: "hsl(40, 20%, 80%)" }}>
            <div className="text-center">
              <div style={{ color: "hsl(36, 60%, 70%)" }}>{isRamadan ? "Sahur" : "İmsak"}</div>
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
              <div style={{ color: "hsl(36, 60%, 70%)" }}>{isRamadan ? "İftar" : "Akşam"}</div>
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
          Vakt-i Şerif
        </a>
      </div>
    </div>
  );
};

export default Widget;
