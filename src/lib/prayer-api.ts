import { PrayerTimes, City } from "@/data/cities";

export interface HijriDateInfo {
  year: number;
  monthNumber: number;
  monthName: string;
  day: number;
  isRamadan: boolean;
}

export interface PrayerTimesWithMeta extends PrayerTimes {
  hijri?: HijriDateInfo;
}

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
const CACHE_PREFIXES = ["daily_", "monthly_", "ramadan_period_", "ayah_"];
const MAX_CACHE_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

function isNavigatorOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/**
 * Eski veya süresi dolmuş önbellek kayıtlarını temizleyerek localStorage kotasını korur.
 */
function prunePrayerCache(forceOldest = false): void {
  try {
    const now = Date.now();
    const candidates: { key: string; ts: number }[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !CACHE_PREFIXES.some((prefix) => key.startsWith(prefix))) continue;

      try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : null;
        const ts = typeof parsed?.ts === "number" ? parsed.ts : 0;
        if (now - ts > MAX_CACHE_RETENTION_MS) {
          localStorage.removeItem(key);
        } else {
          candidates.push({ key, ts });
        }
      } catch {
        localStorage.removeItem(key);
      }
    }

    if (forceOldest && candidates.length > 0) {
      candidates.sort((a, b) => a.ts - b.ts);
      const removeCount = Math.max(1, Math.ceil(candidates.length / 2));
      for (let i = 0; i < removeCount; i++) {
        localStorage.removeItem(candidates[i].key);
      }
    }
  } catch {
    // localStorage erişilemiyorsa sessizce geç
  }
}

/**
 * localStorage'a namaz vakitlerini cache'ler (API erişilmezse fallback olarak kullanılır).
 */
function getCachedData<T>(key: string, maxAgeMs = 48 * 60 * 60 * 1000): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > maxAgeMs) return null;
    return parsed.data as T;
  } catch { return null; }
}

