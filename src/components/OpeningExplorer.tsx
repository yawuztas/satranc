import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import type { Key } from 'chessground/types';
import { Chessboard } from './Chessboard';
import { EvaluationBar } from './EvaluationBar';
import { stockfishService } from '../services/stockfishService';
import { soundManager } from '../utils/sound';
import { getOpeningAnalysis, getCandidateColor } from '../data/openingTreeData';
import { enhanceAnalysisWithDynamicCoach, scoreMoveSafety } from '../utils/dynamicCoach';
import type { CandidateMove, BotStyle, BotElo } from '../types/tree';
import type { EngineEvaluation, Color } from '../types/chess';
import { MAX_CANDIDATE_CHOICES } from '../types/lesson';
import { fetchOpeningStats, type OpeningStatsResponse } from '../services/lichessService';
import {
  Compass,
  RotateCcw,
  Sparkles,
  Bot,
  Lightbulb,
  GitBranch,
  Undo2,
  HelpCircle,
  X,
  Play,
  ArrowRight,
  Settings2,
  GraduationCap
} from 'lucide-react';

interface DecisionPoint {
  plyIndex: number; // ply index where choice occurred
  moveNumber: number; // 1, 2, 3...
  side: 'white' | 'black';
  label: string;
  prefix: string[];
  candidates: CandidateMove[];
  playedSan?: string;
  isCurrentTurn: boolean;
}

