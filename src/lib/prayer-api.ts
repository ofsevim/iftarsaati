import { PrayerTimes, City } from "@/data/cities";

export interface DailyPrayerTimes {
  dateKey: string;   // YYYY-MM-DD
  dateLabel: string; // e.g. "18 Şubat"
  times: PrayerTimes;
}

const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

export async function fetchMonthlyPrayerTimes(
  city: City,
  start: Date,
  end: Date
): Promise<DailyPrayerTimes[]> {
  const results: DailyPrayerTimes[] = [];

  // Collect unique year-month pairs
  const months = new Set<string>();
  const d = new Date(start);
  while (d <= end) {
    months.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
    d.setDate(d.getDate() + 1);
  }

  for (const ym of months) {
    const [year, month] = ym.split("-").map(Number);
    try {
      const res = await fetch(
        `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${city.lat}&longitude=${city.lng}&method=13`
      );
      if (!res.ok) continue;
      const json = await res.json();

      for (const dayData of json.data) {
        const g = dayData.date.gregorian;
        const dateObj = new Date(
          Number(g.year),
          Number(g.month.number) - 1,
          Number(g.day)
        );
        if (dateObj < start || dateObj > end) continue;

        const t = dayData.timings;
        const dateKey = `${g.year}-${String(g.month.number).padStart(2, "0")}-${String(g.day).padStart(2, "0")}`;
        const dateLabel = `${Number(g.day)} ${MONTH_NAMES[Number(g.month.number) - 1]}`;

        results.push({
          dateKey,
          dateLabel,
          times: {
            Fajr: t.Fajr.split(" ")[0],
            Sunrise: t.Sunrise.split(" ")[0],
            Dhuhr: t.Dhuhr.split(" ")[0],
            Asr: t.Asr.split(" ")[0],
            Maghrib: t.Maghrib.split(" ")[0],
            Isha: t.Isha.split(" ")[0],
          },
        });
      }
    } catch (e) {
      console.error("Monthly fetch error:", e);
    }
  }

  results.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  return results;
}

export async function fetchPrayerTimes(city: City): Promise<PrayerTimes | null> {
  try {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    const dateStr = `${dd}-${mm}-${yyyy}`;

    const response = await fetch(
      `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${city.lat}&longitude=${city.lng}&method=13`
    );

    if (!response.ok) throw new Error("API error");

    const data = await response.json();
    const timings = data.data.timings;

    return {
      Fajr: timings.Fajr,
      Sunrise: timings.Sunrise,
      Dhuhr: timings.Dhuhr,
      Asr: timings.Asr,
      Maghrib: timings.Maghrib,
      Isha: timings.Isha,
    };
  } catch (error) {
    console.error("Failed to fetch prayer times:", error);
    return null;
  }
}

export function findNearestCity(
  lat: number,
  lng: number,
  cities: City[]
): City {
  let nearest = cities[0];
  let minDist = Infinity;

  for (const city of cities) {
    const dist = Math.sqrt(
      Math.pow(city.lat - lat, 2) + Math.pow(city.lng - lng, 2)
    );
    if (dist < minDist) {
      minDist = dist;
      nearest = city;
    }
  }

  return nearest;
}

export function getTimeUntilIftar(maghribTime: string): {
  hours: number;
  minutes: number;
  seconds: number;
  passed: boolean;
} {
  const now = new Date();
  const [h, m] = maghribTime.split(":").map(Number);
  const iftar = new Date(now);
  iftar.setHours(h, m, 0, 0);

  const diff = iftar.getTime() - now.getTime();

  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, passed: true };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { hours, minutes, seconds, passed: false };
}

export function getCurrentPrayer(times: PrayerTimes): keyof PrayerTimes | null {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const prayerOrder: (keyof PrayerTimes)[] = [
    "Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"
  ];

  const prayerMinutes = prayerOrder.map((key) => {
    const [h, m] = times[key].split(":").map(Number);
    return h * 60 + m;
  });

  for (let i = prayerMinutes.length - 1; i >= 0; i--) {
    if (currentMinutes >= prayerMinutes[i]) {
      return prayerOrder[i];
    }
  }

  return null;
}
