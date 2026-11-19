import { fen, Chess as OpsChess, ray, attacks, FILE_NAMES, RANK_NAMES } from 'chessops';

export interface PinnedPieceInfo {
  square: string;
  pieceRole: string;
  pieceColor: 'white' | 'black';
  pinnedTo: 'king';
  pinningSquare: string;
  pinningRole: string;
  descriptionTr: string;
}

export interface HangingPieceInfo {
  square: string;
  pieceRole: string;
  pieceColor: 'white' | 'black';
  attackerCount: number;
  defenderCount: number;
  descriptionTr: string;
}

export interface ForkInfo {
  attackerSquare: string;
  attackerRole: string;
  attackerColor: 'white' | 'black';
  targetSquares: string[];
  targetRoles: string[];
  descriptionTr: string;
}

export interface BoardFeatures {
  fen: string;
  friendlyPins: PinnedPieceInfo[];
  opponentPins: PinnedPieceInfo[];
  friendlyHanging: HangingPieceInfo[];
  opponentHanging: HangingPieceInfo[];
  activeForks: ForkInfo[];
  centerAdvantage: number;
  tacticalBulletPoints: string[];
}

export function roleToTr(role: string): string {
  switch (role.toLowerCase()) {
    case 'p':
    case 'pawn':
      return 'Piyon';
    case 'n':
    case 'knight':
      return 'At';
    case 'b':
    case 'bishop':
      return 'Fil';
    case 'r':
    case 'rook':
      return 'Kale';
    case 'q':
    case 'queen':
      return 'Vezir';
    case 'k':
    case 'king':
      return 'Şah';
    default:
      return 'Taş';
  }
}

function sqIndexToName(sq: number): string {
  return `${FILE_NAMES[sq % 8]}${RANK_NAMES[Math.floor(sq / 8)]}`;
}

const CENTER_SQUARES = new Set(['e4', 'd4', 'e5', 'd5']);
const EXT_CENTER_SQUARES = new Set(['c3', 'd3', 'e3', 'f3', 'c4', 'f4', 'c5', 'f5', 'c6', 'd6', 'e6', 'f6']);

/**
 * Extracts objective tactical motifs (pins, hanging pieces, forks, center control)
 * using chessops bitboards and ray tracing. No hand-crafted heuristic text rules.
 */
