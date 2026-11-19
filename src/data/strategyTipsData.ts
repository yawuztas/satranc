import type { StrategyConcept } from '../types/chess';

export const STRATEGY_CONCEPTS: StrategyConcept[] = [
  {
    id: 'rooks-7th-rank',
    title: 'Açık Hatlar ve 7. Yataydaki Canavar Kaleler',
    category: 'Oyun Ortası Planları',
    icon: 'Castle',
    fen: 'r4rk1/1p2qpp1/p1p1p2p/3p4/2PP4/1P2P3/P3RPPP/R2Q2K1 w - - 0 18',
    summary: 'Açılıştan sonra piyonların temizlendiği dikey hatları kalelerle ele geçirmek ve rakibin 7. yatayına sızmak oyunun kaderini belirler.',
    explanation: 'Kaleler yarı açık ve açık dikey hatlarda en yüksek potansiyeline ulaşır. Eğer kalenizi rakibin 7. yatayına (siyah için 2. yatay) indirmeyi başarırsanız, buna satrançta "Domuzcuklar (Pigs on the 7th)" denir. Çünkü rakibin korunmasız piyadelerini bir bir süpürür ve şahı mat ağına sokar.',
    rulesOfThumb: [
      'Merkezdeki piyon takaslarından sonra açık kalan d/e/c dikeyine ilk kalenizi getirin.',
      'İki kalenizi aynı hatta üst üste dizerek (Aljehin Silahı) hattın kontrolünü rakibe kaptırmayın.',
      '7. yataya inen kale genellikle +2 piyonluk bir konumsal avantaja eşdeğerdir.'
    ],
    exampleMoves: ['Rec2', 'Rfd8', 'cxd5', 'cxd5', 'Rc5'],
    proTips: 'Eğer rakip açık dikeyde sizinle kale değişmek istiyorsa, arkanızdaki kaleyle desteklemiyorsanız değişmeyin. Hattın giriş kapısını kontrol edin.',
    arrows: [['e2', 'c2', 'green'], ['c2', 'c7', 'red']],
    highlightSquares: ['c7', 'd7', 'e7', 'f7']
  },
  {
    id: 'outpost-knights',
    title: 'Karakol Kareler (Outpost) ve Ahtapot Atlar',
    category: 'Alet Koordinasyonu',
    icon: 'Shield',
    fen: 'r2q1rk1/1p1b1ppp/p1np4/3Np1b1/4P3/1N1B4/PPP2PPP/R2Q1RK1 w - - 4 13',
    summary: 'Rakip piyonların artık kovamayacağı, kendi piyonunuzun koruduğu delik karelere yerleşen bir at oyunu tek başına kazanabilir.',
    explanation: 'Özellikle d5, e5, d4 karelerinde rakip piyonlar ilerleyip geri çekilemediği için arkalarında "delikler (holes)" bırakırlar. Örneğin siyah d6 ve e5 sürdüğünde d5 karesi sonsuza kadar piyon korumasından yoksun kalır. Beyaz at bu d5 karesine oturduğunda (Outpost) tahtanın merkezini felç eder.',
    rulesOfThumb: [
      'Karakol kare, en az bir piyonunuz tarafından korunmalıdır.',
      'Rakip hiçbir piyonuyla bu karedeki taşınızı tehdit edememelidir.',
      'Karakoldaki atınızı rakip ancak bir fil veya atla değişebilir; bu takası kendi lehinize çevirin.'
    ],
    exampleMoves: ['c3', 'Ne7', 'Nxe7+', 'Qxe7', 'Bc2'],
    proTips: 'Sicilya Savunmasında siyah d6 ve e5 oynadığında beyazın bütün stratejik planı d5 karesini ele geçirmektir.',
    arrows: [['d5', 'b6', 'green'], ['d5', 'c7', 'red'], ['d5', 'e7', 'red'], ['d5', 'f6', 'green']],
    highlightSquares: ['d5']
  },
  {
    id: 'pawn-breaks',
    title: 'Piyon Kırışları (Pawn Breaks): Nereden Ne Çıkar?',
    category: 'Piyon Yapıları',
    icon: 'Flame',
    fen: 'rnbq1rk1/pppn1ppp/4p3/3pP3/1b1P4/2NB1N2/PPP2PPP/R1BQK2R w KQ - 1 7',
    summary: 'Kilitlenmiş pozisyonlarda taşlar geçiş yolu bulamaz. Kapıyı açacak tek anahtar doğru piyon yarmasıdır.',
    explanation: 'Açılıştan sonra merkez kilitlendiğinde (örneğin Fransız Savunmasında beyaz d4-e5, siyah d5-e6 piyon zincirleri kurduğunda) oyuncular ne yapacağını şaşırır. Altın kural: "Piyon zincirinizin ucu hangi kanadı gösteriyorsa oraya saldırın!" Zincir şah kanadına bakıyorsa f4-f5 ile hücum edin, vezir kanadına bakıyorsa c4-c5 ile piyon sürün.',
    rulesOfThumb: [
      'Merkez kapalıyken kanatlardan piyon sürüşleri (f4 veya c5) çok etkilidir.',
      'Rakip kanatta taarruza başladığında en iyi savunma "Merkezden piyon yarması" yapmaktır.',
      'Hazırlıksız yapılan piyon yarmaları kendi piyon yapınızı zayıflatır ve rakibe açık hat hediye eder.'
    ],
    exampleMoves: ['O-O', 'c5', 'dxc5', 'Nc6', 'Bf4'],
    proTips: 'Piyonlar geriye gidemez! Bir piyonu sürmeden önce arkasında bıraktığı karelerin kimin eline geçeceğini iyi hesaplayın.',
    arrows: [['e5', 'f6', 'red'], ['f2', 'f4', 'green'], ['f4', 'f5', 'green']],
    highlightSquares: ['e5', 'd4']
  },
  {
    id: 'isolated-queen-pawn',
    title: 'İzole Vezir Piyonu (d4): Güç mü, Zayıflık mı?',
    category: 'Piyon Yapıları',
    icon: 'Target',
    fen: 'r1bq1rk1/pp1nbppp/4pn2/8/3P4/2NB1N2/PP3PPP/R1BQK2R w KQ - 0 10',
    summary: 'Yanında hiçbir dost piyon bulunmayan d4 piyonu oyun ortasında dinamik bir güç, son oyunda ise kronik bir felakettir.',
    explanation: 'İzole vezir piyonu (IQP), c ve e dikeyindeki piyonlar takas edildiğinde tek başına d4 karesinde kalan piyondur. Avantajı: Beyaza c5 ve e5 karelerinde müthiş bir alan üstünlüğü ve şah kanadı hücumu fırsatı verir. Dezavantajı: Oyun ortasında mat yapamaz ve taşlar azalarak oyun sonuna geçilirse, d4 piyonu korumasız kalarak düşer.',
    rulesOfThumb: [
      'İzole piyonunuz varsa: Taşları değişmeyin! Alan üstünlüğünüzü kullanarak rakip şaha doğrudan saldırın.',
      'Rakibin izole piyonu varsa: Taşları olabildiğince takas edin, piyonun önündeki d5 karesine bir at blokajı kurun ve son oyunda kazanın.'
    ],
    exampleMoves: ['O-O', 'b6', 'Qe2', 'Bb7', 'Rd1'],
    proTips: 'd4-d5 piyon yarması izole piyonu olan oyuncunun pozisyonu patlatıp galibiyete uzandığı en meşhur taktik temadır.',
    arrows: [['d4', 'd5', 'green'], ['d3', 'h7', 'red']],
    highlightSquares: ['d4', 'd5']
  },
  {
    id: 'tactical-pins-forks',
    title: 'Taktik Motifler: Çatal, Şiş ve Açmazın Gücü',
    category: 'Taktik Motifler',
    icon: 'Zap',
    fen: 'r1b1k2r/pppp1ppp/2n5/4P3/1bB1n3/2N2N2/PPP2PPP/R1BQK2R w KQkq - 0 8',
    summary: 'Büyükustalar konumsal oynar ama oyunları bitiren daima taktik darbelerdir. Açmazdaki taşa yüklenmek temel ilkedir.',
    explanation: 'Satrançta taş kayıplarının %80 i üç taktik motiften kaynaklanır: 1) Çift Tehdit / Çatal (Genellikle at veya vezirle), 2) Açmaz (Arkasında şah veya daha değerli taş olan taşın kımıldayamaması), 3) Şiş (Öndeki değerli taş kaçtığında arkadaki taşın düşmesi).',
    rulesOfThumb: [
      '"Açmazdaki taşa saldır!" kuralını asla unutmayın. Açmazdaki bir taşı hemen almak yerine bir piyon veya hafif taşla tehdit edin.',
      'Rakip şah ve vezir aynı çaprazda veya hat üzerindeyse mutlaka taktik bir kombinasyon arayın.',
      'Korumasız taşlar (LPDO: Loose Pieces Drop Off) taktik tuzakların ana hedefidir.'
    ],
    exampleMoves: ['O-O', 'Nxc3', 'bxc3', 'Be7', 'Re1'],
    proTips: 'Her hamlenizden önce kendinize şu üç soruyu sorun: 1) Rakibin şah çekişi var mı? 2) Rakibin taş alış hamlesi var mı? 3) Rakibin taşlarıma doğrudan bir tehdidi var mı?',
    arrows: [['b4', 'e1', 'red'], ['c4', 'f7', 'red']],
    highlightSquares: ['c3', 'f7']
  },
  {
    id: 'good-vs-bad-bishop',
    title: 'İyi Fil vs Kötü Fil (Merkez Zinciri Sanatı)',
    category: 'Alet Koordinasyonu',
    icon: 'Shield',
    fen: 'r2q1rk1/pp1n1ppp/2pbpn2/3p4/3P4/2PBPN2/PP1N1PPP/R1BQ1RK1 w - - 0 9',
    summary: 'Piyonlarınızla aynı renk karelere sıkışan fil "Kötü Fil"dir. Merkez kırışıyla iyi fili parlatın, rakibin kötü filini hapsedin.',
    explanation: 'Kendi piyonlarınız hangi renkte duruyorsa o renk karelerdeki filiniz kendi duvarına çarpar. Beyazın c1 fili c3-d4-e3 piyonlarının arkasında hapisken, e4 sürüşü hem c1 filinin önünü açar hem de merkez hakimiyeti getirir.',
    rulesOfThumb: [
      'Piyonlarınızı mümkün olduğunca filinizin TERSİ rengindeki karelere yerleştirin.',
      'Rakip piyon zinciriyle kendi filini kilitlediyse o kötü fili asla takas etmeyin.',
      'Kendi kötü filinizi ise ya zincir dışına çıkarın ya da uygun aletle değiştirin.'
    ],
    exampleMoves: ['e4', 'dxe4', 'Nxe4', 'Nxe4', 'Bxe4'],
    proTips: 'Oyunu açan tek bir e4 sürüşü bazen bütün tahtadaki kötü taşları bir anda canavar aktif taşlara çevirir!',
    arrows: [['e3', 'e4', 'green'], ['c1', 'g5', 'blue']],
    highlightSquares: ['c1', 'e4']
  },
  {
    id: 'minority-attack',
    title: 'Azınlık Saldırısı (Minority Attack)',
    category: 'Oyun Ortası Planları',
    icon: 'Target',
    fen: 'r1bq1rk1/pp1nbppp/2p1pn2/3p4/2PP4/2N1PN2/PP3PPP/R1BQ1RK1 w - - 0 8',
    summary: 'Vezir gambiti yapılarında (Carlsbad yapısı) az sayıda piyonla rakibin piyon çoğunluğunun üzerine yürüyüp kronik zayıflık yaratma planıdır.',
    explanation: 'Vezir kanadında az piyonunuz (örneğin a2-b2) olmasına rağmen b2-b4-b5 sürüşüyle rakibin c6 piyonuna çarparsanız, rakip ya izole ya da geri kalmış bir c6/d5 zayıflığı vermek zorunda kalır!',
    rulesOfThumb: [
      'Azınlık saldırısının hedefi geçer piyon çıkarmak değil, rakipte geri kalmış piyon (backward pawn) bırakmaktır.',
      'Kaleyi açık c-hattına veya yarı açık b-hattına yerleştirerek baskıyı artırın.',
      'Şah kanadında sakin durun ve dikkati vezir kanadındaki c6 hedefine odaklayın.'
    ],
    exampleMoves: ['b3', 'b6', 'Bb2', 'Bb7', 'Rc1'],
    proTips: 'Vezir Gambiti Reddedildi (QGD) Değişim Varyantında beyazların en klasik ve en öğretici uzun vadeli planıdır.',
    arrows: [['b2', 'b4', 'green'], ['b4', 'b5', 'green'], ['a1', 'c1', 'blue']],
    highlightSquares: ['c6', 'd5']
  },
  {
    id: 'opposite-castling-storm',
    title: 'Ters Kanat Rokları ve Piyon Fırtınası',
    category: 'Oyun Ortası Planları',
    icon: 'Flame',
    fen: 'r2q1rk1/pp2bppp/2n1pn2/2pp4/3P4/2NBPN2/PPP1QPPP/2KR3R w - - 0 10',
    summary: 'İki şah farklı kanatlarda rok attığında satrançta hız yarışı başlar: Önce kim rakip şahın önüne piyon fırtınası sürerse o kazanır!',
    explanation: 'Beyaz vezir kanadına (O-O-O), siyah ise şah kanadına (O-O) rok attıysa kendi şahınıza savunma yaparken şah kanadındaki g2-h2 piyonlarını korkusuzca ileri sürebilirsiniz (g4-g5, h4-h5). Amaç hatları açıp kaleleri şaha indirmektir.',
    rulesOfThumb: [
      'Ters kanat roklarında her tempo altın değerindedir; savunma için piyon sürmekten kaçının.',
      'Piyonunuzu rakip şah kanadındaki kanca piyonla (ör. f6 veya h6) temas ettirin (h4-h5 veya g4-g5).',
      'Rakibin kendi kanadını yarmasını önlemek için merkezde kontrolü elden bırakmayın.'
    ],
    exampleMoves: ['g4', 'Nxg4', 'Rdg1', 'Nf6', 'Ne5'],
    proTips: 'Ters kanat roklarında 1 tempo geriden gelmek bazen mat olmak demektir — aktif ve cesur oynayın!',
    arrows: [['g2', 'g4', 'green'], ['h1', 'g1', 'blue'], ['d3', 'h7', 'red']],
    highlightSquares: ['g8', 'h7']
  }
];
