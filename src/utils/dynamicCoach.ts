import { Chess, type Square } from 'chess.js';
import type { CandidateCharacterBadge, CandidateMove, MoveAnalysis } from '../types/tree';
import type { EngineEvaluation } from '../types/chess';
import { MAX_CANDIDATE_CHOICES } from '../types/lesson';
import { getCandidateColor } from '../data/openingTreeData';
import { evaluateMoveTacticalSafety, isMoveTacticallySafe, PIECE_VALUES, type TacticalEvaluation } from './tacticalSafety';
import { explainConcreteMove } from './concreteMoveExplainer';
import { resolveTargetOpening, resolveCounterOpenings, detectImmediateThreat } from './counterOpeningResolver';
import { findHistoricalChampionDuel, findChampionContinuationsFromPosition } from '../data/historicalChampionGames';
import type { OpeningStatsResponse } from '../services/lichessService';

export { PIECE_VALUES };

/**
 * Score move safety using unified tactical evaluator
 */
export function scoreMoveSafety(chess: Chess, move: any): number {
  return evaluateMoveTacticalSafety(chess, move).score;
}

/**
 * Intelligent Dynamic Coach & Tactical Safety Engine
 * 1. Strictly filters out blunders (hanging pieces, suicide attacks, lost exchanges).
 * 2. Guarantees that every candidate move serves a clear, pedagogically sound chess purpose.
 * 3. Highlights best engine moves, tempo attacks on exposed pieces, safe development, and castling.
 */
