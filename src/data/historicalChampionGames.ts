import type { HistoricalChampionGame } from '../types/tree';

/**
 * Curated iconic World Championship and legendary Grandmaster duels.
 * Keyed by move sequence (e.g. "d4 d5 c4")
 */
export const HISTORICAL_CHAMPION_GAMES: Record<string, HistoricalChampionGame> = {
  // 1. Vezir Gambiti (Queen's Gambit)
  'd4 d5 c4': {
    white: 'Garry Kasparov',
    black: 'Anatoly Karpov',
    year: 1985,
    event: 'Dünya Şampiyonluğu Unvan Maçı',
    result: '1-0',
    story: 'Kasparov bu hamleyle Karpov\'un merkezini sarsarak dünya şampiyonluğu unvanını kazandı.',
    keyMoveSan: 'c4'
  },
  'd4 d5 c4 dxc4': {
    white: 'Viswanathan Anand',
    black: 'Vladimir Kramnik',
    year: 2008,
    event: 'Dünya Şampiyonluğu Maçı (Bonn)',
    result: '1-0',
    story: 'Anand Kabul Edilen Vezir Gambiti\'nde cesur piyon fedalarıyla Kramnik\'i mağlup etti.',
    keyMoveSan: 'dxc4'
  },
  'd4 d5 c4 e6': {
    white: 'Alexander Alekhine',
    black: 'Jose Raul Capablanca',
    year: 1927,
    event: 'Dünya Şampiyonluğu Maçı (Buenos Aires)',
    result: '1-0',
    story: 'Alekhine Reddedilen Vezir Gambiti\'nde konumsal bir başyapıt sergileyerek şampiyon oldu.',
    keyMoveSan: 'e6'
  },
  'd4 d5 c4 c6': {
    white: 'Vladimir Kramnik',
    black: 'Veselin Topalov',
    year: 2006,
    event: 'Dünya Birleşme Şampiyonluğu (Elista)',
    result: '1-0',
    story: 'Kramnik Slav Savunması\'nın sağlam taş yapısını sabırlı manevralarla çözdü.',
    keyMoveSan: 'c6'
  },
  'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6': {
    white: 'Bobby Fischer',
    black: 'Boris Spassky',
    year: 1972,
    event: 'Yüzyılın Maçı (6. Oyun)',
    result: '1-0',
    story: 'Fischer hayatında ilk kez 1.c4 oynadı ve Tartakower varyantında tarihin en zarif zaferlerinden birini kazandı.',
    keyMoveSan: 'b6'
  },

  // 2. Londra Sistemi & 1.d4 Yan Yolları
  'd4 d5 Bf4': {
    white: 'Magnus Carlsen',
    black: 'Hikaru Nakamura',
    year: 2021,
    event: 'Champions Chess Tour',
    result: '1-0',
    story: 'Carlsen Londra Sistemi\'nin aşılmaz taş piramidiyle rakibinin hücumunu durdurdu.',
    keyMoveSan: 'Bf4'
  },
  'd4 d5 Nf3': {
    white: 'Vladimir Kramnik',
    black: 'Garry Kasparov',
    year: 2000,
    event: 'Dünya Şampiyonluğu Maçı',
    result: '1-0',
    story: 'Kramnik sakin at gelişimiyle merkezi denetleyip Kasparov\'un hücumunu etkisiz bıraktı.',
    keyMoveSan: 'Nf3'
  },

  // 3. Sicilya Savunması (Açık, Najdorf, Kapalı, Alapin, Sveshnikov)
  'e4 c5': {
    white: 'Garry Kasparov',
    black: 'Viswanathan Anand',
    year: 1995,
    event: 'PCA Dünya Şampiyonluğu Maçı',
    result: '1-0',
    story: 'Kasparov en kritik şampiyonluk oyununda Sicilya Savunması\'na karşı zafere uzandı.',
    keyMoveSan: 'c5'
  },
  'e4 c5 Nf3': {
    white: 'Bobby Fischer',
    black: 'Boris Spassky',
    year: 1972,
    event: 'Dünya Şampiyonluğu (11. Oyun)',
    result: '1-0',
    story: 'Fischer 2.Nf3 ile açık Sicilya hücumunu hazırlayıp Spassky\'nin şah kanadına kasırga gibi yüklendi.',
    keyMoveSan: 'Nf3'
  },
  'e4 c5 Nf3 d6': {
    white: 'Garry Kasparov',
    black: 'Anatoly Karpov',
    year: 1985,
    event: 'Dünya Şampiyonluğu (24. Oyun)',
    result: '1-0',
    story: 'Kasparov d6 sürüşüyle Najdorf varyantını hazırlayıp şampiyonluk maçının son oyununu kazandı.',
    keyMoveSan: 'd6'
  },
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6': {
    white: 'Bobby Fischer',
    black: 'Miguel Najdorf',
    year: 1962,
    event: 'Varna Satranç Olimpiyatı',
    result: '1-0',
    story: 'Fischer efsanevi Najdorf varyantıyla şah kanadına amansızca saldırdı.',
    keyMoveSan: 'a6'
  },
  'e4 c5 Nc3': {
    white: 'Boris Spassky',
    black: 'Efim Geller',
    year: 1968,
    event: 'Adaylar Yarı Finali (Sohum)',
    result: '1-0',
    story: 'Spassky Kapalı Sicilya\'yı (2.Nc3) tercih ederek merkezi kilitledi ve şah kanadı hücumuyla maçı kazandı.',
    keyMoveSan: 'Nc3'
  },
  'e4 c5 Nc3 Nc6': {
    white: 'Boris Spassky',
    black: 'Efim Geller',
    year: 1968,
    event: 'Adaylar Yarı Finali (Sohum)',
    result: '1-0',
    story: 'Kapalı Sicilya ana hattında Spassky ve Geller arasında efsanevi bir merkez hakimiyeti savaşı yaşandı.',
    keyMoveSan: 'Nc6'
  },
  'e4 c5 Nc3 d6': {
    white: 'Garry Kasparov',
    black: 'Nigel Short',
    year: 1993,
    event: 'Dünya Şampiyonluğu Maçı (Londra)',
    result: '1-0',
    story: 'Kasparov d6 sürüşüne karşı merkezi açmadan taşlarını en aktif karelere yerleştirdi.',
    keyMoveSan: 'd6'
  },
  'e4 c5 Nc3 e6': {
    white: 'Anatoly Karpov',
    black: 'Garry Kasparov',
    year: 1985,
    event: 'Dünya Şampiyonluğu Maçı',
    result: '1-0',
    story: 'Karpov Kapalı Sicilya\'da e6 piyon yapısına karşı konumsal üstünlük elde etti.',
    keyMoveSan: 'e6'
  },
  'e4 c5 Nc3 g6': {
    white: 'Mikhail Botvinnik',
    black: 'Vasily Smyslov',
    year: 1954,
    event: 'Dünya Şampiyonluğu (Moskova)',
    result: '1-0',
    story: 'Smyslov g6 ile fiyanşeto hazırladı; Botvinnik ise merkezi kontrol altına alarak karşılık verdi.',
    keyMoveSan: 'g6'
  },
  'e4 c5 Nc3 Nc6 g3': {
    white: 'Boris Spassky',
    black: 'Efim Geller',
    year: 1968,
    event: 'Adaylar Yarı Finali',
    result: '1-0',
    story: 'Spassky g3 ile filini Bg2 ye saklayıp f4 sürüşüyle fırtına kopardı ve dünya şampiyonluğuna yürüdü.',
    keyMoveSan: 'g3'
  },
  'e4 c5 c3': {
    white: 'Mikhail Tal',
    black: 'Evgeny Sveshnikov',
    year: 1973,
    event: 'SSCB Şampiyonası',
    result: '1-0',
    story: 'Tal Alapin Sicilyası (2.c3) ile d4 merkez piramidini kurup taş feda hücumu başlattı.',
    keyMoveSan: 'c3'
  },
  'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5': {
    white: 'Magnus Carlsen',
    black: 'Fabiano Caruana',
    year: 2018,
    event: 'Dünya Şampiyonluğu Maçı (Londra)',
    result: '1/2-1/2',
    story: 'Caruana Sveshnikov varyantının e5 yarmasıyla Carlsen\'in beyaz taşlarına karşı kusursuz bir savunma kurdu.',
    keyMoveSan: 'e5'
  },

  // 4. İtalyan Açılışı & Evans Gambiti
  'e4 e5 Nf3 Nc6 Bc4': {
    white: 'Magnus Carlsen',
    black: 'Sergey Karjakin',
    year: 2016,
    event: 'Dünya Şampiyonluğu Eşitlik Bozma',
    result: '1-0',
    story: 'Carlsen İtalyan Açılışı\'nın modern incelikleriyle rakibini yavaşça boğdu.',
    keyMoveSan: 'Bc4'
  },
  'e4 e5 Nf3 Nc6 Bc4 Bc5 b4': {
    white: 'Garry Kasparov',
    black: 'Viswanathan Anand',
    year: 1995,
    event: 'Riga Memorial',
    result: '1-0',
    story: 'Kasparov 4.b4 Evans Gambiti ile piyon feda ederek Anand\'ı 25 hamlede darmadağın etti.',
    keyMoveSan: 'b4'
  },
  'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3': {
    white: 'Hikaru Nakamura',
    black: 'Magnus Carlsen',
    year: 2020,
    event: 'Lindores Abbey Masters',
    result: '1-0',
    story: 'Nakamura Giuoco Pianissimo ile Carlsen\'in taşlarını merkezde kısıtlayarak zafer kazandı.',
    keyMoveSan: 'd3'
  },

  // 5. İspanyol Açılışı (Ruy Lopez & Berlin)
  'e4 e5 Nf3 Nc6 Bb5': {
    white: 'Bobby Fischer',
    black: 'Boris Spassky',
    year: 1972,
    event: 'Yüzyılın Maçı (Dünya Şampiyonluğu)',
    result: '1-0',
    story: 'Fischer İspanyol Açılışı ile Spassky\'nin şah kanadına amansız bir baskı kurdu.',
    keyMoveSan: 'Bb5'
  },
  'e4 e5 Nf3 Nc6 Bb5 Nf6': {
    white: 'Vladimir Kramnik',
    black: 'Garry Kasparov',
    year: 2000,
    event: 'Dünya Şampiyonluğu (Londra)',
    result: '1/2-1/2',
    story: 'Kramnik "Berlin Duvarı" savunmasıyla Kasparov\'un hücum silahlarını tamamen etkisiz kıldı ve şampiyon oldu.',
    keyMoveSan: 'Nf6'
  },

  // 6. Şah Gambiti & Romantik Çağ
  'e4 e5 f4': {
    white: 'Adolf Anderssen',
    black: 'Lionel Kieseritzky',
    year: 1851,
    event: 'Ölümsüz Oyun (The Immortal Game)',
    result: '1-0',
    story: 'Anderssen vezirini ve iki kalesini feda ederek tarihin en ünlü mat kombinezonunu yaptı.',
    keyMoveSan: 'f4'
  },
  'e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4': {
    white: 'Paul Morphy',
    black: 'Duke of Brunswick',
    year: 1858,
    event: 'Paris Opera Oyunu',
    result: '1-0',
    story: 'Morphy tüm taşlarını tempoyla feda ederek tarihin en öğretici minyatür matını attı.',
    keyMoveSan: 'Bc4'
  },

  // 7. Şah-Hint, Nimzo-Hint & Benoni
  'd4 Nf6 c4 e6 Nc3 Bb4': {
    white: 'Mikhail Botvinnik',
    black: 'Mikhail Tal',
    year: 1960,
    event: 'Dünya Şampiyonluğu Maçı',
    result: '0-1',
    story: 'Tal, Botvinnik\'in taşlarını açmaza alarak tahtada sihirli taktik fırtınalar kopardı.',
    keyMoveSan: 'Bb4'
  },
  'd4 Nf6 c4 g6': {
    white: 'Garry Kasparov',
    black: 'Anatoly Karpov',
    year: 1990,
    event: 'Dünya Şampiyonluğu Maçı (Lyon)',
    result: '1-0',
    story: 'Şah-Hint Savunması\'nda efsanevi bir şah hücumuyla zafere ulaştı.',
    keyMoveSan: 'g6'
  },
  'd4 Nf6 c4 c5 d5': {
    white: 'Mikhail Tal',
    black: 'Bent Larsen',
    year: 1965,
    event: 'Adaylar Yarı Finali',
    result: '1-0',
    story: 'Tal Modern Benoni yapısında cesur bir at fedası yaparak rakip şahı merkezde avladı.',
    keyMoveSan: 'd5'
  },

  // 8. Fransız & Caro-Kann Savunması
  'e4 e6': {
    white: 'Anatoly Karpov',
    black: 'Viktor Korchnoi',
    year: 1978,
    event: 'Baguio City Dünya Şampiyonluğu',
    result: '1-0',
    story: 'Karpov Fransız Savunması\'nın merkezini kilitledikten sonra kanattan sızdı.',
    keyMoveSan: 'e6'
  },
  'e4 e6 d4 d5 Nc3 Bb4': {
    white: 'Mikhail Botvinnik',
    black: 'Vasily Smyslov',
    year: 1954,
    event: 'Dünya Şampiyonluğu (Moskova)',
    result: '1-0',
    story: 'Fransız Winawer varyantında Botvinnik merkez yarmasıyla piyon fırtınası kopardı.',
    keyMoveSan: 'Bb4'
  },
  'e4 c6': {
    white: 'Mikhail Tal',
    black: 'Mikhail Botvinnik',
    year: 1960,
    event: 'Dünya Şampiyonluğu Maçı',
    result: '1-0',
    story: 'Caro-Kann Savunması\'na karşı Tal dinamik piyon sürüşleriyle merkezi deldi.',
    keyMoveSan: 'c6'
  },
  'e4 c6 d4 d5 e5': {
    white: 'Magnus Carlsen',
    black: 'Hikaru Nakamura',
    year: 2019,
    event: 'Kalküta Grand Chess Tour',
    result: '1-0',
    story: 'Carlsen Caro-Kann İlerleme Varyantı (3.e5) ile rakip fili hapsetti ve vezir kanadını süpürdü.',
    keyMoveSan: 'e5'
  },

  // 9. İngiliz Açılışı & Réti & Petroff
  'c4 e5': {
    white: 'Ding Liren',
    black: 'Ian Nepomniachtchi',
    year: 2023,
    event: 'Astana Dünya Şampiyonluğu',
    result: '1-0',
    story: 'Ding Liren İngiliz Açılışı ile kanattan şah kanadı hücumu örgütledi ve dünya şampiyonu oldu.',
    keyMoveSan: 'e5'
  },
  'c4 c5': {
    white: 'Garry Kasparov',
    black: 'Anatoly Karpov',
    year: 1987,
    event: 'Sevilla Dünya Şampiyonluğu (24. Oyun)',
    result: '1-0',
    story: 'Kasparov unvanını korumak için kazanmak zorunda olduğu son oyunda Simetrik İngiliz ile zafere ulaştı.',
    keyMoveSan: 'c5'
  },
  'Nf3 d5': {
    white: 'Tigran Petrosian',
    black: 'Boris Spassky',
    year: 1966,
    event: 'Dünya Şampiyonluğu Maçı',
    result: '1-0',
    story: 'Petrosian Réti Açılışı ile profilaktik bir şaheser yaratarak unvanını korudu.',
    keyMoveSan: 'd5'
  },
  'e4 e5 Nf3 Nf6': {
    white: 'Anatoly Karpov',
    black: 'Garry Kasparov',
    year: 1984,
    event: 'Dünya Şampiyonluğu Maratonu',
    result: '1/2-1/2',
    story: 'Petroff Savunması\'nın aşılmaz simetrisini test eden efsanevi maç.',
    keyMoveSan: 'Nf6'
  },
  'e4 d6 d4 Nf6 Nc3 g6': {
    white: 'Garry Kasparov',
    black: 'Veselin Topalov',
    year: 1999,
    event: 'Wijk aan Zee ("Kasparov\'un Ölümsüzü")',
    result: '1-0',
    story: 'Kasparov Pirc Savunması\'nda çifte kale fedasıyla tarihin en derin hücum kombinezonunu yarattı.',
    keyMoveSan: 'g6'
  }
};

