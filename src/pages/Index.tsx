import { useState, useEffect, useCallback, useRef } from "react";
import { MapPin, Search, ChevronDown, Moon, Star } from "lucide-react";
import Imsakiye from "@/components/Imsakiye";
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

const Index = () => {
  const [selectedCity, setSelectedCity] = useState<City>(() => {
    const savedCity = localStorage.getItem("selectedCity");
    if (savedCity) {
      const city = TURKEY_CITIES.find((c) => c.name === savedCity);
      if (city) return city;
    }
    return TURKEY_CITIES.find((c) => c.name === "İstanbul")!;
  });
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [tomorrowFajr, setTomorrowFajr] = useState<string | null>(null);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0, passed: false, mode: "iftar" as const });
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    const saved = localStorage.getItem("favoriteCities");
    if (saved) return JSON.parse(saved);
    return QUICK_CITIES;
  });

  const toggleFavorite = (cityName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorites = favoriteCities.includes(cityName)
      ? favoriteCities.filter((name) => name !== cityName)
      : [...favoriteCities, cityName];
    setFavoriteCities(newFavorites);
    localStorage.setItem("favoriteCities", JSON.stringify(newFavorites));
  };

  const loadPrayerTimes = useCallback(async (city: City) => {
    setLoading(true);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const [todayTimes, tomorrowTimes] = await Promise.all([
      fetchPrayerTimes(city),
      fetchPrayerTimesForDate(city, tomorrow),
    ]);

    setPrayerTimes(todayTimes);
    setTomorrowFajr(tomorrowTimes?.Fajr ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPrayerTimes(selectedCity);
    localStorage.setItem("selectedCity", selectedCity.name);
  }, [selectedCity, loadPrayerTimes]);

  useEffect(() => {
    if (!prayerTimes) return;
    const interval = setInterval(() => {
      // Akşam ezanı bittikten sonra otomatik olarak imsaka (sahur bitimine) kalan süreyi göster.
      setCountdown(getTimeUntilIftarThenImsak(prayerTimes.Maghrib, tomorrowFajr ?? undefined));
    }, 1000);
    setCountdown(getTimeUntilIftarThenImsak(prayerTimes.Maghrib, tomorrowFajr ?? undefined));
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
  ).sort((a, b) => a.name.localeCompare(b.name, "tr-TR"));

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgPattern})` }}
      />
      <div className="fixed inset-0 bg-background/60" />

      {/* Side Ornaments - Mobile only */}
      <div
        aria-hidden="true"
        className="fixed inset-y-0 left-0 w-8 z-0 opacity-40 pointer-events-none md:hidden"
      >
        <div
          className="h-full w-full bg-repeat-y bg-contain"
          style={{
            backgroundImage: `url(${bgPattern})`,
            backgroundPosition: 'left center'
          }}
        />
        <div className="absolute inset-y-0 right-0 w-[1px] bg-gold/20" />
      </div>
      <div
        aria-hidden="true"
        className="fixed inset-y-0 right-0 w-8 z-0 opacity-40 pointer-events-none md:hidden"
      >
        <div
          className="h-full w-full bg-repeat-y bg-contain"
          style={{
            backgroundImage: `url(${bgPattern})`,
            backgroundPosition: 'right center'
          }}
        />
        <div className="absolute inset-y-0 left-0 w-[1px] bg-gold/20" />
      </div>

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
                <div className="absolute top-full mt-2 left-0 w-full glass-card gold-border overflow-hidden flex flex-col shadow-2xl z-50">
                  <div className="p-2 border-b border-border">
                    <div className="flex items-center gap-2 bg-input rounded-lg px-3 py-2">
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
          </div>
        </div>

        {/* Countdown */}
        <div className="mb-10 text-center">
          <h2 className="font-display text-xl md:text-2xl text-gold-light mb-6">
            {countdown.passed
              ? "İftar vakti"
              : countdown.mode === "imsak"
                ? "Sahurun Bitimine Kalan Süre"
                : "İftara Kalan Süre"}
          </h2>

          {loading ? (
            <div className="text-cream-muted animate-pulse">Vakitler yükleniyor...</div>
          ) : !prayerTimes ? (
            <div className="text-cream-muted">Vakit verileri şu an alınamadı.</div>
          ) : countdown.passed ? (
            <div className="text-2xl md:text-3xl font-display text-gold">
              Hayırlı İftarlar! 🌙
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
                  <div className="text-2xl mb-1">{PRAYER_ICONS[key]}</div>
                  <div className="text-xs text-cream-muted mb-1">{PRAYER_LABELS[key]}</div>
                  <div className="text-lg font-semibold text-cream font-sans">
                    {prayerTimes[key]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Imsakiye */}
        <Imsakiye city={selectedCity} />

        {/* Footer */}
        <div className="mt-auto pt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Veriler Aladhan API üzerinden alınmaktadır • Diyanet (Türkiye) metodu
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
