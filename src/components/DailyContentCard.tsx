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
  const touchStart = useRef<{ x: number; y: number } | null>(null);

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
    const touch = e.touches[0];
    touchStart.current = e.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      setTab(deltaX < 0 ? "ayet" : "dua");
    }
  };

  const tabStyle = (t: Tab) =>
    `flex items-center gap-1.5 min-h-11 min-w-0 px-2 py-2 border rounded-xl text-sm font-medium transition-colors flex-1 justify-center touch-manipulation ${
      tab === t
        ? "bg-gold/20 text-gold border-gold/40"
        : "border-transparent text-cream-muted hover:text-gold"
    }`;

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 md:mb-8">
      <div
        className="glass-card gold-border p-4 md:p-5"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => { touchStart.current = null; }}
      >
        {/* Tab buttons */}
        <div
          role="tablist"
          aria-label="Günün içeriği"
          className="flex gap-2 mb-4"
          onKeyDown={(event) => {
            let nextTab: Tab;
            switch (event.key) {
              case "ArrowLeft":
              case "ArrowRight":
                nextTab = tab === "dua" ? "ayet" : "dua";
                break;
              case "Home":
                nextTab = "dua";
                break;
              case "End":
                nextTab = "ayet";
                break;
              default:
                return;
            }
            event.preventDefault();
            event.currentTarget.querySelector<HTMLButtonElement>(`#daily-tab-${nextTab}`)?.focus();
            setTab(nextTab);
          }}
        >
          {TABS.map((item) => {
            const Icon = item === "dua" ? BookOpen : Scroll;
            const isSelected = tab === item;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                id={`daily-tab-${item}`}
                aria-selected={isSelected}
                aria-controls="daily-tabpanel"
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setTab(item)}
                className={tabStyle(item)}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {TAB_LABELS[item]}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div role="tabpanel" id="daily-tabpanel" aria-labelledby={`daily-tab-${tab}`} tabIndex={0}>
          {tab === "ayet" ? (
            ayahLoading ? (
              <div className="text-sm text-cream-muted animate-pulse">Ayet yükleniyor...</div>
            ) : ayah ? (
              <div className="space-y-3">
                <p
                  dir="rtl"
                  lang="ar"
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

      </div>
    </div>
  );
};

export default DailyContentCard;
