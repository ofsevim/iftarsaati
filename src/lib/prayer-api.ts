import { PrayerTimes, City } from "@/data/cities";

export interface DailyPrayerTimes {
  dateKey: string;   // YYYY-MM-DD
  dateLabel: string; // e.g. "18 Şubat"
  times: PrayerTimes;
  hijri?: {
    year: number;
    monthNumber: number;
    monthName: string;
    day: number;
  };
}

export interface RamadanPeriod {
  startDateKey: string;
  bayramDateKey: string;
  kadirDateKey: string | null;
  days: DailyPrayerTimes[];
}

const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

const PRAYER_API_TIMEOUT = 15000; // 15 saniye — yavaş mobil bağlantılar için

/**
 * localStorage'a namaz vakitlerini cache'ler (API erişilmezse fallback olarak kullanılır).
 */
function getCachedData<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // 48 saat geçmişse cache'i geçersiz say
    if (Date.now() - parsed.ts > 48 * 60 * 60 * 1000) return null;
    return parsed.data as T;
  } catch { return null; }
}

function setCachedData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* quota aşılmış olabilir */ }
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/** Aladhan API timings nesnesi için arayüz */
interface AladhanTimings {
  Fajr?: string;
  Sunrise?: string;
  Dhuhr?: string;
  Asr?: string;
  Maghrib?: string;
  Isha?: string;
  [key: string]: string | undefined;
}

/**
 * Aladhan timings nesnesini uygulama formatına çevirir.
 */
function normalizePrayerTimesFromTimings(timings: AladhanTimings | null | undefined): PrayerTimes | null {
  if (!timings) return null;
  const normalizeTime = (t: unknown) =>
    typeof t === "string" ? t.split(" ")[0] : null;

  const Fajr = normalizeTime(timings.Fajr);
  const Sunrise = normalizeTime(timings.Sunrise);
  const Dhuhr = normalizeTime(timings.Dhuhr);
  const Asr = normalizeTime(timings.Asr);
  const Maghrib = normalizeTime(timings.Maghrib);
  const Isha = normalizeTime(timings.Isha);

  if (!Fajr || !Sunrise || !Dhuhr || !Asr || !Maghrib || !Isha) return null;
  return { Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha };
}

/**
 * Timings endpoint'i başarısız olursa aynı gün için calendar endpoint'inden veri çekmeyi dener.
 */
async function fetchPrayerTimesViaCalendar(city: City, date: Date): Promise<PrayerTimes | null> {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const response = await fetchWithRetry(
    `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${city.lat}&longitude=${city.lng}&method=13`
  );

  const json = await response.json();
  if (!json?.data || !Array.isArray(json.data)) return null;

  const row = json.data.find((item: Record<string, unknown>) => {
    const g = (item?.date as Record<string, unknown>)?.gregorian as Record<string, unknown> | undefined;
    return Number(g?.day) === day;
  });

  return normalizePrayerTimesFromTimings(row?.timings as AladhanTimings | undefined);
}

/**
 * Belirtilen URL'ye retry + timeout + CORS desteği ile istek atar.
 * - mode:"cors" + credentials:"omit" → mobil tarayıcılarda CORS sorunlarını önler.
 * - cache:"no-store" → bozuk disk cache'inden yanıt gelmesini engeller.
 * - Başarısız yanıtların body'sini tüketir (bağlantı havuzunu serbest bırakır).
 * - AbortController desteklenmiyor ise timeout olmadan dener.
 */
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  let lastError: unknown;

  for (let i = 0; i < retries; i++) {
    let controller: AbortController | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      // Bazı çok eski mobil tarayıcılarda AbortController yoktur
      if (typeof AbortController !== "undefined") {
        controller = new AbortController();
        timeoutId = setTimeout(() => controller!.abort(), PRAYER_API_TIMEOUT);
      }

      const response = await fetch(url, {
        signal: controller?.signal,
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (response.ok) return response;

      // Başarısız yanıtın body'sini tüket (bağlantı havuzunu serbest bırak)
      try { await response.text(); } catch { /* ignore */ }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      lastError = error;
    }

    // Son deneme değilse bekle (exponential backoff: 1s, 2s, 4s)
    if (i < retries - 1) {
      await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, i)));
    }
  }

  throw lastError ?? new Error("Failed to fetch after retries");
}

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
      const res = await fetchWithRetry(
        `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${city.lat}&longitude=${city.lng}&method=13`
      );

      let json: Record<string, unknown>;
      try {
        json = await res.json();
      } catch {
        console.error("[Prayer API] Geçersiz JSON yanıtı (monthly)");
        continue;
      }

      if (!json?.data || !Array.isArray(json.data)) {
        console.error("[Prayer API] Beklenmeyen yanıt yapısı (monthly)");
        continue;
      }

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
          hijri: {
            year: Number(dayData?.date?.hijri?.year),
            monthNumber: Number(dayData?.date?.hijri?.month?.number),
            monthName: String(dayData?.date?.hijri?.month?.en ?? ""),
            day: Number(dayData?.date?.hijri?.day),
          },
        });
      }
    } catch (e) {
      console.error("[Prayer API] Monthly fetch hatası:", e);
    }
  }

  results.sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  // Cache'leme: veri varsa sakla, yoksa eski cache'den dön
  const cacheKey = `monthly_${city.name}_${formatDateKey(start)}_${formatDateKey(end)}`;
  if (results.length > 0) {
    setCachedData(cacheKey, results);
  } else {
    const cached = getCachedData<DailyPrayerTimes[]>(cacheKey);
    if (cached && cached.length > 0) {
      console.info("[Prayer API] API erişilemedi — cache'den yükleniyor (monthly).");
      return cached;
    }
  }

  return results;
}

