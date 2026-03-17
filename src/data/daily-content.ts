/**
 * Günlük içerik verileri — 30 gün boyunca tekrar etmeyecek şekilde hazırlanmıştır.
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
    text: "Allah'ım! Niyetimizi halis, soframızı bereketli, gönlümüzü huzurlu eyle.",
  },
  {
    title: "Günün Duası",
    text: "Rabbim! Bizi affınla kuşat, sabrımızı artır, bize doğru yolu sevdir.",
  },
  {
    title: "Günün Duası",
    text: "Allah'ım! Bugün yaptığımız hayırları kabul eyle, kusurlarımızı bağışla.",
  },
  {
    title: "Günün Duası",
    text: "Rabbim! Evimizi huzurla, kalbimizi imanla, dilimizi güzel sözle doldur.",
  },
  {
    title: "Günün Duası",
    text: "Allah'ım! Dualarımızı kabul eyle, rızkımıza bereket ver, şifa ihsan eyle.",
  },
  {
    title: "Günün Duası",
    text: "Rabbim! Bu Ramazan'ı bize hayırlı kıl, orucumuzu ve namazımızı kabul buyur.",
  },
  {
    title: "Günün Duası",
    text: "Allah'ım! Gönlümüzdeki karanlıkları nur ile aydınlat, kalbimizi kinden arındır.",
  },
  {
    title: "Günün Duası",
    text: "Rabbim! Bizi ve sevdiklerimizi cehennem ateşinden koru, cennetine kavuştur.",
  },
  {
    title: "Günün Duası",
    text: "Allah'ım! Dilimizi yalandan, gözümüzü haramdan, kalbimizi gafilletten koru.",
  },
  {
    title: "Günün Duası",
    text: "Rabbim! Şükrünü eda edebilmek için bize güç ver, nimetlerine karşı nankörlükten sakındır.",
  },
  {
    title: "Günün Duası",
    text: "Allah'ım! Bugün bize sabır ver, sıkıntılarımızı kolaylaştır, işlerimize bereket ihsan eyle.",
  },
  {
    title: "Günün Duası",
    text: "Rabbim! Bizi güzel ahlakla donandır, kötü huylardan uzak tut.",
  },
  {
    title: "Günün Duası",
    text: "Allah'ım! Hasta olanlarımıza şifa, darda kalanlarımıza kurtuluş nasip et.",
  },
  {
    title: "Günün Duası",
    text: "Rabbim! Vefat eden yakınlarımıza rahmet eyle, kabirlerini genişlet ve nurlandır.",
  },
  {
    title: "Günün Duası",
    text: "Allah'ım! Bu ümmetin birliğini ve dirliğini koru, aramızdan fitne ve fesadı kaldır.",
  },
  {
    title: "Günün Duası",
    text: "Rabbim! İlmimi artır, hayrımı çoğalt, beni sana yakın olanlarla haşret.",
  },
  {
    title: "Günün Duası",
    text: "Allah'ım! Gece ibadetimizi kabul et, gündüz orucumuzu bereketli kıl.",
  },
  {
    title: "Günün Duası",
    text: "Rabbim! Kalbimi imanla, gözlerimi gözyaşıyla, halimi tevbeyle doldur.",
  },
  {
    title: "Günün Duası",
    text: "Allah'ım! Bize helal rızık ver, haramdan korut, şükür ehlinden eyle.",
  },
  {
    title: "Günün Duası",
    text: "Rabbim! Bizi sırat-ı müstakimde sabit kıl, yolumuzu doğrult, adımlarımızı sağlamlaştır.",
  },
  {
    title: "Günün Duası",
    text: "Allah'ım! Bugün söylediğimiz her kelimede hayrı, yaptığımız her işte bereketi nasip et.",
  },
  {
    title: "Günün Duası",
    text: "Rabbim! Kadir gecesinin bereketinden bizi nasiplendir, o gecenin feyzini kalbimize akıt.",
  },
  {
    title: "Günün Duası",
    text: "Allah'ım! Ramazan'ı tamamlamayı, arınmış olarak bayrama ulaşmayı bize nasip et.",
  },
  {
    title: "Günün Duası",
    text: "Rabbim! Geçmiş günahlarımı affet, geleceğimi hayırla doldur, şimdiki halimi güzelleştir.",
  },
  {
    title: "Günün Duası",
    text: "Allah'ım! Bizi senin zikrinden, şükründen ve güzel ibadetinden mahrum etme.",
  },
  {
    title: "Günün Duası",
    text: "Rabbim! Mazlumların feryadını duyduğunda bizi de onlara yardımcı eyle.",
  },
  {
    title: "Günün Duası",
    text: "Allah'ım! Kur'an'ı anlayarak okumayı, onunla amel etmeyi bize kolaylaştır.",
  },
  {
    title: "Günün Duası",
    text: "Rabbim! Nefsimizin şerrinden, şeytanın vesvesesinden ve kötü arkadaşlıktan bizi koru.",
  },
  {
    title: "Günün Duası",
    text: "Allah'ım! Bu ayı hastalıktan, sıkıntıdan ve beladan uzak, sağlık ve afiyetle geçirmemizi nasip et.",
  },
  {
    title: "Günün Duası",
    text: "Rabbim! Son nefesimizde kelime-i şehadet ile göç etmeyi, sana güzel bir kullukla kavuşmayı nasip eyle.",
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
    text: "Bugün bir yakınını ara, hal hatır sor: küçük bir ilgi büyük bir mutluluk olur.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Dilin zikre, kalbin şükre alışsın: bugün 33x 'Sübhanallah', 33x 'Elhamdülillah', 33x 'Allahu Ekber'.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Gün bitmeden kısa bir tefekkür: Bugün hangi iyiliği çoğaltabilirim?",
  },
  {
    title: "Günün Hatırlatması",
    text: "Sahurda kalkamasan da bir bardak su iç; sünnet olan bu küçük eylemi ihmal etme.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Bugün sosyal medyada geçirdiğin süreyi yarıya indir, o zamanı dua ve Kur'an'a ayır.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Komşunun iftar sofrası var mı? Küçük bir tabak yemek göndermek sünnet ve büyük sevap.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Bugün gereksiz tartışmalardan uzak dur; oruç yalnızca yemekten değil kötü sözden de perhizdir.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Bir sure veya ayet ezberlemek için güzel bir gün: küçük adımlar büyük hedeflere ulaştırır.",
  },
  {
    title: "Günün Hatırlatması",
    text: "İftar sofrasına oturmadan önce iki rekat namaz kılmak için vaktini ayarla.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Bugün sadaka vermek için cüzdanını aç: az da olsa verilen sadaka bereketi artırır.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Ramazan'da uyku düzenine dikkat et; gece geç yatmak sabah namazını kaçırtabilir.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Bugün istifar duasını (Estağfirullah) en az 100 kez söylemeyi dene.",
  },
  {
    title: "Günün Hatırlatması",
    text: "İftarda aşırıya kaçmamak sağlıklı ve sünnet: peygamberimiz üç hurmayı tavsiye etti.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Bugün kalbindeki kin ve kırgınlığı bırak; Ramazan af ve barışmanın mevsimidir.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Kur'an'ı bugün sesli oku; hem telaffuzunu düzeltir hem de ruhunu dinlendirir.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Bugün birinin borcunu ya da yükünü hafifletmek için ne yapabilirsin? Düşün ve harekete geç.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Kadir Gecesi'ne hazırlan: son on gecede teravih namazını aksatma.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Bugün aile sofrasında telefonunu bir kenara bırak; beraber geçirilen zaman en kıymetli hediyedir.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Öğle vakti 15 dakika kısa bir uyku, hem sünnettir hem de enerji verir.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Bugün bir iyilik zinciri başlat: birine iyilik yap ve ona da aynısını başkasına yapmasını söyle.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Teravih namazlarında Kur'an'ın hatmedilişini takip etmek bu geceleri daha anlamlı kılar.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Bugün içtiğin her yudumda şükret; dünyada temiz suya erişemeyen milyonlar var.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Ramazan'ın son haftasına girdik; ibadetleri yoğunlaştırmanın tam zamanı.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Bugün çocuklara oruç ve Ramazan'ı anlat; onlara imanı sevdirmek en büyük mirastır.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Fitre ve zekât hesaplarını bugün gözden geçir; bayramdan önce ödemenin zamanı yaklaşıyor.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Ramazan'dan sonra da tutmak istediğin bir iyi alışkanlık belirle ve bugün başla.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Son iftar sofralarından birinde herkese teşekkür et; minnettarlık ifade etmek sünnettir.",
  },
  {
    title: "Günün Hatırlatması",
    text: "Ramazan'ı uğurlarken 'Allahümme belliğna ramazan' duasını et; gelecek yıl yeniden kavuşmak için.",
  },
];
