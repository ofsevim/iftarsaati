import { useState, useEffect, useMemo, useRef } from "react";
import { MapPin, Search, ChevronDown, Moon, Star, Volume2, VolumeX, X } from "lucide-react";
import Imsakiye from "@/components/Imsakiye";
import DailyContentCard from "@/components/DailyContentCard";
import InstallPrompt from "@/components/InstallPrompt";
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
  fetchUpcomingRamadanPeriod,
  findNearestCity,
  getCurrentPrayer,
  type RamadanPeriod,
} from "@/lib/prayer-api";
import {
  computeCountdown,
  type CountdownState,
  type CountdownTarget,
} from "@/lib/prayer-countdown";
import { normalizeForSearch } from "@/lib/utils";
import { usePrayerDay } from "@/hooks/use-prayer-day";

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

function formatDisplayDate(dateKey: string): string {
  const parts = dateKey.split("-").map(Number);
  const date = parts.length === 3 && parts.every(Number.isFinite)
    ? new Date(parts[0], parts[1] - 1, parts[2])
    : new Date();
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
}

const INITIAL_COUNTDOWN: CountdownState = {
  hours: 0,
  minutes: 0,
  seconds: 0,
  passed: false,
  mode: "Maghrib",
  unavailable: false,
  isMaghribWindow: false,
};

