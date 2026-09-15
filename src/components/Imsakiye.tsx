import { useEffect, useMemo, useState } from "react";
import { Candy, Printer, Share2 } from "lucide-react";
import { City, PRAYER_LABELS, type PrayerTimes } from "@/data/cities";
import {
  fetchUpcomingRamadanPeriod,
  type DailyPrayerTimes,
  type RamadanPeriod,
} from "@/lib/prayer-api";

interface ImsakiyeProps {
  city: City;
  period?: RamadanPeriod | null;
}

function formatDateRangeLabel(period: RamadanPeriod): string {
  const [startYear, startMonth, startDay] = period.startDateKey.split("-").map(Number);
  const [endYear, endMonth, endDay] = period.bayramDateKey.split("-").map(Number);
  const start = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);
  const startLabel = start.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
  const endLabel = end.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  return `${startLabel} - ${endLabel}`;
}

const Imsakiye = ({ city, period: propPeriod }: ImsakiyeProps) => {
  const [internalPeriod, setInternalPeriod] = useState<RamadanPeriod | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (propPeriod !== undefined) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const data = await fetchUpcomingRamadanPeriod(city, new Date());
      if (!cancelled) {
        setInternalPeriod(data);
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [city, propPeriod]);

  const period = propPeriod !== undefined ? propPeriod : internalPeriod;
  const days = period?.days ?? [];

  const todayStr = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }, []);

  const prayerKeys: (keyof PrayerTimes)[] = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

  const calculateBayramTime = (sunrise: string) => {
    const [h, m] = sunrise.split(":").map(Number);
    const totalMinutes = h * 60 + m + 38;
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
  };

  const getDayName = (dateKey: string) => {
    const [y, m, d] = dateKey.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"][date.getDay()];
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    const text = `${city.name} 2026 Ramazan İmsakiyesi ve İftar Vakitleri: https://iftarsaati.netlify.app/`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="w-full max-w-4xl mt-12 mb-8 print:m-0 print:max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="text-center sm:text-left">
          <h3 className="font-display text-xl md:text-2xl text-gold">
            {city.name} - Ramazan İmsakiyesi
          </h3>
          {period && (
            <p className="text-xs sm:text-sm text-cream-muted mt-1">
              {formatDateRangeLabel(period)}
            </p>
          )}
        </div>

        {period && days.length > 0 && (
          <div className="flex items-center justify-center sm:justify-end gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="glass-card gold-border px-3 py-1.5 flex items-center gap-1.5 text-xs text-cream-muted hover:text-gold transition-colors"
              title="İmsakiyeyi Yazdır"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Yazdır</span>
            </button>
            <button
              onClick={handleShare}
              className="glass-card gold-border px-3 py-1.5 flex items-center gap-1.5 text-xs text-cream-muted hover:text-gold transition-colors"
              title="WhatsApp ile Paylaş"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center text-cream-muted animate-pulse py-8">
          İmsakiye yükleniyor...
        </div>
      ) : !period || days.length === 0 ? (
        <div className="glass-card gold-border text-center text-cream-muted py-8 px-4">
          Bu şehir için Ramazan takvimi şu an alınamadı.
        </div>
      ) : (
        <div className="glass-card gold-border overflow-hidden">
          <table className="w-full text-[10px] sm:text-xs md:text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "hsl(var(--gold) / 0.2)" }}>
                <th className="px-1 sm:px-1.5 md:px-3 py-1.5 md:py-3 text-left text-gold-light font-display font-medium">Gun</th>
                <th className="px-1 sm:px-1.5 md:px-3 py-1.5 md:py-3 text-left text-gold-light font-display font-medium">Tarih</th>
                {prayerKeys.map((key) => (
                  <th key={key} className="px-0.5 sm:px-1.5 md:px-3 py-1.5 md:py-3 text-center text-gold-light font-display font-medium">
                    {PRAYER_LABELS[key]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day: DailyPrayerTimes, i) => {
                const isToday = day.dateKey === todayStr;
                const isKadirGecesi = day.dateKey === period.kadirDateKey;
                const isBayram = day.dateKey === period.bayramDateKey;

                const rowColor = isKadirGecesi
                  ? "bg-[hsla(280,60%,50%,0.12)]"
                  : isBayram
                    ? "bg-[hsla(36,55%,55%,0.15)]"
                    : isToday
                      ? "bg-[hsla(36,55%,55%,0.12)]"
                      : i % 2 === 0
                        ? "bg-transparent"
                        : "bg-[hsla(220,30%,15%,0.3)]";

                const labelColor = isToday ? "text-gold" : (isKadirGecesi || isBayram) ? "text-gold-light" : "text-cream-muted";
                const cellColor = isBayram
                  ? "text-gold font-bold"
                  : isToday
                    ? "text-gold font-semibold"
                    : "text-cream";

                return (
                  <tr
                    key={day.dateKey}
                    className={`border-b transition-colors ${rowColor}`}
                    style={{ borderColor: "hsl(var(--gold) / 0.1)" }}
                  >
                    {isBayram ? (
                      <td colSpan={8} className="px-3 py-3 text-center">
                        <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6">
                          <div className="flex items-center gap-2.5 text-gold-light font-display font-bold text-base md:text-xl transition-transform duration-300 hover:scale-105">
                            <Candy className="h-5 w-5 md:h-6 md:w-6" />
                            <span>{day.dateLabel} {getDayName(day.dateKey)} - Ramazan Bayrami</span>
                          </div>
                          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/15 border border-gold/40 rounded-full animate-pulse-gold shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                            <span className="text-gold font-bold text-sm md:text-base">
                              Bayram Namazi: {calculateBayramTime(day.times.Sunrise)}
                            </span>
                          </div>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className={`px-1 sm:px-1.5 md:px-3 py-1.5 md:py-2.5 font-semibold ${labelColor}`}>
                          {String(i + 1)}
                        </td>
                        <td className={`px-1 sm:px-1.5 md:px-3 py-1.5 md:py-2.5 whitespace-nowrap ${labelColor}`}>
                          <div className="flex flex-col leading-none">
                            <span className="mb-0.5">{day.dateLabel}</span>
                            <span className="text-[10px] md:text-[11px] opacity-60 font-normal">{getDayName(day.dateKey)}</span>
                          </div>
                        </td>
                        {prayerKeys.map((key) => (
                          <td
                            key={key}
                            className={`px-0.5 sm:px-1.5 md:px-3 py-1.5 md:py-2.5 text-center font-mono ${cellColor}`}
                          >
                            {day.times[key]}
                          </td>
                        ))}
                      </>
                    )}
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
