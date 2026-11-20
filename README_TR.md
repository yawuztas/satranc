# Satranç Akademisi

Satranç Akademisi, açılışları, taktikleri ve oyun planlarını etkileşimli bir
tahta üzerinde çalışmak için geliştirilen yerel öncelikli bir eğitim
uygulamasıdır. Türkçe arayüz mobil ve masaüstü ekranlara uyumludur.

## Menüler

- **Satranç Hocası:** Seviyenizi (başlangıç, orta veya ileri) ve renginizi
  seçip derse başlayın. Hoca, konumdaki aday hamleleri gösterir; oynadığınız
  hamleyi planla karşılaştırır, açıklama verir ve rakibin cevabını otomatik
  oynatır. Ders sırasında geri alıp yeniden başlayabilirsiniz.
- **Serbest Oyun:** Tahtada serbestçe varyant kurun, konumu inceleyin ve
  motor değerlendirmesinden yararlanın.
- **Bulmacalar:** Taktik ve tuzak pozisyonlarında doğru hamleyi bulmaya çalışın.
- **Ayarlar:** Uygulama tercihlerini ve sesli hamle bildirimini yönetin.

## Açılış arşivi ve veri kaynakları

Açılış kaşifi, uygulamaya gömülü yerel büyükusta istatistiklerini her zaman
kullanılabilir bir arşiv olarak sunar. Bağlantı varsa mevcut konumun daha
geniş istatistikleri isteğe bağlı olarak Lichess Masters Explorer'dan alınır.
Lichess yanıt vermezse veya konum çevrimdışı yerel arşivdeyse uygulama
otomatik olarak yerel veriye döner; çevrimiçi servis uygulamanın çalışması için
zorunlu değildir.

## Motor

Stockfish, `public/stockfish` altındaki dosyalardan bir Web Worker içinde
çalışır; böylece hesaplama arayüzü engellemez. Worker başlatılamazsa uygulama
değerlendirme için basit materyal sezgisine, rakip hamlesi için de yasal hamle
geri dönüşüne geçer. Lichess açılış istatistikleri ve (uygun konumlarda)
Syzygy tablo tabanı ek çevrimiçi kaynaklardır ve isteğe bağlıdır.

## Geliştirme

Node.js ve npm kurulu bir ortamda:

```bash
npm install
npm run dev
```

Üretim derlemesi:

```bash
npm run build
```

Lint kontrolü:

```bash
npm run lint
```

`npm run dev` sonrasında Vite'in gösterdiği yerel adresi tarayıcıda açın.
