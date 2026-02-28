import { useState, useEffect, useRef, useCallback } from "react";
import { Compass, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

// Kabe koordinatları
const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

/**
 * Great-circle initial bearing formülü.
 * Kaynak: https://www.movable-type.co.uk/scripts/latlong.html
 */
function calculateQibla(lat: number, lng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const φ1 = toRad(lat);
  const φ2 = toRad(KAABA_LAT);
  const Δλ = toRad(KAABA_LNG - lng);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

interface QiblaCompassProps {
  lat: number;
  lng: number;
}

const QiblaCompass = ({ lat, lng }: QiblaCompassProps) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [heading, setHeading] = useState<number | null>(null);
  const [sensorAvailable, setSensorAvailable] = useState(true);
  const headingRef = useRef<number | null>(null);

  const qiblaAngle = calculateQibla(lat, lng);

  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    let compassHeading: number | null = null;

    // iOS: webkitCompassHeading (0-360, kuzeyden saat yönünde)
    if ((e as any).webkitCompassHeading != null) {
      compassHeading = (e as any).webkitCompassHeading;
    }
    // Android: deviceorientationabsolute event'inde alpha = manyetik kuzeyden açı
    else if (e.alpha != null) {
      // absolute event ise alpha doğrudan manyetik kuzey
      // alpha: 0 = kuzey, saat yönünün tersine artar
      // heading = saat yönünde kuzeyden açı
      compassHeading = (360 - e.alpha) % 360;
    }

    if (compassHeading !== null) {
      headingRef.current = compassHeading;
      setHeading(compassHeading);
    }
  }, []);

  const startCompass = useCallback(() => {
    const doe = DeviceOrientationEvent as any;

    const addListeners = () => {
      // Önce absolute event'i dene (Android'de daha doğru)
      window.addEventListener("deviceorientationabsolute", handleOrientation as any, true);
      window.addEventListener("deviceorientation", handleOrientation as any, true);

      // 3 saniye içinde veri gelmezse sensör yok
      setTimeout(() => {
        if (headingRef.current === null) {
          setSensorAvailable(false);
        }
      }, 3000);
    };

    // iOS 13+ izin gerektirir
    if (typeof doe.requestPermission === "function") {
      doe.requestPermission()
        .then((perm: string) => {
          if (perm === "granted") {
            addListeners();
          } else {
            setSensorAvailable(false);
          }
        })
        .catch(() => setSensorAvailable(false));
    } else {
      addListeners();
    }
  }, [handleOrientation]);

  useEffect(() => {
    if (!open) return;
    setHeading(null);
    setSensorAvailable(true);
    headingRef.current = null;
    startCompass();
    return () => {
      window.removeEventListener("deviceorientationabsolute", handleOrientation as any, true);
      window.removeEventListener("deviceorientation", handleOrientation as any, true);
    };
  }, [open, startCompass, handleOrientation]);

  // Kıble iğnesi: kıble bearing - cihaz heading
  const needleRotation = heading !== null ? qiblaAngle - heading : qiblaAngle;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glass-card gold-border p-2.5 flex items-center gap-1.5 text-xs transition-colors hover:text-gold"
        aria-label={t("qibla")}
        title={t("qibla")}
      >
        <Compass className="w-4 h-4 text-cream-muted" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card gold-border p-6 w-full max-w-xs text-center relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-cream-muted hover:text-gold"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-display text-lg text-gold mb-2">{t("qibla")}</h3>
            <p className="text-xs text-cream-muted mb-4">
              {heading === null && sensorAvailable
                ? t("qiblaDesc")
                : !sensorAvailable
                  ? t("qiblaNoSensor")
                  : t("qiblaDesc")}
            </p>

            <div className="w-52 h-52 mx-auto relative">
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {/* Dış halka */}
                <circle cx="100" cy="100" r="95" fill="none" stroke="hsl(36,55%,55%)" strokeWidth="1.5" opacity="0.25" />
                <circle cx="100" cy="100" r="75" fill="none" stroke="hsl(36,55%,55%)" strokeWidth="0.5" opacity="0.1" />

                {/* Yön harfleri — pusula döndüğünde bunlar da döner */}
                {heading !== null && (
                  <g transform={`rotate(${-heading}, 100, 100)`}>
                    {[
                      { label: "N", angle: 0 },
                      { label: "E", angle: 90 },
                      { label: "S", angle: 180 },
                      { label: "W", angle: 270 },
                    ].map(({ label, angle }) => {
                      const rad = (angle * Math.PI) / 180;
                      const cx = 100 + 86 * Math.sin(rad);
                      const cy = 100 - 86 * Math.cos(rad);
                      return (
                        <text
                          key={label}
                          x={cx}
                          y={cy}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={label === "N" ? "hsl(36,55%,55%)" : "hsl(40,20%,80%)"}
                          fontSize={label === "N" ? "12" : "10"}
                          fontWeight={label === "N" ? "bold" : "normal"}
                          opacity={label === "N" ? 0.8 : 0.4}
                        >
                          {label}
                        </text>
                      );
                    })}
                    {/* Kuzey işareti */}
                    <polygon
                      points="100,12 96,22 104,22"
                      fill="hsl(0,60%,50%)"
                      opacity="0.5"
                    />
                  </g>
                )}

                {/* Kıble iğnesi */}
                <g transform={`rotate(${needleRotation}, 100, 100)`}>
                  {/* İğne gövdesi */}
                  <line
                    x1="100" y1="100" x2="100" y2="28"
                    stroke="hsl(36,55%,55%)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* Ok ucu */}
                  <polygon points="100,20 94,34 106,34" fill="hsl(36,55%,55%)" />
                  {/* Kabe emoji */}
                  <text x="100" y="14" textAnchor="middle" dominantBaseline="central" fontSize="14">🕋</text>
                </g>

                {/* Merkez nokta */}
                <circle cx="100" cy="100" r="5" fill="hsl(36,55%,55%)" opacity="0.5" />
                <circle cx="100" cy="100" r="2" fill="hsl(36,60%,70%)" />
              </svg>
            </div>

            {/* Bilgi */}
            <div className="mt-3 space-y-1">
              <div className="text-xs text-cream-muted">
                {t("qibla")}: {Math.round(qiblaAngle)}°
              </div>
              {heading !== null && (
                <div className="text-[11px] text-cream-muted/50">
                  {heading === null ? "" : `Pusula: ${Math.round(heading)}°`}
                </div>
              )}
              {!sensorAvailable && (
                <div className="text-[11px] text-cream-muted/60 mt-2">
                  {t("qiblaNoSensor")}
                  <br />
                  <span className="text-gold/60">↑ Kıble yönü: {Math.round(qiblaAngle)}° (kuzeyden)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QiblaCompass;
