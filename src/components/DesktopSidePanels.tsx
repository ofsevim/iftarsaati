import { useMemo } from "react";
import { DAILY_DUAS, DAILY_REMINDERS, type DailyContentItem } from "@/data/daily-content";

type Side = "left" | "right";

interface DesktopSidePanelsProps {
  /** Sol veya sağ panel */
  side: Side;
  /** Şehir adı gibi küçük bir bağlam metni */
  cityName?: string;
}

/**
 * Bugünün tarihine göre deterministik bir index üretir.
 * Aynı gün boyunca içerik sabit kalır; ertesi gün otomatik değişir.
 */
function getDailyIndex(now: Date, size: number): number {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  // YYYYMMDD gibi tek sayıya çevirip mod alıyoruz.
  const seed = y * 10000 + m * 100 + d;
  return size === 0 ? 0 : seed % size;
}

/**
 * Günlük içerik seçer (dua/hatırlatma gibi).
 */
function pickDailyItem(items: DailyContentItem[], now: Date): DailyContentItem | null {
  if (!items.length) return null;
  return items[getDailyIndex(now, items.length)];
}

export default function DesktopSidePanels({ side, cityName }: DesktopSidePanelsProps) {
  const now = useMemo(() => new Date(), []);

  const dua = useMemo(() => pickDailyItem(DAILY_DUAS, now), [now]);
  const reminder = useMemo(() => pickDailyItem(DAILY_REMINDERS, now), [now]);

  // Sol panel: sadece dua. Sağ panel: sadece hatırlatma.
  const primary = side === "left" ? dua : reminder;

  return (
    <div>
      {primary && (
        <aside
          aria-label={primary.title}
          className="glass-card gold-border p-5 text-left"
        >
          <div>
            <div>
              <h3 className="font-display text-base text-gold-light">{primary.title}</h3>
              {cityName && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {cityName} için
                </p>
              )}
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-cream">
            {primary.text}
          </p>

          {primary.source && (
            <p className="mt-3 text-xs text-muted-foreground">
              {primary.source}
            </p>
          )}
        </aside>
      )}
    </div>
  );
}


