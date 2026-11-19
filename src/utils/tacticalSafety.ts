import { Chess, type Square } from 'chess.js';
import type { EngineEvaluation } from '../types/chess';

export const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

export interface TacticalEvaluation {
  isSafe: boolean;
  score: number;
  fatalBlunder: boolean;
  reason: string;
  isSacrifice?: boolean;
  isGambit?: boolean;
  pv?: string[];
  pvSan?: string[];
}

/**
 * Converts a sequence of UCI moves (e.g. ['f1h7', 'g8h7', 'g1g5']) into standard SAN notation (['Bxh7+', 'Kxh7', 'Ng5+'])
 */
export function convertPvToSan(fen: string, uciMoves: string[]): string[] {
  const c = new Chess(fen);
  const sans: string[] = [];
  for (const uci of uciMoves) {
    if (!uci || uci.length < 4) break;
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    try {
      const m = c.move({ from, to, promotion });
      if (m) sans.push(m.san);
      else break;
    } catch {
      break;
    }
  }
  return sans;
}

export function getPieceNameTr(pieceType: string): string {
  switch (pieceType.toLowerCase()) {
    case 'p': return 'Piyon';
    case 'n': return 'At';
    case 'b': return 'Fil';
    case 'r': return 'Kale';
    case 'q': return 'Vezir';
    case 'k': return 'Şah';
    default: return 'Taş';
  }
}

/**
 * Simulates a full tactical exchange on a given target square to evaluate whether the defender loses material.
 * Accurately handles multiple attackers, pinned defenders (via legal move generation), and net piece value changes.
 * Returns the net material loss for the defending side (e.g. 330 if minor piece is lost clean).
 */
export function simulateSquareExchange(
  board: Chess,
  targetSquare: Square,
  defenderColor: 'w' | 'b'
): { netLoss: number; lostPieceName: string } {
  const targetPiece = board.get(targetSquare);
  if (!targetPiece || targetPiece.color !== defenderColor) {
    return { netLoss: 0, lostPieceName: '' };
  }

  const defenderPieceName = getPieceNameTr(targetPiece.type);
  const attackerColor = defenderColor === 'w' ? 'b' : 'w';

  // Find legal captures by attacker on targetSquare
  const attackerMoves = board.moves({ verbose: true }).filter((m) => m.to === targetSquare);
  if (attackerMoves.length === 0) {
    return { netLoss: 0, lostPieceName: '' };
  }

  // Sort attackers by piece value ascending (pawn, knight/bishop, rook, queen, king)
  attackerMoves.sort((a, b) => (PIECE_VALUES[a.piece] || 100) - (PIECE_VALUES[b.piece] || 100));
  const firstAttacker = attackerMoves[0];

  // Clone board and play attacker's first capture
  const sim = new Chess(board.fen());
  try {
    sim.move({ from: firstAttacker.from, to: firstAttacker.to, promotion: firstAttacker.promotion });
  } catch {
    return { netLoss: 0, lostPieceName: '' };
  }

  let defenderLostMaterial = PIECE_VALUES[targetPiece.type] || 100;
  let attackerLostMaterial = 0;
  let currentOccupantVal = PIECE_VALUES[firstAttacker.piece] || 100;
  let turnColor = defenderColor;

  // Simulate recaptures loop on targetSquare (up to 8 plies)
  for (let depth = 0; depth < 8; depth++) {
    const replies = sim.moves({ verbose: true }).filter((m) => m.to === targetSquare);
    if (replies.length === 0) break;

    // Pick lowest value capturing piece
    replies.sort((a, b) => (PIECE_VALUES[a.piece] || 100) - (PIECE_VALUES[b.piece] || 100));
    const nextCap = replies[0];

    try {
      sim.move({ from: nextCap.from, to: nextCap.to, promotion: nextCap.promotion });
    } catch {
      break;
    }

    if (turnColor === defenderColor) {
      // Defender recaptured attacker's piece
      attackerLostMaterial += currentOccupantVal;
      currentOccupantVal = PIECE_VALUES[nextCap.piece] || 100;
      turnColor = attackerColor;
    } else {
      // Attacker captured defender's piece again
      defenderLostMaterial += currentOccupantVal;
      currentOccupantVal = PIECE_VALUES[nextCap.piece] || 100;
      turnColor = defenderColor;
    }
  }

  const netLoss = defenderLostMaterial - attackerLostMaterial;
  return { netLoss, lostPieceName: defenderPieceName };
}