export function extractBoardFeatures(fenStr: string, playerColor: 'white' | 'black'): BoardFeatures {
  const defaultEmpty: BoardFeatures = {
    fen: fenStr,
    friendlyPins: [],
    opponentPins: [],
    friendlyHanging: [],
    opponentHanging: [],
    activeForks: [],
    centerAdvantage: 0,
    tacticalBulletPoints: [],
  };

  try {
    const parsed = fen.parseFen(fenStr);
    if (parsed.isErr) return defaultEmpty;

    const setup = parsed.unwrap();
    const posResult = OpsChess.fromSetup(setup);
    if (posResult.isErr) return defaultEmpty;

    const pos = posResult.unwrap();
    const board = pos.board;
    const occupied = board.occupied;

    // 1. Bitboard attacks accumulation
    const whiteAttacksCount = new Uint8Array(64);
    const blackAttacksCount = new Uint8Array(64);
    const pieceAttackMap = new Map<number, number[]>();

    for (let sq = 0; sq < 64; sq++) {
      const piece = board.get(sq);
      if (!piece) continue;

      const atkSet = attacks(piece, sq, occupied);
      const targetIndices: number[] = [];
      for (const targetSq of atkSet) {
        targetIndices.push(targetSq);
        if (piece.color === 'white') {
          whiteAttacksCount[targetSq]++;
        } else {
          blackAttacksCount[targetSq]++;
        }
      }
      pieceAttackMap.set(sq, targetIndices);
    }

    // 2. Pins extraction using pos.ctx().blockers & ray-tracing
    const friendlyPins: PinnedPieceInfo[] = [];
    const opponentPins: PinnedPieceInfo[] = [];

    // Check pins for side to move
    const ctx = pos.ctx();
    const kingSq = ctx.king;
    const blockers = Array.from(ctx.blockers);

    if (kingSq !== undefined) {
      for (const pinnedSq of blockers) {
        const piece = board.get(pinnedSq);
        if (!piece) continue;

        const r = ray(kingSq, pinnedSq);
        let pinningSq = -1;
        let pinningRole = 'slider';

        for (const sq of r) {
          if (sq === kingSq || sq === pinnedSq) continue;
          const enemyPiece = board.get(sq);
          if (enemyPiece && enemyPiece.color !== piece.color) {
            pinningSq = sq;
            pinningRole = enemyPiece.role;
            break;
          }
        }

        const sqName = sqIndexToName(pinnedSq);
        const pinSqName = pinningSq !== -1 ? sqIndexToName(pinningSq) : '—';
        const isFriendly = piece.color === playerColor;

        const info: PinnedPieceInfo = {
          square: sqName,
          pieceRole: piece.role,
          pieceColor: piece.color,
          pinnedTo: 'king',
          pinningSquare: pinSqName,
          pinningRole,
          descriptionTr: isFriendly
            ? `${sqName}'deki ${roleToTr(piece.role)} taşınız, ${pinSqName}'deki rakip ${roleToTr(pinningRole)} tarafından Şahınıza açmaza alınmış.`
            : `Rakibin ${sqName}'deki ${roleToTr(piece.role)} taşı Şahına açmazda. Bu zayıflıktan yararlanabilirsiniz.`,
        };

        if (isFriendly) friendlyPins.push(info);
        else opponentPins.push(info);
      }
    }

    // 3. Hanging (Undefended) Pieces & Center Control
    const friendlyHanging: HangingPieceInfo[] = [];
    const opponentHanging: HangingPieceInfo[] = [];
    let whiteCenter = 0;
    let blackCenter = 0;

    for (let sq = 0; sq < 64; sq++) {
      const piece = board.get(sq);
      const sqName = sqIndexToName(sq);
      const wAttacks = whiteAttacksCount[sq];
      const bAttacks = blackAttacksCount[sq];

      if (CENTER_SQUARES.has(sqName)) {
        whiteCenter += wAttacks * 2;
        blackCenter += bAttacks * 2;
      } else if (EXT_CENTER_SQUARES.has(sqName)) {
        whiteCenter += wAttacks;
        blackCenter += bAttacks;
      }

      if (piece && piece.role !== 'king') {
        const isWhite = piece.color === 'white';
        const defenders = isWhite ? wAttacks : bAttacks;
        const attackers = isWhite ? bAttacks : wAttacks;
        const isFriendly = piece.color === playerColor;

        // True hanging: piece is attacked by opponent and has 0 defenders
        if (attackers > 0 && defenders === 0) {
          const info: HangingPieceInfo = {
            square: sqName,
            pieceRole: piece.role,
            pieceColor: piece.color,
            attackerCount: attackers,
            defenderCount: defenders,
            descriptionTr: isFriendly
              ? `${sqName}'deki ${roleToTr(piece.role)} taşınız korumasız ve rakip baskısı altında!`
              : `Rakibin ${sqName}'deki ${roleToTr(piece.role)} taşı korumasız ve alınabilir durumda!`,
          };

          if (isFriendly) friendlyHanging.push(info);
          else opponentHanging.push(info);
        }
      }
    }

    // 4. Active Forks detection
    const activeForks: ForkInfo[] = [];
    for (const [sq, targetSquares] of pieceAttackMap.entries()) {
      const piece = board.get(sq);
      if (!piece) continue;

      const valuableAttackedTargets: { sqName: string; role: string }[] = [];
      for (const tSq of targetSquares) {
        const targetPiece = board.get(tSq);
        if (targetPiece && targetPiece.color !== piece.color) {
          // Attacking King, Queen, Rook, or two minor pieces
          if (['king', 'queen', 'rook'].includes(targetPiece.role) || (piece.role === 'pawn' && ['knight', 'bishop'].includes(targetPiece.role))) {
            valuableAttackedTargets.push({ sqName: sqIndexToName(tSq), role: targetPiece.role });
          }
        }
      }

      if (valuableAttackedTargets.length >= 2) {
        const sqName = sqIndexToName(sq);
        const isFriendly = piece.color === playerColor;
        activeForks.push({
          attackerSquare: sqName,
          attackerRole: piece.role,
          attackerColor: piece.color,
          targetSquares: valuableAttackedTargets.map((t) => t.sqName),
          targetRoles: valuableAttackedTargets.map((t) => t.role),
          descriptionTr: isFriendly
            ? `${sqName}'deki ${roleToTr(piece.role)} taşınız çifte tehdit (çatal) uyguluyor!`
            : `Rakibin ${sqName}'deki ${roleToTr(piece.role)} taşı çatal tehdidi oluşturuyor!`,
        });
      }
    }

    // 5. Generate concise bullet points for Coach UI / Gemini input
    const bullets: string[] = [];
    friendlyHanging.forEach((h) => bullets.push(`⚠️ ${h.descriptionTr}`));
    friendlyPins.forEach((p) => bullets.push(`🔒 ${p.descriptionTr}`));
    opponentHanging.forEach((h) => bullets.push(`🎯 ${h.descriptionTr}`));
    opponentPins.forEach((p) => bullets.push(`⚡ ${p.descriptionTr}`));
    activeForks.forEach((f) => bullets.push(`⚔️ ${f.descriptionTr}`));

    const centerAdvantage = playerColor === 'white' ? whiteCenter - blackCenter : blackCenter - whiteCenter;

    return {
      fen: fenStr,
      friendlyPins,
      opponentPins,
      friendlyHanging,
      opponentHanging,
      activeForks,
      centerAdvantage,
      tacticalBulletPoints: bullets,
    };
  } catch {
    return defaultEmpty;
  }
}

