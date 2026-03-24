import { useState, useEffect, useCallback, useRef } from "react";
import { MapPin, Search, ChevronDown, Moon, Star, Volume2, VolumeX } from "lucide-react";
import Imsakiye from "@/components/Imsakiye";
import DailyContentCard from "@/components/DailyContentCard";
import NotificationManager from "@/components/NotificationManager";
import bgPattern from "@/assets/bg-pattern.jpg";
import {
  TURKEY_CITIES,
  QUICK_CITIES,
  PRAYER_LABELS,
  PRAYER_ICONS,
  type City,
  type PrayerTimes,
} from "@/data/cities";
import {
  fetchPrayerTimes,
  fetchPrayerTimesForDate,
  findNearestCity,
  getTimeUntilIftarThenImsak,
} from "@/lib/prayer-api";
import { normalizeForSearch } from "@/lib/utils";

const BAYRAM_DATE_KEY = "2027-03-10";

type CountdownMode = "Fajr" | "Sunrise" | "Dhuhr" | "Asr" | "Maghrib" | "Isha" | "bayram";

function safeStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Safari private mode vb. durumlarda sessizce geç
  }
}

const Index = () => {
  const [selectedCity, setSelectedCity] = useState<City>(() => {
    const savedCity = safeStorageGet("selectedCity");
    if (savedCity) {
      const city = TURKEY_CITIES.find((c) => c.name === savedCity);
      if (city) return city;
    }
    return TURKEY_CITIES.find((c) => c.name === "İstanbul")!;
  });
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [tomorrowFajr, setTomorrowFajr] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    passed: boolean;
    mode: CountdownMode;
  }>({ hours: 0, minutes: 0, seconds: 0, passed: false, mode: "Maghrib" });
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const azanAudioRef = useRef<HTMLAudioElement | null>(null);
  const azanPlayedRef = useRef(false);
  const [azanEnabled, setAzanEnabled] = useState<boolean>(() => safeStorageGet("azanEnabled") === "true");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);
  const [favoriteCities, setFavoriteCities] = useState<string[]>(() => {
    const saved = safeStorageGet("favoriteCities");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[];
        // Geçerli şehirleri filtrele (TURKEY_CITIES'te olmayanları çıkar)
        const validCityNames = TURKEY_CITIES.map((c) => c.name);
        const filtered = parsed.filter((name) => validCityNames.includes(name));
        if (filtered.length) return filtered;
      } catch (error) {
        console.error("Failed to parse favorite cities:", error);
      }
    }
    return QUICK_CITIES;
  });

  const toggleFavorite = (cityName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Tüm geçerli şehirler favorilere eklenebilir
    if (!TURKEY_CITIES.some((c) => c.name === cityName)) return;
    const newFavorites = favoriteCities.includes(cityName)
      ? favoriteCities.filter((name) => name !== cityName)
      : [...favoriteCities, cityName];
    setFavoriteCities(newFavorites);
    safeStorageSet("favoriteCities", JSON.stringify(newFavorites));
  };

  useEffect(() => {
    if (countdown.passed && countdown.mode === "Maghrib" && azanEnabled) {
      if (!azanPlayedRef.current && azanAudioRef.current) {
        azanPlayedRef.current = true;
        azanAudioRef.current.play().catch(() => {});
      }
    } else if (!countdown.passed) {
      azanPlayedRef.current = false;
      if (azanAudioRef.current && !azanAudioRef.current.paused) {
        azanAudioRef.current.pause();
        azanAudioRef.current.currentTime = 0;
      }
    }
  }, [countdown.passed, countdown.mode, azanEnabled]);

  const loadPrayerTimes = useCallback(async (city: City) => {
    setLoading(true);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const [todayTimes, tomorrowTimes] = await Promise.all([
      fetchPrayerTimes(city),
      fetchPrayerTimesForDate(city, tomorrow),
    ]);

    // Yeni veri alınamazsa mevcut veriyi silmeyelim; kullanıcıya boş ekran göstermeyelim.
    if (todayTimes) {
      setPrayerTimes(todayTimes);
    }
    setTomorrowFajr(tomorrowTimes?.Fajr ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPrayerTimes(selectedCity);
    safeStorageSet("selectedCity", selectedCity.name);
  }, [selectedCity, loadPrayerTimes]);

  useEffect(() => {
    if (!prayerTimes) return;

    const getDateKey = (date: Date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    const getTimeUntilEndOfDay = (now: Date) => {
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      const diff = endOfDay.getTime() - now.getTime();

      if (diff <= 0) {
        return { hours: 0, minutes: 0, seconds: 0, passed: true };
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      return { hours, minutes, seconds, passed: false };
    };

    const updateCountdown = () => {
      const now = new Date();

      // Bayram gününde özel sayaç: günün bitimine kadar geri sayım.
      if (getDateKey(now) === BAYRAM_DATE_KEY) {
        const bayramCountdown = getTimeUntilEndOfDay(now);
        setCountdown({ ...bayramCountdown, mode: "bayram" });
        return;
      }

      // Genel süre hesabı "sonraki vakte kalan süre" olarak ayarlandı:
      const parseTimeOnDate = (base: Date, time: string) => {
        const [h, m] = time.split(":").map(Number);
        const d = new Date(base);
        d.setHours(h, m, 0, 0);
        return d;
      };

      const prayers: { name: CountdownMode; time: Date }[] = [
        { name: "Fajr", time: parseTimeOnDate(now, prayerTimes.Fajr) },
        { name: "Sunrise", time: parseTimeOnDate(now, prayerTimes.Sunrise) },
        { name: "Dhuhr", time: parseTimeOnDate(now, prayerTimes.Dhuhr) },
        { name: "Asr", time: parseTimeOnDate(now, prayerTimes.Asr) },
        { name: "Maghrib", time: parseTimeOnDate(now, prayerTimes.Maghrib) },
        { name: "Isha", time: parseTimeOnDate(now, prayerTimes.Isha) },
      ];

      let nextPrayer = prayers.find(p => p.time.getTime() > now.getTime());

      if (!nextPrayer) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const targetTime = tomorrowFajr
          ? parseTimeOnDate(tomorrow, tomorrowFajr)
          : new Date(now.getTime() + 12 * 60 * 60 * 1000); 
        nextPrayer = { name: "Fajr", time: targetTime };
      }

      const maghribTime = parseTimeOnDate(now, prayerTimes.Maghrib);
      const maghribEnd = new Date(maghribTime.getTime() + 4 * 60 * 1000); 

      if (now.getTime() >= maghribTime.getTime() && now.getTime() <= maghribEnd.getTime()) {
        setCountdown({ hours: 0, minutes: 0, seconds: 0, passed: true, mode: "Maghrib" });
        return;
      }

      const diff = nextPrayer.time.getTime() - now.getTime();
      setCountdown({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        mode: nextPrayer.name,
        passed: false
      });
    };

    const interval = setInterval(() => {
      // Akşam ezanı bittikten sonra otomatik olarak imsaka (sahur bitimine) kalan süreyi göster.
      updateCountdown();
    }, 1000);
    updateCountdown();
    return () => clearInterval(interval);
  }, [prayerTimes, tomorrowFajr]);

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = findNearestCity(pos.coords.latitude, pos.coords.longitude, TURKEY_CITIES);
        setSelectedCity(nearest);
        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    setDropdownOpen(false);
    setSearchQuery("");
  };

  const filteredCities = TURKEY_CITIES.filter((c) =>
    normalizeForSearch(c.name).includes(normalizeForSearch(searchQuery))
  ).sort((a, b) => {
    const aFav = favoriteCities.includes(a.name);
    const bFav = favoriteCities.includes(b.name);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return a.name.localeCompare(b.name, "tr-TR");
  });

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgPattern})` }}
      />
      <div className="fixed inset-0 bg-background/60" />

      {/* Side Ornaments - Mobile only — İslami geometrik altın motif */}
      <svg aria-hidden="true" className="fixed inset-y-0 left-0 w-10 h-full z-0 pointer-events-none md:hidden" preserveAspectRatio="none">
        <defs>
          <pattern id="sideMotifL" x="0" y="0" width="40" height="80" patternUnits="userSpaceOnUse">
            {/* Altın çizgi çerçeve */}
            <line x1="38" y1="0" x2="38" y2="80" stroke="hsl(36,55%,55%)" strokeWidth="0.5" opacity="0.25" />
            {/* Tekrar eden sekizgen geometrik desen */}
            <path d="M20,5 L30,15 L30,25 L20,35 L10,25 L10,15 Z" fill="none" stroke="hsl(36,55%,55%)" strokeWidth="0.6" opacity="0.18" />
            <path d="M20,45 L30,55 L30,65 L20,75 L10,65 L10,55 Z" fill="none" stroke="hsl(36,55%,55%)" strokeWidth="0.6" opacity="0.18" />
            {/* Merkez yıldız */}
            <circle cx="20" cy="20" r="2" fill="hsl(36,60%,70%)" opacity="0.15" />
            <circle cx="20" cy="60" r="2" fill="hsl(36,60%,70%)" opacity="0.15" />
            {/* Bağlantı çizgileri */}
            <line x1="20" y1="35" x2="20" y2="45" stroke="hsl(36,55%,55%)" strokeWidth="0.4" opacity="0.15" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sideMotifL)" />
      </svg>
      <svg aria-hidden="true" className="fixed inset-y-0 right-0 w-10 h-full z-0 pointer-events-none md:hidden" preserveAspectRatio="none">
        <defs>
          <pattern id="sideMotifR" x="0" y="0" width="40" height="80" patternUnits="userSpaceOnUse">
            {/* Altın çizgi çerçeve */}
            <line x1="2" y1="0" x2="2" y2="80" stroke="hsl(36,55%,55%)" strokeWidth="0.5" opacity="0.25" />
            {/* Tekrar eden sekizgen geometrik desen */}
            <path d="M20,5 L30,15 L30,25 L20,35 L10,25 L10,15 Z" fill="none" stroke="hsl(36,55%,55%)" strokeWidth="0.6" opacity="0.18" />
            <path d="M20,45 L30,55 L30,65 L20,75 L10,65 L10,55 Z" fill="none" stroke="hsl(36,55%,55%)" strokeWidth="0.6" opacity="0.18" />
            {/* Merkez yıldız */}
            <circle cx="20" cy="20" r="2" fill="hsl(36,60%,70%)" opacity="0.15" />
            <circle cx="20" cy="60" r="2" fill="hsl(36,60%,70%)" opacity="0.15" />
            {/* Bağlantı çizgileri */}
            <line x1="20" y1="35" x2="20" y2="45" stroke="hsl(36,55%,55%)" strokeWidth="0.4" opacity="0.15" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sideMotifR)" />
      </svg>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center px-4 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Moon className="w-8 h-8 text-gold animate-pulse-gold" />
            <h1 className="text-4xl md:text-5xl font-display font-bold text-gold">
              İftar Vakti
            </h1>
            <Moon className="w-8 h-8 text-gold animate-pulse-gold" />
          </div>
          <p className="text-cream-muted text-sm md:text-base">
            Ramazan-ı Şerif'iniz mübarek olsun
          </p>
        </div>

        {/* City Selection */}
        <div className="w-full max-w-2xl mb-8 space-y-4">
          {/* Quick Cities */}
          <div className="flex flex-wrap justify-center gap-2">
            {favoriteCities.map((name) => {
              const city = TURKEY_CITIES.find((c) => c.name === name);
              if (!city) return null;
              return (
                <button
                  key={name}
                  onClick={() => handleCitySelect(city)}
                  className={`quick-btn ${selectedCity.name === name ? "selected" : ""}`}
                >
                  {name}
                </button>
              );
            })}
          </div>

          {/* Location & Dropdown Row */}
          <div className="flex gap-2 sm:gap-3 justify-center w-full">
            <button
              onClick={handleLocate}
              disabled={locating}
              className="glass-card gold-border px-3 sm:px-4 py-2.5 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-cream-muted hover:text-gold transition-colors cursor-pointer shrink-0"
            >
              <MapPin className="w-3.5 h-3.5 sm:w-4 h-4" />
              <span className="whitespace-nowrap">{locating ? "..." : "Konum"}</span>
            </button>

            <div className="relative flex-grow max-w-[200px]" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="glass-card gold-border px-3 sm:px-4 py-2.5 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-cream w-full justify-between"
              >
                <span className="truncate">{selectedCity.name}</span>
                <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute top-full mt-2 left-0 w-full bg-[#0d1217] backdrop-blur-xl rounded-2xl border gold-border overflow-hidden flex flex-col shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-3 border-b border-white/10">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                      <Search className="w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Şehir ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent text-sm text-cream outline-none w-full placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-[300px]">
                    {filteredCities.map((city) => {
                      const isFavorite = favoriteCities.includes(city.name);
                      return (
                        <div
                          key={city.name}
                          className={`flex items-center justify-between px-4 py-2.5 text-sm transition-colors cursor-pointer ${selectedCity.name === city.name
                            ? "bg-night-light"
                            : "hover:bg-night-light"
                            }`}
                          onClick={() => handleCitySelect(city)}
                        >
                          <span className={selectedCity.name === city.name ? "text-gold" : "text-cream-muted"}>
                            {city.name}
                          </span>
                          <button
                            onClick={(e) => toggleFavorite(city.name, e)}
                            className="p-1 hover:text-gold transition-colors"
                          >
                            <Star
                              className={`w-4 h-4 ${isFavorite ? "text-gold fill-gold" : "text-muted-foreground"
                                }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <NotificationManager
              iftarTime={prayerTimes?.Maghrib}
              sahurTime={prayerTimes?.Fajr}
              city={selectedCity}
            />

            <button
              onClick={() => {
                const newVal = !azanEnabled;
                setAzanEnabled(newVal);
                safeStorageSet("azanEnabled", String(newVal));
              }}
              className="glass-card gold-border p-2.5 flex items-center transition-colors hover:text-gold"
              aria-label={azanEnabled ? "Ezan sesini kapat" : "Ezan sesini aç"}
              title={azanEnabled ? "Ezan sesini kapat" : "Ezan sesini aç"}
            >
              {azanEnabled
                ? <Volume2 className="w-4 h-4 text-gold" />
                : <VolumeX className="w-4 h-4 text-cream-muted" />
              }
            </button>
          </div>
        </div>

        <audio
          ref={azanAudioRef}
          src="https://cdn.islamic.network/prayer-times/audio/adhan-makkah.mp3"
          preload="none"
        />

        {/* Countdown */}
        <div className="mb-10 text-center">
          <h2 className="font-display text-xl md:text-2xl text-gold-light mb-6">
            {countdown.mode === "bayram"
              ? (countdown.passed ? "Bayram Günü" : "Bayramın Bitimine Kalan Süre")
              : countdown.passed && countdown.mode === "Maghrib"
                ? "İftar vakti"
                : countdown.mode === "Fajr"
                  ? "İmsak (Sahur) Vaktine Kalan Süre"
                  : countdown.mode === "Sunrise"
                    ? "Güneşin Doğmasına Kalan Süre"
                    : countdown.mode === "Dhuhr"
                      ? "Öğle Vaktine Kalan Süre"
                      : countdown.mode === "Asr"
                        ? "İkindi Vaktine Kalan Süre"
                        : countdown.mode === "Maghrib"
                          ? "Akşam (İftar) Vaktine Kalan Süre"
                          : countdown.mode === "Isha"
                            ? "Yatsı Vaktine Kalan Süre"
                            : "Sonraki Vakte Kalan Süre"}
          </h2>

          {loading ? (
            <div className="text-cream-muted animate-pulse">Vakitler yükleniyor...</div>
          ) : !prayerTimes ? (
            <div className="text-cream-muted">Vakit verileri şu an alınamadı.</div>
          ) : countdown.passed && countdown.mode === "Maghrib" ? (
            <div className="text-2xl md:text-3xl font-display text-gold">
              {countdown.mode === "bayram" ? "Bayramınız Mübarek Olsun!" : "Hayırlı İftarlar! 🌙"}
            </div>
          ) : (
            <div className="flex items-center gap-3 md:gap-4 justify-center">
              <div className="text-center">
                <div className="countdown-digit">{pad(countdown.hours || 0)}</div>
                <span className="text-xs text-cream-muted mt-2 block">Saat</span>
              </div>
              <span className="text-3xl md:text-5xl text-gold font-bold animate-pulse-gold">:</span>
              <div className="text-center">
                <div className="countdown-digit">{pad(countdown.minutes || 0)}</div>
                <span className="text-xs text-cream-muted mt-2 block">Dakika</span>
              </div>
              <span className="text-3xl md:text-5xl text-gold font-bold animate-pulse-gold">:</span>
              <div className="text-center">
                <div className="countdown-digit">{pad(countdown.seconds || 0)}</div>
                <span className="text-xs text-cream-muted mt-2 block">Saniye</span>
              </div>
            </div>
          )}
        </div>

        {/* Prayer Times */}
        {prayerTimes && (
          <div className="w-full max-w-3xl mb-10">
            <h3 className="font-display text-lg text-gold-light text-center mb-4">
              {selectedCity.name} — Namaz Vakitleri
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {(Object.keys(PRAYER_LABELS) as (keyof PrayerTimes)[]).map((key) => (
                <div
                  key={key}
                  className="prayer-card"
                >
                  <div className="mb-1 flex items-center justify-center">
                    {(() => {
                      const Icon = PRAYER_ICONS[key];
                      return (
                        <Icon
                          aria-hidden="true"
                          className="h-6 w-6 text-gold-light"
                        />
                      );
                    })()}
                  </div>
                  <div className="text-xs text-cream-muted mb-1">{PRAYER_LABELS[key]}</div>
                  <div className="text-lg font-semibold text-cream font-sans">
                    {prayerTimes[key]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Daily Content */}
        <DailyContentCard />

        {/* Imsakiye */}
        <Imsakiye city={selectedCity} />

        {/* Footer */}
        <footer className="mt-1.5 mb-2 text-center">
          <p className="text-xs text-cream-muted/50">
            Bu bir{" "}
            <a
              href="https://omersevim.com.tr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold/60 font-medium hover:text-gold transition-colors"
            >
              Osoft
            </a>{" "}
            ürünüdür
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
