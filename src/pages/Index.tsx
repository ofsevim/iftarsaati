import { useState, useEffect, useCallback } from "react";
import { MapPin, Search, ChevronDown, Moon, Star } from "lucide-react";
import Imsakiye from "@/components/Imsakiye";
import bgPattern from "@/assets/bg-pattern.jpg";
import {
  TURKEY_CITIES,
  PRAYER_LABELS,
  PRAYER_ICONS,
  type City,
  type PrayerTimes,
} from "@/data/cities";
import {
  fetchPrayerTimes,
  findNearestCity,
  getTimeUntilIftar,
} from "@/lib/prayer-api";

const Index = () => {
  const [selectedCity, setSelectedCity] = useState<City>(() => {
    const savedCity = localStorage.getItem("selectedCity");
    if (savedCity) {
      const city = TURKEY_CITIES.find((c) => c.name === savedCity);
      if (city) return city;
    }
    return TURKEY_CITIES.find((c) => c.name === "İstanbul")!;
  });
  
  const [favoriteCities, setFavoriteCities] = useState<string[]>(() => {
    const saved = localStorage.getItem("favoriteCities");
    return saved ? JSON.parse(saved) : [];
  });
  
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0, passed: false });
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadPrayerTimes = useCallback(async (city: City) => {
    setLoading(true);
    const times = await fetchPrayerTimes(city);
    setPrayerTimes(times);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPrayerTimes(selectedCity);
    localStorage.setItem("selectedCity", selectedCity.name);
  }, [selectedCity, loadPrayerTimes]);

  useEffect(() => {
    if (!prayerTimes) return;
    const interval = setInterval(() => {
      setCountdown(getTimeUntilIftar(prayerTimes.Maghrib));
    }, 1000);
    setCountdown(getTimeUntilIftar(prayerTimes.Maghrib));
    return () => clearInterval(interval);
  }, [prayerTimes]);

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

  const toggleFavorite = (cityName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorites = favoriteCities.includes(cityName)
      ? favoriteCities.filter((c) => c !== cityName)
      : [...favoriteCities, cityName];
    setFavoriteCities(newFavorites);
    localStorage.setItem("favoriteCities", JSON.stringify(newFavorites));
  };

  const isFavorite = (cityName: string) => favoriteCities.includes(cityName);

  const favoriteCityObjects = favoriteCities
    .map((name) => TURKEY_CITIES.find((c) => c.name === name))
    .filter((c): c is City => c !== undefined);

  const filteredCities = TURKEY_CITIES.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgPattern})` }}
      />
      <div className="fixed inset-0 bg-background/60" />

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
          {/* Favorite Cities */}
          {favoriteCityObjects.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {favoriteCityObjects.map((city) => (
                <button
                  key={city.name}
                  onClick={() => handleCitySelect(city)}
                  className={`quick-btn ${selectedCity.name === city.name ? "selected" : ""}`}
                >
                  {city.name}
                </button>
              ))}
            </div>
          )}

          {/* Location & Dropdown Row */}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleLocate}
              disabled={locating}
              className="glass-card gold-border px-4 py-2.5 flex items-center gap-2 text-sm text-cream-muted hover:text-gold transition-colors cursor-pointer"
            >
              <MapPin className="w-4 h-4" />
              {locating ? "Aranıyor..." : "Konumu Bul"}
            </button>

            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="glass-card gold-border px-4 py-2.5 flex items-center gap-2 text-sm text-cream min-w-[180px] justify-between cursor-pointer"
              >
                <span>{selectedCity.name}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute top-full mt-2 left-0 right-0 glass-card gold-border z-50 overflow-hidden flex flex-col min-w-[280px]">
                  <div className="p-2 border-b border-border flex-shrink-0">
                    <div className="flex items-center gap-2 bg-input rounded-lg px-3 py-2">
                      <Search className="w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Şehir ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent text-sm text-cream outline-none w-full placeholder:text-muted-foreground"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto" style={{ maxHeight: "300px" }}>
                    {filteredCities.map((city) => (
                      <div
                        key={city.name}
                        className={`flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                          selectedCity.name === city.name
                            ? "text-gold bg-night-light"
                            : "text-cream-muted hover:text-cream hover:bg-night-light"
                        }`}
                      >
                        <button
                          onClick={() => handleCitySelect(city)}
                          className="flex-1 text-left"
                        >
                          {city.name}
                        </button>
                        <button
                          onClick={(e) => toggleFavorite(city.name, e)}
                          className="ml-2 p-1.5 hover:scale-110 transition-transform flex-shrink-0"
                          aria-label={isFavorite(city.name) ? "Favorilerden çıkar" : "Favorilere ekle"}
                          type="button"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              isFavorite(city.name)
                                ? "fill-gold text-gold"
                                : "text-cream-muted hover:text-gold"
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div className="mb-10 text-center">
          <h2 className="font-display text-xl md:text-2xl text-gold-light mb-6">
            {countdown.passed ? "İftar vakti geçti" : "İftara Kalan Süre"}
          </h2>

          {loading ? (
            <div className="text-cream-muted animate-pulse">Yükleniyor...</div>
          ) : countdown.passed ? (
            <div className="text-2xl md:text-3xl font-display text-gold">
              Hayırlı İftarlar! 🌙
            </div>
          ) : (
            <div className="flex items-center gap-3 md:gap-4 justify-center">
              <div className="text-center">
                <div className="countdown-digit">{pad(countdown.hours)}</div>
                <span className="text-xs text-cream-muted mt-2 block">Saat</span>
              </div>
              <span className="text-3xl md:text-5xl text-gold font-bold animate-pulse-gold">:</span>
              <div className="text-center">
                <div className="countdown-digit">{pad(countdown.minutes)}</div>
                <span className="text-xs text-cream-muted mt-2 block">Dakika</span>
              </div>
              <span className="text-3xl md:text-5xl text-gold font-bold animate-pulse-gold">:</span>
              <div className="text-center">
                <div className="countdown-digit">{pad(countdown.seconds)}</div>
                <span className="text-xs text-cream-muted mt-2 block">Saniye</span>
              </div>
            </div>
          )}
        </div>

        {/* Prayer Times */}
        {prayerTimes && (
          <div className="w-full max-w-3xl">
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

      {/* Click outside to close dropdown */}
      {dropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setDropdownOpen(false)}
        />
      )}
    </div>
  );
};

export default Index;
