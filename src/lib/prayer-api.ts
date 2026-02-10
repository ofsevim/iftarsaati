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

const PRAYER_API_TIMEOUT = 15000; // 15 saniye — yavaş mobil bağlantılar için

/**
 * Belirtilen URL'ye retry + timeout + CORS desteği ile istek atar.
 * - Her deneme arasında exponential backoff uygular.
 * - Başarısız yanıtların body'sini tüketir (bağlantı sızıntısını önler).
 * - AbortController desteği olmayan eski tarayıcılarda da çalışır.
 */
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  let lastError: unknown;

  for (let i = 0; i < retries; i++) {
    let controller: AbortController | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      // Bazı eski mobil tarayıcılarda AbortController yoktur
      if (typeof AbortController !== "undefined") {
        controller = new AbortController();
        timeoutId = setTimeout(() => controller!.abort(), PRAYER_API_TIMEOUT);
      }

      const response = await fetch(url, {
        signal: controller?.signal,
        mode: "cors",              // Açıkça CORS belirt
        cache: "no-store",         // Tarayıcı disk cache'inden bozuk yanıt gelmesin
        credentials: "omit",       // Cookie gönderme — gereksiz CORS preflight'ı önler
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

    // Son deneme değilse bekle (exponential backoff)
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

      let json: any;
      try {
        json = await res.json();
      } catch {
        console.error("Monthly API: Geçersiz JSON yanıtı");
        continue;
      }

      if (!json?.data || !Array.isArray(json.data)) {
        console.error("Monthly API: Beklenmeyen yanıt yapısı", json);
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
  try {
    const dateStr = formatDateForPrayerApi(date);
    const response = await fetchWithRetry(
      `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${city.lat}&longitude=${city.lng}&method=13`
    );

    let data: any;
    try {
      data = await response.json();
    } catch {
      console.error("Prayer API: Geçersiz JSON yanıtı");
      return null;
    }

    // Yanıt yapısını doğrula
    if (!data?.data?.timings) {
      console.error("Prayer API: Beklenmeyen yanıt yapısı", data);
      return null;
    }

    const timings = data.data.timings;

    // Helper: "18:13 (TRT)" → "18:13"
    const normalizeTime = (t: string) => t.split(" ")[0];

    return {
      Fajr: normalizeTime(timings.Fajr),
      Sunrise: normalizeTime(timings.Sunrise),
      Dhuhr: normalizeTime(timings.Dhuhr),
      Asr: normalizeTime(timings.Asr),
      Maghrib: normalizeTime(timings.Maghrib),
      Isha: normalizeTime(timings.Isha),
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
  return getTimeUntilIftarWithEzan(maghribTime);
}

/**
 * İftar sayacı:
 * - Akşam ezanı başladığında iftar vaktidir.
 * - Ezan bitene kadar ("ezan süresi") kullanıcıya "Hayırlı iftarlar" göstermek için `passed=true` döner.
 * - Ezan bittikten sonra sayaç otomatik olarak ertesi günün iftarına döner (yarın Maghrib verilmişse).
 */
export function getTimeUntilIftarWithEzan(
  todayMaghribTime: string,
  tomorrowMaghribTime?: string,
  opts?: {
    /**
     * Ezanın ortalama süresi (dakika). Varsayılan: 4 dk.
     * Not: Diyanet/şehir/camiye göre değişebilir; UI davranışı için pratik bir varsayım.
     */
    ezanDurationMinutes?: number;
    /** Test ve deterministik kullanım için "şu an" override. */
    now?: Date;
  }
): {
  hours: number;
  minutes: number;
  seconds: number;
  passed: boolean;
} {
  const now = opts?.now ?? new Date();
  const ezanDurationMinutes = opts?.ezanDurationMinutes ?? 4;

  const parseTimeOnDate = (base: Date, time: string) => {
    const [h, m] = time.split(":").map(Number);
    const d = new Date(base);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const todayIftar = parseTimeOnDate(now, todayMaghribTime);
  const ezanEnd = new Date(todayIftar.getTime() + ezanDurationMinutes * 60 * 1000);

  // İftar henüz gelmediyse: bugünün iftarına say.
  if (now.getTime() < todayIftar.getTime()) {
    const diff = todayIftar.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { hours, minutes, seconds, passed: false };
  }

  // İftar geldi ama ezan bitmediyse: "Hayırlı iftarlar" modunda kal.
  if (now.getTime() <= ezanEnd.getTime()) {
    return { hours: 0, minutes: 0, seconds: 0, passed: true };
  }

  // Ezan bitti: yarının iftarına say (varsa).
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const target = tomorrowMaghribTime
    ? parseTimeOnDate(tomorrow, tomorrowMaghribTime)
    : new Date(todayIftar.getTime() + 24 * 60 * 60 * 1000); // fallback: aynı saat + 1 gün

  const diff = target.getTime() - now.getTime();
  if (diff <= 0) {
    // Teorik edge-case: saat ayarı vs. vb.
    return { hours: 0, minutes: 0, seconds: 0, passed: false };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { hours, minutes, seconds, passed: false };
}

export type IftarCountdownMode = "iftar" | "imsak";

/**
 * İftar sayacı (ezan penceresi dahil) → ezan bittikten sonra "imsaka/sahur bitimine" kalan süre.
 *
 * Dönüş:
 * - `mode="iftar"` + `passed=false` => iftara kalan süre
 * - `mode="iftar"` + `passed=true`  => iftar (ezan) anı / "Hayırlı iftarlar" penceresi
 * - `mode="imsak"` + `passed=false` => imsaka (sahurun bitimine) kalan süre
 */
export function getTimeUntilIftarThenImsak(
  todayMaghribTime: string,
  tomorrowFajrTime?: string,
  opts?: {
    /** Bugünün Fajr (imsak) vakti. Gece yarısı–Fajr arasında sahur sayacı için gerekli. */
    todayFajrTime?: string;
    /** Ezanın ortalama süresi (dakika). Varsayılan: 4 dk. */
    ezanDurationMinutes?: number;
    /** Test ve deterministik kullanım için "şu an" override. */
    now?: Date;
  }
): {
  hours: number;
  minutes: number;
  seconds: number;
  passed: boolean;
  mode: IftarCountdownMode;
} {
  const now = opts?.now ?? new Date();
  const ezanDurationMinutes = opts?.ezanDurationMinutes ?? 4;

  const parseTimeOnDate = (base: Date, time: string) => {
    const [h, m] = time.split(":").map(Number);
    const d = new Date(base);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const calcDiff = (target: Date) => {
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0 };
    return {
      hours: Math.floor(diff / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
    };
  };

  // 1) Gece yarısı – Fajr arası: sahur hâlâ devam ediyor, imsaka say.
  if (opts?.todayFajrTime) {
    const todayFajr = parseTimeOnDate(now, opts.todayFajrTime);
    if (now.getTime() < todayFajr.getTime()) {
      const d = calcDiff(todayFajr);
      return { ...d, passed: false, mode: "imsak" };
    }
  }

  // 2) Fajr – Maghrib arası: iftara say.
  const todayIftar = parseTimeOnDate(now, todayMaghribTime);
  if (now.getTime() < todayIftar.getTime()) {
    const d = calcDiff(todayIftar);
    return { ...d, passed: false, mode: "iftar" };
  }

  // 3) Ezan penceresi (Maghrib → +4dk): "Hayırlı iftarlar".
  const ezanEnd = new Date(todayIftar.getTime() + ezanDurationMinutes * 60 * 1000);
  if (now.getTime() <= ezanEnd.getTime()) {
    return { hours: 0, minutes: 0, seconds: 0, passed: true, mode: "iftar" };
  }

  // 4) Ezan bitti → yarının Fajr'ına (imsak) say.
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const target = tomorrowFajrTime
    ? parseTimeOnDate(tomorrow, tomorrowFajrTime)
    : new Date(todayIftar.getTime() + 12 * 60 * 60 * 1000); // fallback

  const diff = target.getTime() - now.getTime();
  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, passed: false, mode: "imsak" };
  }

  const d = calcDiff(target);
  return { ...d, passed: false, mode: "imsak" };
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
