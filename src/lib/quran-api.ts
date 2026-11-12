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

const TURKISH_SURAH_NAMES: Record<number, string> = {
  1: "Fâtiha Sûresi",
  2: "Bakara Sûresi",
  3: "Âl-i İmrân Sûresi",
  8: "Enfâl Sûresi",
  11: "Hûd Sûresi",
  16: "Nahl Sûresi",
  17: "İsrâ Sûresi",
  20: "Tâhâ Sûresi",
  23: "Mü'minûn Sûresi",
  24: "Nûr Sûresi",
  25: "Furkân Sûresi",
  35: "Fâtır Sûresi",
  39: "Zümer Sûresi",
  49: "Hucurât Sûresi",
  51: "Zâriyât Sûresi",
  55: "Rahmân Sûresi",
  57: "Hadîd Sûresi",
  59: "Haşr Sûresi",
  73: "Müzzemmil Sûresi",
  76: "İnsân Sûresi",
  97: "Kadir Sûresi",
  112: "İhlâs Sûresi",
};

function getDayIndex(now: Date = new Date()): number {
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return seed % RAMADAN_AYAHS.length;
}

function getCacheKey(now: Date = new Date()): string {
  return `ayah_${now.getFullYear()}_${now.getMonth() + 1}_${now.getDate()}`;
}

function isValidAyahData(value: unknown): value is AyahData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.arabic === "string" &&
    candidate.arabic.length > 0 &&
    typeof candidate.turkish === "string" &&
    candidate.turkish.length > 0 &&
    typeof candidate.reference === "string" &&
    candidate.reference.length > 0
  );
}

function pruneStaleAyahCache(keepKey: string): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("ayah_") && k !== keepKey) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
  } catch { /* storage access error */ }
}

const OFFLINE_AYAHS: AyahData[] = [
  {
    arabic: "يَا أَيُّهَا الَّذِينَ آمَنُوا كُتِبَ عَلَيْكُمُ الصِّيَامُ كَمَا كُتِبَ عَلَى الَّذِينَ مِن قَبْلِكُمْ لَعَلَّكُمْ تَتَّقُونَ",
    turkish: "Ey iman edenler! Oruç, sizden öncekilere farz kılındığı gibi, takva sahibi olasınız diye size de farz kılındı.",
    reference: "Bakara Sûresi — 2:183",
  },
  {
    arabic: "شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْآنُ هُدًى لِّلنَّاسِ وَبَيِّنَاتٍ مِّنَ الْهُدَىٰ وَالْفُرْقَانِ",
    turkish: "O Ramazan ayı ki, insanlara doğru yolu gösteren, hidayeti ve hak ile bâtılı ayıran apaçık delilleri içeren Kur'an onda indirilmiştir.",
    reference: "Bakara Sûresi — 2:185",
  },
  {
    arabic: "وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ",
    turkish: "Kullarım sana beni sorduklarında bilsinler ki, şüphesiz ben onlara çok yakınım. Bana dua edenin duasına icabet ederim.",
    reference: "Bakara Sûresi — 2:186",
  },
  {
    arabic: "إِنَّا أَنزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ",
    turkish: "Şüphesiz biz onu Kadir Gecesi'nde indirdik.",
    reference: "Kadir Sûresi — 97:1",
  },
  {
    arabic: "لَيْلَةُ الْقَدْرِ خَيْرٌ مِّنْ أَلْفِ شَهْرٍ",
    turkish: "Kadir Gecesi bin aydan daha hayırlıdır.",
    reference: "Kadir Sûresi — 97:3",
  },
  {
    arabic: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ",
    turkish: "Allah, O'ndan başka ilah olmayan, diri (Hayy) ve her şeyi ayakta tutandır (Kayyûm).",
    reference: "Bakara Sûresi — 2:255",
  },
  {
    arabic: "وَبِالْأَسْحَارِ هُمْ يَسْتَغْفِرُونَ",
    turkish: "Onlar seher vakitlerinde Allah'tan bağışlanma dilerlerdi.",
    reference: "Zâriyât Sûresi — 51:18",
  },
  {
    arabic: "وَأَقِمِ الصَّلَاةَ طَرَفَيِ النَّهَارِ وَزُلَفًا مِّنَ اللَّيْلِ ۚ إِنَّ الْحَسَنَاتِ يُذْهِبْنَ السَّيِّئَاتِ",
    turkish: "Gündüzün iki tarafında ve gecenin gündüze yakın saatlerinde namaz kıl. Şüphesiz iyilikler kötülükleri giderir.",
    reference: "Hûd Sûresi — 11:114",
  },
  {
    arabic: "قُلْ هُوَ اللَّهُ أَحَدٌ ۞ اللَّهُ الصَّمَدُ",
    turkish: "De ki: O, Allah'tır, bir tektir. Allah Samed'dir (her şey O'na muhtaçtır).",
    reference: "İhlâs Sûresi — 112:1-2",
  },
  {
    arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
    turkish: "Rabbimiz! Bize dünyada da iyilik ver, ahirette de iyilik ver ve bizi ateş azabından koru.",
    reference: "Bakara Sûresi — 2:201",
  },
];

export async function fetchDailyAyah(date: Date = new Date()): Promise<AyahData> {
  const cacheKey = getCacheKey(date);

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed: unknown = JSON.parse(cached);
      if (isValidAyahData(parsed)) return parsed;
    }
  } catch { /* localStorage parse failure — ignore, fallback to API */ }

  const dayIdx = getDayIndex(date);
  const ref = RAMADAN_AYAHS[dayIdx];

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return OFFLINE_AYAHS[dayIdx % OFFLINE_AYAHS.length];
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    timeoutId = controller ? setTimeout(() => controller.abort(), 6000) : null;

    const res = await fetch(
      `https://api.alquran.cloud/v1/ayah/${ref}/editions/quran-uthmani,tr.yazir`,
      { cache: "no-store", signal: controller?.signal }
    );

    if (res.ok) {
      const json = await res.json();
      if (json?.data && Array.isArray(json.data) && json.data.length >= 2) {
        const arabicEdition = json.data[0];
        const turkishEdition = json.data[1];
        const arabicText = typeof arabicEdition?.text === "string" ? arabicEdition.text.trim() : "";
        const turkishText = typeof turkishEdition?.text === "string" ? turkishEdition.text.trim() : "";
        const surahNumber = Number(arabicEdition?.surah?.number);
        const ayahNumber = Number(arabicEdition?.numberInSurah);

        if (arabicText && turkishText && Number.isFinite(surahNumber) && Number.isFinite(ayahNumber)) {
          const surahName =
            TURKISH_SURAH_NAMES[surahNumber] ||
            (typeof arabicEdition?.surah?.name === "string" && arabicEdition.surah.name) ||
            `${surahNumber}. Sûre`;

          const result: AyahData = {
            arabic: arabicText,
            turkish: turkishText,
            reference: `${surahName} — ${surahNumber}:${ayahNumber}`,
          };

          pruneStaleAyahCache(cacheKey);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(result));
          } catch { /* quota */ }

          return result;
        }
      }
    }
  } catch {
    // API hatası veya timeout durumunda offline fallback'e geç
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  return OFFLINE_AYAHS[dayIdx % OFFLINE_AYAHS.length];
}