export function enhanceAnalysisWithDynamicCoach(
  chess: Chess,
  historyMoves: string[],
  baseAnalysis: MoveAnalysis,
  engineEvaluation: EngineEvaluation | null,
  masterStats?: OpeningStatsResponse | null
): MoveAnalysis {
  // Discard stale engine evaluation if it belongs to an older position
  const validEngine = (engineEvaluation && (!engineEvaluation.fen || engineEvaluation.fen === chess.fen()))
    ? engineEvaluation
    : null;

  const legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length === 0) {
    return {
      ...baseAnalysis,
      title: chess.isCheckmate() ? '🏁 Şah Mat! Oyun Bitti' : '🤝 Pat / Berabere! Oyun Bitti',
      coachTip: chess.isCheckmate()
        ? 'Tebrikler! Şah mat gerçekleşti.'
        : 'Konum beraberlikle sonuçlandı.',
      candidateMoves: []
    };
  }

  const turn = chess.turn(); // 'w' or 'b'
  const isWhiteToMove = turn === 'w';
  const lastMoveSan = historyMoves.length > 0 ? historyMoves[historyMoves.length - 1] : '';
  const moveMap = new Map(legalMoves.map((m) => [m.san, m]));
  const uciMap = new Map(legalMoves.map((m) => [m.from + m.to, m]));

  const candidateList: CandidateMove[] = [];
  const addedSans = new Set<string>();

  const isPawnSan = (san: string) => /^[a-h]/.test(san);
  const isKnightSan = (san: string) => /^N/.test(san);
  const isPieceSan = (san: string) => /^[NBRQK]|O-O/.test(san);

  // 1. Gather curated opening book candidates from baseAnalysis (e.g. 2.c4 Queen's Gambit, London, etc.)
  // These represent grandmaster pedagogy and directly match coachTip!
  const curatedCandidates: CandidateMove[] = [];
  if (baseAnalysis.candidateMoves && baseAnalysis.candidateMoves.length > 0) {
    let bookPawnCount = 0;
    for (const cand of baseAnalysis.candidateMoves) {
      if (curatedCandidates.length >= 3) break;
      const isPawn = isPawnSan(cand.san);
      // Diversity rule: Do not take more than 2 pawns from book if other piece moves exist
      if (isPawn && bookPawnCount >= 2 && baseAnalysis.candidateMoves.some((c) => !isPawnSan(c.san))) {
        continue;
      }

      const legalMove = moveMap.get(cand.san) || (cand.from && cand.to ? uciMap.get(cand.from + cand.to) : undefined);
      if (legalMove) {
        const candEval = evaluateMoveTacticalSafety(chess, legalMove, validEngine);
        if (candEval.isSafe) {
          if (isPawn) bookPawnCount++;
          curatedCandidates.push({
            ...cand,
            from: legalMove.from,
            to: legalMove.to,
            why: candEval.isSacrifice ? candEval.reason : cand.why,
            futureAttack: candEval.isSacrifice && candEval.pvSan && candEval.pvSan.length > 1
              ? `🎁 KOMBİNEZON & TUZAK PLANI: Eğer rakip bu taşı alırsa (${candEval.pvSan[1]}), devamında ${candEval.pvSan.slice(2, 5).join(' -> ')} oynayarak oyunu lehimize çevireceğiz!`
              : cand.futureAttack,
            tag: candEval.isSacrifice
              ? (candEval.reason.includes('MAT') ? '⚡ Taş Fedası ile Mat' : candEval.isGambit ? '⚔️ Gambit (Gelişim Fedası)' : '🎁 Taktik Taş Fedası (Kombinezon)')
              : (cand.tag || '📖 Teorik Hat'),
          });
        }
      }
    }
  }

  // 2. Identify Stockfish Rank 1 (best engine move)
  let engineRank1Move: CandidateMove | null = null;
  if (validEngine?.multiPV && validEngine.multiPV.length > 0) {
    const sortedLines = [...validEngine.multiPV].sort((a, b) => a.rank - b.rank);
    const rank1 = sortedLines[0];
    if (rank1.move && rank1.move.length >= 4) {
      const from = rank1.move.slice(0, 2);
      const to = rank1.move.slice(2, 4);
      const promo = rank1.move.length > 4 ? rank1.move[4] : undefined;
      const engineCandidate = legalMoves.find((m) => m.from === from && m.to === to && (!promo || m.promotion === promo));
      if (engineCandidate) {
        const evalResult = evaluateMoveTacticalSafety(chess, engineCandidate, validEngine);
        if (evalResult.isSafe) {
          const evalScoreText = rank1.isMate ? `Mat #${Math.abs(rank1.mateIn || 1)}` : `${rank1.score >= 0 ? '+' : ''}${(rank1.score / 100).toFixed(1)}`;
          engineRank1Move = buildCandidateFromMove(chess, engineCandidate, '⭐ En İyi Hamle (Stockfish 1. Saldırı Hattı)', true, evalResult, evalScoreText);
        }
      }
    }
  } else if (validEngine?.bestMove && validEngine.bestMove.length >= 4) {
    const from = validEngine.bestMove.slice(0, 2);
    const to = validEngine.bestMove.slice(2, 4);
    const promo = validEngine.bestMove.length > 4 ? validEngine.bestMove[4] : undefined;
    const engineCandidate = legalMoves.find((m) => m.from === from && m.to === to && (!promo || m.promotion === promo));
    if (engineCandidate) {
      const evalResult = evaluateMoveTacticalSafety(chess, engineCandidate, validEngine);
      if (evalResult.isSafe) {
        engineRank1Move = buildCandidateFromMove(chess, engineCandidate, '⭐ En İyi Hamle (Büyükusta)', true, evalResult);
      }
    }
  }

  // Dynamic 5th Candidate Logic ("Puanlar Yakınsa / Gizli Cevher"):
  // If engine scores between top lines are within 30 cp (0.3 piyon) or we have a rich curated book,
  // allow 5 choices instead of 4 so ambitious/surprise moves are not lost!
  let allowFifthCandidate = false;
  if (validEngine?.multiPV && validEngine.multiPV.length >= 3) {
    const scores = validEngine.multiPV
      .map((p) => p.score)
      .filter((s): s is number => typeof s === 'number');
    if (scores.length >= 3) {
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);
      if (Math.abs(maxScore - minScore) <= 30) {
        allowFifthCandidate = true;
      }
    }
  }
  if (!allowFifthCandidate && (curatedCandidates.length >= 4 || (validEngine?.multiPV && validEngine.multiPV.length >= 4))) {
    allowFifthCandidate = true;
  }
  const maxChoices = allowFifthCandidate ? 5 : MAX_CANDIDATE_CHOICES;

  // 3. Assemble Candidates with Strategic Diversity & High MultiPV Priority:
  // Step 3a: Add Stockfish Rank 1 if available
  if (engineRank1Move) {
    const existingCurated = curatedCandidates.find((c) => c.san === engineRank1Move!.san);
    if (existingCurated) {
      existingCurated.tag = '⭐ En İyi Hamle & Büyükusta Tercihi';
      if (engineRank1Move.leadsTo && engineRank1Move.leadsTo !== 'Sağlam Konumsal Düzen') {
        existingCurated.leadsTo = engineRank1Move.leadsTo;
      }
      candidateList.push(existingCurated);
      addedSans.add(existingCurated.san);
    } else {
      candidateList.push(engineRank1Move);
      addedSans.add(engineRank1Move.san);
    }
  }

  // Step 3b: Prioritize Stockfish MultiPV lines (Rank 2, 3, 4...)
  // Stockfish lines are deeply calculated and GUARANTEED never to hang or lose a piece!
  if (validEngine?.multiPV && validEngine.multiPV.length > 0 && candidateList.length < maxChoices) {
    const sortedLines = [...validEngine.multiPV].sort((a, b) => a.rank - b.rank);
    for (const line of sortedLines) {
      if (candidateList.length >= maxChoices) break;
      if (!line.move || line.move.length < 4) continue;
      const from = line.move.slice(0, 2);
      const to = line.move.slice(2, 4);
      const promo = line.move.length > 4 ? line.move[4] : undefined;
      const engineCand = legalMoves.find((m) => m.from === from && m.to === to && (!promo || m.promotion === promo));
      if (engineCand && !addedSans.has(engineCand.san)) {
        const evalResult = evaluateMoveTacticalSafety(chess, engineCand, validEngine);
        if (evalResult.isSafe) {
          addedSans.add(engineCand.san);
          const evalScoreText = line.isMate ? `Mat #${Math.abs(line.mateIn || 1)}` : `${line.score >= 0 ? '+' : ''}${(line.score / 100).toFixed(1)}`;
          const isKnight = engineCand.piece === 'n';
          const defaultTag = line.rank === 1
            ? '⭐ En İyi Hamle (Stockfish)'
            : isKnight
            ? '🐴 Stockfish At Saldırı Planı'
            : line.rank === 2
            ? '⚡ 2. Taktik Hücum Hattı'
            : line.rank === 3
            ? '🎯 3. Alternatif Saldırı Planı'
            : '💎 Sürpriz Silah';

          const matchingCurated = curatedCandidates.find((c) => c.san === engineCand.san);
          const candObj = buildCandidateFromMove(chess, engineCand, matchingCurated?.tag || defaultTag, false, evalResult, evalScoreText);
          if (matchingCurated) {
            candObj.why = matchingCurated.why;
            candObj.leadsTo = matchingCurated.leadsTo;
            if (matchingCurated.futureAttack) candObj.futureAttack = matchingCurated.futureAttack;
          }
          candidateList.push(candObj);
        }
      }
    }
  }

  // Step 3c: Fill remaining slots with curated book candidates ONLY if strictly verified as safe!
  for (const c of curatedCandidates) {
    if (candidateList.length >= maxChoices) break;
    if (!addedSans.has(c.san)) {
      const legalMatch = moveMap.get(c.san) || (c.from && c.to ? uciMap.get(c.from + c.to) : undefined);
      if (legalMatch) {
        const candEval = evaluateMoveTacticalSafety(chess, legalMatch, validEngine);
        if (candEval.isSafe) {
          candidateList.push(c);
          addedSans.add(c.san);
        }
      }
    }
  }

  // Step 3d: ACTIVE WORLD CHAMPION CONTINUATION INJECTION:
  // If in this position a legendary World Champion (Kasparov, Carlsen, Fischer, Spassky, Tal, Karpov) played a move,
  // actively guarantee that this historic gem is included and tagged for the user!
  const champContinuations = findChampionContinuationsFromPosition(historyMoves);
  for (const champ of champContinuations) {
    const legalMatch = moveMap.get(champ.moveSan) || legalMoves.find((m) => m.san === champ.moveSan);
    if (!legalMatch) continue;

    const evalResult = evaluateMoveTacticalSafety(chess, legalMatch, validEngine);
    if (!evalResult.isSafe) continue;

    if (!addedSans.has(legalMatch.san)) {
      if (candidateList.length < 5) {
        addedSans.add(legalMatch.san);
        const tag = `👑 Şampiyonların Tercihi (${champ.duel.white})`;
        const candObj = buildCandidateFromMove(chess, legalMatch, tag, false, evalResult);
        candObj.historicalGame = champ.duel;
        candObj.why = `⭐ EFSANEVİ BÜYÜKUSTA MAÇI: ${champ.duel.white} vs. ${champ.duel.black} (${champ.duel.year}). ${champ.duel.story}`;
        candObj.leadsTo = `${champ.duel.white} (${champ.duel.year})`;
        candObj.color = 'yellow';
        candidateList.push(candObj);
      }
    } else {
      const existing = candidateList.find((c) => c.san === legalMatch.san);
      if (existing) {
        existing.historicalGame = champ.duel;
        if (!existing.tag?.includes('En İyi')) {
          existing.tag = `👑 Şampiyonların Tercihi: ${champ.duel.white}`;
        }
      }
    }
  }

  // Step 3e: PIECE DIVERSITY & KNIGHT GUARANTEE PROTOCOL
  // If candidateList consists ONLY of pawns (e.g. c5, e5, e6 or d4, c4),
  // according to fundamental chess opening pedagogy, a player must never be left with only pawn moves
  // when safe piece development (especially Knights Nf3/Nc3/Nf6/Nc6) is available!
  const hasPieceMove = candidateList.some((c) => isPieceSan(c.san));
  if (!hasPieceMove) {
    const safePieceMoves = legalMoves
      .filter((m) => !addedSans.has(m.san) && isPieceSan(m.san) && isMoveTacticallySafe(chess, m, validEngine))
      .map((m) => ({ move: m, eval: evaluateMoveTacticalSafety(chess, m, validEngine) }))
      .sort((a, b) => {
        // 1. Knights strictly prioritized
        const aIsKnight = a.move.piece === 'n' || isKnightSan(a.move.san) ? 1 : 0;
        const bIsKnight = b.move.piece === 'n' || isKnightSan(b.move.san) ? 1 : 0;
        if (aIsKnight !== bIsKnight) return bIsKnight - aIsKnight;
        // 2. Developing toward active central squares
        const centralSquares = ['f3', 'c3', 'f6', 'c6', 'e2', 'd2', 'e7', 'd7', 'c4', 'f4', 'b5', 'g5', 'e3', 'd3'];
        const aCenter = centralSquares.includes(a.move.to) ? 1 : 0;
        const bCenter = centralSquares.includes(b.move.to) ? 1 : 0;
        if (aCenter !== bCenter) return bCenter - aCenter;
        return b.eval.score - a.eval.score;
      });

    if (safePieceMoves.length > 0) {
      const bestPiece = safePieceMoves[0];
      const tag = bestPiece.move.piece === 'n'
        ? '🐴 Doğal Taş Gelişimi (At Hamlesi)'
        : bestPiece.move.san.includes('O-O')
        ? '🏰 Kral Emniyeti (Rok)'
        : '🚀 Doğal Taş Gelişimi';

      const pieceCandidate = buildCandidateFromMove(chess, bestPiece.move, tag, false, bestPiece.eval);

      if (candidateList.length < maxChoices) {
        candidateList.push(pieceCandidate);
        addedSans.add(pieceCandidate.san);
      } else {
        // Replace the last pawn candidate with this guaranteed knight/piece move!
        const lastPawnIdx = candidateList.map((c) => isPawnSan(c.san)).lastIndexOf(true);
        if (lastPawnIdx !== -1) {
          candidateList[lastPawnIdx] = pieceCandidate;
          addedSans.add(pieceCandidate.san);
        } else {
          candidateList[candidateList.length - 1] = pieceCandidate;
          addedSans.add(pieceCandidate.san);
        }
      }
    }
  }

  // 3. Fallback: ONLY if candidateList is STILL completely empty (e.g. engine evaluation pending and no opening book match),
  // select the single most solid developing move so the user isn't left empty.
  if (candidateList.length === 0) {
    const safeMoves = legalMoves
      .filter((m) => !addedSans.has(m.san) && isMoveTacticallySafe(chess, m, validEngine))
      .map((m) => ({ move: m, eval: evaluateMoveTacticalSafety(chess, m, validEngine) }))
      .sort((a, b) => b.eval.score - a.eval.score);

    if (safeMoves.length > 0) {
      candidateList.push(buildCandidateFromMove(chess, safeMoves[0].move, '⭐ Önerilen Gelişim Hamlesi', true, safeMoves[0].eval));
    }
  }

  // 4. Concrete Board-Accurate Move Explanation for the last move played
  const lastMoveActor = isWhiteToMove ? 'opponent' : 'player';
  const concreteExpl = explainConcreteMove(historyMoves, lastMoveActor);

  // 5. Detect immediate threats on friendly pieces FIRST
  const threatInfo = detectImmediateThreat(chess);

  // 6. Classify Opponent's Last Move (only if early opening and no active tactical threat)
  const opponentAnalysis = analyzeOpponentDeviation(lastMoveSan, historyMoves.length, threatInfo.hasUrgentThreat);

  // 7. Tailor Master Coach Tip
  let coachTip = baseAnalysis.coachTip || '';
  let whyThisMove = concreteExpl?.whyThisMove || baseAnalysis.whyThisMove;
  let whatItThreatens = concreteExpl?.whatItThreatens || baseAnalysis.whatItThreatens;
  let whatItProtects = concreteExpl?.whatItProtects || baseAnalysis.whatItProtects;
  let futurePlan = concreteExpl?.futurePlan || baseAnalysis.futurePlan;

  const score = validEngine?.score ?? 0;
  const playerAdvantage = isWhiteToMove ? score : -score;
  const topMove = candidateList[0];

  if (chess.inCheck()) {
    coachTip = `⚠️ ŞAH TEHDİDİ! Şahınız şu anda tehdit altında. En doğru hamle şahı kaçmak, araya taş koymak veya tehdit eden taşı almaktır. Hocanın önerdiği hamle: ${topMove ? topMove.san : ''}!`;
    whyThisMove = concreteExpl?.whyThisMove || 'Rakip doğrudan şahınıza saldırı başlattı.';
    whatItThreatens = 'Doğrudan ŞAH tehdidi! Şah kaçmak, araya taş kapatmak veya saldıran taşı almak zorunda.';
    futurePlan = concreteExpl?.futurePlan || 'Önce şahınızı güvene alın, ardından rakibin açıkta kalan taşlarına karşı saldırı başlatın.';
  } else if (threatInfo.hasUrgentThreat && threatInfo.threatDescription) {
    coachTip = `🚨 ${threatInfo.threatDescription} ${topMove ? `Hocanın önerdiği kurtarma hamlesi: ${topMove.san}!` : ''}`;
    whatItThreatens = threatInfo.threatDescription;
    whyThisMove = 'Tehdit altındaki taşı kurtarmak veya savunmayı kurmak zorunludur.';
  } else if (opponentAnalysis.isIrregular && opponentAnalysis.coachAdvice) {
    coachTip = `💡 ${opponentAnalysis.coachAdvice} En iyi karşı hamleniz: ${topMove ? topMove.san : ''}!`;
    whyThisMove = concreteExpl?.whyThisMove || opponentAnalysis.why;
    whatItThreatens = concreteExpl?.whatItThreatens || opponentAnalysis.threat;
    futurePlan = concreteExpl?.futurePlan || opponentAnalysis.plan;
  } else if (playerAdvantage >= 200) {
    coachTip = `🔥 BÜYÜK ÜSTÜNLÜK SENDE! Rakip açılışı yanlış oynadı veya taktik bir hata yaptı (+${(playerAdvantage / 100).toFixed(1)}). Bu avantajı somutlaştırmak için ${topMove ? topMove.san : ''} hamlesiyle zayıflıklara yüklenin!`;
  } else if (!coachTip && masterStats?.moves && masterStats.moves.length > 0 && masterStats.totalGames > 10) {
    const topStatMove = masterStats.moves[0];
    const total = masterStats.totalGames;
    const pct = total > 0 ? Math.round((topStatMove.totalGames / total) * 100) : 0;
    if (validEngine?.bestMoveSan && validEngine.bestMoveSan !== topStatMove.san) {
      coachTip = `Büyükustalar bu konumda en çok ${topStatMove.san} hamlesini tercih ediyor (%${pct}), Stockfish motoru ise taktik olarak ${validEngine.bestMoveSan} hamlesini öneriyor.`;
    } else {
      coachTip = `Bu konumda büyükusta turnuvalarında ${total.toLocaleString('tr-TR')} oyun kaydedildi. En çok tercih edilen ana devam yolu ${topStatMove.san} (%${pct}).`;
    }
  }

  // 8. Enrich Candidates: Character Badges, Historical Champion Games, Master Stats, Counter-Openings
  for (let i = 0; i < candidateList.length; i++) {
    const cand = candidateList[i];
    cand.targetOpening = resolveTargetOpening(historyMoves, cand.san);
    cand.counterOpenings = resolveCounterOpenings(historyMoves, cand.san, masterStats);

    if (threatInfo.hasUrgentThreat) {
      cand.isForcedDefense = true;
    }

    // Dynamic 5th Surprise Weapon Flag
    if (i >= 4 && allowFifthCandidate) {
      cand.isSurpriseWeapon = true;
      cand.tag = '💎 5. Sürpriz Silah (Gizli Cevher)';
    }

    // Historical Champion Duel Lookup
    cand.historicalGame = cand.historicalGame || findHistoricalChampionDuel(historyMoves, cand.san, masterStats?.topGames);

    // Lichess FIDE Masters Stats Lookup
    if (masterStats?.moves && Array.isArray(masterStats.moves)) {
      const stat = masterStats.moves.find((m) => m.san === cand.san);
      if (stat && stat.totalGames > 0) {
        cand.masterStats = {
          totalGames: stat.totalGames,
          whiteWinRate: stat.whiteWinRate,
          drawRate: stat.drawRate,
          blackWinRate: stat.blackWinRate,
        };
      }
    }

    // Character Badge Assignment
    cand.characterBadge = assignCandidateCharacterBadge(
      cand,
      i === 0 && !cand.tag?.includes('Sürpriz'),
      Boolean(cand.isSurpriseWeapon)
    );
  }

  return {
    ...baseAnalysis,
    candidateMoves: candidateList,
    coachTip,
    whyThisMove: whyThisMove || 'Merkez kontrolünü sağlayın ve hafif taşlarınızı oyuna sokun.',
    whatItThreatens: whatItThreatens || 'Tahta hakimiyeti ve alan üstünlüğü.',
    whatItProtects: whatItProtects || 'Dost taşları ve kritik merkez hatlarını destekler.',
    futurePlan: futurePlan || 'Taş koordinasyonunu artırıp şah güvenliğini sağlamak.',
  };
}