const Index = () => {
  const [selectedCity, setSelectedCity] = useState<City>(() => {
    const savedCity = safeStorageGet("selectedCity");
    if (savedCity) {
      const city = TURKEY_CITIES.find((c) => c.name === savedCity);
      if (city) return city;
    }
    return TURKEY_CITIES.find((c) => c.name === "İstanbul")!;
  });
  const { prayerTimes, tomorrowFajr, isRamadan, loading, dateKey } = usePrayerDay(selectedCity);
  const [ramadanData, setRamadanData] = useState<{
    key: string;
    period: RamadanPeriod | null;
  } | null>(null);
  const ramadanKey = `${selectedCity.name}:${dateKey}`;
  const ramadanPeriod = ramadanData?.key === ramadanKey ? ramadanData.period : null;
  const bayramDateKey = ramadanPeriod?.bayramDateKey ?? null;
  const [countdownTarget, setCountdownTarget] = useState<CountdownTarget>(() => {
    const saved = safeStorageGet("countdownTarget");
    return (saved === "next_prayer" || saved === "smart_iftar") ? saved : "smart_iftar";
  });
  const [widgetModalOpen, setWidgetModalOpen] = useState(false);
  const [widgetCopied, setWidgetCopied] = useState(false);
  const widgetTriggerRef = useRef<HTMLButtonElement>(null);
  const widgetCloseRef = useRef<HTMLButtonElement>(null);
  const widgetCopyRef = useRef<HTMLButtonElement>(null);
  const [countdown, setCountdown] = useState<CountdownState>(INITIAL_COUNTDOWN);
  const [activePrayer, setActivePrayer] = useState<keyof PrayerTimes | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [pickerFavoriteOrder, setPickerFavoriteOrder] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const cityButtonRef = useRef<HTMLButtonElement>(null);
  const citySearchRef = useRef<HTMLInputElement>(null);
  const focusCitySearchRef = useRef(false);
  const azanAudioRef = useRef<HTMLAudioElement | null>(null);
  const azanPlayedRef = useRef(false);
  const [azanEnabled, setAzanEnabled] = useState<boolean>(() => safeStorageGet("azanEnabled") === "true");
  const [azanNotice, setAzanNotice] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dropdownOpen) {
        setDropdownOpen(false);
        cityButtonRef.current?.focus();
      }
      if (event.key === "Escape" && widgetModalOpen) setWidgetModalOpen(false);
    };

    if (dropdownOpen || widgetModalOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen, widgetModalOpen]);

  useEffect(() => {
    if (dropdownOpen && focusCitySearchRef.current) citySearchRef.current?.focus();
  }, [dropdownOpen]);

  useEffect(() => {
    if (!widgetModalOpen) return;
    const trigger = widgetTriggerRef.current;
    widgetCloseRef.current?.focus();
    return () => trigger?.focus();
  }, [widgetModalOpen]);

  const [favoriteCities, setFavoriteCities] = useState<string[]>(() => {
    const saved = safeStorageGet("favoriteCities");
    if (saved) {
      try {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const validCityNames = new Set(TURKEY_CITIES.map((c) => c.name));
          return parsed.filter((name): name is string => typeof name === "string" && validCityNames.has(name));
        }
      } catch (error) {
        console.error("Failed to parse favorite cities:", error);
      }
    }
    return QUICK_CITIES;
  });

  const toggleFavorite = (cityName: string) => {
    if (!TURKEY_CITIES.some((c) => c.name === cityName)) return;
    const newFavorites = favoriteCities.includes(cityName)
      ? favoriteCities.filter((name) => name !== cityName)
      : [...favoriteCities, cityName];
    setFavoriteCities(newFavorites);
    safeStorageSet("favoriteCities", JSON.stringify(newFavorites));
  };

  useEffect(() => {
    if (!azanEnabled) {
      if (azanAudioRef.current && !azanAudioRef.current.paused) {
        azanAudioRef.current.pause();
        azanAudioRef.current.currentTime = 0;
      }
      setAzanNotice(null);
      return;
    }

    if (countdown.isMaghribWindow) {
      if (!azanPlayedRef.current && azanAudioRef.current) {
        azanPlayedRef.current = true;
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          setAzanNotice("Ezan sesi çevrimdışı modda oynatılamadı.");
          return;
        }
        azanAudioRef.current.play().then(
          () => setAzanNotice(null),
          () => setAzanNotice("Tarayıcı otomatik sesi engelledi; ses açma izni gerekebilir.")
        );
      }
    } else {
      azanPlayedRef.current = false;
    }
  }, [countdown.isMaghribWindow, azanEnabled]);

  useEffect(() => {
    safeStorageSet("selectedCity", selectedCity.name);
  }, [selectedCity]);

  useEffect(() => {
    let cancelled = false;

    const loadReligiousDates = async () => {
      const period = await fetchUpcomingRamadanPeriod(selectedCity, new Date());
      if (!cancelled) setRamadanData({ key: ramadanKey, period });
    };

    loadReligiousDates();
    return () => {
      cancelled = true;
    };
  }, [selectedCity, dateKey, ramadanKey]);

  useEffect(() => {
    if (!prayerTimes) {
      setActivePrayer(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      setCountdown(
        computeCountdown({
          now,
          prayerTimes,
          tomorrowFajr,
          targetMode: countdownTarget,
          bayramDateKey,
        })
      );
      setActivePrayer(getCurrentPrayer(prayerTimes, now));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [prayerTimes, tomorrowFajr, bayramDateKey, countdownTarget]);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocationMessage("Tarayıcınız konum özelliğini desteklemiyor.");
      return;
    }
    setLocating(true);
    setLocationMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = findNearestCity(pos.coords.latitude, pos.coords.longitude, TURKEY_CITIES);
        setSelectedCity(nearest);
        setLocating(false);
        setLocationMessage(null);
      },
      (err) => {
        setLocating(false);
        setLocationMessage(
          err.code === err.PERMISSION_DENIED
            ? "Konum izni verilmedi."
            : "Konum alınamadı, lütfen tekrar deneyin."
        );
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  };

  const handleCitySelect = (city: City) => {
    setSelectedCity(city);
    setDropdownOpen(false);
    setSearchQuery("");
  };

  const filteredCities = useMemo(() => {
    const query = normalizeForSearch(searchQuery);
    return TURKEY_CITIES.filter((city) => normalizeForSearch(city.name).includes(query)).sort((a, b) => {
      const aFav = pickerFavoriteOrder.includes(a.name);
      const bFav = pickerFavoriteOrder.includes(b.name);
      if (aFav !== bFav) return aFav ? -1 : 1;
      return a.name.localeCompare(b.name, "tr-TR");
    });
  }, [searchQuery, pickerFavoriteOrder]);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat print:hidden"
        style={{ backgroundImage: `url(${bgPattern})` }}
      />
      <div className="fixed inset-0 bg-background/60 print:hidden" />

      {/* Side Ornaments - Mobile only — İslami geometrik altın motif */}
      <svg aria-hidden="true" className="fixed inset-y-0 left-0 w-6 sm:w-10 h-full z-0 pointer-events-none md:hidden print:hidden opacity-75" preserveAspectRatio="none">
        <defs>
          <pattern id="sideMotifL" x="0" y="0" width="40" height="80" patternUnits="userSpaceOnUse">
            <line x1="38" y1="0" x2="38" y2="80" stroke="hsl(36,55%,55%)" strokeWidth="0.5" opacity="0.25" />
            <path d="M20,5 L30,15 L30,25 L20,35 L10,25 L10,15 Z" fill="none" stroke="hsl(36,55%,55%)" strokeWidth="0.6" opacity="0.18" />
            <path d="M20,45 L30,55 L30,65 L20,75 L10,65 L10,55 Z" fill="none" stroke="hsl(36,55%,55%)" strokeWidth="0.6" opacity="0.18" />
            <circle cx="20" cy="20" r="2" fill="hsl(36,60%,70%)" opacity="0.15" />
            <circle cx="20" cy="60" r="2" fill="hsl(36,60%,70%)" opacity="0.15" />
            <line x1="20" y1="35" x2="20" y2="45" stroke="hsl(36,55%,55%)" strokeWidth="0.4" opacity="0.15" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sideMotifL)" />
      </svg>
      <svg aria-hidden="true" className="fixed inset-y-0 right-0 w-6 sm:w-10 h-full z-0 pointer-events-none md:hidden print:hidden opacity-75" preserveAspectRatio="none">
        <defs>
          <pattern id="sideMotifR" x="0" y="0" width="40" height="80" patternUnits="userSpaceOnUse">
            <line x1="2" y1="0" x2="2" y2="80" stroke="hsl(36,55%,55%)" strokeWidth="0.5" opacity="0.25" />
            <path d="M20,5 L30,15 L30,25 L20,35 L10,25 L10,15 Z" fill="none" stroke="hsl(36,55%,55%)" strokeWidth="0.6" opacity="0.18" />
            <path d="M20,45 L30,55 L30,65 L20,75 L10,65 L10,55 Z" fill="none" stroke="hsl(36,55%,55%)" strokeWidth="0.6" opacity="0.18" />
            <circle cx="20" cy="20" r="2" fill="hsl(36,60%,70%)" opacity="0.15" />
            <circle cx="20" cy="60" r="2" fill="hsl(36,60%,70%)" opacity="0.15" />
            <line x1="20" y1="35" x2="20" y2="45" stroke="hsl(36,55%,55%)" strokeWidth="0.4" opacity="0.15" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sideMotifR)" />
      </svg>

      {/* Content */}
      <main className="relative z-10 min-h-screen flex flex-col items-center page-safe-area print:min-h-0 print:block">
        {/* Header */}
        <div className="text-center mb-4 md:mb-12 print:hidden">
          <div className="flex items-center justify-center gap-2 md:gap-3 mb-1 md:mb-3">
            <Moon className="size-6 md:size-8 shrink-0 text-gold" aria-hidden="true" />
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-gold">
              Vakt-i Şerif
            </h1>
            <Moon className="size-6 md:size-8 shrink-0 text-gold" aria-hidden="true" />
          </div>
          <p className="text-cream-muted text-sm md:text-base">
            {isRamadan ? "Ramazan-ı Şerif'iniz mübarek olsun" : "Namaz Vakitleri & Güncel İmsakiye"}
          </p>
        </div>

        {/* City Selection */}
        <div className="w-full max-w-2xl mb-5 md:mb-8 space-y-2 md:space-y-4 print:hidden">
          {/* Quick Cities */}
          {favoriteCities.length > 0 && (
            <div className="overflow-x-auto sm:overflow-visible">
              <div className="flex w-max min-w-full justify-center gap-2 p-1 sm:w-auto sm:flex-wrap">
                {favoriteCities.map((name) => {
                  const city = TURKEY_CITIES.find((c) => c.name === name);
                  if (!city) return null;
                  return (
                    <button
                      key={name}
                      onClick={() => handleCitySelect(city)}
                      aria-pressed={selectedCity.name === name}
                      className={`quick-btn ${selectedCity.name === name ? "selected" : ""}`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Location & Dropdown Row */}
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-start gap-2 sm:grid-cols-[auto_minmax(12rem,15rem)_auto_auto] sm:gap-x-3 justify-center w-full">
            <button
              onClick={handleLocate}
              disabled={locating}
              className="col-start-1 row-start-1 glass-card gold-border min-h-11 min-w-11 px-3 max-[359px]:px-0 sm:px-4 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-cream-muted hover:text-gold transition-colors cursor-pointer touch-manipulation"
              aria-busy={locating}
            >
              <MapPin className={`size-4 ${locating ? "motion-safe:animate-pulse" : ""}`} aria-hidden="true" />
              <span className="max-[359px]:sr-only">{locating ? "Konum aranıyor" : "Konum"}</span>
            </button>

            <div
              className="city-control"
              ref={dropdownRef}
              onBlur={(event) => {
                if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
                  setDropdownOpen(false);
                }
              }}
            >
              <button
                ref={cityButtonRef}
                onClick={(event) => {
                  if (!dropdownOpen) {
                    setSearchQuery("");
                    // Keep focused rows in place when a favorite changes inside the picker.
                    setPickerFavoriteOrder(favoriteCities);
                    focusCitySearchRef.current = event.detail === 0;
                  }
                  setDropdownOpen(!dropdownOpen);
                }}
                aria-expanded={dropdownOpen}
                aria-controls={dropdownOpen ? "city-picker" : undefined}
                className="col-start-2 row-start-1 glass-card gold-border min-h-11 px-2 sm:px-4 flex items-center gap-1 sm:gap-2 text-sm max-[359px]:text-xs text-cream w-full min-w-0 justify-between touch-manipulation"
              >
                <span className="min-w-0 break-words text-left">{selectedCity.name}</span>
                <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <section id="city-picker" aria-label="Şehir seçimi" className="city-control-panel col-span-full row-start-2 min-w-0 bg-[#0d1217] rounded-2xl gold-border shadow-xl z-50">
                  <div className="p-3 border-b border-white/10">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 focus-within:border-gold">
                      <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <input
                        ref={citySearchRef}
                        type="search"
                        aria-label="Şehir ara"
                        placeholder="Şehir ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="min-h-11 min-w-0 w-full bg-transparent text-base text-cream outline-none placeholder:text-cream/70"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-64 p-1">
                    {filteredCities.length === 0 ? (
                      <div role="status" className="px-4 py-6 text-center text-sm text-cream-muted">
                        Eşleşen şehir bulunamadı.
                      </div>
                    ) : (
                      filteredCities.map((city) => {
                        const isFavorite = favoriteCities.includes(city.name);
                        const isSelected = selectedCity.name === city.name;
                        return (
                          <div
                            key={city.name}
                            className={`flex items-stretch rounded-xl ${isSelected ? "bg-night-light" : "hover:bg-night-light"}`}
                          >
                            <button
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => {
                                handleCitySelect(city);
                                cityButtonRef.current?.focus();
                              }}
                              className={`min-h-11 min-w-0 flex-1 rounded-xl px-3 text-left text-sm touch-manipulation ${isSelected ? "text-gold" : "text-cream"}`}
                            >
                              {city.name}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleFavorite(city.name)}
                              className="min-h-11 w-11 shrink-0 rounded-xl text-cream-muted hover:text-gold transition-colors touch-manipulation grid place-items-center"
                              aria-label={`${city.name} favorisi`}
                              aria-pressed={isFavorite}
                            >
                              <Star
                                className={`size-4 ${isFavorite ? "text-gold fill-gold" : ""}`}
                                aria-hidden="true"
                              />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              )}
            </div>

            <NotificationManager
              prayerTimes={prayerTimes || undefined}
              isRamadan={isRamadan}
              city={selectedCity}
            />

            <button
              onClick={() => {
                const newVal = !azanEnabled;
                setAzanEnabled(newVal);
                safeStorageSet("azanEnabled", String(newVal));
              }}
              className="col-start-4 row-start-1 glass-card gold-border size-11 grid place-items-center hover:text-gold touch-manipulation"
              aria-label={azanEnabled ? "Ezan sesini kapat" : "Ezan sesini aç"}
              title={azanEnabled ? "Ezan sesini kapat" : "Ezan sesini aç"}
            >
              {azanEnabled
                ? <Volume2 className="w-4 h-4 text-gold" />
                : <VolumeX className="w-4 h-4 text-cream-muted" />
              }
            </button>
          </div>

          {(locationMessage || azanNotice) && (
            <p className="text-center text-xs text-amber-300/90" role="status">
              {locationMessage || azanNotice}
            </p>
          )}
        </div>

        <audio
          ref={azanAudioRef}
          src="https://cdn.islamic.network/prayer-times/audio/adhan-makkah.mp3"
          preload="none"
          className="print:hidden"
        />

        {/* Countdown */}
        <div className="w-full mb-6 md:mb-10 text-center print:hidden">
          {/* Countdown Target Switcher */}
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 mb-2 md:mb-4">
            <button
              onClick={() => {
                setCountdownTarget("smart_iftar");
                safeStorageSet("countdownTarget", "smart_iftar");
              }}
              aria-pressed={countdownTarget === "smart_iftar"}
              className={`min-h-11 text-xs px-2.5 sm:px-3 rounded-full transition-colors touch-manipulation ${
                countdownTarget === "smart_iftar"
                  ? "bg-gold/20 text-gold border border-gold/40 font-medium shadow-[0_0_10px_rgba(212,175,55,0.15)]"
                  : "text-cream-muted hover:text-gold border border-transparent"
              }`}
            >
              🌙 İftar / Sahur Sayacı
            </button>
            <button
              onClick={() => {
                setCountdownTarget("next_prayer");
                safeStorageSet("countdownTarget", "next_prayer");
              }}
              aria-pressed={countdownTarget === "next_prayer"}
              className={`min-h-11 text-xs px-2.5 sm:px-3 rounded-full transition-colors touch-manipulation ${
                countdownTarget === "next_prayer"
                  ? "bg-gold/20 text-gold border border-gold/40 font-medium shadow-[0_0_10px_rgba(212,175,55,0.15)]"
                  : "text-cream-muted hover:text-gold border border-transparent"
              }`}
            >
              ⏰ Sıradaki Vakit
            </button>
          </div>

          <h2 id="countdown-title" className="font-display text-xl md:text-2xl text-gold-light mb-3 md:mb-6">
            {countdown.mode === "bayram"
              ? "Ramazan Bayramı"
              : countdown.passed && countdown.mode === "Maghrib"
                ? (isRamadan ? "İftar vakti" : "Akşam vakti")
                : countdown.mode === "Fajr"
                  ? (isRamadan ? "Sahur Vaktine Kalan Süre" : "İmsak Vaktine Kalan Süre")
                  : countdown.mode === "Sunrise"
                    ? "Güneşin Doğmasına Kalan Süre"
                    : countdown.mode === "Dhuhr"
                      ? "Öğle Vaktine Kalan Süre"
                      : countdown.mode === "Asr"
                        ? "İkindi Vaktine Kalan Süre"
                        : countdown.mode === "Maghrib"
                          ? (isRamadan ? "İftar Vaktine Kalan Süre" : "Akşam Vaktine Kalan Süre")
                          : countdown.mode === "Isha"
                            ? "Yatsı Vaktine Kalan Süre"
                            : "Sonraki Vakte Kalan Süre"}
          </h2>

          {loading ? (
            <div className="text-cream-muted animate-pulse">Vakitler yükleniyor...</div>
          ) : !prayerTimes ? (
            <div className="text-cream-muted">Vakit verileri şu an alınamadı.</div>
          ) : countdown.passed && countdown.mode === "bayram" ? (
            <div className="text-2xl md:text-3xl font-display text-gold">Bayramınız Mübarek Olsun! 🎉</div>
          ) : countdown.passed && countdown.mode === "Maghrib" ? (
            <div className="text-2xl md:text-3xl font-display text-gold">
              {isRamadan ? "Hayırlı İftarlar! 🌙" : "Akşam Vakti Girdi 🌙"}
            </div>
          ) : countdown.unavailable ? (
            <div className="text-cream-muted">Yarının imsak vakti şu an alınamadı.</div>
          ) : (
            <div
              className="flex items-start gap-1.5 sm:gap-3 md:gap-4 justify-center"
              role="timer"
              aria-labelledby="countdown-title"
            >
              <div className="text-center">
                <div className="countdown-digit">{pad(countdown.hours)}</div>
                <span className="text-[11px] sm:text-xs text-cream-muted mt-1.5 sm:mt-2 block">Saat</span>
              </div>
              <span className="pt-2 sm:pt-3 md:pt-4 text-3xl sm:text-4xl md:text-6xl text-gold font-bold" aria-hidden="true">:</span>
              <div className="text-center">
                <div className="countdown-digit">{pad(countdown.minutes)}</div>
                <span className="text-[11px] sm:text-xs text-cream-muted mt-1.5 sm:mt-2 block">Dakika</span>
              </div>
              <span className="pt-2 sm:pt-3 md:pt-4 text-3xl sm:text-4xl md:text-6xl text-gold font-bold" aria-hidden="true">:</span>
              <div className="text-center">
                <div className="countdown-digit">{pad(countdown.seconds)}</div>
                <span className="text-[11px] sm:text-xs text-cream-muted mt-1.5 sm:mt-2 block">Saniye</span>
              </div>
            </div>
          )}
        </div>

        {/* Prayer Times */}
        {prayerTimes && (
          <section aria-labelledby="prayer-times-title" className="w-full max-w-3xl mb-6 md:mb-10 print:hidden">
            <h3 id="prayer-times-title" className="font-display text-lg text-gold-light text-center">
              {selectedCity.name} Namaz Vakitleri
            </h3>
            <p className="text-center text-sm text-cream-muted mb-3 md:mb-4">
              <time dateTime={dateKey}>{formatDisplayDate(dateKey)}</time>
            </p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
              {(Object.keys(PRAYER_LABELS) as (keyof PrayerTimes)[]).map((key) => (
                <div
                  key={key}
                  className={`prayer-card ${activePrayer === key ? "active" : ""}`}
                  aria-current={activePrayer === key ? "time" : undefined}
                >
                  <div className="mb-1 flex items-center justify-center">
                    {(() => {
                      const Icon = PRAYER_ICONS[key];
                      return (
                        <Icon
                          aria-hidden="true"
                          className="size-5 sm:size-6 text-gold-light"
                        />
                      );
                    })()}
                  </div>
                  <div className="text-xs text-cream-muted mb-1">
                    {isRamadan && key === "Maghrib" ? "İftar" : isRamadan && key === "Fajr" ? "Sahur" : PRAYER_LABELS[key]}
                  </div>
                  <div className="text-lg font-semibold tabular-nums text-cream font-sans">
                    {prayerTimes[key]}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <InstallPrompt />

        {/* Daily Content */}
        <div className="w-full print:hidden">
          <DailyContentCard dateKey={dateKey} />
        </div>

        {/* Imsakiye */}
        <Imsakiye
          city={selectedCity}
          period={ramadanPeriod}
          loading={ramadanData?.key !== ramadanKey}
          todayKey={dateKey}
        />

        {/* Footer */}
        <footer className="mt-4 mb-2 text-center flex flex-col items-center gap-2 print:hidden">
          <button
            ref={widgetTriggerRef}
            onClick={() => {
              setWidgetCopied(false);
              setWidgetModalOpen(true);
            }}
            className="min-h-11 px-2 text-sm text-gold hover:text-gold-light underline transition-colors"
          >
            Sitenize İftar Sayacı Ekleyin (Widget)
          </button>
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

        {/* Widget Modal */}
        {widgetModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center modal-safe-area bg-black/70 backdrop-blur-sm print:hidden"
            onClick={() => setWidgetModalOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="widget-modal-title"
              className="bg-[#0d1217] rounded-2xl gold-border p-4 sm:p-6 max-w-md w-full max-h-full overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key !== "Tab") return;
                const boundary = event.shiftKey ? widgetCloseRef.current : widgetCopyRef.current;
                if (event.target === boundary) {
                  event.preventDefault();
                  (event.shiftKey ? widgetCopyRef.current : widgetCloseRef.current)?.focus();
                }
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 id="widget-modal-title" className="text-lg font-display text-gold font-bold">
                  Web Sitenize İftar Sayacı Ekleyin
                </h3>
                <button
                  ref={widgetCloseRef}
                  onClick={() => setWidgetModalOpen(false)}
                  className="size-11 shrink-0 grid place-items-center rounded-xl text-cream-muted hover:text-gold touch-manipulation"
                  aria-label="Kapat"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>
              <p className="text-xs text-cream-muted mb-4">
                Aşağıdaki kodu web sitenizin dilediğiniz bölümüne ekleyerek canlı iftar sayacını sitenizde gösterebilirsiniz:
              </p>
              <div className="bg-black/60 p-3 rounded-xl border border-white/10 font-mono text-[11px] text-cream select-all break-all mb-4">
                {`<iframe src="https://iftarsaati.netlify.app/widget?city=${encodeURIComponent(selectedCity.name)}" width="300" height="220" frameborder="0" style="border:none; overflow:hidden;" scrolling="no"></iframe>`}
              </div>
              <button
                ref={widgetCopyRef}
                onClick={async () => {
                  const code = `<iframe src="https://iftarsaati.netlify.app/widget?city=${encodeURIComponent(selectedCity.name)}" width="300" height="220" frameborder="0" style="border:none; overflow:hidden;" scrolling="no"></iframe>`;
                  try {
                    if (navigator.clipboard?.writeText) {
                      await navigator.clipboard.writeText(code);
                      setWidgetCopied(true);
                      setTimeout(() => setWidgetCopied(false), 2000);
                    }
                  } catch {
                    setWidgetCopied(false);
                  }
                }}
                className="w-full min-h-11 rounded-xl gold-border text-sm text-gold hover:bg-gold/10 transition-colors font-medium"
              >
                {widgetCopied ? "Kod kopyalandı" : "Kodu Kopyala"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