function setCachedData<T>(key: string, data: T): void {
  const payload = JSON.stringify({ data, ts: Date.now() });
  try {
    localStorage.setItem(key, payload);
  } catch {
    // Kota dolduysa eski önbellekleri temizleyip bir kez daha dene
    prunePrayerCache(true);
    try {
      localStorage.setItem(key, payload);
    } catch {
      /* quota aşılmış olabilir */
    }
  }
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

function normalizeTimeValue(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.split(" ")[0]?.trim();
  if (!cleaned) return null;
  const match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Aladhan timings nesnesini uygulama formatına çevirir.
 */
function normalizePrayerTimesFromTimings(timings: AladhanTimings | null | undefined): PrayerTimes | null {
  if (!timings) return null;

  const Fajr = normalizeTimeValue(timings.Fajr);
  const Sunrise = normalizeTimeValue(timings.Sunrise);
  const Dhuhr = normalizeTimeValue(timings.Dhuhr);
  const Asr = normalizeTimeValue(timings.Asr);
  const Maghrib = normalizeTimeValue(timings.Maghrib);
  const Isha = normalizeTimeValue(timings.Isha);

  if (!Fajr || !Sunrise || !Dhuhr || !Asr || !Maghrib || !Isha) return null;
  return { Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha };
}

function extractHijriInfo(hijriRaw: Record<string, unknown> | undefined): HijriDateInfo | undefined {
  if (!hijriRaw) return undefined;
  const monthObj = hijriRaw.month as Record<string, unknown> | undefined;
  const monthNum = Number(monthObj?.number || 0);
  return {
    year: Number(hijriRaw.year || 0),
    monthNumber: monthNum,
    monthName: String(monthObj?.en || ""),
    day: Number(hijriRaw.day || 0),
    isRamadan: monthNum === 9,
  };
}

/**
 * Timings endpoint'i başarısız olursa aynı gün için calendar endpoint'inden veri çekmeyi dener.
 */
async function fetchPrayerTimesViaCalendar(city: City, date: Date): Promise<PrayerTimesWithMeta | null> {
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
  }) as Record<string, unknown> | undefined;

  const times = normalizePrayerTimesFromTimings(row?.timings as AladhanTimings | undefined);
  if (!times) return null;

  const dateSection = row?.date as Record<string, unknown> | undefined;
  const hijriInfo = extractHijriInfo(dateSection?.hijri as Record<string, unknown> | undefined);
  return {
    ...times,
    ...(hijriInfo ? { hijri: hijriInfo } : {}),
  };
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

function parseGregorianRow(
  dayData: Record<string, unknown> | undefined
): { year: number; month: number; day: number; dateObj: Date; dateKey: string; dateLabel: string } | null {
  const dateObjRaw = dayData?.date as Record<string, unknown> | undefined;
  const g = dateObjRaw?.gregorian as Record<string, unknown> | undefined;
  if (!g) return null;

  const year = Number(g.year);
  const monthObj = g.month as Record<string, unknown> | undefined;
  const month = Number(monthObj?.number ?? g.month);
  const day = Number(g.day);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const dateObj = new Date(year, month - 1, day);
  const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const dateLabel = `${day} ${MONTH_NAMES[month - 1]}`;
  return { year, month, day, dateObj, dateKey, dateLabel };
}

export async function fetchMonthlyPrayerTimes(
  city: City,
  start: Date,
  end: Date
): Promise<DailyPrayerTimes[]> {
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0);
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
  const cacheKey = `monthly_${city.name}_${formatDateKey(startDay)}_${formatDateKey(endDay)}`;

  const cachedPeriod = getCachedData<DailyPrayerTimes[]>(cacheKey);
  if (cachedPeriod?.length) {
    cacheDailyCalendarRows(city, cachedPeriod);
    return cachedPeriod;
  }

  if (isNavigatorOffline()) {
    const offlineCached = getCachedData<DailyPrayerTimes[]>(cacheKey, Infinity);
    if (offlineCached?.length) {
      cacheDailyCalendarRows(city, offlineCached);
      return offlineCached;
    }
    return [];
  }

  const results: DailyPrayerTimes[] = [];

  // Collect unique year-month pairs
  const months = new Set<string>();
  const d = new Date(startDay);
  while (d <= endDay) {
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

      for (const dayData of json.data as Record<string, unknown>[]) {
        const parsedDate = parseGregorianRow(dayData);
        if (!parsedDate) continue;
        if (parsedDate.dateObj < startDay || parsedDate.dateObj > endDay) continue;

        const times = normalizePrayerTimesFromTimings(dayData?.timings as AladhanTimings | undefined);
        if (!times) continue;

        const hijriRaw = (dayData?.date as Record<string, unknown> | undefined)?.hijri as Record<string, unknown> | undefined;
        const hijriMonthObj = hijriRaw?.month as Record<string, unknown> | undefined;

        results.push({
          dateKey: parsedDate.dateKey,
          dateLabel: parsedDate.dateLabel,
          times,
          hijri: {
            year: Number(hijriRaw?.year),
            monthNumber: Number(hijriMonthObj?.number),
            monthName: String(hijriMonthObj?.en ?? ""),
            day: Number(hijriRaw?.day),
          },
        });
      }
    } catch (e) {
      console.error("[Prayer API] Monthly fetch hatası:", e);
    }
  }

  results.sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  // Cache'leme: veri varsa sakla, yoksa eski cache'den dön
  if (results.length > 0) {
    prunePrayerCache(false);
    cacheDailyCalendarRows(city, results, true);
    setCachedData(cacheKey, results);
  } else {
    const cached = getCachedData<DailyPrayerTimes[]>(cacheKey, Infinity);
    if (cached && cached.length > 0) {
      console.info("[Prayer API] API erişilemedi — cache'den yükleniyor (monthly).");
      return cached;
    }
  }

  return results;
}

function cacheDailyCalendarRows(city: City, days: DailyPrayerTimes[], overwriteFresh = false): void {
  for (const day of days) {
    const [year, month, date] = day.dateKey.split("-").map(Number);
    const dailyKey = `daily_${city.name}_${formatDateForPrayerApi(new Date(year, month - 1, date))}`;
    if (!overwriteFresh && getCachedData<PrayerTimesWithMeta>(dailyKey)) {
      continue;
    }
    setCachedData<PrayerTimesWithMeta>(dailyKey, {
      ...day.times,
      ...(day.hijri ? { hijri: { ...day.hijri, isRamadan: day.hijri.monthNumber === 9 } } : {}),
    });
  }
}

// In-flight request deduplication maps
const inFlightRamadanRequests = new Map<string, Promise<RamadanPeriod | null>>();
const inFlightDailyRequests = new Map<string, Promise<PrayerTimesWithMeta | null>>();