/**
 * Builds candidate move card with tailored Turkish reasoning and concrete future attack plans
 */
function buildCandidateFromMove(
  chess: Chess,
  move: any,
  tag: string,
  isEngineBest: boolean,
  evalResult?: TacticalEvaluation,
  evalScoreText?: string
): CandidateMove {
  const turn = chess.turn();
  const oppColor = turn === 'w' ? 'b' : 'w';
  const pieceNameTr = getPieceNameTr(move.piece);

  const testChess = new Chess(chess.fen());
  try {
    testChess.move(move);
  } catch {
    // Fallback if illegal
  }

  // Check if the specifically moved piece attacks opponent high-value Queen
  const pieceAttacks = testChess.moves({ verbose: true }).filter((m) => m.from === move.to);
  const attacksQueen = pieceAttacks.some((m) => {
    const target = testChess.get(m.to as Square);
    return target && target.color === oppColor && target.type === 'q';
  });

  const wasFromAttacked = chess.isAttacked(move.from as Square, oppColor);

  let leadsTo = evalScoreText ? `Motor Skoru: ${evalScoreText}` : 'Sağlam Konumsal Düzen';
  let why = 'Taşınızı güvenli ve aktif bir kareye yerleştirerek tahta hakimiyetini artırır.';
  let threat = 'Merkez ve alan kontrolü';
  let futureAttack = 'Taş koordinasyonunu tamamlayıp şah güvenliğini sağlamak.';

  // If this move is an approved tactical sacrifice / combination / gambit
  if (evalResult?.isSacrifice) {
    leadsTo = evalResult.reason.includes('MAT')
      ? 'Mat Saldırısı Kombinezonu'
      : evalResult.isGambit
      ? 'Açılış Gambiti & Alan Baskısı'
      : 'Taktik Taş Fedası & Hücum';

    why = evalResult.reason;
    tag = evalResult.reason.includes('MAT')
      ? '⚡ Taş Fedası ile Mat'
      : evalResult.isGambit
      ? '⚔️ Gambit (Gelişim Fedası)'
      : '🎁 Taktik Taş Fedası (Kombinezon)';

    if (evalResult.pvSan && evalResult.pvSan.length > 1) {
      const oppReply = evalResult.pvSan[1];
      const followUp = evalResult.pvSan.slice(2, 5).join(' -> ');
      futureAttack = `🎁 KOMBİNEZON & TUZAK PLANI: Eğer rakip bu taşımızı alırsa (${oppReply}), devamında ${followUp || 'şah saldırısıyla'} oynayarak oyunu lehimize çevireceğiz!`;
    } else if (evalResult.isGambit) {
      futureAttack = '⚔️ GAMBİT STRATEJİSİ: Rakip piyonu yerse, açılan hatlardan hafif taşlarımızı süratle merkeze akıtarak rakip şaha baskı kuracağız.';
    }
  } else if (move.captured) {
    const capturedName = getPieceNameTr(move.captured);
    leadsTo = `${capturedName} Kazancı / Takası`;
    why = `${move.to} karesindeki ${capturedName} taşını alarak materyal dengesini sağlar veya avantaj kurar.`;
    threat = 'Rakip taşı tahtadan temizlemek';
    futureAttack = 'Açılan hatlardan kaleleri ve taşları rakip kampa aktarmak.';
  } else if (wasFromAttacked) {
    leadsTo = 'Tehditten Kaçış & Güvenlik';
    why = `Tehdit altındaki ${pieceNameTr} taşını güvenli ${move.to} karesine çekerek taş kaybını önler.`;
    threat = 'Taş emniyetini sağlamak';
    futureAttack = 'Taşı emniyete aldıktan sonra taş koordinasyonunu yeniden kurmak.';
  } else if (move.san.includes('+')) {
    leadsTo = 'Şah Saldırısı & Tempo';
    why = 'Şah çekerek rakibi savunmaya zorlar ve tempoyu elinizde tutar.';
    threat = 'Şaha doğrudan tehdit';
    futureAttack = 'Rakip şahı merkezde açıkta bırakıp diğer taşlarla hücumu büyütmek.';
  } else if (move.san === 'O-O' || move.san === 'O-O-O') {
    leadsTo = 'Kral Emniyeti & Kale Uyumu';
    why = 'Şahı tahtanın merkezindeki taktik tehlikelerden korur ve kaleyi oyuna bağlar.';
    threat = 'Merkez dikeyine kale baskısı getirmek';
    futureAttack = 'Kısa rok sonrası kaleyi açık d ve e hatlarına yönlendirip merkez yarması organize etmek.';
  } else if (attacksQueen) {
    leadsTo = 'Vezire Baskı & Tempo Kazancı';
    why = `${pieceNameTr} ile rakip vezire saldırarak tempoyla taş geliştirir ve rakibi savunmaya zorlar.`;
    threat = 'Rakip veziri merkezden uzaklaştırmak';
    futureAttack = 'Veziri kaçmak zorunda bıraktıktan sonra merkez kareleri hafif taşlarla tutarak şah kanadı hücumu hazırlamak.';
  } else if (move.piece === 'k') {
    leadsTo = 'Şah Emniyeti';
    why = 'Şahı merkezdeki taktik risklerden uzaklaştırıp güvenli kareye çeker.';
    threat = 'Şah güvenliğini sağlamak';
    futureAttack = 'Şahı güvenceye aldıktan sonra taş koordinasyonunu tamamlamak.';
  } else if (move.piece === 'p') {
    if (['e4', 'd4', 'e5', 'd5'].includes(move.to)) {
      leadsTo = 'Merkezde Alan Üstünlüğü';
      why = 'Merkezi doğrudan piyonla işgal ederek rakip taşların etkinliğini kısıtlar ve taşların önünü açar.';
      threat = 'Merkezden alan kazanıp rakibi geriletmek';
      futureAttack = 'Piyon desteğiyle hafif taşları ileri karakollara yerleştirmek.';
    } else {
      leadsTo = 'Piyon Yapısı & Profilaksi';
      why = 'Merkez piyonunu arkadan destekler ve rakip taşların sızabileceği kareleri kontrol eder.';
      threat = 'Sağlam bir savunma ve manevra alanı kurmak';
      futureAttack = 'Sağlam bir piyon yapısı üzerinden karşı hücum hazırlamak.';
    }
  } else if (['n', 'b'].includes(move.piece)) {
    const backRank = turn === 'w' ? '1' : '8';
    const isInitial = move.from.endsWith(backRank);
    leadsTo = evalScoreText ? `Motor Skoru: ${evalScoreText}` : 'Doğal Taş Gelişimi';
    why = isInitial
      ? `${pieceNameTr} taşını oyuna sokarak gelişimi hızlandırır ve merkez kareleri denetim altına alır.`
      : `${pieceNameTr} taşını daha aktif bir kareye yönlendirerek taş koordinasyonunu artırır.`;
    threat = 'Merkez ve çevre kareleri denetim altına almak';
    futureAttack = 'İleride rakip zayıf karelere taş sıçramaları hazırlamak.';
  } else if (['r', 'q'].includes(move.piece)) {
    leadsTo = evalScoreText ? `Motor Skoru: ${evalScoreText}` : 'Ağır Taş Aktivasyonu';
    why = `${pieceNameTr} taşını açık veya yarı açık hatlara aktararak tahta etkinliğini artırır.`;
    threat = 'Dikey hatlar üzerinde baskı kurmak';
    futureAttack = 'Açık hatlar üzerinden rakip kampa sızma planları hazırlamak.';
  }

  // If engine provided a multi-step continuation for this move
  if (!evalResult?.isSacrifice && evalResult?.pvSan && evalResult.pvSan.length > 2) {
    futureAttack = `Planlanan devam yolu: ${evalResult.pvSan.slice(1, 4).join(' -> ')} ile inisiyatifi genişletmek.`;
  }

  if (isEngineBest && !tag.includes('Stockfish')) {
    why = `⭐ HOCANIN EN ÇOK TAVSİYE ETTİĞİ HAMLE: ${why}`;
  }

  const cand: CandidateMove = {
    san: move.san,
    from: move.from,
    to: move.to,
    tag,
    leadsTo,
    why,
    threat,
    futureAttack
  };
  cand.color = getCandidateColor(cand);
  return cand;
}

