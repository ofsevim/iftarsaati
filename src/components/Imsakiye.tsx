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
  loading?: boolean;
  todayKey?: string;
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

const Imsakiye = ({ city, period: propPeriod, loading: propLoading, todayKey }: ImsakiyeProps) => {
  const [internalPeriod, setInternalPeriod] = useState<RamadanPeriod | null>(null);
  const [internalLoading, setInternalLoading] = useState(false);

  useEffect(() => {
    if (propPeriod !== undefined) return;
    let cancelled = false;

    const load = async () => {
      setInternalLoading(true);
      const data = await fetchUpcomingRamadanPeriod(city, new Date());
      if (!cancelled) {
        setInternalPeriod(data);
        setInternalLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [city, propPeriod]);

  const period = propPeriod !== undefined ? propPeriod : internalPeriod;
  const isLoading = propLoading ?? internalLoading;
  const days = period?.days ?? [];

  const todayStr = useMemo(() => {
    if (todayKey) return todayKey;
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }, [todayKey]);

  const prayerKeys: (keyof PrayerTimes)[] = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];

  const calculateBayramTime = (sunrise: string) => {
    const match = sunrise.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return "--:--";
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (h < 0 || h > 23 || m < 0 || m > 59) return "--:--";
    const totalMinutes = (h * 60 + m + 38) % (24 * 60);
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
    const year = period?.startDateKey.slice(0, 4) ?? "";
    const text = `${city.name} ${year} Ramazan İmsakiyesi ve İftar Vakitleri: https://iftarsaati.netlify.app/`;
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div id="imsakiye" className="w-full max-w-4xl mt-12 mb-8 print:m-0 print:max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="text-center sm:text-left">
          <h3 className="font-display text-xl md:text-2xl text-gold print:text-black">
            {city.name} - Ramazan İmsakiyesi
          </h3>
          {period && (
            <p className="text-xs sm:text-sm text-cream-muted mt-1 print:text-gray-700">
              {formatDateRangeLabel(period)}
            </p>
          )}
        </div>

        {period && days.length > 0 && (
          <div className="flex items-center justify-center sm:justify-end gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="glass-card gold-border px-3 py-2 flex items-center gap-1.5 text-xs text-cream-muted hover:text-gold transition-all touch-manipulation active:scale-95"
              title="İmsakiyeyi Yazdır"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Yazdır</span>
            </button>
            <button
              onClick={handleShare}
              className="glass-card gold-border px-3 py-2 flex items-center gap-1.5 text-xs text-cream-muted hover:text-gold transition-all touch-manipulation active:scale-95"
              title="WhatsApp ile Paylaş"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center text-cream-muted animate-pulse py-8">
          İmsakiye yükleniyor...
        </div>
      ) : !period || days.length === 0 ? (
        <div className="glass-card gold-border text-center text-cream-muted py-8 px-4">
          Bu şehir için Ramazan takvimi şu an alınamadı.
        </div>
      ) : (
        <div className="glass-card gold-border overflow-hidden print:overflow-visible print:bg-white print:border-gray-300 print:shadow-none">
          <div className="sm:hidden print:hidden text-right px-3 py-1 text-[10px] text-cream-muted/50 border-b border-white/5">
            ↔ Sağa/sola kaydırılabilir
          </div>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full min-w-[500px] print:min-w-0 text-xs md:text-sm border-collapse">
              <thead>
                <tr className="border-b print:border-gray-300" style={{ borderColor: "hsl(var(--gold) / 0.2)" }}>
                  <th className="sticky print:static left-0 print:left-auto z-20 print:z-auto bg-[#0d1319] print:bg-gray-100 print:text-black px-2 md:px-3 py-2 md:py-3 text-left text-gold-light font-display font-medium w-10 min-w-[2.5rem]">
                    Gün
                  </th>
                  <th className="sticky print:static left-10 print:left-auto z-20 print:z-auto bg-[#0d1319] print:bg-gray-100 print:text-black print:shadow-none px-2 md:px-3 py-2 md:py-3 text-left text-gold-light font-display font-medium border-r border-gold/20 print:border-gray-300 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                    Tarih
                  </th>
                  {prayerKeys.map((key) => (
                    <th key={key} className="px-1 sm:px-2 md:px-3 py-2 md:py-3 text-center text-gold-light print:bg-gray-100 print:text-black font-display font-medium">
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
                  ? "bg-[hsla(280,60%,50%,0.12)] print:bg-purple-50"
                  : isBayram
                    ? "bg-[hsla(36,55%,55%,0.15)] print:bg-amber-50"
                    : isToday
                      ? "bg-[hsla(36,55%,55%,0.12)] print:bg-amber-50"
                      : i % 2 === 0
                        ? "bg-transparent"
                        : "bg-[hsla(220,30%,15%,0.3)] print:bg-gray-50";

                const stickyBg = isKadirGecesi
                  ? "bg-[#1f152b] print:bg-transparent"
                  : isBayram
                    ? "bg-[#241d14] print:bg-transparent"
                    : isToday
                      ? "bg-[#241e12] print:bg-transparent"
                      : i % 2 === 0
                        ? "bg-[#0d1319] print:bg-transparent"
                        : "bg-[#121822] print:bg-transparent";

                const labelColor = isToday
                  ? "text-gold print:text-black print:font-bold"
                  : isKadirGecesi || isBayram
                    ? "text-gold-light print:text-black print:font-semibold"
                    : "text-cream-muted print:text-gray-700";
                const cellColor = isBayram
                  ? "text-gold font-bold print:text-black"
                  : isToday
                    ? "text-gold font-semibold print:text-black"
                    : "text-cream print:text-black";

                return (
                  <tr
                    key={day.dateKey}
                    className={`border-b print:border-gray-200 transition-colors ${rowColor}`}
                    style={{ borderColor: "hsl(var(--gold) / 0.1)" }}
                  >
                    {isBayram ? (
                      <td colSpan={8} className="px-3 py-3 text-center">
                        <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6">
                          <div className="flex items-center gap-2.5 text-gold-light print:text-black font-display font-bold text-base md:text-xl transition-transform duration-300 hover:scale-105">
                            <Candy className="h-5 w-5 md:h-6 md:w-6" />
                            <span>{day.dateLabel} {getDayName(day.dateKey)} - Ramazan Bayramı</span>
                          </div>
                          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/15 print:bg-transparent border border-gold/40 print:border-gray-400 rounded-full animate-pulse-gold shadow-[0_0_15px_rgba(212,175,55,0.1)] print:shadow-none">
                            <span className="text-gold print:text-black font-bold text-sm md:text-base">
                              Bayram Namazı: {calculateBayramTime(day.times.Sunrise)}
                            </span>
                          </div>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className={`sticky print:static left-0 print:left-auto z-10 print:z-auto px-2 md:px-3 py-1.5 md:py-2.5 font-semibold ${stickyBg} ${labelColor} w-10 min-w-[2.5rem]`}>
                          {String(i + 1)}
                        </td>
                        <td className={`sticky print:static left-10 print:left-auto z-10 print:z-auto px-2 md:px-3 py-1.5 md:py-2.5 whitespace-nowrap border-r border-gold/20 print:border-gray-300 print:shadow-none shadow-[2px_0_5px_rgba(0,0,0,0.3)] ${stickyBg} ${labelColor}`}>
                          <div className="flex flex-col leading-none">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span>{day.dateLabel}</span>
                              {isKadirGecesi && (
                                <span className="inline-block px-1.5 py-0.5 text-[9px] font-semibold rounded bg-[hsla(280,60%,55%,0.25)] text-purple-200 border border-purple-400/30 print:bg-transparent print:text-black print:border-gray-400">
                                  Kadir Gecesi
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] md:text-[11px] opacity-60 font-normal print:opacity-100">{getDayName(day.dateKey)}</span>
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
        </div>
      )}
    </div>
  );
};

export default Imsakiye;
