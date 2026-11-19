const fs = require('fs');
const path = require('path');
const { Chess } = require('chess.js');

const rawOpenings = [
  // ==========================================
  // BEYAZ AÇILIŞLARI (20 ADET)
  // ==========================================
  {
    id: 'italian-game',
    name: 'Italian Game',
    turkishName: 'İtalyan Açılışı',
    eco: 'C50',
    side: 'white',
    category: 'Açık Oyunlar (1.e4 e5)',
    difficulty: 'Başlangıç',
    overview: 'Tarihin en eski ve en öğretici açık oyunudur. Beyaz filini c4 karesine çıkarak siyahın en hassas noktası olan f7 karesine doğrudan nişan alır.',
    whitePlans: ['c4 fili ile siyahın f7 zayıflığına baskı kurmak', 'c3 ve d4 sürerek merkezi tamamen ele geçirmek', 'Kısa rok atıp şah kanadı hücumu hazırlamak'],
    blackPlans: ['Filini c5 karesine gelerek denge kurmak (Giuoco Piano)', 'Nf6 ile İki At Savunması oynayıp e4 piyonuna saldırmak', 'd6 ile merkezi sağlamlaştırmak'],
    variations: [
      {
        id: 'giuoco-piano',
        name: 'Giuoco Piano (Sakin Oyun)',
        eco: 'C53',
        description: 'Klasik İtalyan yapısı. Her iki taraf da gelişimini mükemmel bir uyumla tamamlar.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6']
      },
      {
        id: 'fried-liver-attack',
        name: 'Fried Liver Attack (Kızarmış Ciğer)',
        eco: 'C57',
        description: 'Siyah f7 karesini koruyamazsa şah tahtanın ortasına sürüklenir.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7']
      },
      {
        id: 'evans-gambit',
        name: 'Evans Gambiti',
        eco: 'C51',
        description: 'Beyaz b4 piyonunu feda ederek gelişimde ve merkezde devasa bir üstünlük kurar.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5', 'd4']
      }
    ]
  },
  {
    id: 'ruy-lopez',
    name: 'Ruy Lopez (Spanish Opening)',
    turkishName: 'İspanyol Açılışı',
    eco: 'C60-C99',
    side: 'white',
    category: 'Açık Oyunlar (1.e4 e5)',
    difficulty: 'Orta Seviye',
    overview: 'Dünya şampiyonlarının en çok tercih ettiği derin stratejik açılıştır. Beyaz filini b5 karesine gelerek e5 piyonunu savunan c6 atına dolaylı baskı kurar.',
    whitePlans: ['c6 atını tehdit ederek dolaylı yoldan e5 piyonunu zayıflatmak', 'c3 ve d4 sürerek merkez üstünlüğü kurmak', 'Filini b3 ve c2 karelerinde saklayıp uzun vadeli hücumda tutmak'],
    blackPlans: ['3... a6 (Morphy Savunması) oynayarak fili sorgulamak', 'b5 sürerek vezir kanadında alan kazanmak', 'd6 ve Be7 ile konumu sağlam tutmak'],
    variations: [
      {
        id: 'morphy-defense',
        name: 'Morphy Savunması (3... a6)',
        eco: 'C70',
        description: 'Paul Morphy nin adını taşıyan en popüler İspanyol devam yolu.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7']
      },
      {
        id: 'berlin-defense',
        name: 'Berlin Savunması',
        eco: 'C65',
        description: 'Kramnik in Kasparov u yendiği aşılmaz Berlin Duvarı.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O', 'Nxe4', 'd4', 'Nd6']
      }
    ]
  },
  {
    id: 'queens-gambit',
    name: "Queen's Gambit",
    turkishName: 'Vezir Gambiti',
    eco: 'D06-D69',
    side: 'white',
    category: 'Kapalı Oyunlar (1.d4)',
    difficulty: 'Orta Seviye',
    overview: '1.d4 oyunlarının temel taşıdır. Beyaz c4 piyonunu feda eder gibi görünür ancak gerçekte bu bir piyon sapmasıdır; amaç siyahın merkez piyonunu kanada çekip e4 sürerek merkezi ele geçirmektir.',
    whitePlans: ['c4 ile siyahın d5 merkez piyonunu sarsmak', 'cxd5 takasıyla yarı açık c-hattından baskı kurmak', 'e4 sürerek tahtanın mutlak merkez hakimi olmak'],
    blackPlans: ['d5 piyonunu e6 veya c6 ile sağlamlaştırmak', 'Beyazın c4 piyonunu alırsa geri vermeye hazır olup karşı oyun aramak', 'c8 filini oyuna sokabilmek'],
    variations: [
      {
        id: 'queens-gambit-declined',
        name: "Queen's Gambit Declined (Reddedilen)",
        eco: 'D30',
        description: 'En sağlam ve güvenilir klasik karşılık. Siyah piyonu almaz, e6 ile merkez kalesini korur.',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7']
      },
      {
        id: 'queens-gambit-accepted',
        name: "Queen's Gambit Accepted (Kabul Edilen)",
        eco: 'D20',
        description: 'Siyah c4 piyonunu alır ancak piyonu tutmaya çalışmaz, gelişim hızına odaklanır.',
        moves: ['d4', 'd5', 'c4', 'dxc4', 'Nf3', 'Nf6', 'e3', 'e6', 'Bxc4']
      }
    ]
  },
  {
    id: 'london-system',
    name: 'London System',
    turkishName: 'Londra Sistemi',
    eco: 'D02',
    side: 'white',
    category: 'Kapalı Oyunlar (1.d4)',
    difficulty: 'Başlangıç',
    overview: 'Modern çağın en popüler sistem açılışıdır. Beyaz, siyahın ne oynadığından bağımsız olarak taşlarını önceden belirlenmiş aşılmaz bir piyon piramidi kurgusuyla tahtaya dizer.',
    whitePlans: ['Filini erkenden f4 karesine çıkarıp d6 ve e5 karelerini kontrol etmek', 'e3, c3 piyon piramidini kurmak (Granit savunma)', 'Atını Ne5 karesine yerleştirip şah kanadında hücum organize etmek'],
    blackPlans: ['c5 sürerek beyazın d4 piyonuna meydan okumak', 'Qb6 ile beyazın b2 piyonuna ve vezir kanadına baskı yapmak', 'Bd6 ile beyazın güçlü f4 filini takas etmek'],
    variations: [
      {
        id: 'london-standard',
        name: 'Standart Londra Piramidi',
        eco: 'D02',
        description: 'Aşılmaz piyon piramidi ve aktif fil konumu.',
        moves: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'c5', 'c3', 'Nc6', 'Nd2', 'e6']
      }
    ]
  },
  {
    id: 'kings-gambit',
    name: "King's Gambit",
    turkishName: 'Şah Gambiti',
    eco: 'C30',
    side: 'white',
    category: 'Açık Oyunlar (1.e4 e5)',
    difficulty: 'İleri Düzey',
    overview: '19. yüzyıl romantik satranç döneminin sembolüdür. Beyaz 2. hamlede f4 sürerek şah kanadını açar, f-dikeyini ele geçirir ve siyah şaha nefes aldırmayan bir taarruz başlatır.',
    whitePlans: ['f-hattını açarak kaleyle f7 karesine yüklenmek', 'd4 sürerek devasa bir piyon merkezi kurmak', 'Taş feda ederek siyah şahı erkenden mat etmek'],
    blackPlans: ['Piyonu alıp g5 ile korumak (Kabul Edilen Gambit)', 'd5 ile Falkbeer Karşı Gambiti oynayıp merkezi patlatmak', 'Beyazın zayıflayan e1-h4 çaprazından faydalanmak'],
    variations: [
      {
        id: 'kings-gambit-accepted',
        name: 'Kabul Edilen Şah Gambiti',
        eco: 'C34',
        description: 'Siyah f4 piyonunu alır ve beyazın vahşi şah hücumuna göğüs gerer.',
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'Bc4', 'g4']
      }
    ]
  },
  {
    id: 'english-opening',
    name: 'English Opening',
    turkishName: 'İngiliz Açılışı (1.c4)',
    eco: 'A10-A39',
    side: 'white',
    category: 'Kanat Açılışları',
    difficulty: 'Orta Seviye',
    overview: '1.c4 hamlesiyle başlayan esnek ve hipermodern bir açılıştır. Beyaz merkezi doğrudan piyonlarla işgal etmek yerine, d5 karesini uzaktan kontrol altına alır.',
    whitePlans: ['c4 piyonu ve g3-Bg2 filiyle d5 karesine çaprazdan hükmetmek', 'Vezir kanadında b4-b5 sürüşleriyle alan kazanmak', 'Gerektiğinde d4 sürerek 1.d4 oyunlarına geçiş yapmak'],
    blackPlans: ['1... e5 oynayarak ters renkli Sicilya Savunması kurmak', '1... c5 ile simetrik İngiliz oynamak', '1... Nf6 ve e6/g6 ile Hint savunması yapılarına girmek'],
    variations: [
      {
        id: 'english-reversed-sicilian',
        name: 'Ters Renkli Sicilya (1.c4 e5)',
        eco: 'A20',
        description: 'Beyaz bir tempo önde Sicilya Savunması yapısı oynar.',
        moves: ['c4', 'e5', 'Nc3', 'Nf6', 'g3', 'd5', 'cxd5', 'Nxd5', 'Bg2']
      },
      {
        id: 'english-symmetrical',
        name: 'Simetrik İngiliz (1.c4 c5)',
        eco: 'A30',
        description: 'Her iki taraf da simetrik kanat piyonlarıyla merkeze baskı yapar.',
        moves: ['c4', 'c5', 'Nc3', 'Nc6', 'g3', 'g6', 'Bg2', 'Bg7']
      }
    ]
  },
  {
    id: 'reti-opening',
    name: 'Réti Opening',
    turkishName: 'Réti Açılışı (1.Nf3)',
    eco: 'A04-A09',
    side: 'white',
    category: 'Kanat Açılışları',
    difficulty: 'Orta Seviye',
    overview: 'Richard Réti nin hipermodern fikirleriyle geliştirilmiştir. Beyaz 1.Nf3 oynayarak e5 sürüşünü engeller ve merkezi kanat piyonlarıyla uzaktan bombalar.',
    whitePlans: ['c4 sürerek d5 piyonuna meydan okumak', 'g3 ve Bg2 ile a8-h1 çaprazını kontrol etmek', 'Esnek taş gelişimiyle siyahın zayıflıklarına göre form almak'],
    blackPlans: ['d5 sürerek merkezde alan kazanmak', 'c6 veya e6 ile sağlam kalmak', 'Taş gelişimini hızla tamamlayıp rok atmak'],
    variations: [
      {
        id: 'reti-system',
        name: 'Klasik Réti Sistemi',
        eco: 'A09',
        description: '1.Nf3 d5 2.c4 ile siyah merkez piyonunu saptırma stratejisi.',
        moves: ['Nf3', 'd5', 'c4', 'd4', 'g3', 'c5', 'Bg2', 'Nc6', 'O-O']
      }
    ]
  },
  {
    id: 'scotch-game',
    name: 'Scotch Game',
    turkishName: 'İskoç Açılışı',
    eco: 'C45',
    side: 'white',
    category: 'Açık Oyunlar (1.e4 e5)',
    difficulty: 'Başlangıç',
    overview: 'Garry Kasparov un Anatoly Karpov a karşı dünya şampiyonluğu maçında yeniden canlandırdığı agresif açılış. Beyaz 3. hamlede d4 vurarak merkezi anında patlatır.',
    whitePlans: ['d4 vurarak merkezi açmak ve d-dikeyini ele geçirmek', 'Nxd4 ile güçlü bir merkez atı yerleştirmek', 'Açık taş oyununda hızlı taktik üstünlük sağlamak'],
    blackPlans: ['exd4 takasından sonra Bc5 ile d4 atına yüklenmek', 'Nf6 ile e4 piyonuna karşı saldırı başlatmak', 'Merkez gerilimini kendi lehine takas etmek'],
    variations: [
      {
        id: 'scotch-classical',
        name: 'Klasik İskoç (4... Bc5)',
        eco: 'C45',
        description: 'Siyah filini çıkarak d4 atına tempolu baskı uygular.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Bc5', 'Be3', 'Qf6']
      },
      {
        id: 'scotch-mieses',
        name: 'Mieses Varyantı (4... Nf6)',
        eco: 'C45',
        description: 'Siyah atıyla e4 piyonuna saldırır, beyaz e5 ile atı kovalar.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Nf6', 'Nxc6', 'bxc6', 'e5']
      }
    ]
  },
  {
    id: 'catalan-opening',
    name: 'Catalan Opening',
    turkishName: 'Katalan Açılışı',
    eco: 'E00-E09',
    side: 'white',
    category: 'Kapalı Oyunlar (1.d4)',
    difficulty: 'İleri Düzey',
    overview: 'Vezir Gambiti ile Réti/Kral-Hint sistemlerinin mükemmel birleşimidir. Beyaz g3 ve Bg2 oynayarak h1-a8 çaprazında bir keskin nişancı fili konuşlandırır.',
    whitePlans: ['Bg2 filiyle vezir kanadı ve b7 piyonu üzerinde daimi baskı kurmak', 'e4 sürüşüyle merkezi ele geçirmek', 'c4 piyonunu geri alırken üstün konuma ulaşmak'],
    blackPlans: ['dxc4 alıp piyonu c6-b5 ile savunmaya çalışmak veya geri verip gelişmek', 'c5 veya e5 ile merkezde karşı yarma yapmak', 'b6 ve Bb7 ile beyaz fili nötralize etmek'],
    variations: [
      {
        id: 'catalan-closed',
        name: 'Kapalı Katalan',
        eco: 'E06',
        description: 'Siyah merkezde sağlam kalıp gelişimini sakin tamamlar.',
        moves: ['d4', 'Nf6', 'c4', 'e6', 'g3', 'd5', 'Bg2', 'Be7', 'Nf3', 'O-O']
      }
    ]
  },
  {
    id: 'four-knights-game',
    name: 'Four Knights Game',
    turkishName: 'Dört At Açılışı',
    eco: 'C47-C49',
    side: 'white',
    category: 'Açık Oyunlar (1.e4 e5)',
    difficulty: 'Başlangıç',
    overview: 'İlk 4 hamlede tahtadaki 4 atın da oyuna girdiği, son derece prensipli ve sağlam bir klasik açılıştır. Taktik temelleri öğrenmek için mükemmeldir.',
    whitePlans: ['Bb5 veya d4 ile merkeze yüklenmek', 'Şah kanadında taş takaslarıyla son oyuna üstün girmek', 'Hatasız ve konumsal baskı kurmak'],
    blackPlans: ['Bb4 ile simetrik karşı oyun kurmak', 'Nd4 ile Rubinstein karşı saldırısına geçmek', 'Merkezde e5 karesini sıkı tutmak'],
    variations: [
      {
        id: 'four-knights-spanish',
        name: 'İspanyol Varyantı (4.Bb5 Bb4)',
        eco: 'C48',
        description: 'Her iki tarafın da fillerini b5 ve b4 karelerine getirdiği simetrik savaş.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'Bb5', 'Bb4', 'O-O', 'O-O']
      }
    ]
  },
  {
    id: 'vienna-game',
    name: 'Vienna Game',
    turkishName: 'Viyana Oyunu (1.e4 e5 2.Nc3)',
    eco: 'C25-C29',
    side: 'white',
    category: 'Açık Oyunlar (1.e4 e5)',
    difficulty: 'Orta Seviye',
    overview: 'Beyaz 2.Nc3 oynayarak d5 karesini kontrol eder ve f4 sürüşüyle Şah Gambiti benzeri bir hücum hazırlar.',
    whitePlans: ['f4 sürerek f-hattını açmak (Viyana Gambiti)', 'Bc4 ile f7 karesine nişan almak', 'd3 ile merkezi sağlam tutup şah kanadında fırtına koparmak'],
    blackPlans: ['d5 sürüşü ile beyazın erken kanat hücumuna merkezden cevap vermek', 'Nf6 ve Bb4 ile aktif savunma yapmak'],
    variations: [
      {
        id: 'vienna-gambit',
        name: 'Viyana Gambiti (3.f4)',
        eco: 'C29',
        description: 'Beyaz f4 sürerek siyahı merkezde sarsar.',
        moves: ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5', 'fxe5', 'Nxe4', 'Qf3']
      }
    ]
  },
  {
    id: 'bishops-opening',
    name: "Bishop's Opening",
    turkishName: 'Fil Açılışı (1.e4 e5 2.Bc4)',
    eco: 'C23-C24',
    side: 'white',
    category: 'Açık Oyunlar (1.e4 e5)',
    difficulty: 'Başlangıç',
    overview: 'Beyaz 2. hamlede doğrudan filini c4 e çıkarak f7 karesine baskı kurar ve f4 veya c3-d4 sürüşlerine zemin hazırlar.',
    whitePlans: ['f7 karesini gözetim altında tutmak', 'd3 ve f4 sürerek hücuma kalkmak', 'c3-d4 ile piyon merkezi kurmak'],
    blackPlans: ['Nf6 ile e4 piyonuna tempolu saldırmak', 'c6 ve d5 ile merkezi yarmak'],
    variations: [
      {
        id: 'bishops-berlin',
        name: 'Berlin Savunması Karşılığı',
        eco: 'C24',
        description: 'Siyah atını çıkarak e4 piyonuna saldırır.',
        moves: ['e4', 'e5', 'Bc4', 'Nf6', 'd3', 'c6', 'Nf3', 'd5']
      }
    ]
  },
  {
    id: 'ponziani-opening',
    name: 'Ponziani Opening',
    turkishName: 'Ponziani Açılışı',
    eco: 'C44',
    side: 'white',
    category: 'Açık Oyunlar (1.e4 e5)',
    difficulty: 'Orta Seviye',
    overview: '18. yüzyıldan kalma kurnaz bir açılış. Beyaz 3.c3 oynayarak d4 sürüşüyle devasa bir piyon merkezi kurmayı hedefler.',
    whitePlans: ['d4 sürerek merkezi ele geçirmek', 'Qa4 ile c6 atına baskı ve vezir kanadı taktikleri üretmek'],
    blackPlans: ['d5 sürerek beyaz d4 oynamadan merkezi patlatmak', 'Nf6 ile e4 piyonuna yüklenmek'],
    variations: [
      {
        id: 'ponziani-main',
        name: 'Ponziani Ana Hat (3... d5)',
        eco: 'C44',
        description: 'Siyah merkeze vurarak beyazın planlarını bozar.',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'c3', 'd5', 'Qa4', 'f6']
      }
    ]
  },
  {
    id: 'colle-system',
    name: 'Colle System',
    turkishName: 'Colle Sistemi',
    eco: 'D05',
    side: 'white',
    category: 'Kapalı Oyunlar (1.d4)',
    difficulty: 'Başlangıç',
    overview: 'Beyazın d4, e3, c3, Bd3 ve Nbd2 ile kurduğu sağlam sistem. e4 sürüşüyle şah kanadında ölümcül fedalar hazırlar.',
    whitePlans: ['e4 yarma hamlesiyle merkezi açmak', 'Bxh7+ Yunan Hediyesi (Greek Gift) fedasıyla mat hücumu başlatmak'],
    blackPlans: ['c5 ile erken merkez mücadelesi vermek', 'Filini g7 veya b7 ye geliştirip çapraz kontrolü sağlamak'],
    variations: [
      {
        id: 'colle-standard',
        name: 'Standart Colle Düzeni',
        eco: 'D05',
        description: 'Sağlam piyon tabanı ve aktif d3 fili.',
        moves: ['d4', 'd5', 'Nf3', 'Nf6', 'e3', 'e6', 'Bd3', 'c5', 'c3']
      }
    ]
  },
  {
    id: 'torre-attack',
    name: 'Torre Attack',
    turkishName: 'Torre Saldırısı',
    eco: 'A46-A48',
    side: 'white',
    category: 'Kapalı Oyunlar (1.d4)',
    difficulty: 'Orta Seviye',
    overview: 'Meksikalı usta Carlos Torre nin geliştirdiği sistem. Beyaz filini g5 karesine gelerek siyah şah kanadını açmaza alır.',
    whitePlans: ['e3 ve c3 ile merkezi sağlama almak', 'Nbd2 ve Ne5 ile şah hücumu organize etmek'],
    blackPlans: ['h6 ve c5 ile fili sorgulayıp merkezi parçalamak', 'Qb6 ile b2 piyonuna saldırmak'],
    variations: [
      {
        id: 'torre-main',
        name: 'Klasik Torre (Bg5)',
        eco: 'A46',
        description: 'Erken Bg5 ile f6 atına açmaz baskısı.',
        moves: ['d4', 'Nf6', 'Nf3', 'e6', 'Bg5', 'h6', 'Bh4', 'c5', 'e3']
      }
    ]
  },
  {
    id: 'trompowsky-attack',
    name: 'Trompowsky Attack',
    turkishName: 'Trompowsky Saldırısı',
    eco: 'A45',
    side: 'white',
    category: 'Kapalı Oyunlar (1.d4)',
    difficulty: 'Orta Seviye',
    overview: '1.d4 Nf6 2.Bg5 ile başlar. Beyaz siyahın atını filiyle alıp piyon yapısını bozmayı tehdit eder.',
    whitePlans: ['Bxf6 vurarak siyah piyon yapısını parçalamak', 'e3 veya e4 ile merkezi ele geçirmek'],
    blackPlans: ['Ne4 oynayarak fili sorgulamak', 'd5 ve c5 ile merkeze yerleşmek'],
    variations: [
      {
        id: 'tromp-main',
        name: 'Trompowsky Klasik Hat',
        eco: 'A45',
        description: 'Filin erken çıkışı ve piyon yapısı bozulması.',
        moves: ['d4', 'Nf6', 'Bg5', 'd5', 'e3', 'c5', 'Bxf6', 'gxf6']
      }
    ]
  },
  {
    id: 'birds-opening',
    name: "Bird's Opening",
    turkishName: 'Bird Açılışı (1.f4)',
    eco: 'A02-A03',
    side: 'white',
    category: 'Kanat Açılışları',
    difficulty: 'Orta Seviye',
    overview: 'İngiliz usta Henry Bird ün geliştirdiği açılış. Beyaz ilk hamlede f4 sürerek e5 karesini kontrol eder (Ters Hollanda Savunması).',
    whitePlans: ['b3 ve Bb2 ile uzun çaprazdan e5 karesini abluka altına almak', 'Şah kanadında taş yığıp mat hücumu aramak'],
    blackPlans: ['1... d5 ile merkeze yerleşmek', 'From Karşı Gambiti (1... e5) ile beyaz şahı cezalandırmak'],
    variations: [
      {
        id: 'bird-classical',
        name: 'Klasik Bird Düzeni',
        eco: 'A03',
        description: '1.f4 d5 sonrası b3 ve Bb2 ile çapraz hakimiyeti.',
        moves: ['f4', 'd5', 'Nf3', 'Nf6', 'e3', 'g6', 'b3', 'Bg7']
      }
    ]
  },
  {
    id: 'danish-gambit',
    name: 'Danish Gambit',
    turkishName: 'Danimarka Gambiti',
    eco: 'C21',
    side: 'white',
    category: 'Açık Oyunlar (1.e4 e5)',
    difficulty: 'İleri Düzey',
    overview: 'Beyaz iki piyon feda ederek iki filini birden (c4 ve b2) siyah şaha nişanlar. Son derece vahşi bir hücum silahıdır.',
    whitePlans: ['İki filin gücüyle siyah şahı erkenden parçalamak', 'Hızlı gelişim ve d-hattı kontrolü'],
    blackPlans: ['d5 ile merkezi açıp bir piyonu geri vererek taşları sadeleştirmek'],
    variations: [
      {
        id: 'danish-accepted',
        name: 'Kabul Edilen Çifte Gambit',
        eco: 'C21',
        description: 'Siyah iki piyonu da alır, beyaz iki canavar fil kazanır.',
        moves: ['e4', 'e5', 'd4', 'exd4', 'c3', 'dxc3', 'Bc4', 'cxb2', 'Bxb2']
      }
    ]
  },
  {
    id: 'blackmar-diemer-gambit',
    name: 'Blackmar-Diemer Gambit',
    turkishName: 'Blackmar-Diemer Gambiti',
    eco: 'D00',
    side: 'white',
    category: 'Kapalı Oyunlar (1.d4)',
    difficulty: 'İleri Düzey',
    overview: '1.d4 d5 2.e4 ile başlayan çılgın gambit. Beyaz piyon feda ederek açık hatlar ve hızlı taş gelişimi elde eder.',
    whitePlans: ['Nxf3 sonrası Bc4 ve O-O ile f-hattından taarruz', 'Siyah şah kanadını dağıtmak'],
    blackPlans: ['Sağlam durup piyon üstünlüğünü son oyuna taşımak', 'e6 veya c6 ile piyon kalesi örmek'],
    variations: [
      {
        id: 'bdg-main',
        name: 'Blackmar-Diemer Ana Hat',
        eco: 'D00',
        description: 'Piyon fedası ve f-hattı hücumu.',
        moves: ['d4', 'd5', 'e4', 'dxe4', 'Nc3', 'Nf6', 'f3', 'exf3', 'Nxf3']
      }
    ]
  },
  {
    id: 'kings-indian-attack',
    name: "King's Indian Attack (KIA)",
    turkishName: 'Kral-Hint Saldırısı (KIA)',
    eco: 'A07-A08',
    side: 'white',
    category: 'Kanat Açılışları',
    difficulty: 'Orta Seviye',
    overview: 'Bobby Fischer ın Fransız ve Sicilya ya karşı favori silahı. Beyaz Nf3, g3, Bg2, d3, O-O dizilimiyle şah kanadında durdurulamaz bir piyon dalgası başlatır.',
    whitePlans: ['e4 ve e5 sürerek siyah atı kovalamak', 'h4-h5 ve Re1 ile şah kanadında mat ağı kurmak'],
    blackPlans: ['Vezir kanadında c4 ve b5 ile karşı oyun kurmak'],
    variations: [
      {
        id: 'kia-fischer',
        name: 'Fischer Düzeni',
        eco: 'A07',
        description: 'Evrensel şah kanadı hücum mekanizması.',
        moves: ['Nf3', 'd5', 'g3', 'c5', 'Bg2', 'Nc6', 'O-O', 'e5', 'd3', 'Nf6']
      }
    ]
  },

  // ==========================================
  // SİYAH SAVUNMALARI (20 ADET)
  // ==========================================
  {
    id: 'sicilian-defense',
    name: 'Sicilian Defense',
    turkishName: 'Sicilya Savunması',
    eco: 'B20-B99',
    side: 'black',
    category: 'Yarı Açık Oyunlar (1.e4 c5/e6/c6)',
    difficulty: 'İleri Düzey',
    overview: '1.e4 hamlesine karşı istatistiksel olarak siyah için en yüksek kazanma oranına sahip, en keskin ve en popüler savunmadır. Siyah simetriyi bozar ve c-dikeyini açar.',
    whitePlans: ['d4 sürerek merkezi açmak (Açık Sicilya)', 'Şah kanadında fırtına koparmak'],
    blackPlans: ['c-hattını kaleyle ele geçirip vezir kanadından hücum etmek', 'e ve d merkez piyonlarıyla üstünlük kurmak'],
    variations: [
      {
        id: 'sicilian-najdorf',
        name: 'Najdorf Varyantı',
        eco: 'B90',
        description: 'Kasparov ve Fischer ın efsanevi tercihi.',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6']
      },
      {
        id: 'sicilian-dragon',
        name: 'Dragon (Ejderha) Varyantı',
        eco: 'B70',
        description: 'g7 fili uzun çaprazda alev püskürür.',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6']
      },
      {
        id: 'sicilian-scheveningen',
        name: 'Scheveningen Varyantı',
        eco: 'B80',
        description: 'd6 ve e6 küçük piyon merkeziyle sağlam esneklik.',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'e6']
      }
    ]
  },
  {
    id: 'french-defense',
    name: 'French Defense',
    turkishName: 'Fransız Savunması',
    eco: 'C00-C19',
    side: 'black',
    category: 'Yarı Açık Oyunlar (1.e4 c5/e6/c6)',
    difficulty: 'Orta Seviye',
    overview: '1.e4 e6 2.d4 d5 ile başlar. Karakteristik özelliği kilitli piyon zincirleri ve c5/f6 yarma hamleleridir.',
    whitePlans: ['e5 sürerek alan kazanmak', 'Şah kanadı taarruzu'],
    blackPlans: ['c5 sürüşü ile beyazın d4 piyon merkezinin altını oymak', 'Qb6 ile d4 e yüklenmek'],
    variations: [
      {
        id: 'french-advance',
        name: 'İlerleme Varyantı (Advance)',
        eco: 'C02',
        description: 'Beyaz e5 sürer, siyah c5 ile d4 tabanına saldırır.',
        moves: ['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'c3', 'Nc6', 'Nf3', 'Qb6']
      },
      {
        id: 'french-winawer',
        name: 'Winawer Varyantı',
        eco: 'C15',
        description: 'Siyah Bb4 ile c3 atını açmaza alır ve çift piyon yaratır.',
        moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'e5', 'c5', 'a3', 'Bxc3+']
      }
    ]
  },
  {
    id: 'caro-kann',
    name: 'Caro-Kann Defense',
    turkishName: 'Caro-Kann Savunması',
    eco: 'B10-B19',
    side: 'black',
    category: 'Yarı Açık Oyunlar (1.e4 c5/e6/c6)',
    difficulty: 'Başlangıç',
    overview: 'Satranç dünyasının en sağlam kalelerinden biridir. Açık renkli filin (c8) piyon zincirinin dışında kalabilmesi en büyük avantajıdır.',
    whitePlans: ['e5 ile alan kazanmak', 'c4 ile Panov atağı kurmak'],
    blackPlans: ['Filini Bf5 ile piyon zincirinin dışına çıkarmak', 'c5 ile d4 merkezini yıkmak'],
    variations: [
      {
        id: 'caro-classical',
        name: 'Klasik Varyant',
        eco: 'B18',
        description: 'Bf5 filiyle sağlam ve güvenli oyun.',
        moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6']
      },
      {
        id: 'caro-advance',
        name: 'İlerleme Varyantı',
        eco: 'B12',
        description: 'Beyaz e5 sürer, siyah Bf5 ile filini dışarı çıkarır.',
        moves: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3', 'e6', 'Be2']
      }
    ]
  },
  {
    id: 'kings-indian-defense',
    name: "King's Indian Defense (KID)",
    turkishName: 'Şah-Hint Savunması',
    eco: 'E60-E99',
    side: 'black',
    category: 'Hint Savunmaları',
    difficulty: 'İleri Düzey',
    overview: '1.d4 hamlesine karşı Kasparov ve Fischer ın en büyük silahı. Siyah başlangıçta merkezi beyaza bırakır, ardından f5 sürerek beyaz şaha karşı fırtına koparır.',
    whitePlans: ['Vezir kanadında c5 sürüşüyle yarma yapmak', 'Şah kanadındaki siyah saldırıyı savuşturmak'],
    blackPlans: ['e5 ile merkezi kilitleyip f5-f4 ile beyaz şahı mat etmek'],
    variations: [
      {
        id: 'kid-classical',
        name: 'Klasik Mar del Plata Varyantı',
        eco: 'E97',
        description: 'Satrancın en vahşi zıt kanat hücum mücadelesi.',
        moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'Be2', 'e5']
      }
    ]
  },
  {
    id: 'scandinavian-defense',
    name: 'Scandinavian Defense',
    turkishName: 'İskandinav Savunması (1... d5)',
    eco: 'B01',
    side: 'black',
    category: 'Yarı Açık Oyunlar (1.e4 c5/e6/c6)',
    difficulty: 'Başlangıç',
    overview: '1.e4 hamlesine ilk hamlede 1... d5 ile merkeze meydan okuyan, ezberi az ve çok pratik bir savunmadır.',
    whitePlans: ['Vezire tempo ile saldırıp taş gelişiminde öne geçmek'],
    blackPlans: ['Qa5 veya Qd6 ile veziri güvene alıp c6-e6 kalesi kurmak'],
    variations: [
      {
        id: 'scandi-qa5',
        name: 'Ana Varyant (2... Qxd5 3.Nc3 Qa5)',
        eco: 'B01',
        description: 'Vezir a5 karesine çekilip konumsal güvenliğe ulaşır.',
        moves: ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5', 'd4', 'Nf6']
      },
      {
        id: 'scandi-modern',
        name: 'Modern Varyant (2... Nf6)',
        eco: 'B01',
        description: 'Siyah piyonu atla almayı hedefler, veziri erkenden çıkarmaz.',
        moves: ['e4', 'd5', 'exd5', 'Nf6', 'd4', 'Nxd5', 'Nf3', 'g6']
      }
    ]
  },
  {
    id: 'nimzo-indian-defense',
    name: 'Nimzo-Indian Defense',
    turkishName: 'Nimzo-Hint Savunması',
    eco: 'E20-E59',
    side: 'black',
    category: 'Hint Savunmaları',
    difficulty: 'İleri Düzey',
    overview: 'Aron Nimzowitsch in başyapıtı. Siyah Bb4 ile beyazın c3 atını açmaza alır, e4 sürüşünü engeller ve beyazın piyon yapısını bozmayı hedefler.',
    whitePlans: ['İki fil avantajını ele geçirmek', 'e4 sürüşü hazırlamak'],
    blackPlans: ['Bxc3+ ile beyaz piyon yapısını bozup zayıf c4 piyonuna yüklenmek'],
    variations: [
      {
        id: 'nimzo-rubinstein',
        name: 'Rubinstein Varyantı (4.e3)',
        eco: 'E40',
        description: 'Beyaz sakin e3 oynar, siyah rok atıp d5 ile merkeze vurur.',
        moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4', 'e3', 'O-O', 'Bd3', 'd5']
      }
    ]
  },
  {
    id: 'slav-defense',
    name: 'Slav Defense',
    turkishName: 'Slav Savunması',
    eco: 'D10-D19',
    side: 'black',
    category: 'Kapalı Oyunlar (1.d4)',
    difficulty: 'Orta Seviye',
    overview: 'Vezir Gambitine karşı 2... c6 ile d5 piyonunu destekleme stratejisidir. c8 filinin önünü kapatmaması en büyük artısıdır.',
    whitePlans: ['cxd5 takası veya e3 ile merkezi tutmak', 'Vezir kanadında a4-a5 ile alan kazanmak'],
    blackPlans: ['dxc4 alıp Bf5 ile filini dışarı çıkarmak'],
    variations: [
      {
        id: 'slav-classical',
        name: 'Klasik Slav',
        eco: 'D15',
        description: 'dxc4 takası ve Bf5 ile aktif gelişim.',
        moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4', 'a4', 'Bf5']
      },
      {
        id: 'semi-slav',
        name: 'Yarı Slav (Semi-Slav)',
        eco: 'D43',
        description: 'e6 ve c6 ile üçgen piyon piramidi.',
        moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'e6', 'e3', 'Nbd7']
      }
    ]
  },
  {
    id: 'grunfeld-defense',
    name: 'Grünfeld Defense',
    turkishName: 'Grünfeld Savunması',
    eco: 'D80-D99',
    side: 'black',
    category: 'Hint Savunmaları',
    difficulty: 'İleri Düzey',
    overview: 'Bobby Fischer ve Peter Svidler ın favorisi. Siyah d5 vurarak merkezin beyaz piyonlarla dolmasına izin verir, sonra Bg7 ve c5 ile bu merkezi topa tutar.',
    whitePlans: ['Geniş e4-d4 piyon merkezini korumak'],
    blackPlans: ['c5 ve Bg7 ile d4 piyonuna yüklenip merkezi çökertmek'],
    variations: [
      {
        id: 'grunfeld-exchange',
        name: 'Değişim Varyantı (Exchange)',
        eco: 'D85',
        description: 'Beyaz piyonları takas edip e4 sürer, siyah c5 ile merkeze saldırır.',
        moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'cxd5', 'Nxd5', 'e4', 'Nxc3', 'bxc3', 'Bg7']
      }
    ]
  },
  {
    id: 'pirc-defense',
    name: 'Pirc Defense',
    turkishName: 'Pirc Savunması',
    eco: 'B07-B09',
    side: 'black',
    category: 'Yarı Açık Oyunlar (1.e4 c5/e6/c6)',
    difficulty: 'Orta Seviye',
    overview: '1.e4 d6 2.d4 Nf6 3.Nc3 g6 ile başlar. Siyah hipermodern felsefeyle beyaz merkeze Bg7 ve e5/c5 ile karşı saldırı düzenler.',
    whitePlans: ['f4 ile Avusturya Saldırısı kurup şah kanadını ezmek'],
    blackPlans: ['Bg7 ve c5 ile beyaz d4 piyonunu hedef almak'],
    variations: [
      {
        id: 'pirc-austrian',
        name: 'Avusturya Saldırısı (4.f4)',
        eco: 'B09',
        description: 'Beyaz 3 piyonla merkeze yüklenir.',
        moves: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6', 'f4', 'Bg7', 'Nf3', 'O-O']
      }
    ]
  },
  {
    id: 'modern-defense',
    name: 'Modern Defense',
    turkishName: 'Modern Savunma (1.e4 g6)',
    eco: 'B06',
    side: 'black',
    category: 'Yarı Açık Oyunlar (1.e4 c5/e6/c6)',
    difficulty: 'Orta Seviye',
    overview: 'Siyah ilk hamlede 1... g6 oynayarak beyazın 1.e4 veya 1.d4 hamlesine karşı son derece esnek bir karşı duruş sergiler.',
    whitePlans: ['Merkezi ele geçirip şah kanadı hücumu hazırlamak'],
    blackPlans: ['Bg7, d6 ve vezir kanadı piyon sürüşleriyle (a6-b5) karşı hücum'],
    variations: [
      {
        id: 'modern-standard',
        name: 'Standart Modern Düzen',
        eco: 'B06',
        description: 'Kanat fili ve vezir kanadı esnekliği.',
        moves: ['e4', 'g6', 'd4', 'Bg7', 'Nc3', 'd6', 'f4', 'a6', 'Nf3', 'b5']
      }
    ]
  },
  {
    id: 'alekhines-defense',
    name: "Alekhine's Defense",
    turkishName: 'Alekhine Savunması',
    eco: 'B02-B05',
    side: 'black',
    category: 'Yarı Açık Oyunlar (1.e4 c5/e6/c6)',
    difficulty: 'Orta Seviye',
    overview: 'Dünya şampiyonu Alexander Alekhine in icadı. Siyah ilk hamlede 1... Nf6 oynayarak beyaz piyonları üzerine çeker ve onları hedef haline getirir.',
    whitePlans: ['e5 ve d4 sürerek atı kovalamak ve geniş merkez kurmak'],
    blackPlans: ['d6 sürerek beyazın aşırı ilerleyen e5 piyonunu parçalamak'],
    variations: [
      {
        id: 'alekhine-modern',
        name: 'Modern Varyant (4.Nf3)',
        eco: 'B04',
        description: 'Beyaz piyonları aşırı sürmez, taş gelişimine odaklanır.',
        moves: ['e4', 'Nf6', 'e5', 'Nd5', 'd4', 'd6', 'Nf3', 'Bg4', 'Be2', 'c6']
      }
    ]
  },
  {
    id: 'queens-indian-defense',
    name: "Queen's Indian Defense (QID)",
    turkishName: 'Vezir-Hint Savunması',
    eco: 'E12-E19',
    side: 'black',
    category: 'Hint Savunmaları',
    difficulty: 'İleri Düzey',
    overview: '1.d4 Nf6 2.c4 e6 3.Nf3 b6 ile başlar. Siyah açık renkli filini b7 veya a6 karesine yerleştirerek e4 karesine hakim olur.',
    whitePlans: ['g3 ve Bg2 ile fili nötralize etmek'],
    blackPlans: ['Bb7 ve Ne4 ile e4 karesini ablukaya almak'],
    variations: [
      {
        id: 'qid-classical',
        name: 'Klasik Fianchetto Varyantı',
        eco: 'E15',
        description: 'Karşılıklı kanat fili mücadeleleri.',
        moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6', 'g3', 'Ba6', 'b3', 'Bb4+']
      }
    ]
  },
  {
    id: 'modern-benoni',
    name: 'Modern Benoni',
    turkishName: 'Benoni Savunması',
    eco: 'A60-A79',
    side: 'black',
    category: 'Hint Savunmaları',
    difficulty: 'İleri Düzey',
    overview: 'Satrancın en dinamik ve dengesiz savunmalarından biridir. Siyah d5 sürüşüne izin verir, yarı açık e-hattı ve vezir kanadı piyon çoğunluğu ile oynar.',
    whitePlans: ['e4 sürerek merkez piyon üstünlüğüyle hücuma geçmek'],
    blackPlans: ['Bg7 fili ve b5 sürüşüyle vezir kanadı fırtınası koparmak'],
    variations: [
      {
        id: 'benoni-main',
        name: 'Modern Benoni Ana Hat',
        eco: 'A70',
        description: 'Keskin kanat karşı saldırısı ve dinamik dengesizlik.',
        moves: ['d4', 'Nf6', 'c4', 'c5', 'd5', 'e6', 'Nc3', 'exd5', 'cxd5', 'd6', 'e4', 'g6']
      }
    ]
  },
  {
    id: 'benko-gambit',
    name: 'Benko Gambit (Volga Gambit)',
    turkishName: 'Benko Gambiti',
    eco: 'A57-A59',
    side: 'black',
    category: 'Hint Savunmaları',
    difficulty: 'Orta Seviye',
    overview: 'Siyah 3... b5 ile vezir kanadında bir piyon feda eder. Karşılığında açık a ve b dikey hatlarında oyun sonuna kadar süren bitmek bilmez bir kale baskısı elde eder.',
    whitePlans: ['Piyon üstünlüğünü koruyup siyahın vezir kanadı baskısını hafifletmek'],
    blackPlans: ['Ba6, Ra8 ve Rb8 ile beyazın vezir kanadını felç etmek'],
    variations: [
      {
        id: 'benko-accepted',
        name: 'Kabul Edilen Benko Gambiti',
        eco: 'A57',
        description: 'Siyah piyon feda eder ve kaleler için açık otoyollar açar.',
        moves: ['d4', 'Nf6', 'c4', 'c5', 'd5', 'b5', 'cxb5', 'a6', 'bxa6', 'g6']
      }
    ]
  },
  {
    id: 'dutch-defense',
    name: 'Dutch Defense',
    turkishName: 'Hollanda Savunması (1.d4 f5)',
    eco: 'A80-A99',
    side: 'black',
    category: 'Kapalı Oyunlar (1.d4)',
    difficulty: 'Orta Seviye',
    overview: '1.d4 e karşı ilk hamlede f5 sürerek e4 karesini kontrol altına alan ve doğrudan beyaz şaha hücum hedefleyen cüretkar bir savunmadır.',
    whitePlans: ['g3 ve Bg2 ile siyahın şah hücumunu durdurmak', 'e4 sürüşüyle merkezi parçalamak'],
    blackPlans: ['Leningrad (g6-Bg7) veya Stonewall (Taş Duvar) ile şah hücumu yapmak'],
    variations: [
      {
        id: 'dutch-leningrad',
        name: 'Leningrad Varyantı',
        eco: 'A87',
        description: 'g6 ve Bg7 ile modern şah kanadı hücumu.',
        moves: ['d4', 'f5', 'g3', 'Nf6', 'Bg2', 'g6', 'Nf3', 'Bg7', 'O-O', 'O-O']
      },
      {
        id: 'dutch-stonewall',
        name: 'Stonewall (Taş Duvar) Varyantı',
        eco: 'A90',
        description: 'd5, e6, f5, c6 piyon duvarıyla aşılmaz kale.',
        moves: ['d4', 'f5', 'c4', 'e6', 'g3', 'd5', 'Bg2', 'c6', 'Nf3', 'Bd6']
      }
    ]
  },
  {
    id: 'bogo-indian-defense',
    name: 'Bogo-Indian Defense',
    turkishName: 'Bogo-Hint Savunması',
    eco: 'E11',
    side: 'black',
    category: 'Hint Savunmaları',
    difficulty: 'Orta Seviye',
    overview: 'Efim Bogoljubow un geliştirdiği savunma. 1.d4 Nf6 2.c4 e6 3.Nf3 Bb4+ ile başlar. Siyah şah çekerek taş takasını kolaylaştırır.',
    whitePlans: ['Bd2 veya Nbd2 ile gelişimini sürdürmek'],
    blackPlans: ['Qe7 ile fili koruyup merkezde e5 sürüşü hazırlamak'],
    variations: [
      {
        id: 'bogo-main',
        name: 'Klasik Bogo-Hint (4.Bd2)',
        eco: 'E11',
        description: 'Bb4+ şah çekişi ve sakin taş koordinasyonu.',
        moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'Bb4+', 'Bd2', 'Qe7', 'g3', 'Nc6']
      }
    ]
  },
  {
    id: 'budapest-gambit',
    name: 'Budapest Gambit',
    turkishName: 'Budapeşte Gambiti',
    eco: 'A51-A52',
    side: 'black',
    category: 'Hint Savunmaları',
    difficulty: 'Orta Seviye',
    overview: '1.d4 Nf6 2.c4 e5!? ile başlar. Siyah 2. hamlede merkez piyonu feda ederek beyazı teorik bilmediği sularda boğmayı hedefler.',
    whitePlans: ['dxe5 sonrası piyonu tutup kazanca oynamak'],
    blackPlans: ['Ng4 ve Nc6 ile e5 piyonunu geri alırken taktik tuzaklar kurmak'],
    variations: [
      {
        id: 'budapest-main',
        name: 'Adler Varyantı (3... Ng4)',
        eco: 'A52',
        description: 'e5 piyonunu geri alma savaşı.',
        moves: ['d4', 'Nf6', 'c4', 'e5', 'dxe5', 'Ng4', 'Bf4', 'Nc6', 'Nf3', 'Bb4+']
      }
    ]
  },
  {
    id: 'chigorin-defense',
    name: 'Chigorin Defense',
    turkishName: 'Chigorin Savunması',
    eco: 'D07',
    side: 'black',
    category: 'Kapalı Oyunlar (1.d4)',
    difficulty: 'Orta Seviye',
    overview: '1.d4 d5 2.c4 Nc6 ile başlar. Siyah piyonlarla savunmak yerine taşlarının aktifliğiyle (at ve fil baskısıyla) merkezi ele geçirmeye çalışır.',
    whitePlans: ['cxd5 ile merkezi açıp piyon üstünlüğü sağlamak'],
    blackPlans: ['Bg4 ve Bxf3 ile beyazın taş uyumunu bozmak'],
    variations: [
      {
        id: 'chigorin-main',
        name: 'Klasik Chigorin',
        eco: 'D07',
        description: 'Aktif taş oyunu ve erken taş takasları.',
        moves: ['d4', 'd5', 'c4', 'Nc6', 'Nf3', 'Bg4', 'cxd5', 'Bxf3', 'gxf3', 'Qxd5']
      }
    ]
  },
  {
    id: 'owens-defense',
    name: "Owen's Defense",
    turkishName: 'Owen Savunması (1.e4 b6)',
    eco: 'B00',
    side: 'black',
    category: 'Yarı Açık Oyunlar (1.e4 c5/e6/c6)',
    difficulty: 'Başlangıç',
    overview: '1.e4 e karşı siyah ilk hamlede 1... b6 oynayarak filini b7 karesine nişanlar ve beyazın e4 piyonuna çaprazdan baskı uygular.',
    whitePlans: ['d4 ve Bd3 ile geniş merkezi korumak'],
    blackPlans: ['Bb7 ve f5 ile e4 merkezini çökertmek'],
    variations: [
      {
        id: 'owen-main',
        name: 'Klasik Owen Düzeni',
        eco: 'B00',
        description: 'b6 ve Bb7 ile uzun çapraz savaşı.',
        moves: ['e4', 'b6', 'd4', 'Bb7', 'Bd3', 'e6', 'Nf3', 'c5', 'c3', 'Nf6']
      }
    ]
  },
  {
    id: 'qga-defense',
    name: "Queen's Gambit Accepted (QGA)",
    turkishName: 'Kabul Edilen Vezir Gambiti (QGA)',
    eco: 'D20-D29',
    side: 'black',
    category: 'Kapalı Oyunlar (1.d4)',
    difficulty: 'Başlangıç',
    overview: '1.d4 d5 2.c4 dxc4 ile siyah piyonu alır. Siyah piyonu korumaya çalışmaz; c5 ve a6 ile vezir kanadını hızla geliştirir.',
    whitePlans: ['Bxc4 ile piyonu geri alıp e4 sürerek merkezi tutmak'],
    blackPlans: ['c5 ile beyazın d4 piyonunu takas edip eşit bir konuma geçmek'],
    variations: [
      {
        id: 'qga-classical',
        name: 'Klasik Devam Yolu',
        eco: 'D27',
        description: 'a6 ve c5 ile rahat taş gelişimi.',
        moves: ['d4', 'd5', 'c4', 'dxc4', 'Nf3', 'Nf6', 'e3', 'e6', 'Bxc4', 'c5', 'O-O', 'a6']
      }
    ]
  }
];

