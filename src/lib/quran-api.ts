const RAMADAN_AYAHS = [
  "2:183", "2:185", "2:186", "2:187", "97:1",
  "97:3",  "2:255", "3:17",  "51:18", "11:114",
  "73:20", "17:78", "24:36", "35:29", "3:191",
  "39:9",  "76:25", "25:63", "3:133", "57:3",
  "59:22", "55:26", "20:14", "16:97", "3:200",
  "8:2",   "23:1",  "49:13", "112:1", "1:1",
];

export interface AyahData {
  arabic: string;
  turkish: string;
  reference: string;
}

function getDayIndex(): number {
  const now = new Date();
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return seed % RAMADAN_AYAHS.length;
}

function getCacheKey(): string {
  const now = new Date();
  return `ayah_${now.getFullYear()}_${now.getMonth() + 1}_${now.getDate()}`;
}

export async function fetchDailyAyah(): Promise<AyahData | null> {
  const cacheKey = getCacheKey();

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as AyahData;
  } catch {}

  const ref = RAMADAN_AYAHS[getDayIndex()];

  try {
    const res = await fetch(
      `https://api.alquran.cloud/v1/ayah/${ref}/editions/quran-uthmani,tr.yazir`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;

    const json = await res.json();
    if (!json?.data || !Array.isArray(json.data) || json.data.length < 2) return null;

    const arabicEdition = json.data[0];
    const turkishEdition = json.data[1];

    const result: AyahData = {
      arabic: arabicEdition.text,
      turkish: turkishEdition.text,
      reference: `${arabicEdition.surah.name} — ${arabicEdition.surah.number}:${arabicEdition.numberInSurah}`,
    };

    try {
      localStorage.setItem(cacheKey, JSON.stringify(result));
    } catch {}

    return result;
  } catch {
    return null;
  }
}
