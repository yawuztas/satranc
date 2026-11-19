import { Chess } from 'chess.js';

export interface PvStepExplanation {
  ply: number;
  moveNumber: number;
  isWhite: boolean;
  san: string;
  from: string;
  to: string;
  pieceName: string;
  highlightTag?: string; // '⚡ Merkez Yarması', '👑 Şah Emniyeti', '⚔️ Taş Takası', '🎯 Hücum Hazırlığı'
  description: string;
}

export interface PvChainAnalysis {
  sanMoves: string[];
  steps: PvStepExplanation[];
  strategicTheme: string;
  breakthroughMove?: string;
  summarySentence: string;
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
 * Analyzes Stockfish's 6-10 move deep Principal Variation (PV) chain
 * and translates it into an intuitive, step-by-step master attack road.
 */
export function explainPvChain(fen: string, pvSans: string[]): PvChainAnalysis | null {
  if (!pvSans || pvSans.length === 0) return null;

  const simGame = new Chess(fen);
  const steps: PvStepExplanation[] = [];
  let breakthroughMove: string | undefined;
  let hasCentralPawnBreak = false;
  let hasCastling = false;
  let hasAttackOnKing = false;

  const startTurn = simGame.turn(); // 'w' or 'b'
  const isWhiteStarted = startTurn === 'w';

  const fenTokens = fen.split(' ');
  const baseFullMove = fenTokens[5] ? parseInt(fenTokens[5], 10) : 1;
  const isFenBlackTurn = fenTokens[1] === 'b';

  for (let i = 0; i < Math.min(pvSans.length, 8); i++) {
    const san = pvSans[i];
    const currentTurn = simGame.turn();
    const isWhite = currentTurn === 'w';
    const plyOffset = isFenBlackTurn ? i + 1 : i;
    const moveNumber = baseFullMove + Math.floor(plyOffset / 2);

    let moveObj;
    try {
      moveObj = simGame.move(san);
    } catch {
      break;
    }
    if (!moveObj) break;

    const pieceName = PIECE_NAMES_TR[moveObj.piece] || 'Taş';
    const isCapture = Boolean(moveObj.captured);
    const isCastle = san === 'O-O' || san === 'O-O-O';
    const isCheck = san.includes('+');
    const isMate = san.includes('#');
    const isCenterBreak = moveObj.piece === 'p' && ['d4', 'e4', 'd5', 'e5', 'c4', 'c5', 'f4', 'f5'].includes(moveObj.to);

    let highlightTag: string | undefined;
    let description = '';

    if (isMate) {
      highlightTag = '🏁 ŞAH MAT';
      description = `Rakip şah mat ağına alınıyor ve oyun bitiriliyor.`;
    } else if (isCheck) {
      highlightTag = '⚡ Şah Saldırısı';
      description = `${pieceName} ile şah çekerek rakip şahın emniyeti bozuluyor.`;
      hasAttackOnKing = true;
    } else if (isCastle) {
      highlightTag = '👑 Şah Güvenliği (Rok)';
      description = `Şah güvenli siperine çekilirken kale açık hatta bağlanıyor.`;
      hasCastling = true;
    } else if (isCenterBreak) {
      highlightTag = '💥 Merkez Yarması';
      description = `${moveObj.to} sürüşüyle merkeze darbe vurulup rakibin piyon yapısı zorlanıyor.`;
      hasCentralPawnBreak = true;
      if (!breakthroughMove) breakthroughMove = san;
    } else if (isCapture) {
      const capturedName = PIECE_NAMES_TR[moveObj.captured || 'p'] || 'taş';
      highlightTag = '⚔️ Taktik Alış';
      description = `${moveObj.to}'deki ${capturedName} alınarak konum sadeleştiriliyor.`;
    } else if (moveObj.piece === 'n' || moveObj.piece === 'b') {
      highlightTag = '🚀 Taş Gelişimi';
      description = `${pieceName}, ${moveObj.to} karesine gelerek aktif mücadeleye katılıyor.`;
    } else if (moveObj.piece === 'r' || moveObj.piece === 'q') {
      highlightTag = '🎯 Ağır Taş Baskısı';
      description = `${pieceName}, ${moveObj.to} karesinde dikey hat kontrolünü ele geçiriyor.`;
    } else {
      description = `${pieceName} ${moveObj.to} karesine ilerletilerek konum güçlendiriliyor.`;
    }

    steps.push({
      ply: i + 1,
      moveNumber,
      isWhite,
      san,
      from: moveObj.from,
      to: moveObj.to,
      pieceName,
      highlightTag,
      description,
    });
  }

  // Generate Strategic Synthesis Sentence
  let strategicTheme = 'Konumsal Gelişim & Taş Koordinasyonu';
  let summarySentence = '';

  const actorName = isWhiteStarted ? 'Beyaz' : 'Siyah';
  const oppName = isWhiteStarted ? 'Siyah' : 'Beyaz';

  if (hasCentralPawnBreak && breakthroughMove) {
    strategicTheme = 'Merkez Yarması & Alan Hakimiyeti';
    summarySentence = `Motorun hesapladığı çok hamleli planda ${actorName}, ${breakthroughMove} sürüşüyle merkezi parçalayıp rakip hafif taşların alanını daraltmayı hedefliyor.`;
  } else if (hasAttackOnKing) {
    strategicTheme = 'Şah Kanadı Hücumu & Mat Ağı';
    summarySentence = `Motorun varyantında ${actorName}, taşlarını doğrudan ${oppName}'ın şah kanadına yığarak taktik vuruşlar ve mat ağı hazırlıyor.`;
  } else if (hasCastling) {
    strategicTheme = 'Şah Emniyeti & Açık Hat Savaşları';
    summarySentence = `Önce şahı rok ile emniyete alıp, ardından kaleleri merkezdeki açık d ve e hatlarına yığma stratejisi izleniyor.`;
  } else {
    strategicTheme = 'Tahta Hakimiyeti & Zayıflıklara Baskı';
    summarySentence = `Alet koordinasyonunu maksimum seviyeye çıkarıp rakip kampta oluşacak taktik açıklara yüklenme planı.`;
  }

  return {
    sanMoves: steps.map((s) => s.san),
    steps,
    strategicTheme,
    breakthroughMove,
    summarySentence,
  };
}
