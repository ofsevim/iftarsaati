import { useState, useEffect } from "react";
import { MapPin, X, ExternalLink, Navigation } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Mosque {
  name: string;
  lat: number;
  lng: number;
  distance: number; // km
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
  const radius = 3000; // 3km
  const query = `[out:json][timeout:10];(node["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});way["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng}););out center body 20;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const data = await res.json();
  if (!data?.elements) return [];

  return data.elements
    .map((el: any) => {
      const elLat = el.lat ?? el.center?.lat;
      const elLng = el.lon ?? el.center?.lon;
      if (!elLat || !elLng) return null;
      return {
        name: el.tags?.name || "Cami",
        lat: elLat,
        lng: elLng,
        distance: haversine(lat, lng, elLat, elLng),
      };
    })
    .filter(Boolean)
    .sort((a: Mosque, b: Mosque) => a.distance - b.distance)
    .slice(0, 10);
}

const NearbyMosques = () => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(false);

    if (!navigator.geolocation) {
      setError(true);
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const results = await fetchNearbyMosques(pos.coords.latitude, pos.coords.longitude);
          setMosques(results);
        } catch {
          setError(true);
        }
        setLoading(false);
      },
      () => {
        setError(true);
        setLoading(false);
      }
    );
  }, [open]);

  const openInMaps = (mosque: Mosque) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${mosque.lat},${mosque.lng}`;
    window.open(url, "_blank", "noopener,noreferrer");
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
              <p className="text-sm text-cream-muted animate-pulse">{t("mosquesLoading")}</p>
            ) : error ? (
              <p className="text-sm text-cream-muted">{t("mosquesError")}</p>
            ) : mosques.length === 0 ? (
              <p className="text-sm text-cream-muted">{t("mosquesNone")}</p>
            ) : (
              <div className="overflow-y-auto space-y-2 flex-1">
                {mosques.map((mosque, i) => (
                  <button
                    key={i}
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
