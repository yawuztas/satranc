import { Chess } from 'chess.js';
import allOpeningsRaw from '../data/allOpenings.json';
import type { CounterOpeningOption } from '../types/tree';
import type { OpeningStatsResponse } from '../services/lichessService';
import { translateOpeningName } from '../data/openingsDatabase';

interface EcoOpening {
  eco: string;
  name: string;
  pgn: string;
  uci: string;
}

interface ContinuationStat {
  op: EcoOpening;
  count: number;
}

const allOpenings: EcoOpening[] = allOpeningsRaw as EcoOpening[];

// Pre-indexed prefix continuation map for all 3,820 official ECO openings
const prefixMap = new Map<string, Map<string, ContinuationStat>>();
const exactMap = new Map<string, EcoOpening>();

function parsePgnMoves(pgn: string): string[] {
  return pgn.replace(/\d+\.\s*/g, '').trim().split(/\s+/).filter(Boolean);
}

// Initialize lookup index once
for (const op of allOpenings) {
  if (!op.pgn || op.eco === 'eco') continue;
  const moves = parsePgnMoves(op.pgn);
  if (moves.length === 0) continue;

  const key = moves.join(' ');
  exactMap.set(key, op);

  for (let i = 0; i < moves.length; i++) {
    const pfx = moves.slice(0, i).join(' ');
    const nextMove = moves[i];
    if (!prefixMap.has(pfx)) prefixMap.set(pfx, new Map());
    const m = prefixMap.get(pfx)!;
    if (!m.has(nextMove)) {
      m.set(nextMove, { op, count: 1 });
    } else {
      m.get(nextMove)!.count++;
    }
  }
}

/**
 * Common strategic attack objectives for well-known moves and opening families
 */
const ATTACK_OBJECTIVES: Record<string, string> = {
  // 1st moves
  'e4': 'Merkezi piyonla ele geçirip açık hatlar ve hızlı taş gelişimi hedefler.',
  'd4': 'Vezir tarafından korunan sağlam bir merkez kurarak rakibin e5 sürüşünü kısıtlar.',
  'c4': 'İngiliz Açılışı: d5 karesine kanattan baskı yaparak esnek bir merkez kontrolü hedefler.',
  'Nf3': 'Réti / Esnek Başlangıç: Rakibin niyetini görüp esnek bir merkez ve şah kanadı rok hazırlığı amaçlar.',
  'f4': 'Bird Açılışı: e5 karesini kanattan kontrol edip şah kanadında erken hücum arar.',
  // 2nd moves White
  'e4 e5 Nf3': 'e5 merkez piyonuna doğrudan hücum başlatır ve hızlı rok hazırlar.',
  'e4 e5 Bc4': 'Fil Açılışı: f7 zayıf noktasına doğrudan nişan alır.',
  'e4 e5 Nc3': 'Viyana Oyunu: d5 karesini tutar ve f4 sürüşüyle karşı hücuma hazırlanır.',
  'e4 e5 d4': 'Merkez Oyunu: Merkezi hemen patlatıp açık hat açmak ister.',
  'e4 e5 f4': 'Şah Gambiti: f-hattını açarak vahşi bir şah kanadı hücumu başlatır.',
  // Italian / Spanish / Scotch moves
  'e4 e5 Nf3 Nc6 Bc4': 'İtalyan Açılışı: Rakibin en zayıf noktası olan f7 karesine göz diker ve hızlı rok hazırlar.',
  'e4 e5 Nf3 Nc6 Bb5': 'İspanyol Açılışı (Ruy Lopez): c6 atını açmaza alarak dolaylı yoldan e5 piyonunun savunmasını çökertmeyi hedefler.',
  'e4 e5 Nf3 Nc6 d4': 'İskoç Açılışı: Merkezi hemen patlatıp açık hatlardan taşları oyuna sokmayı amaçlar.',
  'e4 e5 Nf3 Nc6 c3': 'Ponziani Açılışı: d4 sürüşünü piyonla destekleyerek devasa bir piyon merkezi kurmayı planlar.',
  // Queen's Gambit
  'd4 d5 c4': 'Vezir Gambiti: d5 piyonunu saptırıp e4 sürerek tahtanın tüm merkezine el koymayı hedefler.',
  'd4 Nf6 c4': 'Hint Savunmalarına karşı alan üstünlüğü ve d5 kontrolü kurar.',
  'd4 d5 Nf3': 'Londra / Zukertort: Sağlam ve risksiz bir konumsal gelişim sağlar.',
  'd4 d5 Bf4': 'Londra Sistemi: Siyahın e5 sürüşünü yasaklar ve granit gibi sağlam bir taş piramidi kurar.',
};

