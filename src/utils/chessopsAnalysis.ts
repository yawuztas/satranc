import { fen, Chess, attacks, FILE_NAMES } from 'chessops';

export interface SquareControl {
  square: string;
  file: string;
  rank: number;
  whiteAttacks: number;
  blackAttacks: number;
  controller: 'white' | 'black' | 'contested' | 'neutral';
  isCenter: boolean;
  isExtendedCenter: boolean;
  pieceOnSquare?: {
    role: string;
    color: 'white' | 'black';
  };
}

export interface BoardHeatmap {
  squares: Record<string, SquareControl>;
  whiteCenterScore: number;
  blackCenterScore: number;
  whiteAdvantage: number; // Positive means white controls more critical squares
  hangingWhitePieces: string[];
  hangingBlackPieces: string[];
  contestedSquares: string[];
}

const CENTER_SQUARES = new Set(['e4', 'd4', 'e5', 'd5']);
const EXTENDED_CENTER = new Set(['c3', 'd3', 'e3', 'f3', 'c4', 'f4', 'c5', 'f5', 'c6', 'd6', 'e6', 'f6']);

/**
 * Computes complete 64-square board control heatmap, center control, and hanging piece detection using chessops bitboards.
 */
export function computeBoardHeatmap(fenStr: string): BoardHeatmap {
  const defaultEmpty: BoardHeatmap = {
    squares: {},
    whiteCenterScore: 0,
    blackCenterScore: 0,
    whiteAdvantage: 0,
    hangingWhitePieces: [],
    hangingBlackPieces: [],
    contestedSquares: [],
  };

  try {
    const parsed = fen.parseFen(fenStr);
    if (parsed.isErr) return defaultEmpty;

    const setup = parsed.unwrap();
    const posResult = Chess.fromSetup(setup);
    if (posResult.isErr) return defaultEmpty;

    const pos = posResult.unwrap();
    const board = pos.board;
    const occupied = board.occupied;

  const whiteAttacksCount = new Uint8Array(64);
  const blackAttacksCount = new Uint8Array(64);

  // Scan all 64 squares for pieces and accumulate their attacks
  for (let sq = 0; sq < 64; sq++) {
    const piece = board.get(sq);
    if (!piece) continue;

    const atkSet = attacks(piece, sq, occupied);
    if (piece.color === 'white') {
      for (const targetSq of atkSet) {
        whiteAttacksCount[targetSq]++;
      }
    } else {
      for (const targetSq of atkSet) {
        blackAttacksCount[targetSq]++;
      }
    }
  }

  const squares: Record<string, SquareControl> = {};
  let whiteCenterScore = 0;
  let blackCenterScore = 0;
  const hangingWhitePieces: string[] = [];
  const hangingBlackPieces: string[] = [];
  const contestedSquares: string[] = [];

  for (let sq = 0; sq < 64; sq++) {
    const fileName = FILE_NAMES[sq % 8];
    const rankNum = Math.floor(sq / 8) + 1;
    const sqName = `${fileName}${rankNum}`;

    const w = whiteAttacksCount[sq];
    const b = blackAttacksCount[sq];
    const piece = board.get(sq);

    let controller: 'white' | 'black' | 'contested' | 'neutral' = 'neutral';
    if (w > b) controller = 'white';
    else if (b > w) controller = 'black';
    else if (w > 0 && b > 0) controller = 'contested';

    const isCenter = CENTER_SQUARES.has(sqName);
    const isExt = EXTENDED_CENTER.has(sqName);

    if (isCenter) {
      whiteCenterScore += w * 2;
      blackCenterScore += b * 2;
    } else if (isExt) {
      whiteCenterScore += w;
      blackCenterScore += b;
    }

    if (controller === 'contested') {
      contestedSquares.push(sqName);
    }

    // Hanging piece detection: Piece attacked by opponent but has 0 defenders
    if (piece) {
      if (piece.color === 'white' && b > 0 && w === 0 && piece.role !== 'king') {
        hangingWhitePieces.push(sqName);
      } else if (piece.color === 'black' && w > 0 && b === 0 && piece.role !== 'king') {
        hangingBlackPieces.push(sqName);
      }
    }

    squares[sqName] = {
      square: sqName,
      file: fileName,
      rank: rankNum,
      whiteAttacks: w,
      blackAttacks: b,
      controller,
      isCenter,
      isExtendedCenter: isExt,
      pieceOnSquare: piece ? { role: piece.role, color: piece.color } : undefined,
    };
  }

    return {
      squares,
      whiteCenterScore,
      blackCenterScore,
      whiteAdvantage: whiteCenterScore - blackCenterScore,
      hangingWhitePieces,
      hangingBlackPieces,
      contestedSquares,
    };
  } catch {
    return defaultEmpty;
  }
}

/**
 * Returns visual heatmap background styling for a given square
 */
export function getSquareHeatmapStyle(
  control: SquareControl | undefined,
  playerColor: 'white' | 'black'
): { backgroundColor?: string; border?: string } {
  if (!control) return {};

  const isPlayerWhite = playerColor === 'white';
  const myAttacks = isPlayerWhite ? control.whiteAttacks : control.blackAttacks;
  const oppAttacks = isPlayerWhite ? control.blackAttacks : control.whiteAttacks;

  if (myAttacks === 0 && oppAttacks === 0) return {};

  // Dominant player control
  if (myAttacks > oppAttacks) {
    const alpha = Math.min(0.4, 0.15 + (myAttacks - oppAttacks) * 0.08);
    return {
      backgroundColor: `rgba(16, 185, 129, ${alpha})`, // Emerald green
    };
  }

  // Dominant opponent control
  if (oppAttacks > myAttacks) {
    const alpha = Math.min(0.4, 0.15 + (oppAttacks - myAttacks) * 0.08);
    return {
      backgroundColor: `rgba(239, 68, 68, ${alpha})`, // Crimson red
    };
  }

  // Contested hotly fought square
  return {
    backgroundColor: 'rgba(234, 179, 8, 0.22)', // Amber yellow
  };
}
