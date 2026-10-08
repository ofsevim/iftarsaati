# Vakt-i Şerif - Namaz Vakitleri ve Ramazan İmsakiyesi

Türkiye için modern, kullanıcı dostu Ramazan imsakiyesi ve namaz vakitleri uygulaması.

## 🌙 Özellikler

- **İftar Geri Sayımı**: Akşam namazına kalan süreyi gerçek zamanlı gösterir
- **81 İl Desteği**: Türkiye'nin tüm illeri için namaz vakitleri
- **Konum Bazlı**: GPS ile otomatik şehir tespiti
- **Aylık İmsakiye**: Yaklaşan veya devam eden Ramazan için tam imsakiye tablosu
- **Kadir Gecesi & Bayram**: Özel günler vurgulanır
- **PWA Desteği**: Telefonunuza uygulama olarak yüklenebilir
- **Offline Çalışma**: Önceden açılmış uygulama ve alınmış vakitler, bağlantı olmadan da kullanılabilir

## 🛠️ Teknolojiler

- React 18 + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Aladhan Prayer Times API

## 🚀 Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev

# Production build
npm run build

# Testleri çalıştır
npm run test
```

## 📱 PWA Kurulumu

Uygulama Progressive Web App olarak tasarlanmıştır. Tarayıcınızdan "Ana Ekrana Ekle" seçeneği ile telefonunuza yükleyebilirsiniz.

## 🤖 Android derlemesi

Android Studio, Android SDK ve Java 21 kurulu bir ortamda:

```bash
npm install
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

Oluşan APK `android/app/build/outputs/apk/debug/` dizinindedir. Native bildirimler için uygulama ilk açılışta bildirim izni ister; tam zamanlı alarmlar cihaz ayarlarına bağlıdır.

## 📄 Lisans

MIT

## 🤲 Ramazan-ı Şerif'iniz Mübarek Olsun