/**
 * Compares before & after board states to derive concrete geometric XAI facts for a move.
 */
export function extractMoveImpact(
  beforeFen: string,
  afterFen: string,
  moveSan: string,
  moverColor: 'white' | 'black'
): string[] {
  const impacts: string[] = [];
  const before = extractBoardFeatures(beforeFen, moverColor);
  const after = extractBoardFeatures(afterFen, moverColor);
  const oppColor = moverColor === 'white' ? 'black' : 'white';
  const afterOppPerspective = extractBoardFeatures(afterFen, oppColor);

  // 1. Castling & Check
  if (moveSan === 'O-O' || moveSan === 'O-O-O') {
    impacts.push('🏰 Şahı güvenli bölgeye alır ve kaleyi oyuna bağlar');
  }
  if (moveSan.includes('+') && !moveSan.includes('#')) {
    impacts.push('⚡ Rakip şaha doğrudan tempo kazanarak şah çeker');
  } else if (moveSan.includes('#')) {
    impacts.push('👑 Zorunlu şah mat hamlesi!');
  }

  // 2. Rescued / Newly Defended Hanging Friendly Pieces
  const stillHanging = new Set(after.friendlyHanging.map((h) => h.square));
  for (const prevH of before.friendlyHanging) {
    if (!stillHanging.has(prevH.square)) {
      impacts.push(`🛡️ Tehdit altındaki ${prevH.square} (${roleToTr(prevH.pieceRole)}) taşını savunur/kurtarır`);
    }
  }

  // 3. New Attack on Undefended Enemy Pieces
  const prevOppHanging = new Set(before.opponentHanging.map((h) => h.square));
  for (const nextOH of after.opponentHanging) {
    if (!prevOppHanging.has(nextOH.square)) {
      impacts.push(`🎯 Rakibin korumasız ${nextOH.square} (${roleToTr(nextOH.pieceRole)}) taşını hedef alır`);
    }
  }

  // 4. Pins Created Against Opponent (in afterFen, turn is oppColor so friendlyPins = oppColor's pins)
  for (const oppPin of afterOppPerspective.friendlyPins) {
    impacts.push(`🔒 Rakibin ${oppPin.square} (${roleToTr(oppPin.pieceRole)}) taşını Şahına açmaza alır`);
  }

  // 5. Center Control Delta
  const centerDiff = after.centerAdvantage - before.centerAdvantage;
  if (centerDiff >= 2) {
    impacts.push(`📍 Merkez kareler üzerindeki baskıyı (+${centerDiff}) artırır`);
  }

  // 6. Newly Exposed Own Piece Warning
  const prevOwnHanging = new Set(before.friendlyHanging.map((h) => h.square));
  for (const nextH of after.friendlyHanging) {
    if (!prevOwnHanging.has(nextH.square)) {
      impacts.push(`⚠️ Dikkat: ${nextH.square} (${roleToTr(nextH.pieceRole)}) taşı savunmasız kalıyor`);
    }
  }

  return impacts.slice(0, 4);
}
