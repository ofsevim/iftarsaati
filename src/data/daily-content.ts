/**
 * Demo "günlük içerik" verileri.
 * Not: Uygulama offline/ilk kurulumda da çalışsın diye statik tutulur.
 */

export type DailyContentItem = {
  /** Kart başlığı */
  title: string;
  /** Gösterilecek ana metin */
  text: string;
  /** Kısa kaynak / not (opsiyonel) */
  source?: string;
};

export const DAILY_DUAS: DailyContentItem[] = [
  {
    title: "Günün Duası",
    text: "Allah’ım! Niyetimizi halis, soframızı bereketli, gönlümüzü huzurlu eyle.",
  },
  {
    title: "Günün Duası",
    text: "Rabbim! Bizi affınla kuşat, sabrımızı artır, bize doğru yolu sevdir.",
  },
  {
    title: "Günün Duası",
    text: "Allah’ım! Bugün yaptığımız hayırları kabul eyle, kusurlarımızı bağışla.",
  },
  {
    title: "Günün Duası",
    text: "Rabbim! Evimizi huzurla, kalbimizi imanla, dilimizi güzel sözle doldur.",
  },
  {
    title: "Günün Duası",
    text: "Allah’ım! Dualarımızı kabul eyle, rızkımıza bereket ver, şifa ihsan eyle.",
  },
];

export const DAILY_REMINDERS: DailyContentItem[] = [
  {
    title: "Günün Hatırlatması",
    text: "İftardan sonra bir bardak su ve kısa bir yürüyüş iyi gelir.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Bugün birine gönül alacak bir mesaj at: küçük bir iyilik büyük bir ferahlık olur.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Sahura kalkmadan önce su hazırlamak sabahı kolaylaştırır.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Dilin zikre, kalbin şükre alışsın: bugün 33x 'Sübhanallah', 33x 'Elhamdülillah', 33x 'Allahu Ekber'.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Gün bitmeden kısa bir tefekkür: Bugün hangi iyiliği çoğaltabilirim?",
  },
];



