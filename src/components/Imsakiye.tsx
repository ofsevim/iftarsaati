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
    <section id="imsakiye" aria-labelledby="imsakiye-title" className="w-full max-w-4xl mt-3 md:mt-8 mb-8 print:m-0 print:max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="text-center sm:text-left">
          <h3 id="imsakiye-title" className="font-display text-xl md:text-2xl text-gold print:text-black">
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
              className="glass-card gold-border min-h-11 px-3 py-2 flex items-center gap-1.5 text-sm text-cream-muted hover:text-gold transition-colors touch-manipulation"
              title="İmsakiyeyi Yazdır"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Yazdır</span>
            </button>
            <button
              onClick={handleShare}
              className="glass-card gold-border min-h-11 px-3 py-2 flex items-center gap-1.5 text-sm text-cream-muted hover:text-gold transition-colors touch-manipulation"
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
          <div className="sm:hidden print:hidden px-3 py-2 text-xs text-cream-muted border-b border-white/10">
            Tüm vakitler için tabloyu yatay kaydırın.
          </div>
          <div className="calendar-scroll overflow-x-auto print:overflow-visible" tabIndex={0} role="region" aria-label="İmsakiye tablosu">
            <table className="table-fixed w-full min-w-[500px] print:min-w-0 text-xs md:text-sm border-collapse">
              <colgroup>
                <col className="w-10" />
                <col className="w-[6.75rem] md:w-36" />
                <col span={6} />
              </colgroup>
              <thead>
                <tr className="border-b print:border-gray-300" style={{ borderColor: "hsl(var(--gold) / 0.2)" }}>
                  <th scope="col" className="sticky print:static left-0 print:left-auto z-20 print:z-auto bg-[#0d1319] print:bg-gray-100 print:text-black px-2 md:px-3 py-2 md:py-3 text-left text-gold-light font-display font-medium">
                    Gün
                  </th>
                  <th scope="col" className="sticky print:static left-10 print:left-auto z-20 print:z-auto bg-[#0d1319] print:bg-gray-100 print:text-black print:shadow-none px-2 md:px-3 py-2 md:py-3 text-left text-gold-light font-display font-medium border-r border-gold/20 print:border-gray-300 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                    Tarih
                  </th>
                  {prayerKeys.map((key) => (
                    <th key={key} scope="col" className="px-1 sm:px-2 md:px-3 py-2 md:py-3 text-center text-gold-light print:bg-gray-100 print:text-black font-display font-medium">
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
                      <td colSpan={8} className="py-3 text-center">
                        <div className="sticky left-0 max-w-[calc(100vw-var(--page-left)-var(--page-right)-2px)] sm:static sm:max-w-none print:static print:max-w-none px-3 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6">
                          <div className="flex items-center gap-2.5 text-gold-light print:text-black font-display font-bold text-base md:text-xl">
                            <Candy className="size-5 md:size-6 shrink-0" aria-hidden="true" />
                            <span>{day.dateLabel} {getDayName(day.dateKey)} - Ramazan Bayramı</span>
                          </div>
                          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/10 print:bg-transparent border border-gold/40 print:border-gray-400 rounded-full">
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
                        <th scope="row" className={`sticky print:static left-10 print:left-auto z-10 print:z-auto px-2 md:px-3 py-2 md:py-2.5 text-left font-medium border-r border-gold/20 print:border-gray-300 print:shadow-none shadow-[2px_0_5px_rgba(0,0,0,0.3)] ${stickyBg} ${labelColor}`}>
                          <div className="flex flex-col items-start leading-tight">
                            <time dateTime={day.dateKey}>{day.dateLabel}</time>
                            <span className="text-[11px] text-cream-muted font-normal print:text-gray-700">{getDayName(day.dateKey)}</span>
                            {isKadirGecesi && (
                              <span className="mt-1 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[hsla(280,60%,55%,0.25)] text-purple-200 border border-purple-400/30 print:bg-transparent print:text-black print:border-gray-400">
                                Kadir Gecesi
                              </span>
                            )}
                          </div>
                        </th>
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
    </section>
  );
};

export default Imsakiye;