export async function fetchUpcomingRamadanPeriod(
  city: City,
  referenceDate: Date = new Date()
): Promise<RamadanPeriod | null> {
  const scanStart = addMonths(referenceDate, -2);
  const scanEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 19, 0);
  const days = await fetchMonthlyPrayerTimes(city, scanStart, scanEnd);

  if (!days.length) {
    return null;
  }

  const periods: RamadanPeriod[] = [];

  for (let i = 0; i < days.length; i++) {
    const startDay = days[i];
    if (startDay.hijri?.monthNumber !== 9 || startDay.hijri.day !== 1) {
      continue;
    }

    const periodDays: DailyPrayerTimes[] = [];
    let bayramDateKey: string | null = null;
    let kadirDateKey: string | null = null;

    for (let j = i; j < days.length; j++) {
      const currentDay = days[j];
      const hijri = currentDay.hijri;

      if (!hijri) {
        continue;
      }

      if (hijri.monthNumber === 9) {
        periodDays.push(currentDay);
        if (hijri.day === 26) {
          kadirDateKey = currentDay.dateKey;
        }
        continue;
      }

      if (hijri.monthNumber === 10 && hijri.day === 1) {
        periodDays.push(currentDay);
        bayramDateKey = currentDay.dateKey;
      }

      break;
    }

    if (periodDays.length > 0 && bayramDateKey) {
      periods.push({
        startDateKey: startDay.dateKey,
        bayramDateKey,
        kadirDateKey,
        days: periodDays,
      });
    }
  }

  if (!periods.length) {
    return null;
  }

  const referenceKey = formatDateKey(referenceDate);
  return periods.find((period) => period.bayramDateKey >= referenceKey) ?? periods[periods.length - 1];
}

export async function fetchPrayerTimes(city: City): Promise<PrayerTimes | null> {
  return fetchPrayerTimesForDate(city, new Date());
}

/**
 * Aladhan API'ye istek atmak için tarihi "DD-MM-YYYY" formatına çevirir.
 */
function formatDateForPrayerApi(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Belirli bir günün namaz vakitlerini getirir.
 * - Hata durumunda `null` döner ve konsola log basar.
 */
export async function fetchPrayerTimesForDate(
  city: City,
  date: Date
): Promise<PrayerTimes | null> {
  const dateStr = formatDateForPrayerApi(date);
  const cacheKey = `daily_${city.name}_${dateStr}`;

  try {
    const response = await fetchWithRetry(
      `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${city.lat}&longitude=${city.lng}&method=13`
    );

    let data: Record<string, unknown>;
    try {
      data = await response.json();
    } catch {
      console.error("[Prayer API] Geçersiz JSON yanıtı (daily)");
      return getCachedData<PrayerTimes>(cacheKey);
    }

    const dataObj = data?.data as Record<string, unknown> | undefined;
    if (!dataObj?.timings) {
      console.error("[Prayer API] Beklenmeyen yanıt yapısı (daily)");
      try {
        const fromCalendar = await fetchPrayerTimesViaCalendar(city, date);
        if (fromCalendar) {
          setCachedData(cacheKey, fromCalendar);
          return fromCalendar;
        }
      } catch {
        // Calendar fallback de başarısız olabilir; cache fallback'e düş
      }
      return getCachedData<PrayerTimes>(cacheKey);
    }

    const result = normalizePrayerTimesFromTimings(dataObj.timings as AladhanTimings);
    if (!result) {
      try {
        const fromCalendar = await fetchPrayerTimesViaCalendar(city, date);
        if (fromCalendar) {
          setCachedData(cacheKey, fromCalendar);
          return fromCalendar;
        }
      } catch {
        // ignore
      }
      return getCachedData<PrayerTimes>(cacheKey);
    }

    setCachedData(cacheKey, result);
    return result;
  } catch (error) {
    console.error("[Prayer API] Daily fetch hatası:", error);
    // Timings endpoint tamamen düştüyse calendar fallback dene
    try {
      const fromCalendar = await fetchPrayerTimesViaCalendar(city, date);
      if (fromCalendar) {
        setCachedData(cacheKey, fromCalendar);
        return fromCalendar;
      }
    } catch {
      // ignore
    }
    // API erişilemezse eski cache'den dön
    const cached = getCachedData<PrayerTimes>(cacheKey);
    if (cached) {
      console.info("[Prayer API] API erişilemedi — cache'den yükleniyor (daily).");
      return cached;
    }
    // Son çare: uygulama tamamen boş kalmasın diye yerleşik fallback
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
