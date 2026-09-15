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

export async function fetchDailyAyah(): Promise<AyahData> {
  const cacheKey = getCacheKey();

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as AyahData;
  } catch { /* localStorage parse failure — ignore, fallback to API */ }

  const dayIdx = getDayIndex();
  const ref = RAMADAN_AYAHS[dayIdx];

  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 6000) : null;

    const res = await fetch(
      `https://api.alquran.cloud/v1/ayah/${ref}/editions/quran-uthmani,tr.yazir`,
      { cache: "no-store", signal: controller?.signal }
    );
    if (timeoutId) clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json?.data && Array.isArray(json.data) && json.data.length >= 2) {
        const arabicEdition = json.data[0];
        const turkishEdition = json.data[1];

        const result: AyahData = {
          arabic: arabicEdition.text,
          turkish: turkishEdition.text,
          reference: `${arabicEdition.surah.name} — ${arabicEdition.surah.number}:${arabicEdition.numberInSurah}`,
        };

        try {
          localStorage.setItem(cacheKey, JSON.stringify(result));
        } catch { /* quota */ }

        return result;
      }
    }
  } catch {
    // API hatası veya timeout durumunda offline fallback'e geç
  }

  return OFFLINE_AYAHS[dayIdx % OFFLINE_AYAHS.length];
}
