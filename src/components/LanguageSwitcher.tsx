import { useI18n, type Locale } from "@/lib/i18n";
import { Globe } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const LANGUAGES: { code: Locale; label: string; flag: string }[] = [
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
];

const LanguageSwitcher = () => {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="glass-card gold-border p-2.5 flex items-center gap-1.5 text-xs transition-colors hover:text-gold"
        aria-label="Dil seçimi"
      >
        <Globe className="w-4 h-4 text-cream-muted" />
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 bg-[#0d1217] backdrop-blur-xl rounded-2xl border gold-border overflow-hidden shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { setLocale(lang.code); setOpen(false); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm w-full transition-colors ${
                locale === lang.code ? "text-gold bg-night-light" : "text-cream-muted hover:bg-night-light"
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
