import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type Locale = "tr" | "en" | "ar";

const translations = {
  tr: {
    appTitle: "İftar Vakti",
    subtitle: "Ramazan-ı Şerif'iniz mübarek olsun",
    location: "Konum",
    searchCity: "Şehir ara...",
    timeToIftar: "İftara Kalan Süre",
    timeToSahur: "Sahurun Bitimine Kalan Süre",
    iftarTime: "İftar vakti",
    happyIftar: "Hayırlı İftarlar! 🌙",
    bayramDay: "Bayram Günü",
    bayramCountdown: "Bayramın Bitimine Kalan Süre",
    happyBayram: "Bayramınız Mübarek Olsun!",
    prayerTimes: "Namaz Vakitleri",
    loading: "Vakitler yükleniyor...",
    noData: "Vakit verileri şu an alınamadı.",
    hours: "Saat",
    minutes: "Dakika",
    seconds: "Saniye",
    fajr: "İmsak",
    sunrise: "Güneş",
    dhuhr: "Öğle",
    asr: "İkindi",
    maghrib: "Akşam",
    isha: "Yatsı",
    imsakiye: "Ramazan İmsakiyesi 2026",
    day: "Gün",
    date: "Tarih",
    share: "Paylaş",
    shareIftar: "iftara {hours} saat {minutes} dakika kaldı!",
    shareSahur: "sahura {hours} saat {minutes} dakika kaldı!",
    qibla: "Kıble",
    qiblaDesc: "Kıble yönünü bulmak için cihazınızı düz tutun",
    qiblaNoSensor: "Cihazınız pusula sensörünü desteklemiyor",
    nearbyMosques: "Yakın Camiler",
    mosquesLoading: "Camiler aranıyor...",
    mosquesNone: "Yakında cami bulunamadı",
    mosquesError: "Konum alınamadı",
    notifications: "Bildirimler",
    dailyDua: "Günün Duası",
    dailyReminder: "Hatırlatma",
    footerText: "Bu bir",
    footerProduct: "ürünüdür",
    bayramNamazi: "BAYRAM NAMAZI",
    ramadanBayram: "Ramazan Bayramı",
    sunday: "Pazar",
    monday: "Pazartesi",
    tuesday: "Salı",
    wednesday: "Çarşamba",
    thursday: "Perşembe",
    friday: "Cuma",
    saturday: "Cumartesi",
  },
  en: {
    appTitle: "Iftar Time",
    subtitle: "May your Ramadan be blessed",
    location: "Location",
    searchCity: "Search city...",
    timeToIftar: "Time Until Iftar",
    timeToSahur: "Time Until Sahur Ends",
    iftarTime: "Iftar time",
    happyIftar: "Happy Iftar! 🌙",
    bayramDay: "Eid Day",
    bayramCountdown: "Time Until Eid Ends",
    happyBayram: "Eid Mubarak!",
    prayerTimes: "Prayer Times",
    loading: "Loading times...",
    noData: "Could not load prayer times.",
    hours: "Hours",
    minutes: "Minutes",
    seconds: "Seconds",
    fajr: "Fajr",
    sunrise: "Sunrise",
    dhuhr: "Dhuhr",
    asr: "Asr",
    maghrib: "Maghrib",
    isha: "Isha",
    imsakiye: "Ramadan Timetable 2026",
    day: "Day",
    date: "Date",
    share: "Share",
    shareIftar: "{hours}h {minutes}m left until iftar!",
    shareSahur: "{hours}h {minutes}m left until sahur!",
    qibla: "Qibla",
    qiblaDesc: "Hold your device flat to find Qibla direction",
    qiblaNoSensor: "Your device does not support compass sensor",
    nearbyMosques: "Nearby Mosques",
    mosquesLoading: "Searching mosques...",
    mosquesNone: "No mosques found nearby",
    mosquesError: "Could not get location",
    notifications: "Notifications",
    dailyDua: "Daily Dua",
    dailyReminder: "Reminder",
    footerText: "A product of",
    footerProduct: "",
    bayramNamazi: "EID PRAYER",
    ramadanBayram: "Eid al-Fitr",
    sunday: "Sun",
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
  },
  ar: {
    appTitle: "وقت الإفطار",
    subtitle: "رمضان كريم",
    location: "الموقع",
    searchCity: "ابحث عن مدينة...",
    timeToIftar: "الوقت المتبقي للإفطار",
    timeToSahur: "الوقت المتبقي للسحور",
    iftarTime: "وقت الإفطار",
    happyIftar: "إفطار سعيد! 🌙",
    bayramDay: "يوم العيد",
    bayramCountdown: "الوقت المتبقي لنهاية العيد",
    happyBayram: "عيد مبارك!",
    prayerTimes: "مواقيت الصلاة",
    loading: "جاري التحميل...",
    noData: "تعذر تحميل المواقيت.",
    hours: "ساعة",
    minutes: "دقيقة",
    seconds: "ثانية",
    fajr: "الفجر",
    sunrise: "الشروق",
    dhuhr: "الظهر",
    asr: "العصر",
    maghrib: "المغرب",
    isha: "العشاء",
    imsakiye: "إمساكية رمضان 2026",
    day: "يوم",
    date: "تاريخ",
    share: "مشاركة",
    shareIftar: "بقي {hours} ساعة و{minutes} دقيقة على الإفطار!",
    shareSahur: "بقي {hours} ساعة و{minutes} دقيقة على السحور!",
    qibla: "القبلة",
    qiblaDesc: "أمسك جهازك بشكل مسطح لتحديد اتجاه القبلة",
    qiblaNoSensor: "جهازك لا يدعم مستشعر البوصلة",
    nearbyMosques: "المساجد القريبة",
    mosquesLoading: "جاري البحث عن المساجد...",
    mosquesNone: "لم يتم العثور على مساجد قريبة",
    mosquesError: "تعذر الحصول على الموقع",
    notifications: "الإشعارات",
    dailyDua: "دعاء اليوم",
    dailyReminder: "تذكير",
    footerText: "منتج من",
    footerProduct: "",
    bayramNamazi: "صلاة العيد",
    ramadanBayram: "عيد الفطر",
    sunday: "الأحد",
    monday: "الإثنين",
    tuesday: "الثلاثاء",
    wednesday: "الأربعاء",
    thursday: "الخميس",
    friday: "الجمعة",
    saturday: "السبت",
  },
} as const;

export type TranslationKey = keyof typeof translations.tr;

type I18nContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const saved = localStorage.getItem("locale");
      if (saved && (saved === "tr" || saved === "en" || saved === "ar")) return saved;
    } catch {}
    return "tr";
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem("locale", l); } catch {}
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      let text = translations[locale][key] ?? translations.tr[key] ?? key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(`{${k}}`, String(v));
        });
      }
      return text;
    },
    [locale]
  );

  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