export const OpeningExplorer: React.FC = () => {
  // Player Setup State
  const [playerColor, setPlayerColor] = useState<Color>('white');
  const [orientation, setOrientation] = useState<Color>('white');

  // Game & Move History State
  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [historyMoves, setHistoryMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<Key[] | undefined>(undefined);

  // Satranç Hocası (AI Opponent) Configuration
  const [botAutoPlay, setBotAutoPlay] = useState<boolean>(false);
  const [botStyle, setBotStyle] = useState<BotStyle>('aggressive');
  const [botElo, setBotElo] = useState<BotElo>(1500);
  const [botThinking, setBotThinking] = useState<boolean>(false);

  // Analysis & Engine
  const [engineEvaluation, setEngineEvaluation] = useState<EngineEvaluation | null>(null);
  const [hoveredCandidate, setHoveredCandidate] = useState<CandidateMove | null>(null);
  const [showEcoModal, setShowEcoModal] = useState<boolean>(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);

  // Selected decision point ply for viewing alternative branches (defaults to latest)
  const [selectedTreePly, setSelectedTreePly] = useState<number | null>(null);

  // Lichess & Master Opening Statistics
  const [lichessToken, setLichessToken] = useState<string>(() => {
    return localStorage.getItem('satranc_lichess_token') || '';
  });
  const [masterStats, setMasterStats] = useState<OpeningStatsResponse | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchOpeningStats(chess.fen(), lichessToken).then((stats) => {
      if (isMounted) setMasterStats(stats);
    });
    return () => {
      isMounted = false;
    };
  }, [chess.fen(), lichessToken]);

  // Synchronous refs to guarantee ZERO stale closures
  const chessRef = useRef<Chess>(chess);
  const historyMovesRef = useRef<string[]>(historyMoves);
  chessRef.current = chess;
  historyMovesRef.current = historyMoves;

  // Get opening analysis from decision tree
  const baseAnalysis = getOpeningAnalysis(historyMoves);
  
  // Unified dynamic coach: Combines real Lichess master database stats + Stockfish engine evaluation + curated opening plans
  const currentAnalysis = enhanceAnalysisWithDynamicCoach(
    chess,
    historyMoves,
    baseAnalysis,
    engineEvaluation,
    masterStats
  );

  // Compute legal moves dests for interactive board
  const getDests = (): Map<Key, Key[]> => {
    const dests = new Map<Key, Key[]>();
    const isPlayerTurn = !botAutoPlay || (chess.turn() === (playerColor === 'white' ? 'w' : 'b'));
    if (botThinking || chess.isGameOver() || !isPlayerTurn) return dests;

    chess.moves({ verbose: true }).forEach((m) => {
      const from = m.from as Key;
      const to = m.to as Key;
      if (!dests.has(from)) {
        dests.set(from, []);
      }
      dests.get(from)!.push(to);
    });
    return dests;
  };

  // Evaluate position with engine whenever position changes
  useEffect(() => {
    let isActive = true;
    if (!chess.isGameOver()) {
      const cancelEvaluation = stockfishService.evaluatePosition(chess.fen(), 12, (evalData) => {
        if (!isActive) return;
        if (evalData.bestMove && !evalData.bestMoveSan) {
          const from = evalData.bestMove.slice(0, 2);
          const to = evalData.bestMove.slice(2, 4);
          const promo = evalData.bestMove.length > 4 ? evalData.bestMove[4] : undefined;
          const moves = chess.moves({ verbose: true });
          const found = moves.find(m => m.from === from && m.to === to && (!promo || m.promotion === promo));
          if (found) {
            evalData.bestMoveSan = found.san;
          }
        }
        setEngineEvaluation(evalData);
      });
      return () => {
        isActive = false;
        cancelEvaluation?.();
      };
    }
    return () => {
      isActive = false;
    };
  }, [chess.fen()]);

  // Execute a move from current position
  const makeMove = (from: string, to: string, promotion: string = 'q'): boolean => {
    const currentChess = chessRef.current;
    const currentHistory = historyMovesRef.current;
    const nextChess = new Chess(currentChess.fen());
    const move = nextChess.move({ from, to, promotion });

    if (!move) return false;

    if (move.captured) {
      soundManager.playCapture();
    } else {
      soundManager.playMove();
    }

    if (nextChess.inCheck()) {
      soundManager.playCheck();
    }

    const nextHistory = [...currentHistory, move.san];
    chessRef.current = nextChess;
    historyMovesRef.current = nextHistory;
    setLastMove([from as Key, to as Key]);
    setChess(nextChess);
    setHistoryMoves(nextHistory);
    setHoveredCandidate(null);
    setSelectedTreePly(null);
    setEngineEvaluation(null);

    // If next turn belongs to Hoca, trigger Hoca's response
    const hocaTurnColor = playerColor === 'white' ? 'b' : 'w';
    if (nextChess.turn() === hocaTurnColor && botAutoPlay && !nextChess.isGameOver()) {
      triggerHocaResponse(nextChess, nextHistory);
    }

    return true;
  };

  // Switch to an alternative branch in the decision tree
  const branchToMove = (prefixMoves: string[], targetSan: string) => {
    if (botThinking) return;

    const newChess = new Chess();
    for (const m of prefixMoves) {
      const ok = newChess.move(m);
      if (!ok) return;
    }
    const move = newChess.move(targetSan);
    if (!move) return;

    if (move.captured) {
      soundManager.playCapture();
    } else {
      soundManager.playMove();
    }

    if (newChess.inCheck()) {
      soundManager.playCheck();
    }

    const newHistory = [...prefixMoves, move.san];
    chessRef.current = newChess;
    historyMovesRef.current = newHistory;
    setChess(newChess);
    setHistoryMoves(newHistory);
    setLastMove([move.from as Key, move.to as Key]);
    setHoveredCandidate(null);
    setSelectedTreePly(null);

    const hocaTurnColor = playerColor === 'white' ? 'b' : 'w';
    if (newChess.turn() === hocaTurnColor && botAutoPlay && !newChess.isGameOver()) {
      triggerHocaResponse(newChess, newHistory);
    }
  };

  // Handle drag and drop on board
  const handleBoardMove = (orig: Key, dest: Key) => {
    makeMove(orig, dest);
  };

  // Trigger Satranç Hocası Response based on style and Elo
  const triggerHocaResponse = (currentChess: Chess, currentHistory: string[]) => {
    setBotThinking(true);

    // Absolute failsafe timer: if bot thinking somehow takes > 4s, guarantee release
    const failsafeTimer = setTimeout(() => {
      setBotThinking(false);
    }, 4000);

    setTimeout(() => {
      // Guard against race conditions if user reset during delay
      if (historyMovesRef.current.length !== currentHistory.length) {
        clearTimeout(failsafeTimer);
        setBotThinking(false);
        return;
      }

      const legalMoves = currentChess.moves({ verbose: true });
      if (legalMoves.length === 0) {
        clearTimeout(failsafeTimer);
        setBotThinking(false);
        return;
      }

      // Helper function to safely commit bot move
      const commitHocaMove = (moveObj: { from: string; to: string; promotion?: string }): boolean => {
        try {
          const nextChess = new Chess(currentChess.fen());
          const isLegal = legalMoves.some(m => m.from === moveObj.from && m.to === moveObj.to);
          if (!isLegal) return false;

          const move = nextChess.move(moveObj);
          if (!move) return false;

          clearTimeout(failsafeTimer);

          if (move.captured) soundManager.playCapture();
          else soundManager.playMove();
          if (nextChess.inCheck()) soundManager.playCheck();

          const nextHistory = [...currentHistory, move.san];
          chessRef.current = nextChess;
          historyMovesRef.current = nextHistory;
          setLastMove([move.from as Key, move.to as Key]);
          setChess(nextChess);
          setHistoryMoves(nextHistory);
          setBotThinking(false);
          return true;
        } catch {
          return false;
        }
      };

      // Tactical Fallback: Guarantees a sound legal move if engine fails or times out
      const executeTacticalFallback = () => {
        try {
          const scored = legalMoves
            .map((m) => ({ m, score: scoreMoveSafety(currentChess, m) }))
            .sort((a, b) => b.score - a.score);

          for (const item of scored) {
            const ok = commitHocaMove({
              from: item.m.from,
              to: item.m.to,
              promotion: item.m.promotion
            });
            if (ok) return;
          }

          if (legalMoves.length > 0) {
            commitHocaMove({
              from: legalMoves[0].from,
              to: legalMoves[0].to,
              promotion: legalMoves[0].promotion
            });
          }
        } finally {
          clearTimeout(failsafeTimer);
          setBotThinking(false);
        }
      };

      // 1. Fresh candidate moves for this exact position using unified coach engine
      const freshTree = getOpeningAnalysis(currentHistory);
      const dynamicAnalysis = enhanceAnalysisWithDynamicCoach(
        currentChess,
        currentHistory,
        freshTree,
        engineEvaluation,
        masterStats
      );
      const candidates = dynamicAnalysis.candidateMoves || [];

      const validCandidates = candidates.filter((c: CandidateMove) =>
        legalMoves.some(m => m.san === c.san || (c.from && c.to && m.from === c.from && m.to === c.to))
      );

      let chosenCandidate: CandidateMove | null = null;

      if (validCandidates.length > 0) {
        if (botStyle === 'aggressive') {
          chosenCandidate = validCandidates.find((c: CandidateMove) => c.color === 'red' || (c.tag && (c.tag.includes('Agresif') || c.tag.includes('Taktik')))) || validCandidates[0];
        } else if (botStyle === 'defensive') {
          chosenCandidate = validCandidates.find((c: CandidateMove) => c.color === 'blue' || (c.tag && (c.tag.includes('Sağlam') || c.tag.includes('Motor')))) || validCandidates[0];
        } else if (botStyle === 'classical') {
          chosenCandidate = validCandidates.find((c: CandidateMove) => c.color === 'green' || (c.tag && c.tag.includes('Popüler'))) || validCandidates[0];
        } else {
          chosenCandidate = validCandidates[0];
        }
      }

      if (chosenCandidate) {
        const legal = legalMoves.find(m => m.san === chosenCandidate!.san || (chosenCandidate!.from && chosenCandidate!.to && m.from === chosenCandidate!.from && m.to === chosenCandidate!.to));
        if (legal) {
          const ok = commitHocaMove({ from: legal.from, to: legal.to, promotion: legal.promotion });
          if (ok) return;
        }
      }

      // 2. If out of book, query engine with safety timeout fallback
      const depth = botElo >= 2500 ? 14 : botElo >= 2000 ? 11 : botElo >= 1500 ? 8 : 4;
      let moveHandled = false;

      const fallbackTimer = setTimeout(() => {
        if (!moveHandled) {
          moveHandled = true;
          executeTacticalFallback();
        }
      }, 2000);

      stockfishService.requestBotMove(currentChess.fen(), depth, (bestMoveStr) => {
        if (moveHandled) return;
        moveHandled = true;
        clearTimeout(fallbackTimer);

        if (bestMoveStr && bestMoveStr.length >= 4) {
          const bFrom = bestMoveStr.slice(0, 2);
          const bTo = bestMoveStr.slice(2, 4);
          const promo = bestMoveStr.length > 4 ? bestMoveStr[4] : undefined;
          const ok = commitHocaMove({ from: bFrom, to: bTo, promotion: promo });
          if (ok) return;
        }

        executeTacticalFallback();
      });
    }, 350);
  };

  // Start new training session with chosen player color
  const startNewSession = (color: Color) => {
    if (botThinking) return;
    setPlayerColor(color);
    setOrientation(color);

    const newChess = new Chess();
    chessRef.current = newChess;
    historyMovesRef.current = [];
    setChess(newChess);
    setHistoryMoves([]);
    setLastMove(undefined);
    setHoveredCandidate(null);
    setSelectedTreePly(null);

    // If player chooses Black, Satranç Hocası makes the 1st move as White!
    if (color === 'black') {
      setTimeout(() => {
        const whiteOpening = botStyle === 'defensive' ? { from: 'd2', to: 'd4', san: 'd4' } : { from: 'e2', to: 'e4', san: 'e4' };
        const hocaChess = new Chess();
        const move = hocaChess.move({ from: whiteOpening.from, to: whiteOpening.to });
        if (move) {
          soundManager.playMove();
          chessRef.current = hocaChess;
          historyMovesRef.current = [move.san];
          setChess(hocaChess);
          setHistoryMoves([move.san]);
          setLastMove([whiteOpening.from as Key, whiteOpening.to as Key]);
        }
      }, 300);
    }
  };

  // Undo last move (or pair of moves if Bot is active)
  const handleUndo = () => {
    const curHistory = historyMovesRef.current;
    if (curHistory.length === 0 || botThinking) return;
    const targetLength = botAutoPlay && curHistory.length >= 2 ? curHistory.length - 2 : curHistory.length - 1;
    const newChess = new Chess();
    const newHistory = curHistory.slice(0, Math.max(0, targetLength));
    for (const m of newHistory) {
      newChess.move(m);
    }
    chessRef.current = newChess;
    historyMovesRef.current = newHistory;
    setChess(newChess);
    setHistoryMoves(newHistory);
    setLastMove(undefined);
    setHoveredCandidate(null);
    setSelectedTreePly(null);
  };

  // Reset to initial position
  const handleReset = () => {
    startNewSession(playerColor);
  };

  // Build decision points across the game history
  const decisionPoints: DecisionPoint[] = [];

  if (playerColor === 'white') {
    // Siyahın karar anları (1. hamle, 2. hamle...)
    if (historyMoves.length >= 1) {
      const p1 = [historyMoves[0]];
      const n1 = getOpeningAnalysis(p1);
      if (n1.candidateMoves.length > 0) {
        decisionPoints.push({
          plyIndex: 1,
          moveNumber: 1,
          side: 'black',
          label: `1. ${historyMoves[0]} Sonrası Siyahın Seçenekleri`,
          prefix: p1,
          candidates: n1.candidateMoves,
          playedSan: historyMoves.length > 1 ? historyMoves[1] : undefined,
          isCurrentTurn: historyMoves.length === 1 && chess.turn() === 'b'
        });
      }
    }
    if (historyMoves.length >= 3) {
      const p2 = historyMoves.slice(0, 3);
      const n2 = getOpeningAnalysis(p2);
      if (n2.candidateMoves.length > 0) {
        decisionPoints.push({
          plyIndex: 3,
          moveNumber: 2,
          side: 'black',
          label: `2. ${historyMoves[2]} Sonrası Siyahın Seçenekleri`,
          prefix: p2,
          candidates: n2.candidateMoves,
          playedSan: historyMoves.length > 3 ? historyMoves[3] : undefined,
          isCurrentTurn: historyMoves.length === 3 && chess.turn() === 'b'
        });
      }
    }
    if (historyMoves.length >= 5) {
      const p3 = historyMoves.slice(0, 5);
      const n3 = getOpeningAnalysis(p3);
      if (n3.candidateMoves.length > 0) {
        decisionPoints.push({
          plyIndex: 5,
          moveNumber: 3,
          side: 'black',
          label: `3. ${historyMoves[4]} Sonrası Siyahın Seçenekleri`,
          prefix: p3,
          candidates: n3.candidateMoves,
          playedSan: historyMoves.length > 5 ? historyMoves[5] : undefined,
          isCurrentTurn: historyMoves.length === 5 && chess.turn() === 'b'
        });
      }
    }
  } else {
    // Beyazın karar anları (Hocanın açılış seçimi)
    const p0: string[] = [];
    const n0 = getOpeningAnalysis(p0);
    if (n0.candidateMoves.length > 0) {
      decisionPoints.push({
        plyIndex: 0,
        moveNumber: 1,
        side: 'white',
        label: '1. Hamle: Beyazın Açılış Tercihleri',
        prefix: p0,
        candidates: n0.candidateMoves,
        playedSan: historyMoves.length > 0 ? historyMoves[0] : undefined,
        isCurrentTurn: historyMoves.length === 0 && chess.turn() === 'w'
      });
    }
    if (historyMoves.length >= 2) {
      const p1 = historyMoves.slice(0, 2);
      const n1 = getOpeningAnalysis(p1);
      if (n1.candidateMoves.length > 0) {
        decisionPoints.push({
          plyIndex: 2,
          moveNumber: 2,
          side: 'white',
          label: `2. ${historyMoves[1]} Sonrası Beyazın Hamleleri`,
          prefix: p1,
          candidates: n1.candidateMoves,
          playedSan: historyMoves.length > 2 ? historyMoves[2] : undefined,
          isCurrentTurn: historyMoves.length === 2 && chess.turn() === 'w'
        });
      }
    }
  }

  // Active decision point to render in the right-column tree
  const activeDecisionPoint = selectedTreePly !== null
    ? decisionPoints.find(dp => dp.plyIndex === selectedTreePly) || decisionPoints[decisionPoints.length - 1]
    : decisionPoints[decisionPoints.length - 1];

  // Candidate move arrows to draw on board for the side to move (White OR Black)
  const boardArrows: [string, string, string?][] = [];
  const isPlayerTurn = chess.turn() === (playerColor === 'white' ? 'w' : 'b');

  if (!botThinking && !chess.isGameOver()) {
    currentAnalysis.candidateMoves.forEach((cand) => {
      const arrowColor = cand.color || getCandidateColor(cand);
      const isHovered = hoveredCandidate?.san === cand.san;
      boardArrows.push([cand.from, cand.to, isHovered ? 'yellow' : arrowColor]);
    });
  }

  // Engine best move arrow
  if (engineEvaluation?.bestMove && engineEvaluation.bestMove.length >= 4) {
    const sfFrom = engineEvaluation.bestMove.slice(0, 2);
    const sfTo = engineEvaluation.bestMove.slice(2, 4);
    if (!boardArrows.some(([f, t]) => f === sfFrom && t === sfTo)) {
      boardArrows.push([sfFrom, sfTo, 'blue']);
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-[1400px] mx-auto px-2 sm:px-4 py-3">
      {/* ========================================================= */}
      {/* TOP HEADER: SETTINGS & TRAINING CONFIGURATION BAR          */}
      {/* ========================================================= */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Current Opening Name & ECO */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-md shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <span className="font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{currentAnalysis.eco}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">{historyMoves.length === 0 ? 'Başlangıç Konumu' : `${historyMoves.length} Hamle Oynandı`}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                {currentAnalysis.openingName}
              </h1>
            </div>
          </div>

          {/* Quick Setup Controls */}
          <div className="flex flex-wrap items-center gap-2.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
            {/* Color Selector */}
            <div className="flex items-center gap-1.5 px-2 bg-slate-900 rounded-lg p-1 border border-slate-800">
              <span className="text-slate-400 font-bold text-[11px] mr-1">Rengin:</span>
              <button
                onClick={() => startNewSession('white')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                  playerColor === 'white'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Beyaz Taşlarla Başla"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-400" />
                <span>Beyaz</span>
              </button>
              <button
                onClick={() => startNewSession('black')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                  playerColor === 'black'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Siyah Taşlarla Başla (Hoca Beyazla Başlar)"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-600" />
                <span>Siyah</span>
              </button>
            </div>

            {/* Satranç Hocası Level & Style Settings Toggle */}
            <button
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold transition-colors"
            >
              <GraduationCap className="w-4 h-4 text-purple-400" />
              <span>Hoca: {botElo} Elo ({botStyle === 'aggressive' ? 'Agresif' : botStyle === 'defensive' ? 'Defansif' : botStyle === 'classical' ? 'Klasik' : 'GM'})</span>
              <Settings2 className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {/* ECO Theory Encyclopedia Button */}
            <button
              onClick={() => setShowEcoModal(true)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Dünyada Kaç Açılış Var?"
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </div>

        {/* Expandable Settings Drawer */}
        {showSettingsDrawer && (
          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs bg-slate-950/70 p-3 rounded-xl">
            <div>
              <label className="text-slate-400 font-bold block mb-1.5">🎓 Satranç Hocası Seviyesi:</label>
              <select
                value={botElo}
                onChange={(e) => setBotElo(Number(e.target.value) as BotElo)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 font-medium focus:border-purple-500"
              >
                <option value={1000}>1000 Elo (Yeni Başlayan / Acemi)</option>
                <option value={1500}>1500 Elo (Kulüp Oyuncusu)</option>
                <option value={2000}>2000 Elo (Usta Seviyesi)</option>
                <option value={2500}>2500 Elo (Büyükusta - GM)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-bold block mb-1.5">⚔️ Hocanın Oyun Tarzı:</label>
              <select
                value={botStyle}
                onChange={(e) => setBotStyle(e.target.value as BotStyle)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 font-medium focus:border-purple-500"
              >
                <option value="aggressive">Agresif (Sicilya, Şah Gambiti, Taktik Hücum)</option>
                <option value="defensive">Defansif (Caro-Kann, Fransız, Slav, Sağlam)</option>
                <option value="classical">Klasik (1... e5, Vezir Gambiti, Denge)</option>
                <option value="master">Büyükusta Tercihi (Turnuva Ana Hatları)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-bold block mb-1.5">⚡ Hoca Yanıt Verme Şekli:</label>
              <button
                onClick={() => setBotAutoPlay(!botAutoPlay)}
                className={`w-full py-1.5 rounded-lg font-bold transition-all border ${
                  botAutoPlay
                    ? 'bg-purple-600/30 border-purple-500 text-purple-200 shadow-sm'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                {botAutoPlay ? '✓ Otomatik Hamle Yapıyor' : 'Manuel Mod (Seçerek Dene)'}
              </button>
            </div>

            <div className="bg-slate-900/90 border border-emerald-500/30 rounded-lg p-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>🌐 Büyükusta Veritabanı:</span>
                  </span>
                  <span className="text-[10px] text-emerald-300 font-mono bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold">
                    ✓ Aktif & Ücretsiz
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  2M+ büyükusta oyunu doğrudan sorgulanır. Token girmeniz gerekmez!
                </p>
              </div>
              <input
                type="password"
                placeholder="Özel Token (İsteğe bağlı)"
                value={lichessToken}
                onChange={(e) => {
                  setLichessToken(e.target.value);
                  localStorage.setItem('satranc_lichess_token', e.target.value);
                }}
                className="w-full mt-1.5 bg-slate-950 border border-slate-800 text-slate-300 rounded px-2 py-0.5 font-mono text-[10px] focus:border-purple-500"
                title="İsteğe bağlı: Kendi Lichess hesabınızın token'ını girmek isterseniz buraya yapıştırabilirsiniz."
              />
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 2-COLUMN GRANDMASTER INTERFACE                             */}
      {/* Sol: Devasa Tahta (620px), Eval Bar, Toolbar, Master DB    */}
      {/* Sağ: Bütünleşik Strateji & Karar Merkezi (Tek Panel)       */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* SOL: DEVASA TAHTA, EVAL BAR, TOOLBAR & BÜYÜKUSTA VERİTABANI */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 flex flex-col items-center gap-3">
          <div className="flex gap-3 w-full justify-center items-center">
            {/* Live Evaluation Bar */}
            <div className="h-[440px] sm:h-[540px] md:h-[600px]">
              <EvaluationBar evaluation={engineEvaluation} orientation={orientation} />
            </div>

            {/* Chessboard with Visible Edge Coordinates (1-8 & A-H) */}
            <div className="flex-1 max-w-[620px]">
              <Chessboard
                fen={chess.fen()}
                orientation={orientation}
                turnColor={chess.turn() === 'w' ? 'white' : 'black'}
                interactive={!botThinking && !chess.isGameOver() && isPlayerTurn}
                dests={getDests()}
                onMove={handleBoardMove}
                arrows={boardArrows}
                lastMove={lastMove}
                check={chess.inCheck()}
              />
            </div>
          </div>

          {/* Arrow Color Legend Bar */}
          <div className="w-full max-w-[620px] grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-[11px] font-semibold text-slate-300 shadow-md">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)] shrink-0" />
              <span className="truncate">🟢 Yeşil: Ana Hat / Teori</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.7)] shrink-0" />
              <span className="truncate">🔵 Mavi: Sağlam / Stratejik</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)] shrink-0" />
              <span className="truncate">🔴 Kırmızı: Agresif / Gambit</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)] shrink-0" />
              <span className="truncate">🟡 Sarı: Sürpriz / Alternatif</span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="w-full max-w-[620px] flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs shadow-lg">
            <div className="flex items-center gap-2">
              <button
                onClick={handleUndo}
                disabled={historyMoves.length === 0 || botThinking}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
                title="Hamleyi Geri Al"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleReset}
                disabled={botThinking}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
                title="Konumu Sıfırla"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setOrientation(orientation === 'white' ? 'black' : 'white')}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Tahtayı Çevir"
              >
                {orientation === 'white' ? '⚪' : '⚫'}
              </button>
              <button
                onClick={() => setBotAutoPlay(!botAutoPlay)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border flex items-center gap-1 ${
                  botAutoPlay
                    ? 'bg-purple-600/30 border-purple-500 text-purple-200 shadow-sm'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title="Hocanın otomatik oynamasını aç / kapat"
              >
                <span>⚡ Otomatik: {botAutoPlay ? 'Açık' : 'Manuel'}</span>
              </button>
            </div>

            {botThinking && (
              <span className="text-purple-400 font-bold animate-pulse text-xs flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5" /> Hoca düşünüyor...
              </span>
            )}

            <div className="text-slate-400 font-mono text-[11px] truncate max-w-[200px]" title={historyMoves.join(' ')}>
              {historyMoves.length > 0 ? historyMoves.join(' ') : 'Hamle bekliyor'}
            </div>
          </div>

          {/* Master Opening Database Stats Panel */}
          {masterStats && (
            <div className="w-full max-w-[620px] bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    Büyükusta Veritabanı ({masterStats.totalGames.toLocaleString('tr-TR')} Oyun)
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold border border-slate-700">
                  {masterStats.source === 'lichess-live' ? '⚡ Canlı Lichess' : '📚 Yerel Master DB'}
                </span>
              </div>

              {/* Master Win-Rate Ratio Bar */}
              <div className="space-y-1">
                <div className="h-4 w-full rounded-full overflow-hidden flex text-[10px] font-black font-mono shadow-inner">
                  <div
                    style={{ width: `${masterStats.totalGames > 0 ? (masterStats.whiteWins / masterStats.totalGames) * 100 : 38}%` }}
                    className="bg-slate-200 text-slate-950 flex items-center justify-center transition-all"
                    title={`Beyaz Kazancı: %${masterStats.totalGames > 0 ? Math.round((masterStats.whiteWins / masterStats.totalGames) * 100) : 38}`}
                  >
                    %{masterStats.totalGames > 0 ? Math.round((masterStats.whiteWins / masterStats.totalGames) * 100) : 38}
                  </div>
                  <div
                    style={{ width: `${masterStats.totalGames > 0 ? (masterStats.draws / masterStats.totalGames) * 100 : 36}%` }}
                    className="bg-slate-600 text-white flex items-center justify-center transition-all"
                    title={`Beraberlik: %${masterStats.totalGames > 0 ? Math.round((masterStats.draws / masterStats.totalGames) * 100) : 36}`}
                  >
                    %{masterStats.totalGames > 0 ? Math.round((masterStats.draws / masterStats.totalGames) * 100) : 36}
                  </div>
                  <div
                    style={{ width: `${masterStats.totalGames > 0 ? (masterStats.blackWins / masterStats.totalGames) * 100 : 26}%` }}
                    className="bg-slate-950 text-slate-300 flex items-center justify-center border-l border-slate-800 transition-all"
                    title={`Siyah Kazancı: %${masterStats.totalGames > 0 ? Math.round((masterStats.blackWins / masterStats.totalGames) * 100) : 26}`}
                  >
                    %{masterStats.totalGames > 0 ? Math.round((masterStats.blackWins / masterStats.totalGames) * 100) : 26}
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-medium px-1">
                  <span>⚪ Beyaz Kazancı</span>
                  <span>⚖️ Berabere</span>
                  <span>⚫ Siyah Kazancı</span>
                </div>
              </div>

              {/* Popular Master Moves in this Position */}
              {masterStats.moves && masterStats.moves.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-300 block">Bu Konumda En Çok Oynanan Usta Hamleleri:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {masterStats.moves.slice(0, MAX_CANDIDATE_CHOICES).map((m, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const moves = chess.moves({ verbose: true });
                          const found = moves.find(leg => leg.san === m.san);
                          if (found) {
                            makeMove(found.from, found.to, found.promotion);
                          }
                        }}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 text-left transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-amber-400 text-xs group-hover:scale-105 transition-transform">
                            {m.san}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {m.total.toLocaleString('tr-TR')} oyun
                          </span>
                        </div>
                        <div className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
                          <span className="text-slate-200">%{m.whiteWinRate}</span>
                          <span>/</span>
                          <span className="text-slate-400">%{m.drawRate}</span>
                          <span>/</span>
                          <span className="text-slate-400">%{m.blackWinRate}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* SAĞ: BÜTÜNLEŞİK BÜYÜKUSTA STRATEJİ & KARAR MERKEZİ         */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            {/* Header: Turn & Opening Info */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className={`w-3.5 h-3.5 rounded-full inline-block shadow-sm ${
                  chess.turn() === 'w' ? 'bg-slate-100 border border-slate-400' : 'bg-slate-950 border border-slate-600'
                }`} />
                <span className="text-xs font-bold text-slate-200">
                  Hamle Sırası: <strong className={isPlayerTurn ? 'text-amber-400' : 'text-purple-400'}>
                    {chess.turn() === 'w' ? 'Beyaz' : 'Siyah'} {isPlayerTurn ? '(Senin Hamlen)' : '(Hoca / Rakip Hamlesi)'}
                  </strong>
                </span>
              </div>

              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-400">
                {currentAnalysis.eco || 'A00'}
              </span>
            </div>

            {/* Current Opening Title */}
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{currentAnalysis.openingName || 'Başlangıç Konumu'}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-snug">
                {currentAnalysis.title}
              </p>
            </div>

            {/* SON OYNANAN HAMLE ANALİZİ (Rakip Ne Yaptı ve Neden Yaptı?) */}
            {historyMoves.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-2 shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">📌 Son Oynanan Hamle Analizi:</span>
                    <span className="font-mono font-black text-amber-400 text-xs px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      {historyMoves[historyMoves.length - 1]}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium truncate max-w-[130px]" title={currentAnalysis.openingName}>
                    {currentAnalysis.openingName}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-300 block text-[11px]">🎯 Neden Bu Hamle / Ne İşe Yarar?</span>
                    <p className="text-slate-300 text-[11px] leading-relaxed mt-0.5">
                      {currentAnalysis.whyThisMove}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-900">
                    <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800/60">
                      <span className="font-bold text-blue-300 text-[10px] block">🛡️ Nereyi Koruyor?</span>
                      <p className="text-slate-300 text-[10px] leading-snug mt-0.5">{currentAnalysis.whatItProtects}</p>
                    </div>
                    <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800/60">
                      <span className="font-bold text-rose-300 text-[10px] block">⚔️ Neyi Tehdit Ediyor?</span>
                      <p className="text-slate-300 text-[10px] leading-snug mt-0.5">{currentAnalysis.whatItThreatens}</p>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-slate-900">
                    <span className="font-bold text-indigo-300 text-[11px] block">🚀 Gelecek Planı (Nereye Götürür?):</span>
                    <p className="text-slate-300 text-[11px] leading-relaxed mt-0.5">
                      {currentAnalysis.futurePlan}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Coach Tip Box */}
            {currentAnalysis.coachTip && (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/30">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1">
                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Hoca Tavsiyesi:</span>
                </div>
                <p className="text-slate-200 text-xs leading-relaxed font-medium">
                  {currentAnalysis.coachTip}
                </p>
              </div>
            )}

            {/* ACTION BANNER: RAKİP HAMLESİ (HOCA) YA DA SENİN SIRAN */}
            {!isPlayerTurn && !botThinking && !chess.isGameOver() && (
              <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/40 space-y-2.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="text-xs font-bold text-purple-200">
                      Sıradaki Hamle: {chess.turn() === 'w' ? 'Beyaz (Rakip)' : 'Siyah (Rakip)'}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-900/60 border border-purple-500/40 text-purple-300 font-bold">
                    {botElo} Elo • {botStyle === 'aggressive' ? 'Agresif' : botStyle === 'defensive' ? 'Defansif' : botStyle === 'classical' ? 'Klasik' : 'Büyükusta'}
                  </span>
                </div>
                <p className="text-[11px] text-purple-200/90 leading-snug">
                  Satranç Hocası kendi stiline göre oynasın veya aşağıdaki seçeneklerden birini tıklayarak rakibin o hamleyi yapmasını sağla:
                </p>
                <button
                  onClick={() => triggerHocaResponse(chess, historyMoves)}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Bot className="w-4 h-4" />
                  <span>🤖 Satranç Hocası Hamlesini Yapsın</span>
                </button>
              </div>
            )}

            {isPlayerTurn && !botThinking && !chess.isGameOver() && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                  <span className="text-xs font-bold text-emerald-300">
                    Hamle Sırası Sende ({chess.turn() === 'w' ? 'Beyaz' : 'Siyah'})
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Tahtadan sür veya seçenek seç</span>
              </div>
            )}

            {/* RECOMMENDED MOVES & 4-COLOR DECISION TREE */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {chess.turn() === 'w' ? 'Beyaz' : 'Siyah'} İçin Tavsiye Edilen Hamleler & Karar Ağacı:
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Tıklayarak oyna</span>
              </div>

              <div className="space-y-2.5">
                {currentAnalysis.candidateMoves.map((cand) => {
                  const candColor = cand.color || getCandidateColor(cand);
                  const colorScheme = {
                    green: {
                      border: 'border-emerald-500/30 hover:border-emerald-400/80 bg-slate-950/80 hover:bg-emerald-950/20',
                      badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                      sanText: 'text-emerald-400 group-hover:text-emerald-300',
                      dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]',
                      btnText: 'text-emerald-400',
                    },
                    blue: {
                      border: 'border-blue-500/30 hover:border-blue-400/80 bg-slate-950/80 hover:bg-blue-950/20',
                      badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
                      sanText: 'text-blue-400 group-hover:text-blue-300',
                      dot: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.7)]',
                      btnText: 'text-blue-400',
                    },
                    red: {
                      border: 'border-rose-500/30 hover:border-rose-400/80 bg-slate-950/80 hover:bg-rose-950/20',
                      badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                      sanText: 'text-rose-400 group-hover:text-rose-300',
                      dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]',
                      btnText: 'text-rose-400',
                    },
                    yellow: {
                      border: 'border-amber-500/30 hover:border-amber-400/80 bg-slate-950/80 hover:bg-amber-950/20',
                      badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                      sanText: 'text-amber-400 group-hover:text-amber-300',
                      dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]',
                      btnText: 'text-amber-400',
                    },
                  }[candColor];

                  return (
                    <button
                      key={cand.san}
                      onClick={() => makeMove(cand.from, cand.to)}
                      onMouseEnter={() => setHoveredCandidate(cand)}
                      onMouseLeave={() => setHoveredCandidate(null)}
                      className={`w-full p-3.5 rounded-xl border text-left transition-all group shadow-md ${colorScheme.border}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colorScheme.dot}`} />
                          <span className={`font-mono font-black text-base group-hover:scale-105 transition-transform ${colorScheme.sanText}`}>
                            {cand.san}
                          </span>
                          {cand.tag && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${colorScheme.badge}`}>
                              {cand.tag}
                            </span>
                          )}
                        </div>
                        <div className={`text-xs font-bold flex items-center gap-1.5 ${colorScheme.btnText}`}>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Oyna</span>
                        </div>
                      </div>

                      {/* Leads To with Arrow */}
                      <div className="text-xs font-semibold text-indigo-300 mt-2 flex items-center gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 inline shrink-0 text-indigo-400" />
                        <span>{cand.leadsTo}</span>
                      </div>

                      {/* Why this move */}
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {cand.why}
                      </p>

                      {/* Threat / Protection */}
                      {cand.threat && (
                        <div className="text-[11px] text-slate-400 mt-1.5 pt-1.5 border-t border-slate-800/60 flex items-center gap-1.5">
                          <span className="text-amber-400/90 font-bold shrink-0">🎯 Tehdit / Hedef:</span>
                          <span className="truncate">{cand.threat}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Decision Tree History Branches */}
            {decisionPoints.length > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-300">
                  <GitBranch className="w-3.5 h-3.5 text-blue-400" />
                  <span>Açılış Karar Noktaları (Geri Dön & Dene):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {decisionPoints.map((dp) => (
                    <button
                      key={dp.plyIndex}
                      onClick={() => {
                        setSelectedTreePly(dp.plyIndex);
                        if (dp.playedSan) {
                          branchToMove(dp.prefix, dp.playedSan);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                        (selectedTreePly === dp.plyIndex || (selectedTreePly === null && dp.plyIndex === activeDecisionPoint?.plyIndex))
                          ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {dp.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* "DÜNYADA KAÇ AÇILIŞ VAR?" MODAL                          */}
      {/* ========================================================= */}
      {showEcoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowEcoModal(false)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
              <HelpCircle className="w-4 h-4" />
              <span>Satranç Teorisi ve Ansiklopedisi</span>
            </div>

            <h2 className="text-2xl font-extrabold text-white">
              Dünyada Bilinen Kaç Satranç Açılışı Var?
            </h2>

            <div className="mt-4 space-y-4 text-sm text-slate-300 leading-relaxed">
              <p>
                Dünya Satranç Federasyonu (FIDE) ve Oxford Satranç Ansiklopedisi literatüründe kayıtlı <strong>1.327 adet isim verilmiş açılış ve varyant</strong> bulunmaktadır.
              </p>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <h4 className="font-bold text-amber-300 text-xs uppercase mb-2">
                  ECO (Encyclopaedia of Chess Openings) 5 Ciltlik Sınıflandırması:
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold text-amber-400 w-16 shrink-0">Cilt A:</span>
                    <span>Kanat açılışları (İngiliz 1.c4, Réti 1.Nf3, Bird 1.f4) ve 1.d4'e karşı düzensiz yanıtlar.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold text-blue-400 w-16 shrink-0">Cilt B:</span>
                    <span>1.e4'e karşı yarı açık oyunlar (Sicilya Savunması, Caro-Kann, İskandinav, Alekhine).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold text-emerald-400 w-16 shrink-0">Cilt C:</span>
                    <span>1.e4 e5 açık oyunlar (İtalyan, İspanyol, Şah Gambiti, İki At) ve Fransız Savunması.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold text-purple-400 w-16 shrink-0">Cilt D:</span>
                    <span>1.d4 d5 kapalı oyunlar (Vezir Gambiti, Slav Savunması, Grünfeld).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono font-bold text-rose-400 w-16 shrink-0">Cilt E:</span>
                    <span>1.d4'e karşı Hint savunmaları (Şah-Hint, Nimzo-Hint, Bogo-Hint, Vezir-Hint).</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                💡 <strong>Önemli Gerçek:</strong> 1.300'den fazla varyant olmasına rağmen, büyükusta ve turnuva seviyesinde oynanan maçların yaklaşık <strong>%90'ı bilinen 30-40 ana açılış ailesi</strong> üzerinden oynanır.
              </p>
            </div>

            <button
              onClick={() => setShowEcoModal(false)}
              className="mt-6 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors"
            >
              Anladım, Karar Ağacına Devam Et
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
