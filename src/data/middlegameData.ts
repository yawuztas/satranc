export interface ImbalanceAnalysis {
  minorPieces: string;
  pawnStructure: string;
  spaceAndFiles: string;
  kingSafety: string;
  worstPiece: {
    piece: string;
    square: string;
    advice: string;
  };
  recommendedPlan: string;
}

export interface MiddlegameScenario {
  id: string;
  title: string;
  subtitle: string;
  fen: string;
  playerTurn: 'white' | 'black';
  theme: 'Hafif Taş Üstünlüğü' | 'Piyon Yapıları' | 'Açık Hatlar' | 'En Kötü Taş' | 'Şah Saldırısı';
  imbalances: ImbalanceAnalysis;
  candidateMoves: {
    san: string;
    quality: 'best' | 'playable' | 'mistake';
    title: string;
    explanation: string;
    strategicRating: number; // 1-100
  }[];
  masterLesson: string;
  arrows: [string, string, string?][];
  highlightSquares?: string[];
}

export const MIDDLEGAME_SCENARIOS: MiddlegameScenario[] = [
  {
    id: 'outpost-knight',
    title: 'İleri Karakol: Canavar At vs Kötü Fil',
    subtitle: 'Jeremy Silman Dengesizlik Analizi',
    fen: 'r2q1rk1/pp1b1ppp/2n1pn2/2pp4/2PP4/2N1PN2/PP1B1PPP/R2QKB1R w KQ - 0 9',
    playerTurn: 'white',
    theme: 'Hafif Taş Üstünlüğü',
    imbalances: {
      minorPieces: 'Beyaz d5 karesinde harika bir ileri karakola sahip olabilir. Siyahın d7 fili ise kendi d5/e6 piyon zinciri tarafından kısıtlanmıştır.',
      pawnStructure: 'Merkez piyon gerilimi (c4xd5) çözüldüğünde beyaz c-hattında baskı kuracaktır.',
      spaceAndFiles: 'Yarı açık c-hattı beyazın kaleleri için ideal bir saldırı koridorudur.',
      kingSafety: 'Her iki taraf da rok hazırlığında; şahlar dengede.',
      worstPiece: {
        piece: 'Beyaz Fil (f1)',
        square: 'f1',
        advice: 'Fil henüz çıkmadı; Bd3 karesine gelerek şah kanadına (h7 noktasına) bakmalı.'
      },
      recommendedPlan: 'Bd3 ile gelişimi tamamlayın, rok atın ve ardından d5 karesine atınızı yerleştirin.'
    },
    candidateMoves: [
      {
        san: 'Bd3',
        quality: 'best',
        title: 'Büyükusta Tercihi: En Mantıklı Gelişim',
        explanation: 'En kötü taşınızı (f1 fili) aktif bir kareye taşıyarak şah kanadına baskı kurar ve rok atmanızı sağlar.',
        strategicRating: 98
      },
      {
        san: 'cxd5',
        quality: 'playable',
        title: 'Merkezi Netleştirme',
        explanation: 'Merkezi erken açar ancak siyaha e6xd5 ile filinin yolunu açma imkanı tanıyabilir.',
        strategicRating: 75
      },
      {
        san: 'a3',
        quality: 'mistake',
        title: 'Pasif Bekleme Hamlesi',
        explanation: 'Gelişimde geri kalırken gereksiz kenar piyon hamlesi yapmak rakibe inisiyatif verir.',
        strategicRating: 30
      }
    ],
    masterLesson: 'Bir at, rakip piyonların artık kovamayacağı bir merkez karesine (Karakol / Outpost) yerleştiğinde en az bir kale kadar değerlidir!',
    arrows: [['f1', 'd3', 'green'], ['c3', 'd5', 'blue']]
  },
  {
    id: 'seventh-rank-rook',
    title: '7. Yataya Kale Sızması (Domination)',
    subtitle: 'Açık Hatların Nihai Amacı',
    fen: '2r2rk1/pp1b1ppp/4p3/3p4/8/P1N5/1P2RPPP/4R1K1 w - - 0 20',
    playerTurn: 'white',
    theme: 'Açık Hatlar',
    imbalances: {
      minorPieces: 'Tahtadaki hafif taş sayısı az; kalelerin gücü maksimum seviyeye çıkmıştır.',
      pawnStructure: 'Siyahın zayıf d5 ve b7 piyonları açıkta.',
      spaceAndFiles: 'e-hattı beyazın çiftlenmiş kalelerinin tam kontrolündedir!',
      kingSafety: 'Beyazın şahı güvenli (h2/g2/f2 piyon kalkanı), siyahın şahı son yatay mat tehditlerine maruz kalabilir.',
      worstPiece: {
        piece: 'Beyaz Kale (e1)',
        square: 'e1',
        advice: 'e2 kalenizi e7 karesine (7. yataya) sürdüğünüzde arkasındaki e1 kalesi desteğiyle oyunu bitirecektir.'
      },
      recommendedPlan: 'Re7 ile 7. yataya inin, siyahın b7 ve d7 taşlarına çifte baskı kurarak rakibi felç edin.'
    },
    candidateMoves: [
      {
        san: 'Re7',
        quality: 'best',
        title: 'Büyükusta Hamlesi: 7. Yatay Domine Edildi!',
        explanation: 'Kaleyi 7. yataya indirir, d7 filini ve arkasındaki b7 piyonunu felç eder.',
        strategicRating: 99
      },
      {
        san: 'h3',
        quality: 'playable',
        title: 'Hava Deliği (Luft)',
        explanation: 'Güvenli ancak inisiyatifi rakibe veren çok temkinli bir hamle.',
        strategicRating: 65
      },
      {
        san: 'Nxd5',
        quality: 'mistake',
        title: 'Hatalı Taktik Acelecilik',
        explanation: 'Gereksiz feda: Siyah e6xd5 ile taşı alır ve kale sızmasını bozar.',
        strategicRating: 25
      }
    ],
    masterLesson: 'Açık bir hattı kontrol etmenin tek ve nihai bir amacı vardır: Kaleyi rakip kampa, yani 7. yataya (veya siyahsanız 2. yataya) sızdırmak!',
    arrows: [['e2', 'e7', 'green'], ['e7', 'd7', 'red'], ['e7', 'b7', 'red']]
  },
  {
    id: 'worst-piece-finder',
    title: 'En Kötü Taşını İyileştirme Manevrası',
    subtitle: 'Büyükustaların Gizli Düşünce Yöntemi',
    fen: 'r4rk1/pp1b1ppp/1qn1p3/3p4/8/1PNBP3/P1P2PPP/R2Q1RK1 w - - 0 14',
    playerTurn: 'white',
    theme: 'En Kötü Taş',
    imbalances: {
      minorPieces: 'Beyazın d3 fili harika bir diyagonale bakıyor. Ancak a1 kalesi ve d1 veziri henüz oyuna bağlanmadı.',
      pawnStructure: 'Merkez kapalı; kanat operasyonları için alan var.',
      spaceAndFiles: 'd-hattı ve c-hattı yarı açık.',
      kingSafety: 'Beyaz rok attı, siyah vezir kanadında aktif.',
      worstPiece: {
        piece: 'Beyaz Kale (a1)',
        square: 'a1',
        advice: 'a1 kalesi hiçbir göreve sahip değil. Rc1 hamlesi ile yarı açık c-hattına gelip siyahın vezirine ve c6 atına baskı kurmalıdır.'
      },
      recommendedPlan: 'Rc1 ile kaleyi oyuna sokun, ardından Na4 ile siyah veziri kovarak tempo kazanın.'
    },
    candidateMoves: [
      {
        san: 'Rc1',
        quality: 'best',
        title: 'Büyükusta Düşüncesi: En Kötü Taşını Uyandır',
        explanation: 'a1 kalesini yarı açık c-hattına yerleştirerek c6 atı ve b6 veziri üzerindeki dolaylı baskıyı başlatır.',
        strategicRating: 95
      },
      {
        san: 'Na4',
        quality: 'playable',
        title: 'Vezire Saldırı',
        explanation: 'Veziri zorlar ancak Rc1 hazırlığı olmadan at kenarda kalabilir.',
        strategicRating: 78
      },
      {
        san: 'g3',
        quality: 'mistake',
        title: 'Zayıflatıcı Piyon Sürüşü',
        explanation: 'Şah kanadındaki beyaz kareleri (f3, h3) zayıflatan hiçbir amaca hizmet etmeyen bir hamle.',
        strategicRating: 20
      }
    ],
    masterLesson: 'Ne oynayacağınızı bilemediğinizde kendinize şu soruyu sorun: "Şu an tahtadaki EN KÖTÜ, EN İŞE YARAMAZ taşım hangisi?" Onu bulun ve daha iyi bir kareye aktarın!',
    arrows: [['a1', 'c1', 'green'], ['c1', 'c6', 'blue']]
  },
  {
    id: 'greek-gift',
    title: 'Yunan Hediyesi (Bxh7+ Fil Fedası)',
    subtitle: 'Savunmasız Şah Kanadı Hücumu',
    fen: 'r1bq1rk1/pp1n1ppp/2pbp3/3pP3/3P4/2NB1N2/PP3PPP/R1BQ1RK1 w - - 0 10',
    playerTurn: 'white',
    theme: 'Şah Saldırısı',
    imbalances: {
      minorPieces: 'Beyaz d3 fili, f3 atı ve d1 veziri şah kanadına tam koordine bakıyor. Siyahın f6 atı olmadığı için h7 piyonu savunmasız.',
      pawnStructure: 'e5 piyonu siyahın f6 karesine at getirmesini engelliyor (h7 savunmasını kesen kilit çivi!).',
      spaceAndFiles: 'h1-h7 diyagonali ve c1-h6 çaprazı beyazın hızlı hücumuna tamamen açık.',
      kingSafety: 'Siyah şah rok atmış olsa da savunma taşı (Nf6) yokluğunda klasik fedaya açık.',
      worstPiece: {
        piece: 'Beyaz Vezir (d1) & At (f3)',
        square: 'f3',
        advice: 'Bxh7+ fedasının ardından Ng5+ ve Qh5 ile doğrudan şah mat ağı kurulmalıdır.'
      },
      recommendedPlan: '1. Bxh7+ Kxh7 2. Ng5+ ile şah kanadına inin ve Qh5 devamını hazırlayın!'
    },
    candidateMoves: [
      {
        san: 'Bxh7+',
        quality: 'best',
        title: 'Klasik Yunan Hediyesi Fedası!',
        explanation: 'Kxh7 sonrası Ng5+ ve Qh5 ile beyaz durdurulamaz bir şah mat veya ağır materyal kazancı hücumu başlatır.',
        strategicRating: 99
      },
      {
        san: 'Qe2',
        quality: 'playable',
        title: 'Temkinli Hazırlık',
        explanation: 'Güvenli ancak siyaha ...f5 veya ...Re8 ile h7 savunması kurma zamanı tanır.',
        strategicRating: 68
      },
      {
        san: 'a3',
        quality: 'mistake',
        title: 'Tempo Kaybı',
        explanation: 'Hücum fırsatı varken vezir kanadında pasif beklemek şah kanadı girişimini çöpe atar.',
        strategicRating: 25
      }
    ],
    masterLesson: 'e5 piyonunuz var, rakibin f6 atı yoksa ve filiniz d3, atınız f3, veziriniz d1/h5 çizgisindeyse — Bxh7+ Yunan Hediyesi neredeyse daima kazandırır!',
    arrows: [['d3', 'h7', 'green'], ['f3', 'g5', 'blue'], ['d1', 'h5', 'red']]
  },
  {
    id: 'bishop-pair-open',
    title: 'Çift Fil Üstünlüğü ve Merkezi Açma',
    subtitle: 'Açık Diyagonallerin Gücü',
    fen: 'r2q1rk1/pp2bppp/2n1pn2/2pp4/3P4/2PBPN2/PP1N1PPP/R1BQR1K1 w - - 0 10',
    playerTurn: 'white',
    theme: 'Piyon Yapıları',
    imbalances: {
      minorPieces: 'Merkezdeki gerilim açıldığında çapraz çalışan filler ve kaleler büyük menzil kazanır.',
      pawnStructure: 'Beyaz e3-c3 zincirini d4 merkeziyle destekliyor; siyah ise c5 baskısı kuruyor.',
      spaceAndFiles: 'e4 sürüşü e1 kalesini ve c1 filini tek hamlede oyuna açar.',
      kingSafety: 'Her iki şah rok altında güvende; mücadele merkez kontrolü üzerinden ilerler.',
      worstPiece: {
        piece: 'Beyaz Fil (c1) & Kale (e1)',
        square: 'c1',
        advice: 'c1 fili kendi e3 piyonunun arkasında kapalı kalmış durumda; e4 piyon yarması yolunu açar!'
      },
      recommendedPlan: 'e4 sürüşüyle merkezi kırın; e-dikeyinde kaleyi ve c1-h6 diyagonalinde fili aktifleştirin.'
    },
    candidateMoves: [
      {
        san: 'e4',
        quality: 'best',
        title: 'Doğru Merkez Yarması!',
        explanation: 'Kötü c1 filini canlandırır, e1 kalesini aktif hatta bağlar ve d5/c5 gerginliğini beyazın lehine çözer.',
        strategicRating: 96
      },
      {
        san: 'dxc5',
        quality: 'playable',
        title: 'Piyon Değişimi',
        explanation: 'Oynanabilir ancak siyah e7 filini tek tempoda c5 karesine geliştirmiş olur.',
        strategicRating: 70
      },
      {
        san: 'h3',
        quality: 'mistake',
        title: 'Gereksiz Yavaşlık',
        explanation: 'Merkezi açma zamanı gelmişken kenar piyon sürmek siyaha ...c4 veya ...Qc7 ile rahatlama şansı verir.',
        strategicRating: 40
      }
    ],
    masterLesson: 'Fillerinizin ve kalelerinizin önü kendi piyonlarınızla kapalıysa en öncelikli göreviniz merkezde piyon kırışı (e4 veya c4) hazırlamaktır.',
    arrows: [['e3', 'e4', 'green'], ['c1', 'g5', 'blue']]
  },
  {
    id: 'iqp-blockade',
    title: 'İzole Piyon Ablukası: d5 Karesini Kilitle!',
    subtitle: 'Nimzowitsch Blokaj Prensibi',
    fen: 'r1bq1rk1/pp3ppp/2n1pn2/8/3P4/2NB1N2/PP3PPP/R1BQ1RK1 b - - 0 10',
    playerTurn: 'black',
    theme: 'En Kötü Taş',
    imbalances: {
      minorPieces: 'Siyah taş değişimlerine giderse ve d5 karesine bir blokaj taşı koyarsa beyazın d4 piyonu zayıflığa dönüşür.',
      pawnStructure: 'Beyazın d4 piyonu izole (yan dikeylerde koruyucu piyon yok). İlerlerse dinamik güç, durdurulursa kronik hedeftir.',
      spaceAndFiles: 'd5 karesi siyah için kusursuz bir blokaj ve ileri karakol noktasıdır.',
      kingSafety: 'Siyah kısa rok atmış, merkezi sağlamlaştırmak için d5 karesini hemen kilitlemelidir.',
      worstPiece: {
        piece: 'Siyah Fil (c8)',
        square: 'c8',
        advice: 'Önce d4 piyonunun ilerlemesini (d5 sürüşünü) ...Nd5 ile durdurun, ardından fili b6-b7 çaprazına açın.'
      },
      recommendedPlan: '...Nd5 ile d4 piyonunu ablukaya alın; taşları azaltıp d4 hedefini oyuna düşürün.'
    },
    candidateMoves: [
      {
        san: 'Nd5',
        quality: 'best',
        title: 'Kitabına Uygun Blokaj!',
        explanation: 'İzole piyonun tam önündeki d5 karesini atla kilitler, beyazın d4-d5 yarmasını engeller ve c3 atına baskı kurar.',
        strategicRating: 98
      },
      {
        san: 'b6',
        quality: 'playable',
        title: 'Fianchetto Hazırlığı',
        explanation: 'Mantıklı bir gelişim ama beyaza önce d5 veya Bg5 ile hızlı atak imkanı bırakabilir.',
        strategicRating: 76
      },
      {
        san: 'h6',
        quality: 'mistake',
        title: 'Zayıflatıcı Tempo Kaybı',
        explanation: 'Merkezdeki kritik d5 kontrolünü almadan şah kanadını gereksiz zayıflatır.',
        strategicRating: 35
      }
    ],
    masterLesson: 'Rakibin izole bir piyonu varsa altın kural şudur: Piyonun tam önündeki kareye mutlaka bir at veya taş koyarak ilerlemesini (blokaj) durdurun!',
    arrows: [['f6', 'd5', 'green'], ['d5', 'c3', 'blue']]
  }
];