export async function fetchUpcomingRamadanPeriod(
  city: City,
  referenceDate: Date = new Date()
): Promise<RamadanPeriod | null> {
  const refYear = referenceDate.getFullYear();
  const referenceKey = formatDateKey(referenceDate);
  const cacheKey = `ramadan_period_${city.name}_${refYear}`;
  const inFlightKey = `${city.name}_${referenceKey}`;

  const cached = getCachedData<RamadanPeriod>(cacheKey);
  if (cached && cached.days && cached.days.length > 0 && cached.bayramDateKey >= referenceKey) {
    return cached;
  }

  if (isNavigatorOffline()) {
    const offlineCached = getCachedData<RamadanPeriod>(cacheKey, Infinity);
    return offlineCached && offlineCached.days?.length > 0 && offlineCached.bayramDateKey >= referenceKey
      ? offlineCached
      : null;
  }

  if (inFlightRamadanRequests.has(inFlightKey)) {
    return inFlightRamadanRequests.get(inFlightKey)!;
  }

  const fetchPromise = (async (): Promise<RamadanPeriod | null> => {
    try {
      const approxHijriYear = Math.round((refYear - 622) * (33 / 32));
      for (const hijriYearToUse of [approxHijriYear - 1, approxHijriYear, approxHijriYear + 1]) {
        try {
          const ramadanRes = await fetchWithRetry(
            `https://api.aladhan.com/v1/hijriCalendar/${hijriYearToUse}/9?latitude=${city.lat}&longitude=${city.lng}&method=13`
          );
          const ramadanJson: Record<string, unknown> = await ramadanRes.json().catch(() => ({}));

          if (!ramadanJson?.data || !Array.isArray(ramadanJson.data) || ramadanJson.data.length === 0) {
            continue;
          }

          const periodDays: DailyPrayerTimes[] = [];
          let day26Key: string | null = null;
          let day27Key: string | null = null;

          for (const dayData of (ramadanJson.data as Record<string, unknown>[])) {
            const parsedDate = parseGregorianRow(dayData);
            const times = normalizePrayerTimesFromTimings(dayData?.timings as AladhanTimings | undefined);
            const dateObj = dayData?.date as Record<string, unknown> | undefined;
            const h = dateObj?.hijri as Record<string, unknown> | undefined;
            if (!parsedDate || !times) continue;

            const hDay = Number(h?.day || 0);
            // Diyanet takvimine göre Kadir Gecesi Ramazan'ın 26. gününü 27. gecesine bağlayan gecedir
            if (hDay === 26 && !day26Key) day26Key = parsedDate.dateKey;
            if (hDay === 27 && !day27Key) day27Key = parsedDate.dateKey;

            periodDays.push({
              dateKey: parsedDate.dateKey,
              dateLabel: parsedDate.dateLabel,
              times,
              hijri: {
                year: Number(h?.year || hijriYearToUse),
                monthNumber: 9,
                monthName: "Ramazan",
                day: hDay,
              },
            });
          }

          if (periodDays.length === 0) continue;

          // Tam aylık geçmiş bir Ramazan yılıysa gereksiz Şevval/Bayram isteği atma
          const lastRamadanDay = periodDays[periodDays.length - 1];
          const [ly, lm, ld] = lastRamadanDay.dateKey.split("-").map(Number);
          const maxPossibleEidKey = formatDateKey(new Date(ly, lm - 1, ld + 2));
          if (periodDays.length >= 28 && maxPossibleEidKey < referenceKey) {
            continue;
          }

          // Şevval 1. günü (Bayram) al
          let bayramDateKey: string | null = null;
          try {
            const eidRes = await fetchWithRetry(
              `https://api.aladhan.com/v1/hijriCalendar/${hijriYearToUse}/10?latitude=${city.lat}&longitude=${city.lng}&method=13`
            );
            const eidJson = await eidRes.json().catch(() => ({}));
            const eidList = eidJson?.data as Record<string, unknown>[] | undefined;
            const eidFirstDay = eidList?.[0];
            if (eidFirstDay) {
              const parsedEid = parseGregorianRow(eidFirstDay);
              const eidTimes = normalizePrayerTimesFromTimings(eidFirstDay?.timings as AladhanTimings | undefined);
              const eh = (eidFirstDay?.date as Record<string, unknown> | undefined)?.hijri as Record<string, unknown> | undefined;
              if (parsedEid && eidTimes) {
                bayramDateKey = parsedEid.dateKey;
                periodDays.push({
                  dateKey: bayramDateKey,
                  dateLabel: parsedEid.dateLabel,
                  times: eidTimes,
                  hijri: {
                    year: Number(eh?.year || hijriYearToUse),
                    monthNumber: 10,
                    monthName: "Şevval",
                    day: Number(eh?.day || 1),
                  },
                });
              }
            }
          } catch (err) {
            console.warn("[Prayer API] Bayram günü alınırken hata:", err);
          }

          if (!bayramDateKey) {
            const nextD = new Date(ly, lm - 1, ld + 1);
            bayramDateKey = formatDateKey(nextD);
          }

          const kadirDateKey = day26Key ?? day27Key ?? periodDays[Math.min(25, periodDays.length - 1)].dateKey;

          const result: RamadanPeriod = {
            startDateKey: periodDays[0].dateKey,
            bayramDateKey,
            kadirDateKey,
            days: periodDays,
          };

          if (result.bayramDateKey < referenceKey) continue;
          setCachedData(cacheKey, result);
          return result;
        } catch (candidateError) {
          console.warn(`[Prayer API] ${hijriYearToUse} Ramazan takvimi alınamadı:`, candidateError);
        }
      }
      const staleFallback = getCachedData<RamadanPeriod>(cacheKey, Infinity);
      return staleFallback && staleFallback.bayramDateKey >= referenceKey ? staleFallback : null;
    } catch (e) {
      console.error("[Prayer API] Ramadan period getirme hatası:", e);
      const staleFallback = getCachedData<RamadanPeriod>(cacheKey, Infinity);
      return staleFallback && staleFallback.bayramDateKey >= referenceKey ? staleFallback : null;
    }
  })().finally(() => {
    inFlightRamadanRequests.delete(inFlightKey);
  });

  inFlightRamadanRequests.set(inFlightKey, fetchPromise);
  return fetchPromise;
}

