import { useMemo, useState, useRef, useEffect } from "react";
import { BookOpen, Scroll } from "lucide-react";
import { DAILY_DUAS, type DailyContentItem } from "@/data/daily-content";
import { fetchDailyAyah, type AyahData } from "@/lib/quran-api";
import { formatLocalDateKey } from "@/lib/prayer-countdown";

function parseDateKey(key: string): Date {
  const parts = key.split("-").map(Number);
  if (parts.length === 3 && parts.every(Number.isFinite)) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date();
}

function getDailyIndex(now: Date, size: number): number {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const seed = y * 10000 + m * 100 + d;
  return size === 0 ? 0 : seed % size;
}

const TABS = ["dua", "ayet"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  dua: "Günün Duası",
  ayet: "Günün Ayeti",
};

interface DailyContentCardProps {
  dateKey?: string;
}

const DailyContentCard = ({ dateKey }: DailyContentCardProps) => {
  const [internalDateKey, setInternalDateKey] = useState(() => formatLocalDateKey(new Date()));
  const effectiveDateKey = dateKey || internalDateKey;
  const currentDate = useMemo(() => parseDateKey(effectiveDateKey), [effectiveDateKey]);

  const [tab, setTab] = useState<Tab>("dua");
  const [ayahState, setAyahState] = useState<{ key: string; data: AyahData } | null>(null);
  const [ayahLoading, setAyahLoading] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (dateKey) return;
    let timerId: ReturnType<typeof setTimeout>;
    const scheduleMidnight = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      const ms = Math.max(1000, nextMidnight.getTime() - now.getTime());
      timerId = setTimeout(() => {
        setInternalDateKey(formatLocalDateKey(new Date()));
        scheduleMidnight();
      }, ms);
    };
    scheduleMidnight();
    return () => clearTimeout(timerId);
  }, [dateKey]);

  const ayah = ayahState?.key === effectiveDateKey ? ayahState.data : null;
  const duaIndex = getDailyIndex(currentDate, DAILY_DUAS.length);
  const item: DailyContentItem | null = tab === "dua" ? DAILY_DUAS[duaIndex] : null;

  useEffect(() => {
    if (tab !== "ayet" || ayah !== null) return;
    let cancelled = false;
    setAyahLoading(true);
    fetchDailyAyah(currentDate)
      .then((data) => {
        if (cancelled) return;
        setAyahState({ key: effectiveDateKey, data });
        setAyahLoading(false);
      })
      .catch(() => {
        if (!cancelled) setAyahLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, ayah, currentDate, effectiveDateKey]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    const threshold = 50;
    if (Math.abs(diff) > threshold) {
      const currentIndex = TABS.indexOf(tab);
      if (diff < 0 && currentIndex < TABS.length - 1) {
        setTab(TABS[currentIndex + 1]);
      } else if (diff > 0 && currentIndex > 0) {
        setTab(TABS[currentIndex - 1]);
      }
    }
    touchStartX.current = null;
  };

  const tabStyle = (t: Tab) =>
    `flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex-1 justify-center touch-manipulation active:scale-[0.98] ${
      tab === t
        ? "bg-[hsl(36,55%,55%,0.15)] text-gold border border-[hsl(36,55%,55%,0.3)] shadow-[0_0_10px_rgba(212,175,55,0.1)]"
        : "text-cream-muted hover:text-gold"
    }`;

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div
        className="glass-card gold-border p-4 md:p-5"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Tab buttons */}
        <div role="tablist" aria-label="Günün içeriği" className="flex gap-2 mb-4">
          <button
            type="button"
            role="tab"
            id="daily-tab-dua"
            aria-selected={tab === "dua"}
            aria-controls="daily-tabpanel"
            onClick={() => setTab("dua")}
            className={tabStyle("dua")}
          >
            <BookOpen className="w-4 h-4" />
            {TAB_LABELS.dua}
          </button>
          <button
            type="button"
            role="tab"
            id="daily-tab-ayet"
            aria-selected={tab === "ayet"}
            aria-controls="daily-tabpanel"
            onClick={() => setTab("ayet")}
            className={tabStyle("ayet")}
          >
            <Scroll className="w-4 h-4" />
            {TAB_LABELS.ayet}
          </button>
        </div>

        {/* Content */}
        <div role="tabpanel" id="daily-tabpanel" aria-labelledby={`daily-tab-${tab}`}>
          {tab === "ayet" ? (
            ayahLoading ? (
              <div className="text-sm text-cream-muted animate-pulse">Ayet yükleniyor...</div>
            ) : ayah ? (
              <div className="space-y-3">
                <p
                  dir="rtl"
                  className="text-right text-lg md:text-xl leading-loose text-cream"
                  style={{ fontFamily: "serif" }}
                >
                  {ayah.arabic}
                </p>
                <p className="text-sm md:text-base leading-relaxed text-cream">
                  {ayah.turkish}
                </p>
                <p className="text-xs text-muted-foreground">{ayah.reference}</p>
              </div>
            ) : (
              <p className="text-sm text-cream-muted">Ayet alınamadı. İnternet bağlantınızı kontrol edin.</p>
            )
          ) : item ? (
            <>
              <p className="text-sm md:text-base leading-relaxed text-cream">{item.text}</p>
              {item.source && (
                <p className="mt-2 text-xs text-muted-foreground">{item.source}</p>
              )}
            </>
          ) : null}
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-label={TAB_LABELS[t]}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                tab === t ? "bg-gold w-3" : "bg-cream-muted/30 w-1.5 hover:bg-cream-muted/60"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DailyContentCard;