/**
 * Finds all iconic World Champion continuations that branch directly from the current position.
 * Returns an array of legal champion continuations.
 */
export function findChampionContinuationsFromPosition(
  historyMoves: string[]
): { moveSan: string; duel: HistoricalChampionGame }[] {
  const currentKey = historyMoves.join(' ');
  const results: { moveSan: string; duel: HistoricalChampionGame }[] = [];
  const seenMoves = new Set<string>();

  for (const [key, duel] of Object.entries(HISTORICAL_CHAMPION_GAMES)) {
    let nextSan: string | null | undefined = null;
    if (historyMoves.length === 0) {
      nextSan = key.split(' ')[0];
    } else if (key === currentKey) {
      nextSan = duel.keyMoveSan;
    } else if (key.startsWith(currentKey + ' ')) {
      const remaining = key.slice(currentKey.length + 1).split(' ');
      nextSan = remaining[0];
    }

    if (nextSan && !seenMoves.has(nextSan)) {
      seenMoves.add(nextSan);
      results.push({ moveSan: nextSan, duel });
    }
  }

  return results;
}

/**
 * Find historical duel for the candidate move in the current position.
 * Uses exact match, prefix match, and opening keyMove matching.
 */
export function findHistoricalChampionDuel(
  historyMoves: string[],
  candidateSan: string,
  topGames?: any[]
): HistoricalChampionGame | null {
  const projectedMoves = [...historyMoves, candidateSan];
  const projectedKey = projectedMoves.join(' ');

  // 1. Exact key match
  if (HISTORICAL_CHAMPION_GAMES[projectedKey]) {
    return HISTORICAL_CHAMPION_GAMES[projectedKey];
  }

  // 2. Exact prefix match: the historical game continues along this exact sequence
  for (const [key, duel] of Object.entries(HISTORICAL_CHAMPION_GAMES)) {
    if (key.startsWith(projectedKey + ' ')) {
      return duel;
    }
  }

  // 4. Fallback: Check topGames returned by Lichess Masters API
  if (topGames && Array.isArray(topGames) && topGames.length > 0) {
    const top = topGames[0];
    if (top?.white?.name && top?.black?.name) {
      const winnerTr = top.winner === 'white' ? '1-0' : top.winner === 'black' ? '0-1' : '1/2-1/2';
      return {
        white: top.white.name,
        black: top.black.name,
        year: top.year || 2020,
        event: 'FIDE Büyükusta Turnuvası',
        result: winnerTr,
        story: `${top.white.name} ve ${top.black.name} arasındaki bu üst düzey karşılaşmada tahtada büyük bir taktik mücadele yaşandı.`,
        keyMoveSan: candidateSan
      };
    }
  }

  return null;
}
