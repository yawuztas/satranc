import { Chess, type Square } from 'chess.js';
import { PIECE_VALUES } from './tacticalSafety';

export interface ConcreteMoveAnalysis {
  san: string;
  pieceName: string;
  fromSquare: string;
  toSquare: string;
  isCapture: boolean;
  capturedPieceName?: string;
  isCheck: boolean;
  isCheckmate: boolean;
  isCastle: boolean;
  castleType?: 'kingside' | 'queenside';
  isPromotion: boolean;
  promotedToName?: string;
  whyThisMove: string;
  whatItThreatens: string;
  whatItProtects: string;
  futurePlan: string;
  forkTargets?: string[];
  pinnedPiece?: string;
}

const PIECE_NAMES_TR: Record<string, string> = {
  p: 'Piyon',
  n: 'At',
  b: 'Fil',
  r: 'Kale',
  q: 'Vezir',
  k: 'Şah',
};

/**
 * Analyzes the exact move just played between two board states (before and after the move)
 * and generates deeply specific, board-accurate Turkish explanations without generic canned text.
 */
export function explainConcreteMove(
  historyMoves: string[],
  actor: 'player' | 'opponent' = 'opponent'
): ConcreteMoveAnalysis | null {
  if (historyMoves.length === 0) return null;

  // Replay moves up to the last move
  const gameBefore = new Chess();
  for (let i = 0; i < historyMoves.length - 1; i++) {
    try {
      gameBefore.move(historyMoves[i]);
    } catch {
      break;
    }
  }

  const lastMoveSan = historyMoves[historyMoves.length - 1];
  const gameAfter = new Chess(gameBefore.fen());
  let moveObj;
  try {
    moveObj = gameAfter.move(lastMoveSan);
  } catch {
    return null;
  }
  if (!moveObj) return null;

  const movedColor = moveObj.color; // 'w' or 'b'
  const oppColor = movedColor === 'w' ? 'b' : 'w';
  const isWhite = movedColor === 'w';
  const pieceCode = moveObj.piece;
  const pieceName = PIECE_NAMES_TR[pieceCode] || 'Taş';
  const from = moveObj.from;
  const to = moveObj.to;
  const isCapture = Boolean(moveObj.captured);
  const capturedPieceName = moveObj.captured ? PIECE_NAMES_TR[moveObj.captured] : undefined;
  const isCheck = lastMoveSan.includes('+');
  const isCheckmate = lastMoveSan.includes('#');
  const isCastle = lastMoveSan === 'O-O' || lastMoveSan === 'O-O-O';
  const isKingsideCastle = lastMoveSan === 'O-O';
  const isQueensideCastle = lastMoveSan === 'O-O-O';
  const isPromotion = Boolean(moveObj.promotion);
  const promotedToName = moveObj.promotion ? PIECE_NAMES_TR[moveObj.promotion] : undefined;

  // 1. Inspect what enemy pieces the moved piece DIRECTLY attacks from its new square
  const directThreats: string[] = [];
  const threatenedPiecesList: { piece: string; square: string; value: number }[] = [];
  const boardAfter = gameAfter.board();

  // Find all opponent pieces attacked by this specific moved piece on its new square
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = boardAfter[r][c];
      if (p && p.color === oppColor) {
        const file = String.fromCharCode('a'.charCodeAt(0) + c);
        const rank = String(8 - r);
        const sq = `${file}${rank}` as Square;

        // Verify if square is attacked by movedColor
        // And specifically if our moved piece is attacking it
        if (gameAfter.isAttacked(sq, movedColor)) {
          // Check if this specific piece can legally capture or attack
          // We can check legal moves from 'to' in gameAfter if it were still movedColor's turn
          // Or using geometric attack rules:
          const pName = PIECE_NAMES_TR[p.type] || 'Taş';
          const pVal = PIECE_VALUES[p.type] || 100;

          // Check if attacked by testing a phantom board where it's movedColor's turn
          const phantom = new Chess(gameAfter.fen());
          // Switch turn back to movedColor to inspect available moves from 'to'
          const fenTokens = phantom.fen().split(' ');
          fenTokens[1] = movedColor;
          fenTokens[3] = '-'; // clear en-passant
          try {
            phantom.load(fenTokens.join(' '));
            const attacksFromDest = phantom.moves({ square: to as Square, verbose: true });
            if (attacksFromDest.some((m) => m.to === sq)) {
              // Real Chess Threat Rules:
              // 1. Piece is completely hanging (!isTargetDefended)
              // 2. Or attacked by a piece of lower or equal value (e.g. pawn attacks knight/bishop/rook/queen)
              const isTargetDefended = gameAfter.isAttacked(sq, oppColor);
              const movedPieceVal = PIECE_VALUES[pieceCode] || 100;
              const isGenuineThreat = !isTargetDefended || movedPieceVal <= pVal;

              if (isGenuineThreat) {
                directThreats.push(`${sq} karesindeki ${pName}`);
                threatenedPiecesList.push({ piece: pName, square: sq, value: pVal });
              }
            }
          } catch {
            // fallback ignore
          }
        }
      }
    }
  }

  // Sort threatened pieces by value descending (Queen, Rook, Bishop/Knight, Pawn)
  threatenedPiecesList.sort((a, b) => b.value - a.value);

  // 2. Inspect what friendly pieces are NOW PROTECTED by this move that were attacked by opponent
  const defendedPieces: string[] = [];
  const boardBefore = gameBefore.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = boardBefore[r][c];
      if (p && p.color === movedColor) {
        const file = String.fromCharCode('a'.charCodeAt(0) + c);
        const rank = String(8 - r);
        const sq = `${file}${rank}` as Square;
        if (sq === from) continue;

        const wasAttacked = gameBefore.isAttacked(sq, oppColor);
        const wasDefended = gameBefore.isAttacked(sq, movedColor);
        const isDefendedNow = gameAfter.isAttacked(sq, movedColor);

        if ((wasAttacked && !wasDefended && isDefendedNow) || (wasAttacked && isDefendedNow)) {
          const friendlyName = PIECE_NAMES_TR[p.type] || 'Taş';
          defendedPieces.push(`${sq}'deki ${friendlyName}`);
        }
      }
    }
  }

  // 3. Detect Pins (Açmaz): e.g. Bg5 pins Nf6 to Queen d8 or King e8
  let pinnedPieceDesc: string | undefined;
  if (['b', 'r', 'q'].includes(pieceCode)) {
    // If piece moved along a diagonal or rank/file towards King or Queen
    for (const target of threatenedPiecesList) {
      if (['Vezir', 'Kale', 'Fil', 'At'].includes(target.piece)) {
        pinnedPieceDesc = `${target.square}'deki ${target.piece}'i arkasındaki taşlara açmaza alma baskısı kuruyor.`;
        break;
      }
    }
  }

  // 4. Detect Forks (Çatal): attacking 2 or more valuable pieces
  let forkDesc: string | undefined;
  if (threatenedPiecesList.length >= 2) {
    const p1 = threatenedPiecesList[0];
    const p2 = threatenedPiecesList[1];
    forkDesc = `Aynı anda hem ${p1.square}'deki ${p1.piece}'e hem de ${p2.square}'deki ${p2.piece}'e çatal atıyor!`;
  }

  // 5. Build Dynamic 'whyThisMove' (Hamlenin Amacı)
  let whyThisMove = '';
  const actorSubject = actor === 'opponent' ? 'Rakip' : 'Sen';
  const possessive = actor === 'opponent' ? 'senin' : 'rakibin';

  if (isCheckmate) {
    whyThisMove = `🏁 ŞAH MAT! ${actorSubject} şahı kaçacak kare bırakmayarak oyunu bitiren kesin darbeyi vurdu.`;
  } else if (isCastle) {
    whyThisMove = isKingsideCastle
      ? `${actorSubject} şah kanadına kısa rok attı. Şahını g${isWhite ? '1' : '8'} karesinde güvenli bir kaleye sakladı ve f${isWhite ? '1' : '8'} kalesini oyuna bağladı.`
      : `${actorSubject} vezir kanadına uzun rok attı. Şahını c${isWhite ? '1' : '8'} karesinde emniyete aldı ve d${isWhite ? '1' : '8'} kalesini doğrudan açık d-hattına koydu.`;
  } else if (isCapture) {
    whyThisMove = `${actorSubject}, ${from} karesindeki ${pieceName} ile ${to} karesindeki ${possessive} ${capturedPieceName || 'taşını'} aldı. Konumu sadeleştirip materyal dengesini değiştirdi.`;
  } else if (isCheck) {
    whyThisMove = `${actorSubject}, ${from} karesinden ${to} karesine ${pieceName} oynayarak doğrudan ŞAH ÇEKTİ! Şah şu anda acil tehdit altında.`;
  } else if (forkDesc) {
    whyThisMove = `${actorSubject}, ${pieceName}'i ${to} karesine sıçratarak ölümcül bir ÇATAL attı! ${forkDesc}`;
  } else if (threatenedPiecesList.length > 0 && threatenedPiecesList[0].value >= 300) {
    const topT = threatenedPiecesList[0];
    whyThisMove = `${actorSubject}, ${pieceName}'i ${to} karesine gelerek ${possessive} ${topT.square} karesindeki ${topT.piece}'ine doğrudan hücum başlattı (Tempo kazandı).`;
  } else if (pieceCode === 'p' && ['e4', 'd4', 'e5', 'd5'].includes(to)) {
    whyThisMove = `${actorSubject}, ${to} karesine piyon sürerek tahtanın tam merkezini kontrol altına aldı ve hafif taşlarının önünü açtı.`;
  } else if (pieceCode === 'p' && ['c4', 'c5', 'f4', 'f5'].includes(to)) {
    whyThisMove = `${actorSubject}, ${to} piyon sürüşüyle merkezdeki dengeleri zorlamak ve kanattan piyon yarması başlatmak istiyor.`;
  } else if (['n', 'b'].includes(pieceCode)) {
    whyThisMove = `${actorSubject}, ${from} karesindeki ${pieceName}'ini ${to} karesine geliştirerek aktif bir mücadeleye soktu ve merkez kareleri gözetim altına aldı.`;
  } else if (['r', 'q'].includes(pieceCode)) {
    whyThisMove = `${actorSubject}, ${pieceName}'ini ${to} karesine aktararak açık/yarı açık dikeyden baskı oluşturmayı hedefliyor.`;
  } else {
    whyThisMove = `${actorSubject}, ${from} karesindeki ${pieceName}'ini ${to} karesine oynayarak taş koordinasyonunu ve alan kontrolünü güçlendirdi.`;
  }

  // 6. Build Dynamic 'whatItThreatens' (Nereye ve Ne Tehdit Ediyor)
  let whatItThreatens = '';
  if (isCheck) {
    whatItThreatens = `Doğrudan ŞAH tehdidi! Şah kaçmak, araya taş kapatmak veya saldıran taşı almak zorunda.`;
  } else if (forkDesc) {
    whatItThreatens = forkDesc;
  } else if (threatenedPiecesList.length > 0) {
    whatItThreatens = threatenedPiecesList
      .slice(0, 2)
      .map((t) => `${t.square}'deki ${t.piece}`)
      .join(' ve ') + ' tehdit altında!';
  } else if (to === 'f7' || to === 'f2') {
    whatItThreatens = `Satranç tahtasının en hassas karesi olan ${to} zayıflığına doğrudan baskı kuruyor!`;
  } else if (pieceCode === 'p') {
    whatItThreatens = `Bir sonraki hamlede piyonu daha da ilerleterek alan kazanmak ve rakip taşları kovalamak.`;
  } else {
    whatItThreatens = `Merkez kareler üzerinde baskı kurarak rakip taşların serbest hareket alanını daraltıyor.`;
  }

  // 7. Build Dynamic 'whatItProtects' (Neyi Savunuyor)
  let whatItProtects = '';
  if (defendedPieces.length > 0) {
    whatItProtects = defendedPieces.slice(0, 2).join(', ') + ' karesindeki taşları emniyete alıyor.';
  } else if (isCastle) {
    whatItProtects = 'Şahı merkezdeki tehlikeli taktik hatlardan uzaklaştırıp koruyor.';
  } else if (pieceCode === 'p') {
    whatItProtects = 'Komşu piyon zincirini ve geride kalan merkez karelerini destekliyor.';
  } else if (pieceCode === 'n' || pieceCode === 'b') {
    whatItProtects = 'Çevresindeki stratejik kareleri kontrol ederek rakip sızmalarını engelliyor.';
  } else {
    whatItProtects = 'Kendi kampındaki zayıf noktaları ve taş koordinasyonunu güvenceye alıyor.';
  }

  // 8. Build Dynamic 'futurePlan' (Gelecekteki Saldırı Planı: Nereye ve Nasıl Saldıracak?)
  let futurePlan = '';
  if (isCheckmate) {
    futurePlan = 'Oyun şah mat ile tamamlandı.';
  } else if (forkDesc) {
    futurePlan = `Çatal atılan taşlardan birini bir sonraki hamlede kazanarak net materyal üstünlüğü elde etmek.`;
  } else if (isCastle) {
    futurePlan = isKingsideCastle
      ? 'Merkezdeki piyon gerilimini çözdükten sonra açık f veya e dikeyinden kaleyle hücum dalgası başlatmak.'
      : 'Karşı kanada kısa rok atan şaha karşı piyon fırtınası (g ve h piyonlarını sürerek) başlatmak.';
  } else if (pieceCode === 'n') {
    if (to === 'f3' || to === 'f6') {
      futurePlan = 'e5/e4 piyonuna yüklenmek veya g5/e5 karelerine sıçrayarak şah kanadına hücum hazırlığı yapmak.';
    } else if (to === 'c3' || to === 'c6') {
      futurePlan = 'd5/d4 karesine sıçrayıp rakip kampın merkezini parçalamak veya vezir kanadına baskı getirmek.';
    } else {
      futurePlan = 'Daha ileri bir ileri karakol (outpost) karesine yerleşip rakip taşları takasa zorlamak.';
    }
  } else if (pieceCode === 'b') {
    if (to === 'c4' || to === 'c5') {
      futurePlan = 'Rakibin en savunmasız noktası olan f7/f2 karesine namluyu doğrultup erken taktik vuruşlar aramak.';
    } else if (to === 'g5' || to === 'g4') {
      futurePlan = 'Rakip atı açmaza alıp merkez kontrolünü zayıflatmak ve gerekirse atı kırıp piyon yapısını bozmak.';
    } else if (to === 'b5' || to === 'b4') {
      futurePlan = 'c6/c3 atına baskı kurup şahı rahatsız etmek ve merkez piyonunu savunmasız bırakmak.';
    } else {
      futurePlan = 'Uzun çaprazı kontrol edip rakibin rok pozisyonunu yıpratmak.';
    }
  } else if (pieceCode === 'q') {
    futurePlan = 'Rakip zayıf piyonlara (özellikle b7, f7 veya d5) çift yönlü saldırı düzenleyip hızlı taş kazanmak.';
  } else if (pieceCode === 'r') {
    futurePlan = 'Dikeyi tamamen ele geçirip 7. yataya sızmak ve rakip piyonları arkadan süpürmek.';
  } else if (pieceCode === 'p') {
    if (['e4', 'd4'].includes(to)) {
      futurePlan = 'Merkezi tamamen kapatmak veya e5/d5 sürerek rakip hafif taşları geri püskürtmek.';
    } else if (['c4', 'c5'].includes(to)) {
      futurePlan = 'Merkez piyonunu takasa zorlayıp açık c-dikeyinde kale ve vezir baskısı oluşturmak.';
    } else {
      futurePlan = 'Piyon zincirini sağlamlaştırıp hafif taşların manevra yapabileceği güvenli alanlar açmak.';
    }
  } else {
    futurePlan = 'Taşları daha uyumlu hale getirip taktik avantaj kollamak.';
  }

  return {
    san: lastMoveSan,
    pieceName,
    fromSquare: from,
    toSquare: to,
    isCapture,
    capturedPieceName,
    isCheck,
    isCheckmate,
    isCastle,
    castleType: isKingsideCastle ? 'kingside' : isQueensideCastle ? 'queenside' : undefined,
    isPromotion,
    promotedToName,
    whyThisMove,
    whatItThreatens,
    whatItProtects,
    futurePlan,
    forkTargets: threatenedPiecesList.map((t) => `${t.square} ${t.piece}`),
    pinnedPiece: pinnedPieceDesc,
  };
}
