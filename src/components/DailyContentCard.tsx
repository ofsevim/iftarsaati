import { useMemo, useState, useRef } from "react";
import { BookOpen, Lightbulb } from "lucide-react";
import { DAILY_DUAS, DAILY_REMINDERS, type DailyContentItem } from "@/data/daily-content";
import { useI18n } from "@/lib/i18n";

function getDailyIndex(now: Date, size: number): number {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const seed = y * 10000 + m * 100 + d;
  return size === 0 ? 0 : seed % size;
}

const TABS = ["dua", "hatirlatma"] as const;
type Tab = (typeof TABS)[number];

const DailyContentCard = () => {
  const { t } = useI18n();
  const now = useMemo(() => new Date(), []);
  const [tab, setTab] = useState<Tab>("dua");
  const touchStartX = useRef<number | null>(null);

  const duaIndex = getDailyIndex(now, DAILY_DUAS.length);
  const reminderIndex = getDailyIndex(now, DAILY_REMINDERS.length);

  const item: DailyContentItem | null =
    tab === "dua" ? DAILY_DUAS[duaIndex] : DAILY_REMINDERS[reminderIndex];

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

  if (!item) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div
        className="glass-card gold-border p-4 md:p-5"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Tab buttons */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setTab("dua")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              tab === "dua"
                ? "bg-[hsl(36,55%,55%,0.15)] text-gold border border-[hsl(36,55%,55%,0.3)]"
                : "text-cream-muted hover:text-gold"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            {t("dailyDua")}
          </button>
          <button
            onClick={() => setTab("hatirlatma")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              tab === "hatirlatma"
                ? "bg-[hsl(36,55%,55%,0.15)] text-gold border border-[hsl(36,55%,55%,0.3)]"
                : "text-cream-muted hover:text-gold"
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            {t("dailyReminder")}
          </button>
        </div>

        {/* Content */}
        <p className="text-sm md:text-base leading-relaxed text-cream">
          {item.text}
        </p>
        {item.source && (
          <p className="mt-2 text-xs text-muted-foreground">{item.source}</p>
        )}

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {TABS.map((tabKey) => (
            <div
              key={tabKey}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                tab === tabKey ? "bg-gold w-3" : "bg-cream-muted/30"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DailyContentCard;