/**
 * Pedagogical counter-mechanisms explaining how an opponent's opening neutralizes the attack
 */
function explainHowItCounters(san: string, openingName: string): { howItCounters: string; badge: CounterOpeningOption['badge'] } {
  const lower = openingName.toLowerCase();

  // Two Knights
  if (san === 'Nf6' && (lower.includes('two knights') || lower.includes('iki at') || lower.includes('scotch gambit'))) {
    return {
      howItCounters: 'Karşı Taarruz ile Kesme: Beyazın f7 hücumunu pasif savunmak yerine doğrudan e4 piyonuna saldırarak beyazı kendi savunmasıyla meşgul eder.',
      badge: '⚔️ Karşı Taarruz',
    };
  }

  // Giuoco Piano
  if (san === 'Bc5' && (lower.includes('giuoco') || lower.includes('italian') || lower.includes('italyan'))) {
    return {
      howItCounters: 'Simetrik Dengeleme: Merkez kareleri tutarak beyazın d4 ile merkezi patlatmasını kısıtlar ve f2 karesine karşı tehdit koyar.',
      badge: '👑 Simetrik Denge',
    };
  }

  // Hungarian / Benima
  if (san === 'Be7' && (lower.includes('hungarian') || lower.includes('macar') || lower.includes('benima'))) {
    return {
      howItCounters: 'Katı Duvar / Profilaksi: f7 karesindeki taktik delikleri kapatır, beyazın Ng5 tuzaklarını ve hücumunu tamamen kurutur.',
      badge: '🧱 Duvar / Kilit',
    };
  }

  // Berlin Defense
  if (san === 'Nf6' && (lower.includes('berlin') || lower.includes('ruy lopez') || lower.includes('ispanyol'))) {
    return {
      howItCounters: 'Berlin Duvarı: İspanyol Açılışı\'nın tüm taktik sivriliklerini budar, oyunu beyazın hücum edemeyeceği dengeli bir oyun sonuna sürükler.',
      badge: '🧱 Duvar / Kilit',
    };
  }

  // Morphy Defense (3... a6)
  if (san === 'a6' && (lower.includes('morphy') || lower.includes('ruy lopez') || lower.includes('ispanyol'))) {
    return {
      howItCounters: 'Fili Sorgulama: Beyazın b5 filini hemen tehdit eder, fili kaçmaya zorlar ve vezir kanadında b5 ile alan kazanır.',
      badge: '⚔️ Karşı Taarruz',
    };
  }

  // Sicilian Defense
  if (san === 'c5') {
    return {
      howItCounters: 'Asimetrik Kanat Saldırısı: Beyazın e4 merkez üstünlüğüne karşı c-hattını açarak vezir kanadından keskin karşı hücum başlatır.',
      badge: '⚡ Asimetrik Yarma',
    };
  }

  // Caro-Kann Defense
  if (san === 'c6') {
    return {
      howItCounters: 'Granit Merkez Seddi: d5 piyon kalesi kurarak beyazın merkez baskısını emici, delinmesi çok güç sağlam bir savunma kurar.',
      badge: '🧱 Duvar / Kilit',
    };
  }

  // French Defense
  if (san === 'e6') {
    return {
      howItCounters: 'Piyon Zinciri Karşı Oyunu: d5 ile merkezi kilitler ve ardından ...c5 sürüşüyle beyazın d4 merkez piyonunun kökünü yıkar.',
      badge: '⚡ Asimetrik Yarma',
    };
  }

  // Scandinavian Defense
  if (san === 'd5') {
    return {
      howItCounters: 'Anında Merkez Yarması: İlk hamleden beyazın e4 merkez piyonunu doğrudan sorgulayarak merkezi patlatır.',
      badge: '⚔️ Karşı Taarruz',
    };
  }

  // Petrov Defense
  if (san === 'Nf6' && (lower.includes('petrov') || lower.includes('russian'))) {
    return {
      howItCounters: 'Simetrik Karşı Saldırı: e5 piyonunu savunmayı reddedip doğrudan beyazın e4 piyonuna saldırır ve oyunu sakinleştirir.',
      badge: '👑 Simetrik Denge',
    };
  }

  // King's Indian Defense
  if (lower.includes('king\'s indian') || lower.includes('şah-hint')) {
    return {
      howItCounters: 'Hipermodern Şah Kanadı Fırtınası: Beyazın merkezde alan kazanmasına izin verir, ardından ...f5 sürüşüyle doğrudan beyaz şaha hücum eder.',
      badge: '⚔️ Karşı Taarruz',
    };
  }

  // Slav Defense
  if (san === 'c6' && (lower.includes('slav') || lower.includes('vezir gambiti'))) {
    return {
      howItCounters: 'Granit Piyon Desteği: c8 filinin önünü kapatmadan d5 piyonunu sağlamlaştırarak beyazın Vezir Gambiti baskısını göğüsler.',
      badge: '🧱 Duvar / Kilit',
    };
  }

  // Nimzo-Indian / Queen's Indian
  if (lower.includes('nimzo') || lower.includes('bogo') || lower.includes('queen\'s indian')) {
    return {
      howItCounters: 'Taş Açmazı & Merkez Ablukası: c3 atını açmaza alarak beyazın e4 sürmesini engeller ve merkezi hafif taşlarla kontrol eder.',
      badge: '🧱 Duvar / Kilit',
    };
  }

  // Gambits
  if (lower.includes('gambit')) {
    return {
      howItCounters: 'Gelişim Fedası (Gambit): Piyon vererek taşlarını süratle oyuna sokar ve rakibin açılış koordinasyonunu bozar.',
      badge: '🎯 Taktik Gambit',
    };
  }

  // Generic fallback based on move characteristics
  if (san.includes('x') || san.includes('+')) {
    return {
      howItCounters: 'Taktik Karşı Hücum: Doğrudan materyal alarak veya şah çekerek rakibin hücum hazırlığını böler.',
      badge: '⚔️ Karşı Taarruz',
    };
  }

  if (san === 'O-O' || san === 'O-O-O') {
    return {
      howItCounters: 'Şah Emniyeti (Rok): Şahı merkezdeki tehlikeli taktik fırtınadan kaçırarak savunmayı güçlendirir.',
      badge: '🧱 Duvar / Kilit',
    };
  }

  return {
    howItCounters: `${openingName}: Teoriye uygun taş gelişimi yaparak rakip açılışın merkez baskısını dengeler.`,
    badge: '👑 Simetrik Denge',
  };
}

