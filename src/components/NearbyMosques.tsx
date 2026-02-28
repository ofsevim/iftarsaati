import { useState, useEffect } from "react";
import { MapPin, X, ExternalLink, Navigation } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Mosque {
  name: string;
  lat: number;
  lng: number;
  distance: number;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchNearbyMosques(lat: number, lng: number): Promise<Mosque[]> {
  const radius = 5000;
  const query = `[out:json][timeout:25];
(
  node["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});
  way["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});
  node["building"="mosque"](around:${radius},${lat},${lng});
  way["building"="mosque"](around:${radius},${lat},${lng});
  node["amenity"="place_of_worship"]["name"~"[Cc]ami|[Mm]osque|[Mm]escid"](around:${radius},${lat},${lng});
  way["amenity"="place_of_worship"]["name"~"[Cc]ami|[Mm]osque|[Mm]escid"](around:${radius},${lat},${lng});
);
out center body 30;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  if (!data?.elements) return [];

  const seen = new Set<string>();
  return data.elements
    .map((el: any) => {
      const elLat = el.lat ?? el.center?.lat;
      const elLng = el.lon ?? el.center?.lon;
      if (!elLat || !elLng) return null;
      const name = el.tags?.name || "Cami";
      const dist = haversine(lat, lng, elLat, elLng);
      const key = `${name}_${Math.round(elLat * 1000)}_${Math.round(elLng * 1000)}`;
      if (seen.has(key)) return null;
      seen.add(key);
      return { name, lat: elLat, lng: elLng, distance: dist };
    })
    .filter(Boolean)
    .sort((a: Mosque, b: Mosque) => a.distance - b.distance)
    .slice(0, 15);
}

const NearbyMosques = ({ fallbackLat, fallbackLng }: { fallbackLat: number; fallbackLng: number }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  const doFetch = async (lat: number, lng: number, isFallback: boolean) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const results = await fetchNearbyMosques(lat, lng);
      setMosques(results);
      setFetched(true);
      setUsedFallback(isFallback);
    } catch (err) {
      console.error("[NearbyMosques]", err);
      // Gerçek konum başarısız olduysa ve fallback henüz denenmemişse, fallback dene
      if (!isFallback) {
        try {
          const results = await fetchNearbyMosques(fallbackLat, fallbackLng);
          setMosques(results);
          setFetched(true);
          setUsedFallback(true);
        } catch {
          setErrorMsg(t("mosquesError"));
        }
      } else {
        setErrorMsg(t("mosquesError"));
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!open || fetched) return;

    if (!navigator.geolocation) {
      // Geolocation yok — doğrudan şehir merkezini kullan
      doFetch(fallbackLat, fallbackLng, true);
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => doFetch(pos.coords.latitude, pos.coords.longitude, false),
      () => {
        // Konum alınamadı — şehir merkezini kullan
        console.info("[NearbyMosques] Konum alınamadı, şehir merkezi kullanılıyor.");
        doFetch(fallbackLat, fallbackLng, true);
      },
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 300000 }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fetched]);

  const openInMaps = (mosque: Mosque) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${mosque.lat},${mosque.lng}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleRetry = () => {
    setFetched(false);
    setErrorMsg(null);
    setMosques([]);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glass-card gold-border p-2.5 flex items-center gap-1.5 text-xs transition-colors hover:text-gold"
        aria-label={t("nearbyMosques")}
        title={t("nearbyMosques")}
      >
        <Navigation className="w-4 h-4 text-cream-muted" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card gold-border p-5 w-full max-w-sm relative max-h-[80vh] flex flex-col">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-cream-muted hover:text-gold"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-display text-lg text-gold mb-4">{t("nearbyMosques")}</h3>

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin mb-3" />
                <p className="text-sm text-cream-muted">{t("mosquesLoading")}</p>
              </div>
            ) : errorMsg ? (
              <div className="text-center py-6">
                <p className="text-sm text-cream-muted mb-3">{errorMsg}</p>
                <button
                  onClick={handleRetry}
                  className="text-xs text-gold hover:text-gold-light transition-colors"
                >
                  Tekrar dene
                </button>
              </div>
            ) : mosques.length === 0 ? (
              <p className="text-sm text-cream-muted text-center py-6">{t("mosquesNone")}</p>
            ) : (
              <div className="overflow-y-auto space-y-2 flex-1">
                {usedFallback && (
                  <p className="text-[11px] text-cream-muted/50 mb-1 text-center">
                    Şehir merkezi baz alındı
                  </p>
                )}
                {mosques.map((mosque, i) => (
                  <button
                    key={`${mosque.name}-${i}`}
                    onClick={() => openInMaps(mosque)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-[hsl(36,55%,55%,0.3)] transition-colors text-left"
                  >
                    <MapPin className="w-4 h-4 text-gold shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-cream truncate">{mosque.name}</div>
                      <div className="text-xs text-cream-muted">
                        {mosque.distance < 1
                          ? `${Math.round(mosque.distance * 1000)} m`
                          : `${mosque.distance.toFixed(1)} km`}
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-cream-muted/50 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default NearbyMosques;