/**
 * Translates piece abbreviations to Turkish piece names
 */
function getPieceNameTr(pieceCode: string): string {
  switch (pieceCode.toLowerCase()) {
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
 * Diagnoses unusual or irregular opening moves played by opponent
 */
function analyzeOpponentDeviation(lastMoveSan: string, plyCount: number, hasThreatOnBoard: boolean): {
  isIrregular: boolean;
  title: string;
  why: string;
  threat: string;
  plan: string;
  coachAdvice: string;
} {
  // Only classify as irregular wing move if:
  // 1. It is early opening (plyCount <= 4)
  // 2. AND there is NO active threat on our friendly pieces!
  if (!hasThreatOnBoard && plyCount <= 4 && ['h6', 'h5', 'a6', 'a5', 'h3', 'h4', 'a3', 'a4', 'g5', 'b5', 'f6'].includes(lastMoveSan)) {
    return {
      isIrregular: true,
      title: 'Zayıf / Teori Dışı Kanat Hamlesi',
      why: 'Rakip merkez mücadelesine katılmayan ve kanadı zayıflatan bir piyon sürdü.',
      threat: 'Doğrudan ciddi bir merkez tehdidi yok.',
      plan: 'Merkezi piyonlarla tutun (e4 / d4), taşlarınızı hızla geliştirin.',
      coachAdvice: `Rakibin oynadığı ${lastMoveSan} hamlesi açılış ilkelerine aykırıdır; merkez mücadelesini sana bıraktı. Merkez kareleri tutarak gelişiminizi sürdürün.`
    };
  }

  // Early Queen excursions in first 6 plies
  if (['Qh4', 'Qf6', 'Qg5', 'Qh5'].includes(lastMoveSan) && plyCount <= 6) {
    return {
      isIrregular: true,
      title: 'Erken Vezir Çıkışı (Taktik Zayıflık)',
      why: 'Rakip hafif taşlarını geliştirmeden vezirini erken oyuna soktu.',
      threat: 'Hızlı piyon tehditleri veya çoban matı arıyor.',
      plan: 'Hafif taşlarınızı vezire tempolu saldırarak geliştirin.',
      coachAdvice: 'Satrançta erken vezir çıkışı cezalandırılır! Vezire tempolu hücum ederek hafif taşlarınızı geliştirin ve inisiyatifi ele alın.'
    };
  }

  return {
    isIrregular: false,
    title: 'Standart Hamle',
    why: '',
    threat: '',
    plan: '',
    coachAdvice: ''
  };
}

/**
 * Assigns a thematic chess character badge to candidate moves
 */
function assignCandidateCharacterBadge(
  cand: CandidateMove,
  isEngineBest: boolean,
  isSurprise: boolean
): CandidateCharacterBadge {
  if (isSurprise) {
    return {
      label: 'Sürpriz Silah (Gizli Cevher)',
      icon: '💎',
      colorClass: 'purple',
      desc: 'Motor puanları çok yakın; rakibi ezber dışına çıkaracak gizli büyükusta hamlesi.'
    };
  }

  // 1. Stockfish Best Move strictly takes priority for Rank 1
  if (isEngineBest) {
    return {
      label: 'Stockfish En İyi Hamlesi',
      icon: '🤖',
      colorClass: 'emerald',
      desc: 'Matematiksel ve taktiksel olarak tahtadaki en güçlü devam yolu.'
    };
  }

  // 2. Verified Historical Champion Game
  if (cand.historicalGame) {
    return {
      label: `Şampiyonların Tercihi (${cand.historicalGame.white})`,
      icon: '🏆',
      colorClass: 'amber',
      desc: `${cand.historicalGame.white} vs. ${cand.historicalGame.black} (${cand.historicalGame.year}) büyükusta tercihi.`
    };
  }

  const san = cand.san;

  // 3. Tactical move / Sacrifice / Check / Capture
  if (cand.tag?.includes('Feda') || cand.tag?.includes('Gambit') || san.includes('+') || san.includes('x')) {
    return {
      label: 'Taktik Hücum & Hamle',
      icon: '⚔️',
      colorClass: 'rose',
      desc: 'Rakip taşları veya zayıflıkları hedef alan doğrudan taktik hamle.'
    };
  }

  // 4. King safety / Castling
  if (san === 'O-O' || san === 'O-O-O') {
    return {
      label: 'Kral Emniyeti (Rok)',
      icon: '🛡️',
      colorClass: 'sky',
      desc: 'Şahı merkezin taktik tehlikelerinden koruyan sağlam gelişim.'
    };
  }

  return {
    label: 'Klasik Gelişim Hattı',
    icon: '♟️',
    colorClass: 'slate',
    desc: 'Merkez kontrolünü ve taş koordinasyonunu artıran prensipli hamle.'
  };
}
