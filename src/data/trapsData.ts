import { Chess } from 'chess.js';
import type { OpeningTrap, TrapStep } from '../types/chess';

function buildTrapSteps(moves: string[], comments: { [ply: number]: string }, blunders: number[] = [], punishments: number[] = []): TrapStep[] {
  const chess = new Chess();
  const steps: TrapStep[] = [];

  for (let i = 0; i < moves.length; i++) {
    const moveSan = moves[i];
    chess.move(moveSan);
    const ply = i + 1;
    steps.push({
      ply,
      san: moveSan,
      fen: chess.fen(),
      comment: comments[ply] || `${moveSan} hamlesi oynandı.`,
      isBlunder: blunders.includes(ply),
      isPunishment: punishments.includes(ply),
    });
  }

  return steps;
}

export const TRAPS_DATA: OpeningTrap[] = [
  {
    id: 'blackburne-shilling',
    name: 'Blackburne Shilling Tuzağı',
    openingName: 'İtalyan Açılışı',
    side: 'black',
    difficulty: 'Kolay',
    story: '19. yüzyılın ünlü İngiliz ustası Joseph Henry Blackburne un kahvehanelerde amatörlerden shilling (para) kazanmak için oynadığı efsanevi tuzaktır.',
    setupMoves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4'],
    blunderMoveSan: 'Nxe5',
    puzzleGoal: 'Beyaz bedava sandığı e5 piyonunu aldı. Siyahın ölümcül karşı saldırı hamlesini yap!',
    solutionMoves: ['Qg5', 'Nxf7', 'Qxg2', 'Rf1', 'Qxe4+', 'Be2', 'Nf3#'],
    steps: buildTrapSteps(
      ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nd4', 'Nxe5', 'Qg5', 'Nxf7', 'Qxg2', 'Rf1', 'Qxe4+', 'Be2', 'Nf3#'],
      {
        1: '1. e4 - Standart başlangıç.',
        2: '1... e5 - Karşılık.',
        3: '2. Nf3 - e5 piyonuna saldırı.',
        4: '2... Nc6 - Piyon korundu.',
        5: '3. Bc4 - İtalyan fili oyunda.',
        6: '3... Nd4!? - Tuzağın yemi! Siyah açılış prensiplerine aykırı olarak aynı taşla iki kez oynar ve e5 piyonunu boşta bırakır.',
        7: '4. Nxe5? - BEYAZ TUZAĞA DÜŞTÜ! Beyaz açgözlülük yaparak korumasız e5 piyonunu alır ve f7 karesine çifte saldırı planlar.',
        8: '4... Qg5!! - Cezalandırıcı Hamle! Vezir hem e5 atına hem de savunmasız g2 piyonuna aynı anda saldırır!',
        9: '5. Nxf7 - Beyaz vazgeçmez, vezir ve kaleyi çatalladığını zanneder.',
        10: '5... Qxg2! - Siyah g2 piyonunu süpürür ve h1 kalesini tehdit eder.',
        11: '6. Rf1 - Kaleyi kurtarmak için tek hamle.',
        12: '6... Qxe4+! - Vezir merkezden şah çeker.',
        13: '7. Be2 - Beyaz filiyle arayı kapatmak zorundadır.',
        14: '7... Nf3# - BOĞMACA MATI!! At şahı e1 karesinde kendi taşları arasında boğarak mat eder!'
      },
      [7], // Blunder at ply 7 (Nxe5)
      [8, 14] // Punishments
    ),
    strategicLesson: 'Açılışta bedava görünen piyonları kontrol etmeden asla almayın! Özellikle rakip vezir g5 veya h4 karelerine inebiliyorsa g2/f2 kareleri ölümcül tehlike altındadır.'
  },
  {
    id: 'legal-trap',
    name: "Légal Matı (Vezir Feda Tuzağı)",
    openingName: 'İtalyan Açılışı / Philidor',
    side: 'white',
    difficulty: 'Orta',
    story: '1750 yılında Fransız usta Sire de Légal tarafından oynanan, satranç tarihinin en estetik vezir feda matlarından biridir.',
    setupMoves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'd6', 'Nc3', 'Bg4', 'h3'],
    blunderMoveSan: 'Bh5',
    puzzleGoal: 'Siyah filini h5 e çekerek açmazı korumak istedi. Beyazın dahi vezir fedasını başlat!',
    solutionMoves: ['Nxe5', 'Bxd1', 'Bxf7+', 'Ke7', 'Nd5#'],
    steps: buildTrapSteps(
      ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'd6', 'Nc3', 'Bg4', 'h3', 'Bh5', 'Nxe5', 'Bxd1', 'Bxf7+', 'Ke7', 'Nd5#'],
      {
        1: '1. e4',
        2: '1... e5',
        3: '2. Nf3',
        4: '2... Nc6',
        5: '3. Bc4',
        6: '3... d6',
        7: '4. Nc3',
        8: '4... Bg4 - Siyah f3 atını beyaz vezire açmaza alır.',
        9: '5. h3 - Beyaz "Filini alacak mısın yoksa geri mi çekeceksin?" diye sorar.',
        10: '5... Bh5? - HATA! Siyah açmazı korumak ister ancak taktik motifi göremez.',
        11: '6. Nxe5!! - DAHİ VEZİR FEDASI! Beyaz vezirini açıkta bırakarak f6 piyonunu atla alır!',
        12: '6... Bxd1? - Siyah açgözlülükle veziri alır ve mat tuzağına düşer.',
        13: '7. Bxf7+! - Fil f7 karesinden şah çeker, siyah şahın tek kaçış karesi e7 dir.',
        14: '7... Ke7',
        15: '8. Nd5# - MÜKEMMEL MAT! İki at ve bir fil tahtanın ortasındaki şahı mat eder.'
      },
      [10],
      [11, 15]
    ),
    strategicLesson: 'Mutlak olmayan (arkasında şah değil vezir olan) açmazlar yalancı açmazdır. Taşların aktifliği vezirden bile daha değerli mat hücumları yaratabilir.'
  },
  {
    id: 'elephant-trap',
    name: 'Fil Tuzağı (Elephant Trap)',
    openingName: "Vezir Gambiti (Queen's Gambit Declined)",
    side: 'black',
    difficulty: 'Orta',
    story: 'Reddedilen Vezir Gambitinde beyazın d5 piyonunu açmazda zannedip almasıyla başlayan kurnaz bir tuzaktır.',
    setupMoves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Nbd7', 'cxd5', 'exd5'],
    blunderMoveSan: 'Nxd5',
    puzzleGoal: 'Beyaz d5 piyonunu açmazda sanıp atıyla aldı. Siyahın tahtayı alt üst eden hamlesini oyna!',
    solutionMoves: ['Nxd5', 'Bxd8', 'Bb4+', 'Qd2', 'Bxd2+', 'Kxd2', 'Kxd8'],
    steps: buildTrapSteps(
      ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Nbd7', 'cxd5', 'exd5', 'Nxd5', 'Nxd5', 'Bxd8', 'Bb4+', 'Qd2', 'Bxd2+', 'Kxd2', 'Kxd8'],
      {
        1: '1. d4',
        2: '1... d5',
        3: '2. c4',
        4: '2... e6',
        5: '3. Nc3',
        6: '3... Nf6',
        7: '4. Bg5',
        8: '4... Nbd7 - Tuzağın hazırlığı! Siyah atını d7 karesine koyar.',
        9: '5. cxd5',
        10: '5... exd5',
        11: '6. Nxd5? - BEYAZ TUZAĞA DÜŞTÜ! Beyaz f6 atının vezire açmazda olduğunu düşünerek d5 piyonunu bedava zanneder.',
        12: '6... Nxd5!! - SİYAH VEZİRİNİ BIRAKIYOR! At piyonu alan beyaz atı yer.',
        13: '7. Bxd8 - Beyaz zevkle siyah veziri alır.',
        14: '7... Bb4+! - ŞOK EDİCİ ŞAH! Beyaz şahın gidecek hiçbir karesi yoktur, vezirini feda etmek zorundadır!',
        15: '8. Qd2',
        16: '8... Bxd2+',
        17: '9. Kxd2',
        18: '9... Kxd8 - Duman dağıldığında siyah temiz bir alet (at) öndedir ve oyunu kazanır!'
      },
      [11],
      [12, 14]
    ),
    strategicLesson: 'Açmazdaki taşlar eğer rakip şaha karşı ölümcül bir ara şah (in-between check) çekebiliyorsa açmaz hükümsüz kalır.'
  },
  {
    id: 'noahs-ark',
    name: "Noah's Ark (Nuh'un Gemisi) Tuzağı",
    openingName: 'İspanyol Açılışı (Ruy Lopez)',
    side: 'black',
    difficulty: 'Usta Tuzağı',
    story: 'Çok eski bir tuzak olduğu için "Nuh tufanından kalma" anlamında bu ismi almıştır. Beyazın değerli açık renkli fili piyon kafesinde boğulur.',
    setupMoves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'd6', 'd4', 'b5', 'Bb3', 'Nxd4', 'Nxd4', 'exd4'],
    blunderMoveSan: 'Qxd4',
    puzzleGoal: 'Beyaz d4 piyonunu vezirle aldı. Siyahın beyaz fili hapsedecek piyon zincirini başlat!',
    solutionMoves: ['c5', 'Qd5', 'Be6', 'Qc6+', 'Bd7', 'Qd5', 'c4'],
    steps: buildTrapSteps(
      ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'd6', 'd4', 'b5', 'Bb3', 'Nxd4', 'Nxd4', 'exd4', 'Qxd4', 'c5', 'Qd5', 'Be6', 'Qc6+', 'Bd7', 'Qd5', 'c4'],
      {
        1: '1. e4',
        2: '1... e5',
        3: '2. Nf3',
        4: '2... Nc6',
        5: '3. Bb5',
        6: '3... a6',
        7: '4. Ba4',
        8: '4... d6',
        9: '5. d4',
        10: '5... b5',
        11: '6. Bb3',
        12: '6... Nxd4',
        13: '7. Nxd4',
        14: '7... exd4',
        15: '8. Qxd4? - HATA! Beyaz veziriyle d4 piyonunu alır ancak vezir kanadındaki piyon yürüyüşünü hesaba katmaz.',
        16: '8... c5! - Vezire tempo ile saldırı.',
        17: '9. Qd5 - Beyaz f7 karesine ve a8 kalesine çift tehdit kurar.',
        18: '9... Be6 - Siyah filiyle f7 karesini savunur ve veziri kovalar.',
        19: '10. Qc6+',
        20: '10... Bd7',
        21: '11. Qd5',
        22: '11... c4! - FİL KAFESTE! Beyazın b3 fili piyonlar tarafından hapsedilmiştir ve kurtarılamaz. Siyah temiz bir fil kazanır.'
      },
      [15],
      [16, 22]
    ),
    strategicLesson: 'Filler geniş diyagonalleri sever. Rakip piyonların filinizin kaçış yollarını kesmesine ve onu kafese kapatmasına asla izin vermeyin.'
  },
  {
    id: 'fried-liver',
    name: 'Kızarmış Ciğer Saldırısı (Fried Liver)',
    openingName: 'İtalyan Açılışı: İki At Savunması',
    side: 'white',
    difficulty: 'Kolay',
    story: 'Adını İtalyanca "Fegatello" (kızartılmış ciğer) tabirinden alan, f7 karesine at fedasıyla siyah şahı tahtanın ortasına çeken en keskin açılış saldırısıdır.',
    setupMoves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5'],
    blunderMoveSan: 'Nxd5',
    puzzleGoal: 'Siyah 5...Na5 yerine 5...Nxd5? oynayarak f7 fedasına kapı açtı. Beyazın efsanevi fedasını başlat!',
    solutionMoves: ['Nxf7', 'Kxf7', 'Qf3+', 'Ke6', 'Nc3'],
    steps: buildTrapSteps(
      ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7', 'Kxf7', 'Qf3+', 'Ke6', 'Nc3'],
      {
        1: '1. e4',
        2: '1... e5',
        3: '2. Nf3',
        4: '2... Nc6',
        5: '3. Bc4',
        6: '3... Nf6 - İki At Savunması.',
        7: '4. Ng5 - Doğrudan f7 zayıflığına saldırı!',
        8: '4... d5 - Siyah filin çaprazını kesmeye çalışır.',
        9: '5. exd5',
        10: '5... Nxd5? - HATA! Teorik hamle 5...Na5 idi. Şimdi d5 atı korunmasız ve f7 savunmasız!',
        11: '6. Nxf7!! - KIZARMIŞ CİĞER FEDASI! Beyaz atıyla f7 piyonunu kırıp siyah vezir ile kaleyi çatallar.',
        12: '6... Kxf7 - Siyah şah zorunlu olarak atı alır ve merkeze sürüklenir.',
        13: '7. Qf3+! - Çifte tehdit! Hem şah çeker hem d5 atını ister.',
        14: '7... Ke6 - Siyah atı korumak için şahıyla ortada kalmak zorundadır.',
        15: '8. Nc3! - Açmazdaki d5 atına bir taş daha yükleniyor; beyazın saldırısı ezicidir!'
      },
      [10],
      [11, 13, 15]
    ),
    strategicLesson: 'İki At Savunmasında f7 karesi açıkken ...Nxd5 almak büyük tehlikedir; şah ortada kalınca gelişim üstünlüğü taş fedasını fazlasıyla karşılar.'
  },
  {
    id: 'caro-kann-smothered',
    name: 'Caro-Kann Boğmaca Matı (Nd6#)',
    openingName: 'Caro-Kann Savunması',
    side: 'white',
    difficulty: 'Kolay',
    story: 'Caro-Kann oyuncuları açılış sırasını ezbere mekanik oynadığında sıklıkla düştüğü, 6 hamlelik şok edici boğmaca matı!',
    setupMoves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nd7', 'Qe2'],
    blunderMoveSan: 'Ngf6',
    puzzleGoal: 'Siyah e-dikeyindeki gizli tehlikeyi fark etmeden 5...Ngf6? oynadı. Tek hamlede matı yap!',
    solutionMoves: ['Nd6#'],
    steps: buildTrapSteps(
      ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nd7', 'Qe2', 'Ngf6', 'Nd6#'],
      {
        1: '1. e4',
        2: '1... c6 - Caro-Kann Savunması.',
        3: '2. d4',
        4: '2... d5',
        5: '3. Nc3',
        6: '3... dxe4',
        7: '4. Nxe4',
        8: '4... Nd7 - d7 atı filin ve şahın yolunu geçici olarak kapatıyor.',
        9: '5. Qe2 - Vezir e-hattından gizli açmaz kurar!',
        10: '5... Ngf6?? - ÖLÜMCÜL HATA! Siyah e7 piyonunun e2 veziri tarafından Şaha açmazda olduğunu görmez.',
        11: '6. Nd6# - BOĞMACA MATI! e7 piyonu e8 şahına açmazda olduğu için d6 atını alamaz!'
      },
      [10],
      [11]
    ),
    strategicLesson: 'Açmazdaki taş (e7 piyonu) yanındaki kareyi koruyor gibi görünür ama gerçekte koruyamaz — hayalet korumaya asla güvenmeyin!'
  },
  {
    id: 'stafford-gambit',
    name: 'Stafford Gambiti Mat Tuzağı',
    openingName: 'Petrov Savunması: Stafford Gambiti',
    side: 'black',
    difficulty: 'Orta',
    story: 'İnternet yıldırım (blitz) satrancının en tehlikeli tuzaklarından biridir. Siyah bir piyon feda edip beyazın açgözlü fil hamlesini şok bir vezir fedasıyla cezalandırır.',
    setupMoves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6', 'd3', 'Bc5'],
    blunderMoveSan: 'Bg5',
    puzzleGoal: 'Beyaz f6 atını vezire açmaza aldığını sanıp 6.Bg5? oynadı. Siyahla veziri feda edip matı vur!',
    solutionMoves: ['Nxe4', 'Bxd8', 'Bxf2+', 'Ke2', 'Bg4#'],
    steps: buildTrapSteps(
      ['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'Nc6', 'Nxc6', 'dxc6', 'd3', 'Bc5', 'Bg5', 'Nxe4', 'Bxd8', 'Bxf2+', 'Ke2', 'Bg4#'],
      {
        1: '1. e4',
        2: '1... e5',
        3: '2. Nf3',
        4: '2... Nf6 - Petrov Savunması.',
        5: '3. Nxe5',
        6: '3... Nc6!? - Stafford Gambiti!',
        7: '4. Nxc6',
        8: '4... dxc6 - Fil ve vezir çaprazları ardına kadar açıldı.',
        9: '5. d3',
        10: '5... Bc5 - Doğrudan f2 karesini hedef alıyor.',
        11: '6. Bg5? - TUZAK! Beyaz f6 atını açmaza aldığını sanır.',
        12: '6... Nxe4!! - ŞOK VEZİR FEDASI! Légal teması devrede.',
        13: '7. Bxd8 - Beyaz veziri alırsa mat kaçınılmaz olur.',
        14: '7... Bxf2+! - f2 piyonu şahla düşüyor.',
        15: '8. Ke2',
        16: '8... Bg4# - ÇİFT FİL MATI! İki fil tahtanın ortasındaki şahı mat eder.'
      },
      [11],
      [12, 16]
    ),
    strategicLesson: 'Gelişimi geri kalmışken açık hat ve çaprazlara sahip rakibe karşı arkada f2/f7 zayıflığı varsa sahte açmazlara aldanmayın!'
  },
  {
    id: 'lasker-trap',
    name: 'Lasker Tuzağı (At Terfisi Şoku!)',
    openingName: 'Albin Karşı Gambiti',
    side: 'black',
    difficulty: 'Usta Tuzağı',
    story: '2. Dünya Şampiyonu Emanuel Lasker tarafından popülerleştirilen, satranç tarihinde vezir yerine AT terfi ettirmenin (underpromotion) en meşhur örneğidir.',
    setupMoves: ['d4', 'd5', 'c4', 'e5', 'dxe5', 'd4', 'e3', 'Bb4+', 'Bd2', 'dxe3'],
    blunderMoveSan: 'Bxb4',
    puzzleGoal: 'Beyaz b4 filini ücretsiz sanıp 6.Bxb4? aldı. Piyonu vezir değil AT çıkararak cezalandır!',
    solutionMoves: ['exf2+', 'Ke2', 'fxg1=N+'],
    steps: buildTrapSteps(
      ['d4', 'd5', 'c4', 'e5', 'dxe5', 'd4', 'e3', 'Bb4+', 'Bd2', 'dxe3', 'Bxb4', 'exf2+', 'Ke2', 'fxg1=N+'],
      {
        1: '1. d4',
        2: '1... d5',
        3: '2. c4',
        4: '2... e5 - Albin Karşı Gambiti.',
        5: '3. dxe5',
        6: '3... d4 - Alan kazanır.',
        7: '4. e3',
        8: '4... Bb4+',
        9: '5. Bd2',
        10: '5... dxe3! - Siyah b4 filini feda ediyor gibi görünür.',
        11: '6. Bxb4? - BEYAZ YUTTU! Doğrusu 6.fxe3 idi.',
        12: '6... exf2+! - Piyon şah çekerek f2 karesini kırar.',
        13: '7. Ke2 - Kxf2 oynarsa Qxd1 ile vezir gider!',
        14: '7... fxg1=N+! - EFSANE AT TERFİSİ! Vezir çıksaydı Rxg1 olurdu; at çıkarak hem şah çekiyor hem de d1 vezirini ve oyunu kazanıyor!'
      },
      [11],
      [12, 14]
    ),
    strategicLesson: 'Terfi karelerinde her zaman otomatik vezir çıkmayın — tempo ile şah çeken bir at terfisi bütün oyunu kazandırabilir.'
  },
  {
    id: 'englund-gambit',
    name: 'Englund Gambiti Vezir Tuzağı',
    openingName: 'Englund Gambiti',
    side: 'black',
    difficulty: 'Kolay',
    story: '1.d4 hamlesine karşı piyon feda eden agresif açılışın 8 hamlede koridor matıyla biten tuzak dizisi.',
    setupMoves: ['d4', 'e5', 'dxe5', 'Nc6', 'Nf3', 'Qe7', 'Bf4', 'Qb4+', 'Bd2', 'Qxb2'],
    blunderMoveSan: 'Bc3',
    puzzleGoal: 'Beyaz kaleyi korumak için 6.Bc3? oynadı. Çapraz açmazını kullanıp 8 hamlelik matı bitir!',
    solutionMoves: ['Bb4', 'Qd2', 'Bxc3', 'Qxc3', 'Qc1#'],
    steps: buildTrapSteps(
      ['d4', 'e5', 'dxe5', 'Nc6', 'Nf3', 'Qe7', 'Bf4', 'Qb4+', 'Bd2', 'Qxb2', 'Bc3', 'Bb4', 'Qd2', 'Bxc3', 'Qxc3', 'Qc1#'],
      {
        1: '1. d4',
        2: '1... e5!? - Englund Gambiti.',
        3: '2. dxe5',
        4: '2... Nc6',
        5: '3. Nf3',
        6: '3... Qe7',
        7: '4. Bf4',
        8: '4... Qb4+ - Hem şah hem b2 piyonu hem f4 fili aynı anda isteniyor!',
        9: '5. Bd2',
        10: '5... Qxb2',
        11: '6. Bc3? - HATA! Doğrusu 6.Nc3 ile c3 karesini tutmaktı.',
        12: '6... Bb4! - FİL AÇMAZDA! a1 kalesi yüzünden beyaz bu fili yiyemez.',
        13: '7. Qd2 - Beyaz açmazdaki fili veziriyle korumaya çalışır.',
        14: '7... Bxc3',
        15: '8. Qxc3',
        16: '8... Qc1# - SON YATAY MATI! Vezir b2 den tek adımda şahı mat eder.'
      },
      [11],
      [12, 16]
    ),
    strategicLesson: 'Kendi vezirinizin önünü ve 1. yatay savunmasını zayıflatan zoraki kale kurtarmaları genellikle matla biter.'
  },
  {
    id: 'fishing-pole',
    name: 'Olta Tuzağı (Fishing Pole Trap)',
    openingName: 'İspanyol Açılışı (Ruy Lopez)',
    side: 'black',
    difficulty: 'Orta',
    story: 'Siyah şah kanadındaki atı h5 piyonuyla adeta bir "olta yemi" gibi feda edip beyazın rok atmış şahına h-hattından durdurulamaz saldırı başlatır.',
    setupMoves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O', 'Ng4', 'h3', 'h5'],
    blunderMoveSan: 'hxg4',
    puzzleGoal: 'Beyaz 6.hxg4? diyerek yemi yuttu. h-dikeyini aç ve beyaz şaha ölümcül vezir saldırısını kur!',
    solutionMoves: ['hxg4', 'Ne1', 'Qh4'],
    steps: buildTrapSteps(
      ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O', 'Ng4', 'h3', 'h5', 'hxg4', 'hxg4', 'Ne1', 'Qh4'],
      {
        1: '1. e4',
        2: '1... e5',
        3: '2. Nf3',
        4: '2... Nc6',
        5: '3. Bb5',
        6: '3... Nf6 - Berlin Savunması.',
        7: '4. O-O',
        8: '4... Ng4!? - Şah kanadına sıçrayan yem at.',
        9: '5. h3',
        10: '5... h5! - OLTA ATILDI! Siyah h-hattını açmak için atı bilerek bırakır.',
        11: '6. hxg4?? - ÖLÜMCÜL HATA! Rok kanadında h-dikeyini kendi eliyle açmak intihardır.',
        12: '6... hxg4! - Kale artık açık h-dikeyinde ve f3 atı kovuluyor.',
        13: '7. Ne1 - Atı kaçabilecek tek kare.',
        14: '7... Qh4! - DURDURULAMAZ MAT AĞI! Bir sonraki hamlede Qh2# veya Qh1# tehdidine karşı savunma yoktur.'
      },
      [11],
      [12, 14]
    ),
    strategicLesson: 'Rok attıktan sonra önünüzdeki h-piyonunu sürerek rakibe açık h-dikeyini asla bedava açmayın!'
  },
  {
    id: 'siberian-trap',
    name: 'Sibirya Tuzağı (Siberian Trap)',
    openingName: 'Sicilya Savunması: Smith-Morra Gambiti',
    side: 'black',
    difficulty: 'Orta',
    story: 'Smith-Morra Gambiti oyuncularının en korkulu rüyasıdır. Siyah ...Qc7 ve ...Ng4 ile h2 piyonuna gizli bir batarya kurar ve veziri düşürür.',
    setupMoves: ['e4', 'c5', 'd4', 'cxd4', 'c3', 'dxc3', 'Nxc3', 'Nc6', 'Nf3', 'e6', 'Bc4', 'Qc7', 'O-O', 'Nf6', 'Qe2', 'Ng4'],
    blunderMoveSan: 'h3',
    puzzleGoal: 'Beyaz g4 atını kovmak için dikkatsizce 9.h3? sürdü. Saptırma hamlesiyle doğrudan matı vur!',
    solutionMoves: ['Nd4', 'Nxd4', 'Qh2#'],
    steps: buildTrapSteps(
      ['e4', 'c5', 'd4', 'cxd4', 'c3', 'dxc3', 'Nxc3', 'Nc6', 'Nf3', 'e6', 'Bc4', 'Qc7', 'O-O', 'Nf6', 'Qe2', 'Ng4', 'h3', 'Nd4', 'Nxd4', 'Qh2#'],
      {
        1: '1. e4',
        2: '1... c5',
        3: '2. d4',
        4: '2... cxd4',
        5: '3. c3 - Smith-Morra Gambiti.',
        6: '3... dxc3',
        7: '4. Nxc3',
        8: '4... Nc6',
        9: '5. Nf3',
        10: '5... e6',
        11: '6. Bc4',
        12: '6... Qc7',
        13: '7. O-O',
        14: '7... Nf6',
        15: '8. Qe2',
        16: '8... Ng4! - h2 karesine g4 atı ve c7 veziriyle gizli batarya kuruldu!',
        17: '9. h3? - HATA! Beyaz atı kovmak ister ama d4 sıçramasını unutur.',
        18: '9... Nd4!! - SAPTIRMA DARBESİ! Hem beyaz veziri hem de f3 savunmacısını aynı anda tehdit eder!',
        19: '10. Nxd4 - Beyaz f3 savunmasını çekmek zorunda kalır.',
        20: '10... Qh2# - h2 KARESİNDEN MAT!'
      },
      [17],
      [18, 20]
    ),
    strategicLesson: 'Şahınızın h2/h7 karesini koruyan tek taş f3/f6 atıdır; rakibin onu saptırabilecek ...Nd4 gibi taktik atlayışlarını daima kontrol edin!'
  },
  {
    id: 'budapest-kieninger',
    name: 'Kieninger Boğmaca Tuzağı',
    openingName: 'Budapeşte Gambiti',
    side: 'black',
    difficulty: 'Kolay',
    story: '1925 yılında Georg Kieninger tarafından oynanan, beyazın ...b4 filini kovmaya çalışırken şahını kendi taşlarıyla boğduğu 8 hamlelik yıldırım tuzağı.',
    setupMoves: ['d4', 'Nf6', 'c4', 'e5', 'dxe5', 'Ng4', 'Bf4', 'Nc6', 'Nf3', 'Bb4+', 'Nbd2', 'Qe7', 'a3', 'Ngxe5'],
    blunderMoveSan: 'axb4',
    puzzleGoal: 'Beyaz b4 filini ücretsiz sanıp 8.axb4? aldı. Tek hamlede şok boğmaca matını oyna!',
    solutionMoves: ['Nd3#'],
    steps: buildTrapSteps(
      ['d4', 'Nf6', 'c4', 'e5', 'dxe5', 'Ng4', 'Bf4', 'Nc6', 'Nf3', 'Bb4+', 'Nbd2', 'Qe7', 'a3', 'Ngxe5', 'axb4', 'Nd3#'],
      {
        1: '1. d4',
        2: '1... Nf6',
        3: '2. c4',
        4: '2... e5 - Budapeşte Gambiti.',
        5: '3. dxe5',
        6: '3... Ng4',
        7: '4. Bf4',
        8: '4... Nc6',
        9: '5. Nf3',
        10: '5... Bb4+',
        11: '6. Nbd2',
        12: '6... Qe7 - e5 piyonuna 3. saldırı ve gizli e-hattı açmazı.',
        13: '7. a3',
        14: '7... Ngxe5! - Siyah b4 filini bilerek bırakır!',
        15: '8. axb4?? - BEYAZ FİLİ YUTTU!',
        16: '8... Nd3# - BOĞMACA MATI! e2 piyonu e7 veziri tarafından şaha açmazda olduğu için atı alamaz!'
      },
      [15],
      [16]
    ),
    strategicLesson: 'Kendi taşlarınızla e1 şahınızın etrafını kapattığınızda e2 piyonu üzerindeki açmaz gizli bir mat ağına dönüşebilir!'
  }
];
