import type { EndgameLesson } from '../types/endgame';

export const ENDGAME_LESSONS: EndgameLesson[] = [
  {
    id: 'opposition-basic',
    title: 'Doğrudan Opozisyon (Direct Opposition)',
    category: 'Piyon Sonları',
    difficulty: 'Temel',
    startingFen: '4k3/8/8/4P3/8/8/4K3/8 w - - 0 1',
    playerColor: 'white',
    summary: 'Şahların aralarında tek bir kare kalarak yüz yüze gelmesine Opozisyon denir. Opozisyona sahip olan taraf, rakip şahı geri çekilmeye zorlar.',
    grandmasterPrinciple: 'Şah piyonun önünden gitmelidir! Asla şahınızı piyonun arkasında bırakmayın.',
    keyRule: 'Hamle sırası rakipteyken opozisyonu alan taraf avantajlıdır; çünkü rakip şah kapıyı açmak (yana veya geriye çekilmek) zorundadır.',
    steps: [
      {
        ply: 1,
        expectedMove: 'Ke3',
        explanation: 'Şahınızı doğrudan merkeze getirerek e-hattındaki kontrolü artırın ve siyah şahın e6 karesine inmesini engelleyin.',
        keyConcept: 'Şahı piyonun önüne sürmek',
        arrows: [['e2', 'e3', 'blue'], ['e3', 'e4', 'green']],
        opponentReply: {
          san: 'Ke7',
          explanation: 'Siyah şah savunma için e7 karesine yerleşiyor.'
        }
      },
      {
        ply: 2,
        expectedMove: 'Ke4',
        explanation: 'Harika! Şimdi şahı piyonun önüne geçirdiniz. Siyah şahın doğrudan karşısına geçmeye (opozisyona) hazırlanıyorsunuz.',
        keyConcept: 'İleri şah aktifliği',
        arrows: [['e3', 'e4', 'green']],
        opponentReply: {
          san: 'Ke6',
          explanation: 'Siyah şah doğrudan e6 karesine gelerek opozisyon aldı.'
        }
      },
      {
        ply: 3,
        expectedMove: 'Kd4',
        explanation: 'Siyah şah opozisyonda olduğu için kanattan aşma (outflanking) manevrasına başlıyoruz.',
        keyConcept: 'Kanattan aşma manevrası (Outflanking)',
        arrows: [['e4', 'd4', 'green'], ['d4', 'd5', 'blue']]
      }
    ]
  },
  {
    id: 'rule-of-the-square',
    title: 'Kare Kuralı (Rule of the Square)',
    category: 'Piyon Sonları',
    difficulty: 'Temel',
    startingFen: '8/8/8/3P4/8/8/8/k6K w - - 0 1',
    playerColor: 'white',
    summary: 'Kendi şahınız uzaktayken, piyonun terfi karesine olan mesafesi kadar bir kare çizilir. Rakip şah bu sanal karenin dışındaysa piyonu asla yakalayamaz!',
    grandmasterPrinciple: 'Zaman kaybetmeyin: Kare kuralı geçerliyse şahınızı bekletmeyin, piyonu son sürat sürün!',
    keyRule: 'Piyondan terfi karesine ve yana doğru piyonun terfiye uzaklığı kadar sayarak bir kare çizin. Şah karenin içine adım atamıyorsa piyon otomatik olarak vezir çıkar.',
    steps: [
      {
        ply: 1,
        expectedMove: 'd6',
        explanation: 'Piyonu hemen ilerletiyoruz! d6 karesiyle birlikte sanal karenin sınırları daralır (d6-d8-h8-h6). Siyah şah karenin dışındadır!',
        keyConcept: 'Kareyi küçültme',
        arrows: [['d5', 'd6', 'green'], ['d6', 'd8', 'blue'], ['d8', 'h8', 'blue'], ['h8', 'h6', 'blue']],
        highlightSquares: ['d6', 'd8', 'h8', 'h6'],
        opponentReply: {
          san: 'Kb2',
          explanation: 'Siyah şah çaresizce yetişmeye çalışıyor ancak karenin dışında kaldı.'
        }
      },
      {
        ply: 2,
        expectedMove: 'd7',
        explanation: 'Mükemmel! d7 sürüşüyle kare 1x1 boyutuna indi. Hiçbir taş piyonun d8 karesinde vezir çıkmasını durduramaz.',
        keyConcept: 'Durdurulamaz terfi',
        arrows: [['d6', 'd7', 'green']],
        opponentReply: {
          san: 'Kc3',
          explanation: 'Siyah şah çok geç kaldı.'
        }
      },
      {
        ply: 3,
        expectedMove: 'd8=Q',
        explanation: 'Tebrikler! Piyon vezire dönüştü ve oyun teknik olarak kesin kazanca ulaştı.',
        keyConcept: 'Vezir terfisi'
      }
    ]
  },
  {
    id: 'lucena-bridge',
    title: 'Lucena Konumu & Köprü Kurma (The Bridge)',
    category: 'Kale Sonları',
    difficulty: 'Büyükusta Tekniği',
    startingFen: '1K1k4/1P6/8/8/8/8/r7/5R2 w - - 0 1',
    playerColor: 'white',
    summary: 'Kale oyun sonlarının EN ÖNEMLİ kazanç tekniğidir! Piyon 7. yataydadır, beyaz şah önündedir. Beyaz kale ile "köprü" kurarak siyah kalenin sürekli şahlarını keser.',
    grandmasterPrinciple: 'Beyaz kale 4. yataya yerleştirilir ("Köprü hazırlığı"). Şah dışarı çıkar ve kale şahlardan birine siper olur.',
    keyRule: '1. Rf4! ile kaleyi 4. yataya atın. Şahı çıkardıktan sonra siyah kalenin şahlarını kendi kalenizle kesin.',
    steps: [
      {
        ply: 1,
        expectedMove: 'Rf4',
        explanation: 'Lucena tekniğinin anahtarı: Kaleyi tam 4. yataya yerleştirmek! Bu kale az sonra şahımızın arkasına köprü (siper) olacak.',
        keyConcept: '4. Yatay Köprü Hazırlığı',
        arrows: [['f1', 'f4', 'green']],
        opponentReply: {
          san: 'Ra1',
          explanation: 'Siyah kale şah çekecek kare arıyor.'
        }
      },
      {
        ply: 2,
        expectedMove: 'Kc7',
        explanation: 'Şah piyonun önünden çıkarak yolu açıyor. Siyah kale şimdi arkadan şah çekecektir.',
        keyConcept: 'Şahı piyonun önünden çıkarmak',
        arrows: [['b8', 'c7', 'green']],
        opponentReply: {
          san: 'Rc1+',
          explanation: 'Siyah kale şah çekerek şahı piyonun yakınından uzaklaştırmaya çalışıyor.'
        }
      },
      {
        ply: 3,
        expectedMove: 'Kd6',
        explanation: 'Şahımızı d6 karesine ilerletiyoruz. Hedefimiz kalenin bulunduğu 4. yataya kadar inmek!',
        keyConcept: 'Merkeze ve kaleye doğru inme',
        arrows: [['c7', 'd6', 'green']],
        opponentReply: {
          san: 'Rd1+',
          explanation: 'Siyah kale bir kez daha şah çekiyor.'
        }
      },
      {
        ply: 4,
        expectedMove: 'Ke5',
        explanation: 'Bir adım daha yaklaştık! Siyah kalenin son şahında köprü kurulacak.',
        keyConcept: 'Köprüye son adım',
        arrows: [['d6', 'e5', 'green']],
        opponentReply: {
          san: 'Re1+',
          explanation: 'Siyahın son çaresi şah çekmek.'
        }
      },
      {
        ply: 5,
        expectedMove: 'Re4',
        explanation: 'İŞTE BÜYÜKUSTA KÖPRÜSÜ (THE BRIDGE)! Kale şahın önüne siper oldu. Siyah kale değişmek zorundadır ve piyon bir sonraki hamlede b8=Q ile vezir çıkar!',
        keyConcept: 'Lucena Köprüsünün Tamamlanması',
        arrows: [['f4', 'e4', 'green']]
      }
    ]
  },
  {
    id: 'philidor-defense',
    title: 'Philidor Savunması (3./6. Yatay Kalesi)',
    category: 'Kale Sonları',
    difficulty: 'Orta Seviye',
    startingFen: '4k3/R7/8/4P3/8/8/r7/4K3 b - - 0 1',
    playerColor: 'black',
    summary: 'Piyon gerisinde olan taraf için kale oyun sonlarında beraberliği kurtarmanın EN TEMEL yöntemidir. François-André Danican Philidor tarafından 1777 yılında bulunmuştur.',
    grandmasterPrinciple: 'Savunma yapan taraf kalesini kendi 3. (siyah için 6.) yatayında tutarak rakip şahın yaklaşmasını engeller; piyon sürülünce hemen en arkaya geçer.',
    keyRule: '1) Kaleyi 6. yatayda beklet. 2) Beyaz piyon e6 sürülünce kaleyi hemen 1. yataya indir ve arkadan sürekli şah çek!',
    steps: [
      {
        ply: 1,
        expectedMove: 'Ra6',
        explanation: 'Doğru prensip! Kalenizi 6. yataya (beyazın 3. yatayı) yerleştirerek beyaz şahın e6 karesine ilerlemesine duvar örün.',
        keyConcept: '6. Yatay Savunma Duvarı',
        arrows: [['a2', 'a6', 'green']],
        opponentReply: {
          san: 'Kf2',
          explanation: 'Beyaz şah merkeze doğru yaklaşıyor.'
        }
      },
      {
        ply: 2,
        expectedMove: 'Rb6',
        explanation: 'Pasif ve sabırlı bekleme! Piyon sürülene kadar kalenizi kesinlikle 6. yataydan indirmeyin.',
        keyConcept: '6. Yatayda Sabırla Bekleme',
        arrows: [['a6', 'b6', 'green']],
        opponentReply: {
          san: 'e6',
          explanation: 'Beyaz sabırsızlanıp piyonu sürdü ve şahının sığınacağı e6 karesini kendi eliyle kapattı!'
        }
      },
      {
        ply: 3,
        expectedMove: 'Rb1',
        explanation: 'MÜKEMMEL! Piyon sürüldüğü an kaleyi 1. yataya indiriyoruz. Şimdi beyaz şah arkadan gelecek durdurulamaz şah çekişlerden saklanamaz; kesin beraberlik!',
        keyConcept: 'Arkadan Sürekli Şah Geçişi',
        arrows: [['b6', 'b1', 'green']]
      }
    ]
  },
  {
    id: 'opposite-bishops',
    title: 'Ters Renkli Filler Kalesi (Fortress)',
    category: 'Hafif Taş Sonları',
    difficulty: 'Orta Seviye',
    startingFen: '8/8/4k3/4P3/8/5B2/8/4b1K1 w - - 0 1',
    playerColor: 'white',
    summary: 'Ters renkli filler oyun sonlarında inanılmaz bir beraberlik eğilimine sahiptir. Piyon geri olsanız bile karşı filin kontrol edemediği karelerde geçilmez bir kale (fortress) kurabilirsiniz.',
    grandmasterPrinciple: 'Rakip şahın piyonunuzu alıp geçmesini veya karşı kanada sızmasını engelleyen ters renk blokajı kurun.',
    keyRule: 'Rakip fil asla sizin filinizi tehdit edemez çünkü farklı renk karelerde hareket ederler; temel diyagonalleri tutmak yeterlidir.',
    steps: [
      {
        ply: 1,
        expectedMove: 'Bg4+',
        explanation: 'Şah çekerek siyah şahın hareket alanını sınırlandırın ve piyonu savunan çaprazı güçlendirin.',
        keyConcept: 'Çapraz Şah ile Tempo',
        arrows: [['f3', 'g4', 'green']],
        opponentReply: {
          san: 'Kxe5',
          explanation: 'Siyah şah e5 piyonunu aldı.'
        }
      },
      {
        ply: 2,
        expectedMove: 'Kg2',
        explanation: 'Şahınızı merkeze doğru yaklaştırarak rakibin ileri karakol kurmasını engelleyin.',
        keyConcept: 'Şahı Aktifleştirme',
        arrows: [['g1', 'g2', 'green']],
        opponentReply: {
          san: 'Kf4',
          explanation: 'Siyah şah g4 filine yaklaştı.'
        }
      },
      {
        ply: 3,
        expectedMove: 'Bf3',
        explanation: 'Güvenli diyagonale geri dönerek tam beraberlik kalesi (fortress) kuruldu!',
        keyConcept: 'Güvenli Savunma Çaprazı',
        arrows: [['g4', 'f3', 'green']]
      }
    ]
  },
  {
    id: 'queen-vs-7th-rank',
    title: 'Vezir vs 7. Yatay Piyonu (Merdiven)',
    category: 'Vezir Sonları',
    difficulty: 'Orta Seviye',
    startingFen: '8/8/4Q3/K7/8/8/1kp5/8 w - - 0 1',
    playerColor: 'white',
    summary: 'Vezire karşı 7. yataydaki c2 piyonu tehlikeli görünür. Kazanç yöntemi şah çekerek rakip şahı piyonun önüne itmek ve bu sayede kendi şahınızı adım adım yaklaştırmaktır.',
    grandmasterPrinciple: 'Her seferinde rakip şahı kendi piyonunun önüne zorladığınızda bir "tempo" kazanırsınız ve kendi şahınızı 1 kare yaklaştırırsınız!',
    keyRule: 'Önce vezirle c1 terfi karesini bloke edin veya şahı piyonun önüne sıkıştırın, sonra şahınızı yaklaştırın.',
    steps: [
      {
        ply: 1,
        expectedMove: 'Qb6+',
        explanation: 'Vezirle yaklaşıp şah çekin; siyah şah c2 piyonunu korumak için köşeye veya önüne dönmek zorunda kalacak.',
        keyConcept: 'Vezirle Yaklaşım Şahı',
        arrows: [['e6', 'b6', 'green']],
        opponentReply: {
          san: 'Ka2',
          explanation: 'Siyah şah terfi karesini tutarak kaçtı.'
        }
      },
      {
        ply: 2,
        expectedMove: 'Qc5',
        explanation: 'c2 piyonuna saldırarak siyah şahı kıpırdayamaz hale getirin!',
        keyConcept: 'Piyona Saldırı ile Kısıtlama',
        arrows: [['b6', 'c5', 'green']],
        opponentReply: {
          san: 'Kb2',
          explanation: 'Siyah şah tekrar piyonun yanına dönmek zorunda kaldı.'
        }
      },
      {
        ply: 3,
        expectedMove: 'Qb4+',
        explanation: 'Tekrar şah çekip şahı c1 terfi karesinin yakınına veya a2 köşesine sıkıştırıyoruz.',
        keyConcept: 'Ritim Bozmama',
        arrows: [['c5', 'b4', 'green']],
        opponentReply: {
          san: 'Ka2',
          explanation: 'Siyah şah köşeye sıkıştı.'
        }
      },
      {
        ply: 4,
        expectedMove: 'Qc3',
        explanation: 'Piyonu dondurduk! Siyah şah artık c1 piyonunun önünü kapatacak olan Kb1 hamlesine zorlanıyor.',
        keyConcept: 'Blokaj Zorlaması',
        arrows: [['b4', 'c3', 'green']],
        opponentReply: {
          san: 'Kb1',
          explanation: 'Siyah şah kendi piyonunun terfi karesini kapatmak zorunda kaldı.'
        }
      },
      {
        ply: 5,
        expectedMove: 'Kb4',
        explanation: 'Siyah şah terfi karesini kendi tıkadığı için kazandığınız bu altın tempoda şahınızı b4 karesine yaklaştırın! Sonraki adımda mat ağı tamamlanır.',
        keyConcept: 'Tempo İle Şah Yaklaştırma',
        arrows: [['a5', 'b4', 'green']]
      }
    ]
  },
  {
    id: 'outside-passed-pawn',
    title: 'Uzak Geçer Piyon (Yemleme Tekniği)',
    category: 'Piyon Sonları',
    difficulty: 'Orta Seviye',
    startingFen: '8/5p2/6p1/3k3p/P7/4K1P1/7P/8 w - - 0 1',
    playerColor: 'white',
    summary: 'İki tarafın aynı kanatta piyonları varken diğer kanattaki yalnız bir geçer piyon (a-piyonu), rakip şahı uzaklaştırıp karşı kanattaki tüm piyonları toplamak için mükemmel bir yemdir.',
    grandmasterPrinciple: 'Uzak geçer piyonunuzu vezire çıkmak için değil, rakip şahı merkezden uzağa çekmek (yemlemek) için sürün!',
    keyRule: 'Rakip şah uzak geçeri almaya giderken kendi şahınızı f4-g5 üzerinden rakip piyon kampına daldırın.',
    steps: [
      {
        ply: 1,
        expectedMove: 'a5',
        explanation: 'Uzak geçer piyonu hemen sürerek siyah şahı merkezden uzaklaşmaya zorlayın.',
        keyConcept: 'Yem Piyonu İlerletmek',
        arrows: [['a4', 'a5', 'green']],
        opponentReply: {
          san: 'Kc5',
          explanation: 'Siyah şah mecburen geçer piyonu durdurmaya koşuyor.'
        }
      },
      {
        ply: 2,
        expectedMove: 'a6',
        explanation: 'Piyonu bir kare daha sürerek siyah şahı en kenara hapsedin!',
        keyConcept: 'Rakip Şahı Köşeye Çekmek',
        arrows: [['a5', 'a6', 'green']],
        opponentReply: {
          san: 'Kb6',
          explanation: 'Siyah şah piyonu durdurdu ama şah kanadından tamamen koptu.'
        }
      },
      {
        ply: 3,
        expectedMove: 'Kf4',
        explanation: 'Harika! Siyah şah a6 ile meşgulken kendi şahımızı agresifçe f4 karesine aktarıyoruz.',
        keyConcept: 'Karşı Kanattan Şah Saldırısı',
        arrows: [['e3', 'f4', 'green']],
        opponentReply: {
          san: 'Kxa6',
          explanation: 'Siyah piyonu aldı ama artık çok uzakta kaldı.'
        }
      },
      {
        ply: 4,
        expectedMove: 'Kg5',
        explanation: 'İŞTE KAZANÇ! Beyaz şah f7 ve g6 piyonlarının arasına dalar; siyah şah geri dönemeden tüm piyonlar toplanır.',
        keyConcept: 'Piyon Kampına Sızma',
        arrows: [['f4', 'g5', 'green']]
      }
    ]
  },
  {
    id: 'key-squares-advantage',
    title: 'Anahtar Kareler ve Piyon Önü Kuralı',
    category: 'Piyon Sonları',
    difficulty: 'Temel',
    startingFen: '8/3k4/8/8/3P4/3K4/8/8 w - - 0 1',
    playerColor: 'white',
    summary: 'Piyon oyun sonlarında bir piyonun terfi olup olmayacağını tahta üzerindeki "3 Anahtar Kare" belirler. Piyon 4. yataydaysa anahtar kareleri onun 2 sıra önündedir (c6, d6, e6).',
    grandmasterPrinciple: 'Şahınız piyonun 6. yataydaki üç anahtar karesinden (c6, d6, e6) birine oturursa, hamle sırası kimde olursa olsun piyon mutlaka vezir çıkar.',
    keyRule: 'Piyonu boşuna sürmeyin — önce şahınızla piyonun önüne geçip anahtar karelere yürüyün.',
    steps: [
      {
        ply: 1,
        expectedMove: 'Ke4',
        explanation: 'Doğrudan d5 sürmek yerine şahı çaprazdan piyonun önüne (anahtar karelere) taşıyın.',
        keyConcept: 'Şahı Piyon Önüne Çıkarmak',
        arrows: [['d3', 'e4', 'green']],
        opponentReply: {
          san: 'Ke6',
          explanation: 'Siyah şah opozisyon almak için e6 karesine geldi.'
        }
      },
      {
        ply: 2,
        expectedMove: 'd5+',
        explanation: 'Şimdi tempo ile d5+ sürerek siyah şahı 6. yataydan geri atın veya yana açın.',
        keyConcept: 'Tempo İle Alan Açmak',
        arrows: [['d4', 'd5', 'green']],
        opponentReply: {
          san: 'Kd6',
          explanation: 'Siyah şah d6 karesinde piyonun yolunu kesmeye çalışıyor.'
        }
      },
      {
        ply: 3,
        expectedMove: 'Kd4',
        explanation: 'Doğrudan opozisyonu aldınız! Siyah şah şimdi c7/e7 kanadına çekilmek zorunda kalacak ve beyaz şah c5 veya e5 üzerinden d6/e6 anahtar karelerine sızacak.',
        keyConcept: 'Opozisyon İle Sızma',
        arrows: [['e4', 'd4', 'green']]
      }
    ]
  }
];
