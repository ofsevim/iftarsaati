import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/** İmsak — hilal + yıldızlar, gece atmosferi */
export const FajrIcon = (props: IconProps) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    {/* Hilal */}
    <path
      d="M18 6C12.5 6 8 10.5 8 16s4.5 10 10 10c2.5 0 4.8-.9 6.5-2.5-1.2.5-2.5.8-3.8.8C14.9 24.3 10.3 19.7 10.3 13.9c0-3.5 1.7-6.6 4.3-8.5C16.2 6.1 17.1 6 18 6z"
      fill="currentColor"
      opacity="0.85"
    />
    {/* Yıldızlar */}
    <circle cx="22" cy="8" r="1" fill="currentColor" opacity="0.7" />
    <circle cx="26" cy="12" r="0.7" fill="currentColor" opacity="0.5" />
    <circle cx="24" cy="5" r="0.5" fill="currentColor" opacity="0.4" />
  </svg>
);

/** Güneş doğuşu — ufuk çizgisi + yükselen güneş */
export const SunriseIcon = (props: IconProps) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    {/* Ufuk */}
    <line x1="4" y1="22" x2="28" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    {/* Güneş yarım daire */}
    <path
      d="M10 22a6 6 0 0 1 12 0"
      fill="currentColor"
      opacity="0.75"
    />
    {/* Işınlar */}
    <line x1="16" y1="10" x2="16" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
    <line x1="10" y1="12.5" x2="11.8" y2="14.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    <line x1="22" y1="12.5" x2="20.2" y2="14.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    <line x1="7" y1="17" x2="9" y2="18" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
    <line x1="25" y1="17" x2="23" y2="18" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
    {/* Yukarı ok — doğuş */}
    <path d="M16 8l-2 2.5h4L16 8z" fill="currentColor" opacity="0.5" />
  </svg>
);

/** Öğle — tam güneş, güçlü ışınlar */
export const DhuhrIcon = (props: IconProps) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    {/* Güneş */}
    <circle cx="16" cy="16" r="5.5" fill="currentColor" opacity="0.85" />
    {/* Işınlar */}
    <line x1="16" y1="4" x2="16" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    <line x1="16" y1="24" x2="16" y2="28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    <line x1="4" y1="16" x2="8" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    <line x1="24" y1="16" x2="28" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    <line x1="7.5" y1="7.5" x2="10.3" y2="10.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.45" />
    <line x1="21.7" y1="21.7" x2="24.5" y2="24.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.45" />
    <line x1="24.5" y1="7.5" x2="21.7" y2="10.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.45" />
    <line x1="10.3" y1="21.7" x2="7.5" y2="24.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.45" />
  </svg>
);

/** İkindi — eğik güneş + uzun gölge hissi */
export const AsrIcon = (props: IconProps) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    {/* Güneş (sağa kaymış) */}
    <circle cx="18" cy="13" r="4.5" fill="currentColor" opacity="0.75" />
    {/* Kısa ışınlar */}
    <line x1="18" y1="4" x2="18" y2="6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    <line x1="25" y1="13" x2="27" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    <line x1="23.5" y1="7.5" x2="22" y2="9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
    <line x1="12" y1="8" x2="13.5" y2="9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
    {/* Ufuk + gölge */}
    <line x1="4" y1="24" x2="28" y2="24" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
    <ellipse cx="14" cy="24" rx="6" ry="1.5" fill="currentColor" opacity="0.15" />
  </svg>
);

/** Akşam — batan güneş, sıcak ufuk */
export const MaghribIcon = (props: IconProps) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    {/* Ufuk */}
    <line x1="4" y1="20" x2="28" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    {/* Batan güneş — sadece üst kısmı görünür */}
    <path
      d="M10 20a6 6 0 0 1 12 0"
      fill="currentColor"
      opacity="0.65"
    />
    {/* Sıcak ışık yayılımı */}
    <ellipse cx="16" cy="20" rx="10" ry="3" fill="currentColor" opacity="0.1" />
    {/* Aşağı ok — batış */}
    <path d="M16 24l-2-2.5h4L16 24z" fill="currentColor" opacity="0.45" />
    {/* Hafif ışınlar */}
    <line x1="16" y1="10" x2="16" y2="13" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.35" />
    <line x1="10" y1="13" x2="11.5" y2="14.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
    <line x1="22" y1="13" x2="20.5" y2="14.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
  </svg>
);

/** Yatsı — hilal + cami silueti + yıldız */
export const IshaIcon = (props: IconProps) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    {/* Hilal (küçük, üstte) */}
    <path
      d="M20 4c-3.3 0-6 2.7-6 6 0 1.5.5 2.8 1.4 3.9-.3.1-.6.1-.9.1C11.5 14 9 11.5 9 8.5c0-1.2.4-2.3 1-3.2C10.3 5.1 10.6 5 11 5c-1.7 0-3.2.7-4.3 1.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="0"
    />
    <path
      d="M22 5c-2 0-3.8.8-5 2.2.8-.4 1.7-.7 2.7-.7 3 0 5.5 2.5 5.5 5.5 0 1-.3 1.9-.7 2.7C25.8 13.5 26.5 11.7 26.5 9.7 26.5 7.1 24.5 5 22 5z"
      fill="currentColor"
      opacity="0.8"
    />
    {/* Yıldız */}
    <path
      d="M13 7l.7 1.4 1.5.2-1.1 1 .3 1.5L13 10.3l-1.4.8.3-1.5-1.1-1 1.5-.2z"
      fill="currentColor"
      opacity="0.6"
    />
    {/* Cami silueti */}
    <path
      d="M8 28v-6c0-2 1.5-3.5 3-4.5.5-.3 1-.5 1.5-.5h7c.5 0 1 .2 1.5.5 1.5 1 3 2.5 3 4.5v6H8z"
      fill="currentColor"
      opacity="0.2"
    />
    {/* Minare */}
    <rect x="6" y="20" width="1.5" height="8" rx="0.5" fill="currentColor" opacity="0.3" />
    <rect x="24.5" y="20" width="1.5" height="8" rx="0.5" fill="currentColor" opacity="0.3" />
    {/* Kubbe */}
    <path
      d="M12 18c0-2.2 1.8-4 4-4s4 1.8 4 4"
      fill="currentColor"
      opacity="0.25"
    />
  </svg>
);
