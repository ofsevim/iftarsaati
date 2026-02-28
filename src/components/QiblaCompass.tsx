import { useState, useEffect, useCallback } from "react";
import { Compass, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

// Kabe koordinatları
const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

function calculateQibla(lat: number, lng: number): number {
  const latR = (lat * Math.PI) / 180;
  const lngR = (lng * Math.PI) / 180;
  const kaabaLatR = (KAABA_LAT * Math.PI) / 180;
  const kaabaLngR = (KAABA_LNG * Math.PI) / 180;
  const dLng = kaabaLngR - lngR;
  const x = Math.sin(dLng);
  const y = Math.cos(latR) * Math.tan(kaabaLatR) - Math.sin(latR) * Math.cos(dLng);
  let bearing = (Math.atan2(x, y) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

interface QiblaCompassProps {
  lat: number;
  lng: number;
}

const QiblaCompass = ({ lat, lng }: QiblaCompassProps) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [heading, setHeading] = useState<number | null>(null);
  const [error, setError] = useState(false);

  const qiblaAngle = calculateQibla(lat, lng);

  const startCompass = useCallback(() => {
    // iOS requires permission
    const doe = DeviceOrientationEvent as any;
    if (typeof doe.requestPermission === "function") {
      doe.requestPermission().then((perm: string) => {
        if (perm === "granted") {
          window.addEventListener("deviceorientationabsolute", handleOrientation as any);
          window.addEventListener("deviceorientation", handleOrientation as any);
        } else {
          setError(true);
        }
      }).catch(() => setError(true));
    } else {
      window.addEventListener("deviceorientationabsolute", handleOrientation as any);
      window.addEventListener("deviceorientation", handleOrientation as any);
    }
  }, []);

  const handleOrientation = (e: DeviceOrientationEvent) => {
    // webkitCompassHeading for iOS, alpha for Android
    const compassHeading = (e as any).webkitCompassHeading;
    if (compassHeading !== undefined && compassHeading !== null) {
      setHeading(compassHeading);
    } else if (e.alpha !== null) {
      // Android: alpha is relative to device, absolute if available
      const isAbsolute = (e as any).absolute === true;
      if (isAbsolute || e.alpha !== undefined) {
        setHeading(360 - (e.alpha ?? 0));
      }
    }
  };

  useEffect(() => {
    if (!open) return;
    startCompass();
    return () => {
      window.removeEventListener("deviceorientationabsolute", handleOrientation as any);
      window.removeEventListener("deviceorientation", handleOrientation as any);
    };
  }, [open, startCompass]);

  // Kıble iğnesi açısı: kıble yönü - cihaz yönü
  const needleRotation = heading !== null ? qiblaAngle - heading : 0;

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
            <p className="text-xs text-cream-muted mb-4">{t("qiblaDesc")}</p>

            {error || heading === null ? (
              <div className="w-48 h-48 mx-auto rounded-full border-2 border-[hsl(36,55%,55%,0.3)] flex items-center justify-center">
                {error ? (
                  <p className="text-xs text-cream-muted px-4">{t("qiblaNoSensor")}</p>
                ) : (
                  <div className="text-cream-muted animate-pulse">
                    <Compass className="w-12 h-12" />
                  </div>
                )}
              </div>
            ) : (
              <div className="w-48 h-48 mx-auto relative">
                {/* Outer ring */}
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  <circle cx="100" cy="100" r="95" fill="none" stroke="hsl(36,55%,55%)" strokeWidth="1" opacity="0.3" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(36,55%,55%)" strokeWidth="0.5" opacity="0.15" />
                  {/* Cardinal directions */}
                  {["N", "E", "S", "W"].map((dir, i) => {
                    const angle = i * 90 - (heading ?? 0);
                    const rad = (angle * Math.PI) / 180;
                    const x = 100 + 88 * Math.sin(rad);
                    const y = 100 - 88 * Math.cos(rad);
                    return (
                      <text
                        key={dir}
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="hsl(40,20%,80%)"
                        fontSize="10"
                        opacity="0.5"
                      >
                        {dir}
                      </text>
                    );
                  })}
                  {/* Qibla needle */}
                  <g transform={`rotate(${needleRotation}, 100, 100)`}>
                    <line x1="100" y1="100" x2="100" y2="25" stroke="hsl(36,55%,55%)" strokeWidth="3" strokeLinecap="round" />
                    <polygon points="100,18 94,32 106,32" fill="hsl(36,55%,55%)" />
                    {/* Kaaba icon at tip */}
                    <rect x="95" y="12" width="10" height="10" rx="1" fill="hsl(36,55%,55%)" opacity="0.8" />
                    <text x="100" y="20" textAnchor="middle" dominantBaseline="central" fontSize="7">🕋</text>
                  </g>
                  {/* Center dot */}
                  <circle cx="100" cy="100" r="4" fill="hsl(36,55%,55%)" opacity="0.6" />
                </svg>

                <div className="absolute bottom-0 left-0 right-0 text-center">
                  <span className="text-xs text-cream-muted">{Math.round(qiblaAngle)}°</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default QiblaCompass;