// Helper to compute FENs and generate steps
function generateFile() {
  const processed = rawOpenings.map((op) => {
    const variations = op.variations.map((v) => {
      const chess = new Chess();
      const steps = [];

      for (let i = 0; i < v.moves.length; i++) {
        const san = v.moves[i];
        chess.move(san);
        const ply = i + 1;
        steps.push({
          ply,
          san,
          fen: chess.fen(),
          title: `${san} Hamlesi (${Math.floor(i / 2) + 1}. Hamle)`,
          explanation: i === 0 ? 'Merkez kontrolü ve gelişim hazırlığı.' : 'Taş gelişimi ve stratejik kare kontrolü.',
          turnAdvice: 'Aletleri hızlıca oyuna sokun ve şah güvenliğini sağlayın.'
        });
      }

      return {
        id: v.id,
        name: v.name,
        eco: v.eco,
        description: v.description,
        moves: v.moves,
        steps
      };
    });

    return {
      id: op.id,
      name: op.name,
      turkishName: op.turkishName,
      eco: op.eco,
      side: op.side,
      category: op.category,
      difficulty: op.difficulty,
      overview: op.overview,
      whitePlans: op.whitePlans,
      blackPlans: op.blackPlans,
      variations
    };
  });

  const content = `import type { Opening } from '../types/chess';\n\nexport const OPENINGS_DATA: Opening[] = ${JSON.stringify(processed, null, 2)};\n`;

  const targetPath = path.join(__dirname, '../src/data/openingsData.ts');
  fs.writeFileSync(targetPath, content, 'utf8');
  console.log('SUCCESS! WROTE', processed.length, 'OPENINGS TO', targetPath);
}

generateFile();
