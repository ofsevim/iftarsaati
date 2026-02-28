import { useState, useEffect, useRef, useCallback } from "react";
import { Compass, X, ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

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
  const [hasCompass, setHasCompass] = useState<boolean | null>(null);
  const [debug, setDebug] = useState("");
  const receivedData = useRef(false);
  const usingAbsolute = useRef(false);

  const qiblaAngle = calculateQibla(lat, lng);

  // deviceorientationabsolute handler — Android'de manyetik kuzeye göre
  const handleAbsolute = useCallback((e: any) => {
    if (e.alpha == null) return;
    usingAbsolute.current = true;
    receivedData.current = true;
    // absolute event: alpha = cihazın manyetik kuzeyden saat yönü tersine açısı
    // heading (saat yönünde kuzeyden) = (360 - alpha) % 360
    const h = (360 - e.alpha) % 360;
    setHasCompass(true);
    setHeading(h);
    setDebug(`abs α=${Math.round(e.alpha)} → h=${Math.round(h)}`);
  }, []);

  // deviceorientation handler — iOS veya Android fallback
  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    // absolute event zaten çalışıyorsa bunu atla
    if (usingAbsolute.current) return;

    // iOS: webkitCompassHeading zaten saat yönünde kuzeyden derece
    const webkit = (e as any).webkitCompassHeading;
    if (webkit != null && typeof webkit === "number" && !isNaN(webkit)) {
      receivedData.current = true;
      setHasCompass(true);
      setHeading(webkit);
      setDebug(`iOS wk=${Math.round(webkit)}`);
      return;
    }

    // Android fallback (relative orientation — güvenilir değil ama son çare)
    if (e.alpha != null) {
      receivedData.current = true;
      setHasCompass(true);
      const h = (360 - e.alpha) % 360;
      setHeading(h);
      setDebug(`rel α=${Math.round(e.alpha)} → h=${Math.round(h)}`);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    receivedData.current = false;
    usingAbsolute.current = false;
    setHeading(null);
    setHasCompass(null);
    setDebug("");

    const doe = DeviceOrientationEvent as any;

    const addListeners = () => {
      // Ayrı event'ler — absolute öncelikli
      window.addEventListener("deviceorientationabsolute", handleAbsolute, true);
      window.addEventListener("deviceorientation", handleOrientation, true);
    };

    if (typeof doe.requestPermission === "function") {
      doe.requestPermission()
        .then((perm: string) => {
          if (perm === "granted") addListeners();
          else setHasCompass(false);
        })
        .catch(() => setHasCompass(false));
    } else {
      addListeners();
    }

    const timer = setTimeout(() => {
      if (!receivedData.current) setHasCompass(false);
    }, 3000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("deviceorientationabsolute", handleAbsolute, true);
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, [open, handleAbsolute, handleOrientation]);

  const needleAngle = heading != null ? qiblaAngle - heading : 0;

  const openQiblaMap = () => {
    window.open(
      `https://www.google.com/maps/dir/${lat},${lng}/${KAABA_LAT},${KAABA_LNG}`,
      "_blank", "noopener,noreferrer"
    );
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glass-card gold-border p-2.5 flex items-center gap-1.5 text-xs transition-colors hover:text-gold"
        aria-label={t("qibla")} title={t("qibla")}
      >
        <Compass className="w-4 h-4 text-cream-muted" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card gold-border p-6 w-full max-w-xs text-center relative">
            <button onClick={() => setOpen(false)} className="absolute top-3 right-3 text-cream-muted hover:text-gold">
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-display text-lg text-gold mb-2">{t("qibla")}</h3>

            {hasCompass === null && (
              <div className="w-48 h-48 mx-auto flex items-center justify-center">
                <div className="text-cream-muted animate-pulse">
                  <Compass className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-xs">{t("qiblaDesc")}</p>
                </div>
              </div>
            )}

            {hasCompass === false && (
              <div className="py-4">
                <div className="w-40 h-40 mx-auto relative mb-4">
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    <circle cx="100" cy="100" r="90" fill="none" stroke="hsl(36,55%,55%)" strokeWidth="1.5" opacity="0.2" />
                    {["N","E","S","W"].map((d,i) => {
                      const a = (i*90*Math.PI)/180;
                      return <text key={d} x={100+82*Math.sin(a)} y={100-82*Math.cos(a)}
                        textAnchor="middle" dominantBaseline="central"
                        fill={d==="N"?"hsl(36,55%,55%)":"hsl(40,20%,80%)"}
                        fontSize={d==="N"?"12":"10"} fontWeight={d==="N"?"bold":"normal"}
                        opacity={d==="N"?0.8:0.35}>{d}</text>;
                    })}
                    <g transform={`rotate(${qiblaAngle}, 100, 100)`}>
                      <line x1="100" y1="100" x2="100" y2="25" stroke="hsl(36,55%,55%)" strokeWidth="3" strokeLinecap="round" />
                      <polygon points="100,18 94,32 106,32" fill="hsl(36,55%,55%)" />
                      <text x="100" y="12" textAnchor="middle" dominantBaseline="central" fontSize="14">🕋</text>
                    </g>
                    <circle cx="100" cy="100" r="4" fill="hsl(36,55%,55%)" opacity="0.5" />
                  </svg>
                </div>
                <p className="text-xs text-cream-muted mb-1">{t("qiblaNoSensor")}</p>
                <p className="text-sm text-gold mb-3">{t("qibla")}: {Math.round(qiblaAngle)}°</p>
                <button onClick={openQiblaMap}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs border border-white/10 text-cream-muted hover:text-gold hover:border-[hsl(36,55%,55%,0.3)] transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Haritada göster
                </button>
              </div>
            )}

            {hasCompass === true && heading != null && (
              <div className="py-2">
                <p className="text-xs text-cream-muted mb-3">{t("qiblaDesc")}</p>
                <div className="w-52 h-52 mx-auto relative">
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    <circle cx="100" cy="100" r="95" fill="none" stroke="hsl(36,55%,55%)" strokeWidth="1.5" opacity="0.2" />
                    <circle cx="100" cy="100" r="75" fill="none" stroke="hsl(36,55%,55%)" strokeWidth="0.5" opacity="0.1" />

                    <g transform={`rotate(${-heading}, 100, 100)`}>
                      {[{l:"N",a:0},{l:"E",a:90},{l:"S",a:180},{l:"W",a:270}].map(({l,a}) => {
                        const rad=(a*Math.PI)/180;
                        return <text key={l} x={100+86*Math.sin(rad)} y={100-86*Math.cos(rad)}
                          textAnchor="middle" dominantBaseline="central"
                          fill={l==="N"?"hsl(0,60%,55%)":"hsl(40,20%,80%)"}
                          fontSize={l==="N"?"12":"10"} fontWeight={l==="N"?"bold":"normal"}
                          opacity={l==="N"?0.9:0.4}>{l}</text>;
                      })}
                      <polygon points="100,12 96,22 104,22" fill="hsl(0,60%,50%)" opacity="0.6" />
                    </g>

                    <g transform={`rotate(${needleAngle}, 100, 100)`}>
                      <line x1="100" y1="100" x2="100" y2="25" stroke="hsl(36,55%,55%)" strokeWidth="3.5" strokeLinecap="round" />
                      <polygon points="100,18 93,34 107,34" fill="hsl(36,55%,55%)" />
                      <text x="100" y="10" textAnchor="middle" dominantBaseline="central" fontSize="16">🕋</text>
                    </g>

                    <circle cx="100" cy="100" r="5" fill="hsl(36,55%,55%)" opacity="0.5" />
                    <circle cx="100" cy="100" r="2" fill="hsl(36,60%,70%)" />
                  </svg>
                </div>

                <div className="mt-2 text-[10px] text-cream-muted/40">
                  Kıble: {Math.round(qiblaAngle)}° · Pusula: {Math.round(heading)}° · {debug}
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
