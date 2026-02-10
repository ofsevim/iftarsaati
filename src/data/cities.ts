// Turkey cities with coordinates for Aladhan API
export interface City {
  name: string;
  lat: number;
  lng: number;
}

export const TURKEY_CITIES: City[] = [
  { name: "Adana", lat: 37.0, lng: 35.3213 },
  { name: "Adıyaman", lat: 37.7648, lng: 38.2786 },
  { name: "Afyonkarahisar", lat: 38.7507, lng: 30.5567 },
  { name: "Ağrı", lat: 39.7191, lng: 43.0503 },
  { name: "Aksaray", lat: 38.3687, lng: 34.0370 },
  { name: "Amasya", lat: 40.6499, lng: 35.8353 },
  { name: "Ankara", lat: 39.9334, lng: 32.8597 },
  { name: "Antalya", lat: 36.8969, lng: 30.7133 },
  { name: "Artvin", lat: 41.1828, lng: 41.8183 },
  { name: "Aydın", lat: 37.8560, lng: 27.8416 },
  { name: "Balıkesir", lat: 39.6484, lng: 27.8826 },
  { name: "Bartın", lat: 41.6344, lng: 32.3375 },
  { name: "Batman", lat: 37.8812, lng: 41.1351 },
  { name: "Bayburt", lat: 40.2552, lng: 40.2249 },
  { name: "Bilecik", lat: 40.0567, lng: 30.0665 },
  { name: "Bingöl", lat: 38.8854, lng: 40.4966 },
  { name: "Bitlis", lat: 38.4004, lng: 42.1095 },
  { name: "Bolu", lat: 40.7360, lng: 31.6061 },
  { name: "Burdur", lat: 37.7203, lng: 30.2908 },
  { name: "Bursa", lat: 40.1885, lng: 29.0610 },
  { name: "Çanakkale", lat: 40.1553, lng: 26.4142 },
  { name: "Çankırı", lat: 40.6013, lng: 33.6134 },
  { name: "Çorum", lat: 40.5506, lng: 34.9556 },
  { name: "Denizli", lat: 37.7765, lng: 29.0864 },
  { name: "Diyarbakır", lat: 37.9144, lng: 40.2306 },
  { name: "Düzce", lat: 40.8438, lng: 31.1565 },
  { name: "Edirne", lat: 41.6818, lng: 26.5623 },
  { name: "Elazığ", lat: 38.6810, lng: 39.2264 },
  { name: "Erzincan", lat: 39.7500, lng: 39.5000 },
  { name: "Erzurum", lat: 39.9055, lng: 41.2658 },
  { name: "Eskişehir", lat: 39.7767, lng: 30.5206 },
  { name: "Gaziantep", lat: 37.0662, lng: 37.3833 },
  { name: "Giresun", lat: 40.9128, lng: 38.3895 },
  { name: "Gümüşhane", lat: 40.4386, lng: 39.5086 },
  { name: "Hakkâri", lat: 37.5833, lng: 43.7333 },
  { name: "Hatay", lat: 36.4018, lng: 36.3498 },
  { name: "Iğdır", lat: 39.9167, lng: 44.0500 },
  { name: "Isparta", lat: 37.7648, lng: 30.5566 },
  { name: "İstanbul", lat: 41.0082, lng: 28.9784 },
  { name: "İzmir", lat: 38.4192, lng: 27.1287 },
  { name: "Kahramanmaraş", lat: 37.5858, lng: 36.9371 },
  { name: "Karabük", lat: 41.2061, lng: 32.6204 },
  { name: "Karaman", lat: 37.1759, lng: 33.2287 },
  { name: "Kars", lat: 40.6167, lng: 43.1000 },
  { name: "Kastamonu", lat: 41.3887, lng: 33.7827 },
  { name: "Kayseri", lat: 38.7312, lng: 35.4787 },
  { name: "Kilis", lat: 36.7184, lng: 37.1212 },
  { name: "Kırıkkale", lat: 39.8468, lng: 33.5153 },
  { name: "Kırklareli", lat: 41.7333, lng: 27.2167 },
  { name: "Kırşehir", lat: 39.1425, lng: 34.1709 },
  { name: "Kocaeli", lat: 40.8533, lng: 29.8815 },
  { name: "Konya", lat: 37.8667, lng: 32.4833 },
  { name: "Kütahya", lat: 39.4167, lng: 29.9833 },
  { name: "Malatya", lat: 38.3552, lng: 38.3095 },
  { name: "Manisa", lat: 38.6191, lng: 27.4289 },
  { name: "Mardin", lat: 37.3212, lng: 40.7245 },
  { name: "Mersin", lat: 36.8121, lng: 34.6415 },
  { name: "Muğla", lat: 37.2153, lng: 28.3636 },
  { name: "Muş", lat: 38.7432, lng: 41.5064 },
  { name: "Nevşehir", lat: 38.6939, lng: 34.6857 },
  { name: "Niğde", lat: 37.9667, lng: 34.6833 },
  { name: "Ordu", lat: 40.9839, lng: 37.8764 },
  { name: "Osmaniye", lat: 37.0742, lng: 36.2478 },
  { name: "Rize", lat: 41.0201, lng: 40.5234 },
  { name: "Sakarya", lat: 40.6940, lng: 30.4358 },
  { name: "Samsun", lat: 41.2928, lng: 36.3313 },
  { name: "Şanlıurfa", lat: 37.1591, lng: 38.7969 },
  { name: "Siirt", lat: 37.9333, lng: 41.9500 },
  { name: "Sinop", lat: 42.0231, lng: 35.1531 },
  { name: "Şırnak", lat: 37.4187, lng: 42.4918 },
  { name: "Sivas", lat: 39.7477, lng: 37.0179 },
  { name: "Tekirdağ", lat: 41.0, lng: 27.5167 },
  { name: "Tokat", lat: 40.3167, lng: 36.5500 },
  { name: "Trabzon", lat: 41.0027, lng: 39.7168 },
  { name: "Tunceli", lat: 39.1079, lng: 39.5401 },
  { name: "Uşak", lat: 38.6823, lng: 29.4082 },
  { name: "Van", lat: 38.4891, lng: 43.3800 },
  { name: "Yalova", lat: 40.6500, lng: 29.2667 },
  { name: "Yozgat", lat: 39.8181, lng: 34.8147 },
  { name: "Zonguldak", lat: 41.4564, lng: 31.7987 },
];

export const QUICK_CITIES = ["Ankara", "İstanbul", "Kahramanmaraş", "İzmir", "Bursa", "Antalya", "Konya"];

export interface PrayerTimes {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

export const PRAYER_LABELS: Record<keyof PrayerTimes, string> = {
  Fajr: "İmsak",
  Sunrise: "Güneş",
  Dhuhr: "Öğle",
  Asr: "İkindi",
  Maghrib: "Akşam",
  Isha: "Yatsı",
};

export const PRAYER_ICONS: Record<keyof PrayerTimes, string> = {
  Fajr: "🌙",
  Sunrise: "🌅",
  Dhuhr: "☀️",
  Asr: "🌤️",
  Maghrib: "🌇",
  Isha: "🌃",
};
