import { useMemo, useState } from "react";
import { BookOpen, Lightbulb, ChevronLeft, ChevronRight } from "lucide-react";
import { DAILY_DUAS, DAILY_REMINDERS, type DailyContentItem } from "@/data/daily-content";

function getDailyIndex(now: Date, size: number): number {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const seed = y * 10000 + m * 100 + d;
  return size === 0 ? 0 : seed % size;
}

const DailyContentCard = () => {
  const now = useMemo(() => new Date(), []);
  const [tab, setTab] = useState<"dua" | "hatirlatma">("dua");

  const duaIndex = getDailyIndex(now, DAILY_DUAS.length);
  const reminderIndex = getDailyIndex(now, DAILY_REMINDERS.length);

  const item: DailyContentItem | null =
    tab === "dua" ? DAILY_DUAS[duaIndex] : DAILY_REMINDERS[reminderIndex];

  if (!item) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="glass-card gold-border p-4 md:p-5">
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
            Günün Duası
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
            Hatırlatma
          </button>
        </div>

        {/* Content */}
        <p className="text-sm md:text-base leading-relaxed text-cream">
          {item.text}
        </p>
        {item.source && (
          <p className="mt-2 text-xs text-muted-foreground">{item.source}</p>
        )}

        {/* Swipe hint */}
        <div className="flex items-center justify-center gap-1 mt-3">
          <ChevronLeft className="w-3 h-3 text-cream-muted/40" />
          <span className="text-[10px] text-cream-muted/40">kaydır</span>
          <ChevronRight className="w-3 h-3 text-cream-muted/40" />
        </div>
      </div>
    </div>
  );
};

export default DailyContentCard;