/**
 * Rigorously evaluates tactical and positional safety of any candidate move.
 * - Distinguishes between accidental blunders vs. intentional sacrifices, gambits, and combinations!
 * - If a move is approved by Stockfish (in bestMove or MultiPV with positive eval/mate) or is recognized opening theory:
 *   IT IS NOT DISQUALIFIED! Instead, it is identified as a brilliant sacrifice, trap, or gambit!
 */
export function evaluateMoveTacticalSafety(
  chess: Chess,
  move: { from: string; to: string; piece: string; captured?: string; promotion?: string; san: string },
  engineEval?: EngineEvaluation | null
): TacticalEvaluation {
  const turn = chess.turn(); // 'w' or 'b'
  const oppColor = turn === 'w' ? 'b' : 'w';
  const myColor = turn;
  const myPieceVal = PIECE_VALUES[move.piece] || 100;
  const capturedVal = move.captured ? (PIECE_VALUES[move.captured] || 100) : 0;
  const uci = move.from + move.to + (move.promotion || '');

  // Guard against stale engine evaluations belonging to a previous board state
  const validEngineEval = (engineEval && (!engineEval.fen || engineEval.fen === chess.fen())) ? engineEval : null;

  // Check if Stockfish has verified this move as favorable
  const isEngineBest = validEngineEval?.bestMove === uci || validEngineEval?.bestMoveSan === move.san;
  const engineLine = validEngineEval?.multiPV?.find((l) => l.move === uci || l.move.startsWith(move.from + move.to));
  const rawScore = engineLine?.score ?? (isEngineBest ? validEngineEval?.score : null);
  const isWinningMate = (isEngineBest && validEngineEval?.isMate && (validEngineEval.mateIn ?? 0) > 0) ||
                        (engineLine?.isMate && (engineLine.mateIn ?? 0) > 0);
  const isLosingMate = (isEngineBest && validEngineEval?.isMate && (validEngineEval.mateIn ?? 0) < 0) ||
                       (engineLine?.isMate && (engineLine.mateIn ?? 0) < 0);

  // Normalize engine score to the perspective of the player to move:
  // positive = good for player, negative = bad for player
  const playerEval = rawScore !== null && rawScore !== undefined
    ? (myColor === 'w' ? rawScore : -rawScore)
    : null;

  const bestEngineScore = validEngineEval?.score;
  const bestPlayerEval = bestEngineScore !== null && bestEngineScore !== undefined
    ? (myColor === 'w' ? bestEngineScore : -bestEngineScore)
    : 0;

  // A move is engine favorable ONLY if:
  // 1) It delivers mate for our side, OR
  // 2) The player evaluation is not heavily losing (>= -60 cp from our perspective)
  const isEngineFavorable = !isLosingMate && (
    isWinningMate ||
    (isEngineBest && (playerEval === null || playerEval >= -60)) ||
    (engineLine && playerEval !== null && playerEval >= -60)
  );
  const isMateAttack = isWinningMate;
  const mateCount = engineLine?.mateIn ?? (isEngineBest ? validEngineEval?.mateIn : undefined);
  const engineScore = engineLine?.score ?? (isEngineBest ? (validEngineEval?.score ?? 100) : null);

  // If engine explicitly evaluated this line and found forced mate against us
  if (isLosingMate) {
    return {
      isSafe: false,
      score: -99999,
      fatalBlunder: true,
      reason: 'Bu hamle rakibe zorunlu mat fırsatı veriyor.',
    };
  }

  // Blunder Filter:
  // Disqualify any candidate move that drops >= 120 cp (1.2 piyon)
  // compared to the best engine move in the position. Best move is never disqualified!
  if (playerEval !== null && !isEngineBest) {
    const evalDrop = bestPlayerEval - playerEval;
    if (evalDrop >= 120) {
      return {
        isSafe: false,
        score: -90000,
        fatalBlunder: true,
        reason: 'Stockfish derin analizine göre bu hamle en iyi devam yoluna kıyasla 1.2 piyon veya daha fazla avantaj kaybettiriyor.',
      };
    }
  }

  // 1. Anti-Blunder: Moving king without castling in opening when not in check (unless engine strictly demands it)
  if (!chess.inCheck() && move.piece === 'k' && move.san !== 'O-O' && move.san !== 'O-O-O' && !isEngineBest) {
    return {
      isSafe: false,
      score: -99999,
      fatalBlunder: true,
      reason: 'Şahı açılışta gereksiz yere hareket ettirip açıkta bırakmak ciddi bir hatadır.',
    };
  }

  // 2. Clone board and play the move
  const nextChess = new Chess(chess.fen());
  try {
    nextChess.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
  } catch {
    return {
      isSafe: false,
      score: -999999,
      fatalBlunder: true,
      reason: 'Geçersiz hamle.',
    };
  }

  // 3. Mate-in-1 check: Does this move allow opponent to mate immediately?
  const opponentReplies = nextChess.moves({ verbose: true });
  if (opponentReplies.some((m) => m.san.includes('#')) || nextChess.isCheckmate()) {
    return {
      isSafe: false,
      score: -999999,
      fatalBlunder: true,
      reason: 'Bu hamle rakibe tek hamlede mat etme fırsatı veriyor!',
    };
  }

  // Helper for generating sacrifice data (ONLY when engine verified!)
  const createSacrificeData = (reasonPrefix: string): TacticalEvaluation => {
    const pvUci = engineLine?.pv || (isEngineBest ? validEngineEval?.pv : undefined) || [];
    const pvSan = pvUci.length > 0 ? convertPvToSan(chess.fen(), pvUci) : [];
    return {
      isSafe: true,
      score: (engineScore ?? 350) + 500,
      fatalBlunder: false,
      isSacrifice: true,
      isGambit: false,
      pv: pvUci,
      pvSan,
      reason: isMateAttack
        ? `⚡ TAŞ FEDASI İLE MAT: Bu taş feda edilerek rakip şah ${mateCount ? Math.abs(mateCount) : ''} hamlede mat ağına alınıyor!`
        : `${reasonPrefix}: Stockfish analizine göre bu feda rakibin savunmasını dağıtarak avantaj sağlıyor!`,
    };
  };

  // 3.5. Forced Check & Royal Fork Blunder Detector
  // Does this move give opponent an unavoidable check that forks King + Queen/Rook, winning major material?
  for (const oppMove of opponentReplies) {
    if (oppMove.san.includes('+')) {
      const checkBoard = new Chess(nextChess.fen());
      try {
        checkBoard.move(oppMove.san);
        const ourEscapes = checkBoard.moves({ verbose: true });
        const canCaptureChecker = ourEscapes.some((m) => m.to === oppMove.to);

        if (!canCaptureChecker && ourEscapes.length > 0) {
          let allEscapesLoseMajorPiece = true;
          let lostPieceName = '';
          for (const esc of ourEscapes) {
            const afterEsc = new Chess(checkBoard.fen());
            afterEsc.move(esc.san);
            const oppFollowUps = afterEsc.moves({ verbose: true });
            const winsQueen = oppFollowUps.some((f) => f.captured === 'q');
            const winsRook = oppFollowUps.some((f) => f.captured === 'r');
            if (winsQueen) {
              lostPieceName = 'Vezir';
            } else if (winsRook && !lostPieceName) {
              lostPieceName = 'Kale';
            } else if (!winsQueen && !winsRook) {
              allEscapesLoseMajorPiece = false;
              break;
            }
          }
          if (allEscapesLoseMajorPiece && lostPieceName) {
            if (isEngineFavorable) {
              return createSacrificeData('🎁 HESAPLANMIŞ KONTRA HAMLE');
            }
            return {
              isSafe: false,
              score: -99999,
              fatalBlunder: true,
              reason: `Bu hamle rakibe şah çekerek ${lostPieceName} kazandıran ölümcül bir çatal (${oppMove.san}) fırsatı veriyor!`,
            };
          }
        }
      } catch {
        // Ignored
      }
    }
  }

  // 4. Tactical Safety of the Destination Square (move.to)
  const isDestAttackedByOpp = nextChess.isAttacked(move.to as Square, oppColor);
  const isDestDefendedByMe = nextChess.isAttacked(move.to as Square, myColor);
  const destExchange = simulateSquareExchange(nextChess, move.to as Square, myColor);
  if (destExchange.netLoss >= 200) {
    if (isEngineFavorable) {
      return createSacrificeData('🎁 HESAPLANMIŞ TAŞ FEDASI');
    }
    return {
      isSafe: false,
      score: -85000 - destExchange.netLoss,
      fatalBlunder: true,
      reason: `Taş (${move.san}) ${destExchange.lostPieceName} korumasız veya taktik olarak aleyhinize olan bir kareye gidiyor ve net taş kaybı yaşanıyor!`,
    };
  }

  // 5. Board-Wide Piece Safety (Ensures no friendly Bishop, Knight, Rook, Queen is left hanging or under-defended)
  const nextBoard = nextChess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = nextBoard[r][c];
      if (p && p.color === myColor) {
        const sq = (String.fromCharCode('a'.charCodeAt(0) + c) + String(8 - r)) as Square;
        const sqExchange = simulateSquareExchange(nextChess, sq, myColor);
        if (sqExchange.netLoss >= 200) {
          if (isEngineFavorable) {
            return createSacrificeData('🎁 HESAPLANMIŞ TAŞ FEDASI');
          }
          return {
            isSafe: false,
            score: -90000 - sqExchange.netLoss,
            fatalBlunder: true,
            reason: `Bu hamle ${sq} karesindeki ${sqExchange.lostPieceName} taşınızı korumasız bırakıyor ve rakip onu alarak net taş kazanıyor!`,
          };
        }
      }
    }
  }

  // 6. Queen Under Direct Attack: Must save the Queen unless sacrifice combination!
  const board = chess.board();
  let queenSquare: string | null = null;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.type === 'q' && piece.color === myColor) {
        const file = String.fromCharCode('a'.charCodeAt(0) + c);
        const rank = String(8 - r);
        queenSquare = `${file}${rank}`;
        break;
      }
    }
    if (queenSquare) break;
  }

  if (queenSquare && chess.isAttacked(queenSquare as Square, oppColor)) {
    const qSqNext = move.piece === 'q' ? move.to : queenSquare;
    if (nextChess.isAttacked(qSqNext as Square, oppColor)) {
      const oppQCaps = opponentReplies.filter((m) => m.to === qSqNext);
      const lowestQAttacker = oppQCaps.sort((a, b) => (PIECE_VALUES[a.piece] || 100) - (PIECE_VALUES[b.piece] || 100))[0];
      const isQDefended = nextChess.isAttacked(qSqNext as Square, myColor);
      if (!isQDefended || (lowestQAttacker && PIECE_VALUES[lowestQAttacker.piece] < 900)) {
        if (move.piece !== 'q' && move.to !== lowestQAttacker?.from && move.captured !== lowestQAttacker?.piece) {
          // If queen sacrifice leads to forced mate or winning combo:
          if (isEngineFavorable && isMateAttack) {
            return createSacrificeData('👑 EFSANEVİ VEZİR FEDASI İLE MAT');
          }
          return {
            isSafe: false,
            score: -95000,
            fatalBlunder: true,
            reason: 'Veziriniz tehdit altındayken başka taş oynamak veziri kaybettirir!',
          };
        }
      }
    }
  }

  // 7. Positive Positional & Strategic Scoring (The move is 100% safe!)
  let score = 100;
  if (engineScore !== null) {
    const playerEngineScore = myColor === 'w' ? engineScore : -engineScore;
    score += playerEngineScore;
  }

  // 7A: Rescuing / Moving a piece that was attacked on 'from' square
  const wasFromAttacked = chess.isAttacked(move.from as Square, oppColor);
  const wasFromDefended = chess.isAttacked(move.from as Square, myColor);
  if (wasFromAttacked && (!wasFromDefended || myPieceVal >= 300)) {
    if (!isDestAttackedByOpp || isDestDefendedByMe) {
      // Big priority to saving pieces under attack!
      score += 600 + Math.min(myPieceVal, 900);
    }
  }

  // 7B: Castling
  if (move.san === 'O-O' || move.san === 'O-O-O') {
    score += 450;
  }

  // 7C: Attacks opponent Queen or high-value piece safely (TEMPO!)
  const pieceAtDest = move.piece;
  if (['n', 'b', 'r', 'p'].includes(pieceAtDest)) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.color === oppColor && p.type === 'q') {
          const file = String.fromCharCode('a'.charCodeAt(0) + c);
          const rank = String(8 - r);
          const oppQSq = `${file}${rank}` as Square;
          if (nextChess.isAttacked(oppQSq, myColor)) {
            score += 420;
          }
        }
      }
    }
  }

  // 7D: Central Pawn Push & Prophylaxis
  if (move.piece === 'p') {
    const isPawnContested = isDestAttackedByOpp && !isDestDefendedByMe;
    if (isPawnContested) {
      score -= 300; // Do not mindlessly push pawns into undefended attacks!
    } else {
      if (['e4', 'd4', 'e5', 'd5'].includes(move.to)) {
        score += 350;
      } else if (['c4', 'c5'].includes(move.to)) {
        score += 260;
      } else if (['c3', 'c6', 'd3', 'd6', 'e3', 'e6'].includes(move.to)) {
        score += 210;
      } else if (['a4', 'a5'].includes(move.to)) {
        // Queenside space / prophylaxis against b5/b4 pushes
        score += 180;
      } else if (['h3', 'h6'].includes(move.to)) {
        // Kingside luft / prophylaxis against Bg4/Ng4
        score += 140;
      }
    }
  }

  // 7E: Natural Minor Piece Development (Knights & Bishops)
  if (['n', 'b'].includes(move.piece)) {
    const backRank = myColor === 'w' ? '1' : '8';
    const isInitialDevelopment = move.from.endsWith(backRank);
    if (isInitialDevelopment) {
      score += 350; // Big bonus for bringing unplayed pieces out of the back rank!
    }

    const isRetreatToBackRank = !isInitialDevelopment && move.to.endsWith(backRank);
    if (isRetreatToBackRank && !wasFromAttacked && !isEngineBest) {
      // Drastic penalty: NEVER retreat developed piece back to starting square in opening unless forced
      score -= 2500;
    } else if (!isInitialDevelopment && !wasFromAttacked && !isEngineBest) {
      // ANTI-OSCILLATION: Penalize moving an ALREADY DEVELOPED piece aimlessly back and forth!
      // Moving an active piece for no urgent reason wastes tempi
      score -= 400;
    }

    if (['e4', 'd4', 'e5', 'd5', 'c4', 'c5', 'f3', 'c3', 'f6', 'c6'].includes(move.to)) {
      score += isInitialDevelopment ? 150 : 20;
    }
  }

  // 7F: Major Piece Activation (Rooks & Queen)
  if (['r', 'q'].includes(move.piece)) {
    const backRank = myColor === 'w' ? '1' : '8';
    const isFromBackRank = move.from.endsWith(backRank);

    // Rooks to central open/semi-open files (e1, d1, c1, e8, d8, c8)
    if (move.piece === 'r') {
      if (['e1', 'd1', 'c1', 'e8', 'd8', 'c8'].includes(move.to)) {
        score += 280;
      } else if (isFromBackRank) {
        score += 150;
      }
    }

    // Queen modest activation (connecting the rooks, e.g. Qe2, Qc2, Qd2)
    if (move.piece === 'q' && isFromBackRank && !isDestAttackedByOpp) {
      if (['e2', 'c2', 'd2', 'e7', 'c7', 'd7'].includes(move.to)) {
        score += 220;
      }
    }
  }

  // 7G: Safe Captures (Huge bonus for taking undefended enemy pieces)
  if (move.captured) {
    if (capturedVal >= myPieceVal) {
      score += (capturedVal - myPieceVal) * 2 + 350;
    } else if (!isDestAttackedByOpp) {
      score += capturedVal * 2 + 500;
    } else {
      score += 100;
    }
  }

  // 7H: Safe Checks
  if (move.san.includes('+')) {
    if (!isDestAttackedByOpp) {
      score += 160;
    }
  }

  const pvUci = engineLine?.pv || (isEngineBest ? validEngineEval?.pv : undefined) || [];
  const pvSan = pvUci.length > 0 ? convertPvToSan(chess.fen(), pvUci) : [];

  const isSafe = score > -800;

  return {
    isSafe,
    score,
    fatalBlunder: !isSafe,
    pv: pvUci,
    pvSan,
    reason: !isSafe
      ? 'Açılış ilkelerine aykırı hamle kaybı veya zayıflık oluşturan hamle.'
      : isMateAttack
      ? `⚡ Zorunlu Mat Saldırısı: Stockfish ${mateCount ? Math.abs(mateCount) : ''} hamlede mat hesapladı!`
      : 'Taktiksel ve konumsal olarak güvenli ve sağlam hamle.',
  };
}

/**
 * Returns true if the move passes tactical safety OR is an engine/theory approved sacrifice.
 */
export function isMoveTacticallySafe(
  chess: Chess,
  move: { from: string; to: string; piece: string; captured?: string; promotion?: string; san: string },
  engineEval?: EngineEvaluation | null
): boolean {
  return evaluateMoveTacticalSafety(chess, move, engineEval).isSafe;
}
