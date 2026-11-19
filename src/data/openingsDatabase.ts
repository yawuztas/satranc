import allOpeningsRaw from './allOpenings.json';
import { Chess } from 'chess.js';
import type { CandidateMove } from '../types/tree';
import { MAX_CANDIDATE_CHOICES } from '../types/lesson';
import { getCandidateColor } from './openingTreeData';

export interface EcoOpening {
  eco: string;
  name: string;
  pgn: string;
  uci: string;
}

export interface ContinuationStat {
  op: EcoOpening;
  count: number; // Number of GM master variations using this move
  nameTr: string;
}

const allOpenings: EcoOpening[] = allOpeningsRaw as EcoOpening[];

function parsePgnMoves(pgn: string): string[] {
  return pgn.replace(/\d+\.\s*/g, '').trim().split(/\s+/).filter(Boolean);
}

// Translate common English opening and variation names into rich Turkish
export function translateOpeningName(name: string): string {
  return name
    .replace(/\bKing's Gambit Declined\b/gi, 'Reddedilen Şah Gambiti')
    .replace(/\bKing's Gambit Accepted\b/gi, 'Kabul Edilen Şah Gambiti')
    .replace(/\bKing's Gambit\b/gi, 'Şah Gambiti')
    .replace(/\bQueen's Gambit Declined\b/gi, 'Reddedilen Vezir Gambiti')
    .replace(/\bQueen's Gambit Accepted\b/gi, 'Kabul Edilen Vezir Gambiti')
    .replace(/\bQueen's Gambit\b/gi, 'Vezir Gambiti')
    .replace(/\bKing's Pawn Game\b/gi, 'Şah Piyonu Oyunu')
    .replace(/\bQueen's Pawn Game\b/gi, 'Vezir Piyonu Oyunu')
    .replace(/\bKing's Knight Opening\b/gi, 'Şah Atı Açılışı')
    .replace(/\bThree Knights Opening\b/gi, 'Üç At Açılışı')
    .replace(/\bZukertort Opening\b/gi, 'Zukertort Açılışı')
    .replace(/\bKing's Indian Attack\b/gi, 'Şah-Hint Saldırısı (KIA)')
    .replace(/\bKing's Indian Defense\b|\bKing's Indian\b/gi, 'Şah-Hint Savunması')
    .replace(/\bQueen's Indian\b/gi, 'Vezir-Hint')
    .replace(/\bNimzo-Indian\b/gi, 'Nimzo-Hint')
    .replace(/\bBogo-Indian\b/gi, 'Bogo-Hint')
    .replace(/\bSicilian Defense\b|\bSicilian\b/gi, 'Sicilya Savunması')
    .replace(/\bFrench Defense\b|\bFrench\b/gi, 'Fransız Savunması')
    .replace(/\bCaro-Kann Defense\b|\bCaro-Kann\b/gi, 'Caro-Kann Savunması')
    .replace(/\bItalian Game\b/gi, 'İtalyan Açılışı')
    .replace(/\bRuy Lopez\b/gi, 'İspanyol Açılışı (Ruy Lopez)')
    .replace(/\bScotch Game\b/gi, 'İskoç Açılışı')
    .replace(/\bEnglish Opening\b/gi, 'İngiliz Açılışı')
    .replace(/\bSlav Defense\b/gi, 'Slav Savunması')
    .replace(/\bScandinavian Defense\b/gi, 'İskandinav Savunması')
    .replace(/\bVienna Game\b|\bVienna Gambit\b/gi, 'Viyana Oyunu')
    .replace(/\bFour Knights Game\b/gi, 'Dört At Oyunu')
    .replace(/\bPetrov's Defense\b|\bPetrov Defense\b/gi, 'Petrov Savunması (Rus Oyunu)')
    .replace(/\bPhilidor Defense\b/gi, 'Philidor Savunması')
    .replace(/\bDutch Defense\b/gi, 'Hollanda Savunması')
    .replace(/\bLondon System\b/gi, 'Londra Sistemi')
    .replace(/\bBishop's Opening\b/gi, 'Fil Açılışı')
    .replace(/\bCenter Game\b/gi, 'Merkez Oyunu')
    .replace(/\bFalkbeer Countergambit\b/gi, 'Falkbeer Karşı Gambiti')
    .replace(/\bNormal Variation\b/gi, 'Normal Varyant')
    .replace(/\bDeclined\b/gi, 'Reddedildi')
    .replace(/\bAccepted\b/gi, 'Kabul Edildi')
    .replace(/\bVariation\b/gi, 'Varyantı')
    .replace(/\bDefense\b/gi, 'Savunması')
    .replace(/\bAttack\b/gi, 'Saldırısı')
    .replace(/\bCountergambit\b|\bCounter-Gambit\b/gi, 'Karşı Gambiti')
    .replace(/\bGambit\b/gi, 'Gambiti')
    .replace(/\bOpening\b/gi, 'Açılışı')
    .replace(/\bGame\b/gi, 'Oyunu')
    .replace(/\bClassical\b/gi, 'Klasik')
    .replace(/\bModern\b/gi, 'Modern')
    .replace(/\bExchange\b/gi, 'Değişim')
    .replace(/\bAdvance\b/gi, 'İlerleme')
    .replace(/\bClosed\b/gi, 'Kapalı')
    .replace(/\bOpen\b/gi, 'Açık');
}

// Blacklisted / Joke / Absurd openings that should NEVER be recommended by a Coach
const BANNED_OPENING_KEYWORDS = [
  'bongcloud',
  'hammerschlag',
  'fried fox',
  "king david's",
  'borg defense',
  'barnes opening',
  'barnes defense',
  'damiano defense',
  'devin gambit',
  'clemenz opening',
  'ware opening',
  'ware defense',
  'grob opening',
];

// Pre-indexed lookup maps with master frequency counts
const exactMoveMap = new Map<string, EcoOpening>();
const prefixContinuationMap = new Map<string, Map<string, ContinuationStat>>();

// Initialize once
for (const op of allOpenings) {
  if (!op.pgn || op.eco === 'eco') continue;
  const moves = parsePgnMoves(op.pgn);
  if (moves.length === 0) continue;

  const key = moves.join(' ');
  exactMoveMap.set(key, op);

  const lowerName = op.name.toLowerCase();
  const isBanned = BANNED_OPENING_KEYWORDS.some((kw) => lowerName.includes(kw));

  for (let i = 0; i < moves.length; i++) {
    const pfx = moves.slice(0, i).join(' ');
    const nextMove = moves[i];

    if (!prefixContinuationMap.has(pfx)) {
      prefixContinuationMap.set(pfx, new Map());
    }
    const branchMap = prefixContinuationMap.get(pfx)!;

    if (branchMap.has(nextMove)) {
      const existing = branchMap.get(nextMove)!;
      existing.count += 1;
      // If current opening has a cleaner/mainline name, use it
      if (!isBanned && (existing.nameTr.includes('Gambiti') || !existing.nameTr.includes('Açılışı'))) {
        existing.op = op;
        existing.nameTr = translateOpeningName(op.name);
      }
    } else {
      branchMap.set(nextMove, {
        op,
        count: isBanned ? 0 : 1,
        nameTr: translateOpeningName(op.name),
      });
    }
  }
}

/**
 * Finds the most specific opening match for a move history.
 */
export function findOpeningByMoves(moves: string[]): { eco: string; name: string } | null {
  for (let len = moves.length; len > 0; len--) {
    const key = moves.slice(0, len).join(' ');
    const match = exactMoveMap.get(key);
    if (match) {
      return {
        eco: match.eco,
        name: translateOpeningName(match.name),
      };
    }
  }
  return null;
}

export interface OpeningContext {
  opening: { eco: string; name: string } | null;
  continuations: EcoOpening[];
}

export interface BookSubBranch {
  san: string;
  from: string;
  to: string;
  eco: string;
  leadsTo: string;
  weight: number;
}

export interface BookBranch {
  san: string;
  from: string;
  to: string;
  eco: string;
  leadsTo: string;
  weight: number;
  subBranches?: BookSubBranch[];
}

/**
 * Returns clean theoretical book continuations from the ECO database with the exact opening each move leads into,
 * plus 2nd-level opponent counter-branches for visual opening tree rendering.
 */
export function getBookBranches(
  moves: string[],
  chess: Chess,
  limit: number = 4,
  includeSubBranches: boolean = true
): BookBranch[] {
  const key = moves.join(' ');
  const continuations = prefixContinuationMap.get(key);
  if (!continuations || continuations.size === 0) return [];

  const legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length === 0) return [];

  const items: BookBranch[] = [];

  for (const [nextSan, stat] of continuations.entries()) {
    const leg = legalMoves.find((m) => m.san === nextSan);
    if (!leg) continue;

    const opLower = stat.op.name.toLowerCase();
    if (BANNED_OPENING_KEYWORDS.some((kw) => opLower.includes(kw))) continue;
    if (leg.piece === 'k' && leg.san !== 'O-O' && leg.san !== 'O-O-O') continue;

    // Prefer exact ECO match right after playing nextSan, else fallback to the branch's representative opening
    const nextKey = [...moves, nextSan].join(' ');
    const exactAfter = exactMoveMap.get(nextKey);
    const displayOp = exactAfter || stat.op;

    items.push({
      san: leg.san,
      from: leg.from,
      to: leg.to,
      eco: displayOp.eco,
      leadsTo: translateOpeningName(displayOp.name),
      weight: stat.count,
    });
  }

  items.sort((a, b) => b.weight - a.weight);
  const top = items.slice(0, limit);

  if (includeSubBranches) {
    for (const branch of top) {
      try {
        const sim = new Chess(chess.fen());
        if (sim.move({ from: branch.from, to: branch.to, promotion: 'q' })) {
          branch.subBranches = getBookBranches([...moves, branch.san], sim, 2, false);
        }
      } catch {
        // Ignore invalid simulation safely
      }
    }
  }

  return top;
}

export function getOpeningContext(moves: string[]): OpeningContext {
  const key = moves.join(' ');
  const exact = exactMoveMap.get(key);
  const continuationMap = prefixContinuationMap.get(key);
  const opening = exact ?? (continuationMap ? continuationMap.values().next().value?.op : undefined);
  const continuations: EcoOpening[] = [];

  if (continuationMap) {
    const sorted = Array.from(continuationMap.values()).sort((a, b) => b.count - a.count);
    for (const stat of sorted) {
      continuations.push(stat.op);
      if (continuations.length === MAX_CANDIDATE_CHOICES) break;
    }
  }

  return {
    opening: opening ? { eco: opening.eco, name: translateOpeningName(opening.name) } : null,
    continuations,
  };
}

/**
 * Generates official theoretical master continuations for a given position.
 * Strictly filters out blunders (like walking the King in the opening)
 * and ranks candidates by master popularity and pedagogical soundness.
 */
export function getTheoreticalContinuations(moves: string[], chess: Chess): CandidateMove[] {
  const key = moves.join(' ');
  const continuations = prefixContinuationMap.get(key);
  if (!continuations || continuations.size === 0) return [];

  const legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length === 0) return [];

  const inCheck = chess.inCheck();
  const moveNumber = Math.floor(moves.length / 2) + 1;

  // Score and filter continuations
  const scoredList: { san: string; stat: ContinuationStat; move: (typeof legalMoves)[0]; score: number }[] = [];

  for (const [nextSan, stat] of continuations.entries()) {
    const leg = legalMoves.find((m) => m.san === nextSan);
    if (!leg) continue;

    // 1. ABSOLUTE FILTER: NEVER walk the king in opening (moves 1-20) if not in check and not castling!
    if (!inCheck && leg.piece === 'k' && leg.san !== 'O-O' && leg.san !== 'O-O-O') {
      continue;
    }

    // 2. ABSOLUTE FILTER: Banned / joke openings
    const opLower = stat.op.name.toLowerCase();
    if (BANNED_OPENING_KEYWORDS.some((kw) => opLower.includes(kw))) {
      continue;
    }

    // 3. Weight by Master Frequency + Chess Quality Principles
    let score = stat.count * 10;

    // Boost healthy development moves
    if (['Nf3', 'Nc3', 'Nf6', 'Nc6'].includes(leg.san)) score += 300;
    if (['e4', 'd4', 'e5', 'd5'].includes(leg.san)) score += 400;
    if (['c4', 'c5'].includes(leg.san)) score += 250;
    if (['Bc4', 'Bb5', 'Be2', 'Bd3', 'Bc5', 'Bb4', 'Be7'].includes(leg.san)) score += 200;
    if (leg.san === 'O-O' || leg.san === 'O-O-O') score += 350;

    // Penalize dubious early moves
    if (moveNumber <= 3 && ['f3', 'f6', 'h3', 'h6', 'a3', 'a6', 'g4', 'g5', 'h4', 'h5'].includes(leg.san)) {
      score -= 500;
    }
    if (moveNumber <= 3 && leg.piece === 'q' && leg.san !== 'Qe2') {
      score -= 300; // Early queen sorties
    }

    scoredList.push({ san: nextSan, stat, move: leg, score });
  }

  // Sort descending by score
  scoredList.sort((a, b) => b.score - a.score);

  const result: CandidateMove[] = [];

  for (const item of scoredList) {
    if (result.length >= MAX_CANDIDATE_CHOICES) break;

    const leg = item.move;
    const turkishOpening = item.stat.nameTr;
    const isCapture = leg.san.includes('x');
    const isCheck = leg.san.includes('+');

    let tag = '⭐ Ana Hat';
    if (item.stat.count >= 100) tag = '🏆 En Çok Tercih Edilen';
    else if (turkishOpening.includes('Gambit')) tag = '⚔️ Gambit';
    else if (turkishOpening.includes('Klasik')) tag = '🏛️ Klasik';
    else if (turkishOpening.includes('Savunma')) tag = '🛡️ Sağlam';
    else if (turkishOpening.includes('Saldırı')) tag = '🚀 Agresif';
    else if (isCapture) tag = '⚔️ Taktik Takas';
    else if (isCheck) tag = '⚡ Şah Saldırısı';

    // Tailored Pedagogical Turkish Explanations
    let why = `${turkishOpening} teorik büyükusta devam yolu. Taş uyumu ve merkez kontrolü hedeflenir.`;
    let threat = isCapture ? 'Materyal kazanımı veya takası' : 'Merkez kareleri ve hatlar üzerinde baskı';
    let futureAttack = 'Merkez ve kanat kontrolü sağlayarak ilerideki taş hücumunu hazırlar.';

    if (leg.san === 'Nf3') {
      why = 'Atı doğal ve en aktif karesine geliştirir, e5 merkez piyonuna doğrudan baskı kurar ve şah kanadı rok hazırlığı yapar.';
      threat = 'e5 piyonunu tehdit eder ve d4 karesini kontrol eder';
      futureAttack = 'İleride Bc4 (İtalyan) veya Bb5 (İspanyol) ile birleşerek rakibin şah kanadına ve e5 merkez piyonuna çok yönlü hücum başlatır.';
    } else if (leg.san === 'Nc3') {
      why = 'Viyana Oyunu & Dört At: e4 piyonunu ve d5 karesini kontrol eden esnek ve sağlam bir gelişim.';
      threat = 'Merkez ve d5 karesi üzerinde kontrol';
      futureAttack = 'Viyana Saldırısı: d5 karesini kontrol eder ve f4 sürüşüyle f-hattını açarak rakip şaha taarruz planlar.';
    } else if (leg.san === 'Bc4') {
      why = 'Fil Açılışı / İtalyan: Rakibin en zayıf noktası olan f7 karesine göz diker ve hızlı rok hazırlar.';
      threat = 'f7 karesine doğrudan baskı';
      futureAttack = 'f7 aşil tendonuna yüklenir! 4. Ng5 (Kızarmış Ciğer) veya c3-d4 ile f7 üzerinden şah mat kombinezonları ve merkez istilası hazırlar.';
    } else if (leg.san === 'Bb5') {
      why = 'İspanyol Açılışı (Ruy Lopez): c6 atını açmaza alarak dolaylı yoldan e5 piyonunun savunmasını çökertir.';
      threat = 'c6 atını açmaza almak ve e5 savunmasını kırmak';
      futureAttack = 'Ruy Lopez: c6 atını açmaza alarak e5 piyonunun savunmasını çökertir. İleride c3 ve d4 ile merkez dominasyonu kurar.';
    } else if (leg.san === 'd4') {
      why = 'Merkez Oyunu / İskoç: Merkezi hemen açarak taşların hareket alanını maksimuma çıkarır.';
      threat = 'Merkezi piyon gerilimini patlatmak';
      futureAttack = 'Merkezi anında patlatır! Açık d-dikeyine vezir ve kaleleri yerleştirerek rakip taşları geri püskürtür.';
    } else if (leg.san === 'f4') {
      why = 'Şah Gambiti: f-dikeyini açarak vahşi bir şah kanadı taarruzu başlatır.';
      threat = 'e5 piyonunu saptırmak';
      futureAttack = 'Şah Gambiti: f-dikeyini açarak kaleyle f7 piyonuna ve şah kanadına doğrudan vahşi bir hücum başlatır.';
    } else if (leg.san === 'e4') {
      why = 'Merkezi ele geçirir, d5 ve f5 karelerini kontrol eder, vezir ve filin önünü açar.';
      threat = 'Merkez dominasyonu ve hızlı taş çıkışı';
      futureAttack = 'Açık renkli filin ve vezirin çaprazlarını açarak doğrudan şah kanadı hücumu vaat eder.';
    } else if (leg.san === 'c4') {
      why = 'İngiliz Açılışı: Kanattan d5 karesine baskı kurar ve esnek bir merkez kontrolü sağlar.';
      threat = 'Merkeze kanattan abluka';
      futureAttack = 'Kanattan d5 karesine baskı kurar ve açık d-hattında asimetrik vezir kanadı hücumu vaat eder.';
    } else if (leg.san === 'c5') {
      why = 'Sicilya Savunması: d4 karesini kanattan kontrol eder ve asimetrik kazanma şansı arar.';
      threat = 'c-hattını açıp vezir kanadından saldırmak';
      futureAttack = 'c-dikeyinde yarı açık hat elde eder; ileride vezir kanadından piyon dalgası (...a6, ...b5) ve kaleyle beyaz şaha asimetrik karşı taarruz kurar.';
    } else if (leg.san === 'e6') {
      why = 'Fransız Savunması: d5 merkez yarmasını piyonla arkadan destekler.';
      threat = 'Merkeze d5 ile darbe vurmak';
      futureAttack = 'Sağlam merkez kurar ve ...c5 sürüşüyle beyazın d4 piyon zincirinin kökünü hedef alır.';
    } else if (leg.san === 'c6') {
      why = 'Caro-Kann Savunması: c8 filini piyon zinciri dışına çıkarabilmek için d5 i c6 ile destekler.';
      threat = 'd5 kalesi kurmak';
      futureAttack = 'Granit gibi sağlam bir d5 merkezi kurar; beyazın e4 piyonunu merkezde sorgular.';
    } else if (leg.san === 'Nc6') {
      why = 'Atı doğal karesine geliştirerek merkez piyonunu savunur ve d4 sürüşünü kontrol eder.';
      threat = 'e5 piyonunu korur, d4 karesine baskı kurar';
      futureAttack = 'e5 piyonunu savunur; ileride ...Bc5 veya ...Nf6 ile beyazın merkezine karşı çift yönlü baskı kurar.';
    } else if (leg.san === 'Nf6') {
      why = 'Petrov Savunması / Karşı Saldırı: Pasif savunma yerine beyazın e4 piyonuna karşı saldırı başlatır.';
      threat = 'e4 piyonuna doğrudan tehdit';
      futureAttack = 'Petrov Savunması: Pasif savunma yerine beyazın e4 piyonunu doğrudan hedef alır.';
    } else if (leg.san === 'O-O' || leg.san === 'O-O-O') {
      why = 'Şahı güvenli kaleye alır ve kaleyi oyuna bağlar.';
      threat = 'Merkez hattına kale aktarmak';
      futureAttack = 'Şahı güvenli kaleye alır ve kaleyi merkeze aktararak açık hatta hücuma bağlar.';
    }

    const cand: CandidateMove = {
      san: leg.san,
      from: leg.from,
      to: leg.to,
      leadsTo: turkishOpening,
      tag,
      why,
      threat,
      futureAttack,
    };

    cand.color = getCandidateColor(cand);
    result.push(cand);
  }

  return result;
}