export async function fetchPrayerTimes(city: City): Promise<PrayerTimesWithMeta | null> {
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
): Promise<PrayerTimesWithMeta | null> {
  const dateStr = formatDateForPrayerApi(date);
  const cacheKey = `daily_${city.name}_${dateStr}`;
  const inFlightKey = `${city.name}_${dateStr}`;

  const cached = getCachedData<PrayerTimesWithMeta>(cacheKey);
  if (cached) {
    return cached;
  }
  if (isNavigatorOffline()) {
    return getCachedData<PrayerTimesWithMeta>(cacheKey, Infinity);
  }

  if (inFlightDailyRequests.has(inFlightKey)) {
    return inFlightDailyRequests.get(inFlightKey)!;
  }

  const fetchPromise = (async (): Promise<PrayerTimesWithMeta | null> => {
    try {
      const response = await fetchWithRetry(
        `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${city.lat}&longitude=${city.lng}&method=13`
      );

      let data: Record<string, unknown>;
      try {
        data = await response.json();
      } catch {
        console.error("[Prayer API] Geçersiz JSON yanıtı (daily)");
        return getCachedData<PrayerTimesWithMeta>(cacheKey, Infinity);
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
        return getCachedData<PrayerTimesWithMeta>(cacheKey, Infinity);
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
        return getCachedData<PrayerTimesWithMeta>(cacheKey, Infinity);
      }

      const dateSection = dataObj.date as Record<string, unknown> | undefined;
      const hijriInfo = extractHijriInfo(dateSection?.hijri as Record<string, unknown> | undefined);

      const finalResult: PrayerTimesWithMeta = {
        ...result,
        ...(hijriInfo ? { hijri: hijriInfo } : {}),
      };

      setCachedData(cacheKey, finalResult);
      return finalResult;
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
      const cached = getCachedData<PrayerTimesWithMeta>(cacheKey, Infinity);
      if (cached) {
        console.info("[Prayer API] API erişilemedi — cache'den yükleniyor (daily).");
        return cached;
      }
      return null;
    }
  })().finally(() => {
    inFlightDailyRequests.delete(inFlightKey);
  });

  inFlightDailyRequests.set(inFlightKey, fetchPromise);
  return fetchPromise;
}

export function findNearestCity(
  lat: number,
  lng: number,
  cities: City[]
): City {
  if (cities.length === 0) {
    throw new Error("City list cannot be empty");
  }

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  let nearest = cities[0];
  let minDist = Infinity;

  for (const city of cities) {
    const dLat = toRad(city.lat - lat);
    const dLng = toRad(city.lng - lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat)) * Math.cos(toRad(city.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const dist = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (dist < minDist) {
      minDist = dist;
      nearest = city;
    }
  }

  return nearest;
}

export function getCurrentPrayer(times: PrayerTimes, now: Date = new Date()): keyof PrayerTimes | null {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const prayerOrder: (keyof PrayerTimes)[] = [
    "Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"
  ];

  const prayerMinutes = prayerOrder.map((key) => {
    const match = times[key]?.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return Number.POSITIVE_INFINITY;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (h < 0 || h > 23 || m < 0 || m > 59) return Number.POSITIVE_INFINITY;
    return h * 60 + m;
  });

  for (let i = prayerMinutes.length - 1; i >= 0; i--) {
    if (currentMinutes >= prayerMinutes[i]) {
      return prayerOrder[i];
    }
  }

  return null;
}
