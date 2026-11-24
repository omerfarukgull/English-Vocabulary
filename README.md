# Personal English Vocabulary (Kelimelerim)

Kişisel kullanım için, telefon öncelikli İngilizce kelime öğrenme uygulaması (PWA).
React + TypeScript + Vite, veriler cihazda (IndexedDB), üyelik/sunucu yok.

## Özellikler
- Günlük 10 yeni kelime hedefi (tekrarlardan ayrı sayılır), ilerleme çubuğu, seri (streak)
- 2571 kelime, 26 kategori (Zamirler dahil: kişi, nesne, iyelik, dönüşlü, işaret, soru, belgisiz ve karşılıklı zamirler), A1/A2/B1 (A2'den başlar, sonra A1 eksikleri, sonra B1)
- Öğrenme kartı: görsel, İngilizce, Türkçe, Türkçe okunuş, IPA, sesli telaffuz, örnek cümle + çeviri
- 5 test türü + karışık: görselden yaz, görselden seç, İngilizce→Türkçe, Türkçe→İngilizce yaz, dinle ve bul
- SM-2 benzeri akıllı tekrar; "Öğrenildi" için art arda 3 doğru + en az 3 farklı test türü gerekir
- Kelimelerim: arama, kategori/seviye/durum filtresi, favoriler, detay, tekrar et
- İstatistik: toplamlar, doğru oranı, 14 günlük grafik, haftalık karşılaştırma, zor kategoriler
- Açık/koyu tema, konuşma hızı ve ses seçimi, JSON yedek al / geri yükle, onaylı sıfırlama
- Günlere göre kelimeler: Öğren > "Günlerim" sekmesinde her gün öğrenilen kelimeler ayrı tutulur ("1. Gün", "2. Gün" …,
  en yeni gün başta, sayfa başına 7 gün). Her gün kart kart yeniden gözden geçirilebilir ya da o günün kelimeleriyle test çözülebilir.
  Ana sayfadaki "Bugünün kelimelerini tekrar et" düğmesi bugünün kelimelerini öğrenme sırasıyla yeniden gösterir. Bu tekrar ilerlemeyi değiştirmez.
- Kategori bazlı çalışma: Ana sayfadaki "Çalışılan kategori" seçimiyle yeni kelimeler yalnızca o kategoriden gelir
  (bugünün henüz görülmemiş kelimeleri de yeni kategoriden yeniden seçilir). Tekrar ekranında da "Hangi kategoriden?" seçilebilir.
  Akıllı tekrar takvimi, günlük hedef ve istatistikler tüm kategorilerde ortaktır.
- Kendi kelimeni ekle: sözlükte zaten varsa yeniden eklemez, mevcut kelimeyi öğrenme listene almayı önerir; eklenen kelimeler
  "Kendi kelimelerim" kategorisinde durur, sonradan düzenlenip silinebilir, günlük planda öne alınır
- Yazım hatası kontrolü: kelime eklerken uygulama sözlüğü + 63.367 kelimelik çevrimdışı İngilizce listeyle karşılaştırılır
  ("Bunu mu demek istediniz: apple?"); listede olmayan kelimede "Bu kelime sözlükte bulunamadı, emin misin?" uyarısı çıkar.
  Yazılı testlerde tek harflik kayma (uzun kelimede iki) "Neredeyse doğru" sayılır: doğru yazım gösterilir, kelime tam doğru
  sayılmaz ve ertesi gün yeniden sorulur. Yazılan şey uygulamadaki başka bir kelimeyse (ör. "three" yerine "tree") yanlış sayılır.
- Kelime aileleri: aynı kökten kelimeler kartta birlikte gösterilir (happy, unhappy, happiness …; 199 grup)
- Hafıza ipuçları: görseli olmayan 1539 kelimenin hepsinde Türkçe bir ipucu var (benzer ses, Türkçedeki ortak kelime,
  kelimenin parçaları ya da ekleri). İpuçları `data/hints.txt` dosyasındadır; birleşik kelimeler ve ekli kelimeler için
  olanlar build sırasında otomatik üretilir, dosyadaki elle yazılmış ipucu her zaman önceliklidir.
- Günlük hatırlatma (Ayarlar): seçtiğin saatte bildirim. Sınırları: uygulama açıkken her tarayıcıda çalışır; uygulama
  kapalıyken yalnızca arka plan eşitlemesini destekleyen tarayıcılarda (Android Chrome, ana ekrana eklenmiş olarak) ve
  saati tarayıcının belirlediği bir zamanda gelir. iPhone'da kapalı uygulamadan bildirim garanti değildir. Bu yüzden
  ".ics takvim hatırlatıcısı" düğmesi telefonun takvimine her gün o saatte alarmlı bir etkinlik ekler; en güvenilir yol budur.
- Günün testi: yalnızca o gün öğrenilen kelimelerden her zaman 20 soru, farklı test türleriyle (kelime azsa kelimeler
  farklı türlerle tekrar sorulur, aynı kelime art arda gelmez). "Günlerim"deki gün testleri de 20 soru.
- Genel test: şimdiye kadar öğrenilen tüm kelimelerden 30 soru (zorlanılan kelimeler öncelikli). İstenince her zaman
  çözülebilir; haftada bir zorunludur: son genel testten (ya da ilk kelimeden) 7 gün sonra ana sayfada kalıcı uyarı çıkar,
  bir gün daha gecikirse test çözülene kadar yeni kelime öğrenme kilitlenir (tekrar ve diğer testler açık kalır).
- Arayüz dili (Ayarlar → Dil / Language): Türkçe veya English. Yalnızca menüler, düğmeler ve mesajlar çevrilir;
  kelimeler İngilizce, anlamları, ipuçları ve örnek çevirileri Türkçe kalır. Seçim cihazda saklanır, varsayılan Türkçe.
  Metinler `src/lib/i18n-en.ts` içinde (anahtar Türkçe metnin kendisi).
- Çevrimdışı çalışma (service worker tüm dosyaları önbelleğe alır), ana ekrana eklenebilir

## Çalıştırma (bilgisayarda)
Node.js 20+ gerekir.
```
npm install
npm run dev        # geliştirme: http://localhost:5173
npm run build      # üretim derlemesi: dist/ klasörü
npm run preview    # derlemeyi dene: http://localhost:4173
```
Kelime verisi `data/*.psv` dosyalarındadır (satır başına bir kelime). Düzenledikten sonra
`npm run data` veya `npm run build` çalıştır; betik tekrar eden kelime/anlam/ikonları ve eksik alanları denetler.

## Telefona yükleme
Telefona kurulabilmesi için `dist/` klasörünün HTTPS ile yayınlanması gerekir (GitHub Pages, Netlify, Vercel ücretsiz).
- Android (Chrome): siteyi aç → menü (⋮) → "Ana ekrana ekle" / "Uygulamayı yükle".
- iPhone (Safari): siteyi aç → Paylaş → "Ana Ekrana Ekle".
İlk açılışta tüm kelimeler ve görseller indirilir; sonra internetsiz açılır.

## Görseller
Kelime görselleri açık lisanslı tek renkli ikon setlerinden (Material Design Icons, Material Symbols, game-icons.net,
Healthicons, Phosphor, Font Awesome Free, Fluent UI, MingCute) alınıp uygulamaya gömülü SVG'lerdir; lisanslar
`public/ikon-lisanslari.txt` dosyasında (yazım kontrolündeki SCOWL kelime listesinin izin metni de orada). Renkler, sayılar, sıklık zarfları (5 nokta ölçeği), yer edatları (kutu-top
şemaları), pusula yönleri ve karşıt sıfatlar (dolu şekil = kelime, kesikli şekil = karşıtı) için şemalar bu uygulamada çizildi.

Kelime → görsel eşleşmeleri `data/images.txt` dosyasındadır (`kelime-id|set:ikon`, iki parçalı sahne için `a+b`).
Her eşleşme ekranda tek tek kontrol edildi; bir ikon yalnızca bir kelimede kullanılabilir (build denetler) ve başka bir
kelimenin resmine çok benzeyen eşleşmeler çıkarıldı.

2571 kelimenin 1032'sinde görsel var. Kalan 1539 kelimede (çoğu fiil, sıfat, soyut kavram, bağlaç; ayrıca haftanın günleri
ve aylar) yanıltmayan bir resim bulunamadığı için alakasız görsel yerine nötr harf kartı gösterilir; bu kelimeler görselli
testlerde sorulmaz.

## Veri
Tüm ilerleme yalnızca cihazdaki IndexedDB'de tutulur, hiçbir yere gönderilmez. Uygulama güncellemeleri
ilerlemeyi silmez (kelime kimlikleri sabittir). Tarayıcı verisini temizlemek ilerlemeyi siler; düzenli JSON yedeği alın.
