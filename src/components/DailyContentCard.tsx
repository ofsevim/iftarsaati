import { useMemo, useState, useRef, useEffect } from "react";
import { BookOpen, Lightbulb, Scroll } from "lucide-react";
import { DAILY_DUAS, DAILY_REMINDERS, type DailyContentItem } from "@/data/daily-content";
import { fetchDailyAyah, type AyahData } from "@/lib/quran-api";

function getDailyIndex(now: Date, size: number): number {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const seed = y * 10000 + m * 100 + d;
  return size === 0 ? 0 : seed % size;
}

const TABS = ["dua", "hatirlatma", "ayet"] as const;
type Tab = (typeof TABS)[number];

const DailyContentCard = () => {
  const now = useMemo(() => new Date(), []);
  const [tab, setTab] = useState<Tab>("dua");
  const [ayah, setAyah] = useState<AyahData | null>(null);
  const [ayahLoading, setAyahLoading] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const duaIndex = getDailyIndex(now, DAILY_DUAS.length);
  const reminderIndex = getDailyIndex(now, DAILY_REMINDERS.length);

  const item: DailyContentItem | null =
    tab === "dua"
      ? DAILY_DUAS[duaIndex]
      : tab === "hatirlatma"
        ? DAILY_REMINDERS[reminderIndex]
        : null;

  useEffect(() => {
    if (tab !== "ayet" || ayah !== null) return;
    setAyahLoading(true);
    fetchDailyAyah().then((data) => {
      setAyah(data);
      setAyahLoading(false);
    });
  }, [tab, ayah]);

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
    `flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all flex-1 justify-center ${
      tab === t
        ? "bg-[hsl(36,55%,55%,0.15)] text-gold border border-[hsl(36,55%,55%,0.3)]"
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
        <div className="flex gap-1.5 mb-3">
          <button onClick={() => setTab("dua")} className={tabStyle("dua")}>
            <BookOpen className="w-3.5 h-3.5" />
            Günün Duası
          </button>
          <button onClick={() => setTab("hatirlatma")} className={tabStyle("hatirlatma")}>
            <Lightbulb className="w-3.5 h-3.5" />
            Hatırlatma
          </button>
          <button onClick={() => setTab("ayet")} className={tabStyle("ayet")}>
            <Scroll className="w-3.5 h-3.5" />
            Günün Ayeti
          </button>
        </div>

        {/* Content */}
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

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {TABS.map((t) => (
            <div
              key={t}
              className={`h-1.5 rounded-full transition-all ${
                tab === t ? "bg-gold w-3" : "bg-cream-muted/30 w-1.5"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DailyContentCard;