/**
 * Resolves the opening that candidateSan establishes
 */
export function resolveTargetOpening(
  historyMoves: string[],
  candidateSan: string
): { name: string; eco: string; attackObjective: string } {
  const fullMoves = [...historyMoves, candidateSan];
  const fullKey = fullMoves.join(' ');

  // 1. Check exact match in allOpenings.json
  const exact = exactMap.get(fullKey);
  let eco = exact?.eco || 'A00';
  let name = exact ? translateOpeningName(exact.name) : '';

  // 2. If not exact, find longest matching prefix
  if (!name) {
    for (let len = fullMoves.length; len > 0; len--) {
      const pfxKey = fullMoves.slice(0, len).join(' ');
      const match = exactMap.get(pfxKey);
      if (match) {
        eco = match.eco;
        name = translateOpeningName(match.name);
        break;
      }
    }
  }

  if (!name) {
    name = candidateSan.includes('O-O') ? 'Rok ve Şah Emniyeti' : `${candidateSan} Gelişim Hamlesi`;
  }

  // 3. Resolve Attack Objective
  let attackObjective = ATTACK_OBJECTIVES[fullKey] || '';
  if (!attackObjective) {
    // Try shorter prefix
    for (let len = fullMoves.length - 1; len >= 1; len--) {
      const pfx = fullMoves.slice(0, len).join(' ');
      if (ATTACK_OBJECTIVES[pfx]) {
        attackObjective = ATTACK_OBJECTIVES[pfx];
        break;
      }
    }
  }

  if (!attackObjective) {
    if (candidateSan === 'O-O' || candidateSan === 'O-O-O') {
      attackObjective = 'Şahı güvenli siperine çeker, kaleyi merkezdeki açık hatta bağlar.';
    } else if (['Nf3', 'Nc3', 'Nf6', 'Nc6'].includes(candidateSan)) {
      attackObjective = 'Hafif taşları merkeze geliştirerek kritik kareleri denetim altına alır.';
    } else if (['Bc4', 'Bb5', 'Bc5', 'Bb4', 'Bg5', 'Bg4'].includes(candidateSan)) {
      attackObjective = 'Fili aktif bir hatta yerleştirerek rakip zayıflıklara ve şah kanadına göz diker.';
    } else if (['d4', 'e4', 'd5', 'e5'].includes(candidateSan)) {
      attackObjective = 'Merkezi piyonla işgal edip alan üstünlüğü kurar.';
    } else {
      attackObjective = 'Taş koordinasyonunu artırarak rakip zayıf karelere hücum hazırlar.';
    }
  }

  return { name, eco, attackObjective };
}

