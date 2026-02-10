import { useState, useEffect } from "react";
import { Candy } from "lucide-react";
import { City, PRAYER_LABELS, type PrayerTimes } from "@/data/cities";
import { fetchMonthlyPrayerTimes, type DailyPrayerTimes } from "@/lib/prayer-api";

interface ImsakiyeProps {
  city: City;
}

const RAMADAN_START = new Date(2026, 1, 18); // Feb 18, 2026
const RAMADAN_END = new Date(2026, 2, 20);   // Mar 20, 2026 (Bayram dahil)

// Kadir Gecesi: 27. gece (Ramazan'ın 27. günü = index 26)
const KADIR_GECESI_INDEX = 26;
// Ramazan Bayramı 1. gün: 20 Mart 2026 (index 30, 0-indexed)
const BAYRAM_INDEX = 30;

const Imsakiye = ({ city }: ImsakiyeProps) => {
  const [days, setDays] = useState<DailyPrayerTimes[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const data = await fetchMonthlyPrayerTimes(city, RAMADAN_START, RAMADAN_END);
      if (!cancelled) {
        setDays(data);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [city]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const prayerKeys: (keyof PrayerTimes)[] = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

  return (
    <div className="w-full max-w-4xl mt-12 mb-8">
      <h3 className="font-display text-xl md:text-2xl text-gold text-center mb-6">
        {city.name} — Ramazan İmsakiyesi 2026
      </h3>

      {loading ? (
        <div className="text-center text-cream-muted animate-pulse py-8">
          İmsakiye yükleniyor...
        </div>
      ) : (
        <div className="glass-card gold-border overflow-hidden">
          {/* Tablo — mobilde küçük font+padding ile tüm vakitler sığıyor */}
          <table className="w-full text-[10px] sm:text-xs md:text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "hsl(var(--gold) / 0.2)" }}>
                <th className="px-1 sm:px-1.5 md:px-3 py-1.5 md:py-3 text-left text-gold-light font-display">Gün</th>
                <th className="px-1 sm:px-1.5 md:px-3 py-1.5 md:py-3 text-left text-gold-light font-display">Tarih</th>
                {prayerKeys.map((key) => (
                  <th key={key} className="px-0.5 sm:px-1.5 md:px-3 py-1.5 md:py-3 text-center text-gold-light font-display">
                    {PRAYER_LABELS[key]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day, i) => {
                const isToday = day.dateKey === todayStr;
                const isKadirGecesi = i === KADIR_GECESI_INDEX;
                const isBayram = i === BAYRAM_INDEX;

                const dayLabel = String(i + 1);
                const dateLabel = day.dateLabel;

                const rowColor = isKadirGecesi
                  ? "bg-[hsla(280,60%,50%,0.12)]"
                  : isBayram
                    ? "bg-[hsla(120,50%,40%,0.1)]"
                    : isToday
                      ? "bg-[hsla(36,55%,55%,0.12)]"
                      : i % 2 === 0
                        ? "bg-transparent"
                        : "bg-[hsla(220,30%,15%,0.3)]";

                const labelColor = isToday ? "text-gold" : (isKadirGecesi || isBayram) ? "text-gold-light" : "text-cream-muted";

                const cellColor = () =>
                  isBayram ? "text-gold-light font-semibold" :
                    isToday ? "text-gold font-semibold" : "text-cream";

                return (
                  <tr
                    key={day.dateKey}
                    className={`border-b transition-colors ${rowColor}`}
                    style={{ borderColor: "hsl(var(--gold) / 0.1)" }}
                  >
                    <td className={`px-1 sm:px-1.5 md:px-3 py-1.5 md:py-2.5 font-semibold ${labelColor}`}>
                      {isBayram ? (
                        <span className="inline-flex items-center justify-center" aria-label="Bayram">
                          <Candy className="h-3 w-3 md:h-4 md:w-4 text-blue-400" aria-hidden="true" />
                        </span>
                      ) : dayLabel}
                    </td>
                    <td className={`px-1 sm:px-1.5 md:px-3 py-1.5 md:py-2.5 whitespace-nowrap ${labelColor}`}>
                      {dateLabel}
                    </td>
                    {prayerKeys.map((key) => (
                      <td
                        key={key}
                        className={`px-0.5 sm:px-1.5 md:px-3 py-1.5 md:py-2.5 text-center font-mono ${cellColor()}`}
                      >
                        {isBayram && key === "Sunrise" ? `🕌 ${day.times[key]}` : day.times[key]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Imsakiye;