/**
 * Resolves the opponent's counter-openings that stop or counter this candidate move
 */
export function resolveCounterOpenings(
  historyMoves: string[],
  candidateSan: string,
  masterStats?: OpeningStatsResponse | null
): CounterOpeningOption[] {
  const fullMoves = [...historyMoves, candidateSan];
  const fullKey = fullMoves.join(' ');
  const continuationMap = prefixMap.get(fullKey);

  const counterList: CounterOpeningOption[] = [];
  const addedSans = new Set<string>();

  if (continuationMap) {
    // Sort opponent continuations by popularity
    const sorted = Array.from(continuationMap.entries()).sort((a, b) => b[1].count - a[1].count);

    for (const [oppSan, stat] of sorted) {
      if (counterList.length >= 3) break;
      if (addedSans.has(oppSan)) continue;

      addedSans.add(oppSan);
      const opName = translateOpeningName(stat.op.name);
      const explanation = explainHowItCounters(oppSan, opName);

      // Check if we have Lichess win stats for this move
      const statMove = masterStats?.moves?.find((m) => m.san === oppSan);

      counterList.push({
        san: oppSan,
        name: opName,
        eco: stat.op.eco,
        howItCounters: explanation.howItCounters,
        badge: explanation.badge,
        winRateBlack: statMove?.blackWinRate,
        winRateWhite: statMove?.whiteWinRate,
        drawRate: statMove?.drawRate,
      });
    }
  }

  return counterList;
}

/**
 * Detects whether the current position contains an immediate fatal tactical threat
 * requiring an urgent, forced defense move (e.g. mate in 1 or undefended Queen under attack).
 */
export function detectImmediateThreat(chess: Chess): {
  hasUrgentThreat: boolean;
  threatDescription?: string;
  forcedSavingSans?: string[];
} {
  const turn = chess.turn();
  const oppColor = turn === 'w' ? 'b' : 'w';

  // 1. In check?
  if (chess.inCheck()) {
    const legalEscapes = chess.moves({ verbose: true });
    return {
      hasUrgentThreat: true,
      threatDescription: '🚨 ŞAH TEHDİDİ: Şahınız şu anda doğrudan tehdit altında! Zorunlu kurtarma hamlesi yapılmalıdır.',
      forcedSavingSans: legalEscapes.map((m) => m.san),
    };
  }

  // 2. Simulated Null-Move: If opponent were allowed to move right now, could they mate in 1?
  const testOpponentTurn = new Chess(chess.fen());
  const fenTokens = testOpponentTurn.fen().split(' ');
  fenTokens[1] = oppColor; // switch turn to opponent
  fenTokens[3] = '-';

  try {
    testOpponentTurn.load(fenTokens.join(' '));
    const oppMoves = testOpponentTurn.moves({ verbose: true });
    const mateMove = oppMoves.find((m) => m.san.includes('#'));
    if (mateMove) {
      return {
        hasUrgentThreat: true,
        threatDescription: `🚨 TEK HAMLEDE MAT TEHDİDİ: Rakip bir sonraki hamlede ${mateMove.san} oynayarak doğrudan mat etmek istiyor! Bu matı kesmek zorunludur.`,
      };
    }
  } catch {
    // If invalid FEN due to existing check, ignore
  }

  return { hasUrgentThreat: false };
}
