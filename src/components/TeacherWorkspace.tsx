import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import type { Key } from 'chessground/types';
import type { DrawShape } from 'chessground/draw';
import { Chessboard } from './Chessboard';
import { EvaluationBar } from './EvaluationBar';
import { stockfishService } from '../services/stockfishService';
import { nullMoveThreatService, type OpponentThreat } from '../services/nullMoveService';
import { classicEvalService, type EvalDeltaReason } from '../services/classicEvalService';
import { fetchOpeningStats, type OpeningStatsResponse } from '../services/lichessService';
import {
  extractBoardFeatures,
  extractMoveImpact,
  roleToTr,
  type BoardFeatures,
} from '../utils/boardFeatureExtractor';
import { findOpeningByMoves, getBookBranches, type BookBranch } from '../data/openingsDatabase';
import { convertPvToSan } from '../utils/tacticalSafety';
import { geminiCoachService } from '../services/geminiCoachService';
import { soundManager } from '../utils/sound';
import type { EngineEvaluation } from '../types/chess';
import {
  RotateCcw,
  Undo2,
  RefreshCw,
  Swords,
  Shield,
  Sparkles,
  Compass,
  Bot,
  Microscope,
  Key as KeyIcon,
  ArrowRight,
  GitBranch,
} from 'lucide-react';

interface MoveRecord {
  san: string;
  beforeFen: string;
  afterFen: string;
  from: Key;
  to: Key;
  mover: 'white' | 'black';
  wasBook: boolean;
  preBestSan?: string;
  preScoreWhiteCp?: number;
}

interface MoveVerdict {
  badge: string;
  tone: 'book' | 'best' | 'good' | 'inaccuracy' | 'mistake';
  summary: string;
  reasons: string[];
}

export const TeacherWorkspace: React.FC = () => {
  const [game, setGame] = useState<Chess>(() => new Chess());
  const [records, setRecords] = useState<MoveRecord[]>([]);
  const [color, setColor] = useState<'white' | 'black'>('white');
  const [autoBotPlay, setAutoBotPlay] = useState<boolean>(true);
  const [botThinking, setBotThinking] = useState<boolean>(false);
  const [hoveredBranch, setHoveredBranch] = useState<BookBranch | null>(null);

  // Engine, Threat & XAI States
  const [engineEval, setEngineEval] = useState<EngineEvaluation | null>(null);
  const [opponentThreat, setOpponentThreat] = useState<OpponentThreat | null>(null);
  const [boardFeatures, setBoardFeatures] = useState<BoardFeatures | null>(null);
  const [masterStats, setMasterStats] = useState<OpeningStatsResponse | null>(null);

  // DecodeChess Delta Explanations
  const [bestMoveReasons, setBestMoveReasons] = useState<string[]>([]);
  const [lastMoveDeltaReasons, setLastMoveDeltaReasons] = useState<string[]>([]);

  // Gemini Summary State
  const [geminiTip, setGeminiTip] = useState<string | null>(null);
  const [geminiLoading, setGeminiLoading] = useState<boolean>(false);
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [keyInput, setKeyInput] = useState<string>(() => geminiCoachService.getApiKey());
  const hasApiKey = geminiCoachService.hasApiKey();

  const historyMoves = useMemo(() => records.map((r) => r.san), [records]);
  const currentTurnColor = game.turn() === 'w' ? 'white' : 'black';
  const isPlayerTurn = !autoBotPlay || currentTurnColor === color;

  const gameRef = useRef(game);
  gameRef.current = game;
  const recordsRef = useRef(records);
  recordsRef.current = records;
  const engineEvalRef = useRef(engineEval);
  engineEvalRef.current = engineEval;
  const suppressBotRef = useRef(false);
  const botTurnHandledRef = useRef<string>('');

  // Book branches from current position
  const bookBranches = useMemo(
    () => getBookBranches(historyMoves, game, 4),
    [historyMoves, game]
  );

  // 1. Move Execution (records pre-move eval & book status for Move Review)
  const executeMove = useCallback(
    (from: string, to: string, promotion: string = 'q'): boolean => {
      const current = gameRef.current;
      const beforeFen = current.fen();
      const mover: 'white' | 'black' = current.turn() === 'w' ? 'white' : 'black';
      const currentMoves = recordsRef.current.map((r) => r.san);
      const currentBook = getBookBranches(currentMoves, current, 12);

      const next = new Chess(beforeFen);
      let moveObj;
      try {
        moveObj = next.move({ from, to, promotion });
      } catch {
        return false;
      }
      if (!moveObj) return false;

      if (moveObj.captured) soundManager.playCapture();
      else soundManager.playMove();
      if (next.inCheck()) soundManager.playCheck();

      const wasBook = currentBook.some((b) => b.san === moveObj.san);
      const prevEval =
        engineEvalRef.current?.fen === beforeFen ? engineEvalRef.current : null;

      const entry: MoveRecord = {
        san: moveObj.san,
        beforeFen,
        afterFen: next.fen(),
        from: from as Key,
        to: to as Key,
        mover,
        wasBook,
        preBestSan: prevEval?.bestMoveSan,
        preScoreWhiteCp: prevEval?.score,
      };

      suppressBotRef.current = false;
      setHoveredBranch(null);
      setRecords((prev) => [...prev, entry]);
      setGame(next);
      return true;
    },
    []
  );

  // 2. Fetch Lichess Master Explorer stats (gracefully cached + offline fallback)
  useEffect(() => {
    let active = true;
    fetchOpeningStats(game.fen()).then((stats) => {
      if (active) setMasterStats(stats);
    });
    return () => {
      active = false;
    };
  }, [game.fen()]);

  // 3. Unified Engine Evaluation, Null-Move Threat & Book+Engine Bot Play
  useEffect(() => {
    const fen = game.fen();
    const isBotTurn = autoBotPlay && currentTurnColor !== color && !suppressBotRef.current;

    // A: Bitboard features
    setBoardFeatures(extractBoardFeatures(fen, color));

    // B: Stop playing bot if game over
    if (game.isGameOver()) {
      setBotThinking(false);
      setOpponentThreat(null);
      return;
    }

    // C: If Bot's turn in Practice mode
    if (isBotTurn) {
      setOpponentThreat(null);
      setBotThinking(true);
      const alreadyHandled = botTurnHandledRef.current === fen;

      // Prefer Opening Book moves while in theory!
      if (bookBranches.length > 0 && !alreadyHandled) {
        botTurnHandledRef.current = fen;
        // Weighted pick among top 3 book lines so games explore real openings
        const topPool = bookBranches.slice(0, 3);
        const totalW = topPool.reduce((acc, b) => acc + Math.max(1, b.weight), 0);
        let r = Math.random() * totalW;
        let chosen = topPool[0];
        for (const cand of topPool) {
          r -= Math.max(1, cand.weight);
          if (r <= 0) {
            chosen = cand;
            break;
          }
        }

        const timer = window.setTimeout(() => {
          if (gameRef.current.fen() !== fen) return;
          setBotThinking(false);
          executeMove(chosen.from, chosen.to, 'q');
        }, 450);

        return () => window.clearTimeout(timer);
      }

      // Out of Book -> Stockfish Engine Move
      stockfishService.evaluatePosition(fen, 10, (ev) => {
        setEngineEval(ev);
        if (!alreadyHandled && ev.bestMove && ev.bestMove.length >= 4) {
          botTurnHandledRef.current = fen;
          const uci = ev.bestMove;
          setTimeout(() => {
            if (gameRef.current.fen() !== fen) return;
            setBotThinking(false);
            executeMove(uci.slice(0, 2), uci.slice(2, 4), uci[4] || 'q');
          }, 400);
        }
      });

      return () => {
        stockfishService.stop();
      };
    }

    // D: Player / Explorer Analysis Turn
    setBotThinking(false);
    stockfishService.evaluatePosition(fen, 12, (ev) => {
      setEngineEval(ev);
    });

    nullMoveThreatService.detectThreat(fen, engineEvalRef.current?.score).then((threat) => {
      if (gameRef.current.fen() === fen) {
        setOpponentThreat(threat);
      }
    });

    return () => {
      stockfishService.stop();
      nullMoveThreatService.stop();
    };
  }, [game, color, currentTurnColor, autoBotPlay, bookBranches, executeMove]);

  // 4. Compute SAN + PV SAN for Engine Best Move
  const bestMoveSan = useMemo(() => {
    if (engineEval?.bestMoveSan) return engineEval.bestMoveSan;
    if (!engineEval?.bestMove || engineEval.bestMove.length < 4) return null;
    try {
      const c = new Chess(game.fen());
      const m = c.move({
        from: engineEval.bestMove.slice(0, 2),
        to: engineEval.bestMove.slice(2, 4),
        promotion: engineEval.bestMove[4] || undefined,
      });
      return m?.san || engineEval.bestMove;
    } catch {
      return engineEval.bestMove;
    }
  }, [engineEval?.bestMoveSan, engineEval?.bestMove, game]);

  const bestPvSan = useMemo(() => {
    if (!engineEval?.pv || engineEval.pv.length === 0) return [];
    return convertPvToSan(game.fen(), engineEval.pv.slice(0, 5));
  }, [engineEval?.pv, game]);

  // 5. DecodeChess Delta Analysis for Recommended Best Move (chessops + Classic Stockfish eval)
  useEffect(() => {
    const fen = game.fen();
    const uci = engineEval?.bestMove;
    if (!uci || uci.length < 4 || !bestMoveSan) {
      setBestMoveReasons([]);
      return;
    }

    let active = true;
    try {
      const sim = new Chess(fen);
      const m = sim.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
      if (!m) {
        setBestMoveReasons([]);
        return;
      }
      const afterFen = sim.fen();
      const geometric = extractMoveImpact(fen, afterFen, bestMoveSan, currentTurnColor);
      setBestMoveReasons(geometric);

      classicEvalService.getEvalDelta(fen, afterFen, currentTurnColor).then((evalDeltas: EvalDeltaReason[]) => {
        if (!active || gameRef.current.fen() !== fen) return;
        const evalNotes = evalDeltas.map((d) => `📊 ${d.detail}`);
        setBestMoveReasons([...geometric, ...evalNotes].slice(0, 5));
      });
    } catch {
      setBestMoveReasons([]);
    }

    return () => {
      active = false;
    };
  }, [game.fen(), engineEval?.bestMove, bestMoveSan, currentTurnColor]);

  // 6. Last Played Move Review Delta (chessops + Classic Stockfish eval)
  const lastRecord = records.length > 0 ? records[records.length - 1] : null;

  useEffect(() => {
    if (!lastRecord) {
      setLastMoveDeltaReasons([]);
      return;
    }
    let active = true;
    const geometric = extractMoveImpact(
      lastRecord.beforeFen,
      lastRecord.afterFen,
      lastRecord.san,
      lastRecord.mover
    );
    setLastMoveDeltaReasons(geometric);

    classicEvalService
      .getEvalDelta(lastRecord.beforeFen, lastRecord.afterFen, lastRecord.mover)
      .then((deltas) => {
        if (!active) return;
        const evalNotes = deltas.map((d) => `📊 ${d.detail}`);
        setLastMoveDeltaReasons([...geometric, ...evalNotes].slice(0, 4));
      });

    return () => {
      active = false;
    };
  }, [lastRecord]);

  const lastMoveVerdict = useMemo<MoveVerdict | null>(() => {
    if (!lastRecord) return null;

    if (lastRecord.wasBook) {
      return {
        badge: '📚 Kitap Hamlesi',
        tone: 'book',
        summary: `${lastRecord.san} teorik açılış ağacının ana devam yollarından biridir.`,
        reasons: lastMoveDeltaReasons,
      };
    }

    if (lastRecord.preBestSan && lastRecord.san === lastRecord.preBestSan) {
      return {
        badge: '⭐ En İyi Hamle',
        tone: 'best',
        summary: `${lastRecord.san} motorun önerdiği en güçlü hamledir.`,
        reasons: lastMoveDeltaReasons,
      };
    }

    if (
      lastRecord.preScoreWhiteCp !== undefined &&
      engineEval &&
      engineEval.fen === lastRecord.afterFen
    ) {
      const sign = lastRecord.mover === 'white' ? 1 : -1;
      const beforeMoverCp = lastRecord.preScoreWhiteCp * sign;
      const afterMoverCp = engineEval.score * sign;
      const cpLoss = beforeMoverCp - afterMoverCp;

      if (cpLoss >= 180) {
        return {
          badge: `❌ Hata (-${(cpLoss / 100).toFixed(1)} piyon)`,
          tone: 'mistake',
          summary: `${lastRecord.san} avantaj kaybettirdi.${lastRecord.preBestSan ? ` Doğrusu: ${lastRecord.preBestSan}` : ''}`,
          reasons: lastMoveDeltaReasons,
        };
      }
      if (cpLoss >= 80) {
        return {
          badge: `⚠️ Şüpheli (-${(cpLoss / 100).toFixed(1)} piyon)`,
          tone: 'inaccuracy',
          summary: `${lastRecord.san} biraz pasif kaldı.${lastRecord.preBestSan ? ` Alternatif: ${lastRecord.preBestSan}` : ''}`,
          reasons: lastMoveDeltaReasons,
        };
      }
    }

    return {
      badge: '✅ Sağlam Hamle',
      tone: 'good',
      summary: `${lastRecord.san} konumsal dengeyi korur.`,
      reasons: lastMoveDeltaReasons,
    };
  }, [lastRecord, engineEval, lastMoveDeltaReasons]);

  // 7. Optional Gemini Short Synthesis (debounced & only on settled player turn to prevent 429 rate-limits)
  useEffect(() => {
    if (!hasApiKey || !isPlayerTurn || botThinking || game.isGameOver() || !bestMoveSan) {
      if (game.isGameOver()) setGeminiTip(null);
      setGeminiLoading(false);
      return;
    }

    let isSubscribed = true;
    const fenSnapshot = game.fen();
    const timer = window.setTimeout(() => {
      if (!isSubscribed || gameRef.current.fen() !== fenSnapshot) return;
      const opening = findOpeningByMoves(historyMoves);
      setGeminiLoading(true);

      geminiCoachService
        .analyzePosition({
          fen: fenSnapshot,
          moveHistory: historyMoves,
          lastMoveSan: lastRecord?.san,
          playerColor: color,
          level: 'intermediate',
          openingName: opening?.name,
          eco: opening?.eco,
          stockfishEval: engineEval
            ? {
                score: engineEval.score,
                bestMoveSan: bestMoveSan || undefined,
                pvSans: bestPvSan,
              }
            : undefined,
          immediateThreat: opponentThreat?.description,
          tacticalFeatures: [...(boardFeatures?.tacticalBulletPoints || []), ...bestMoveReasons],
        })
        .then((res) => {
          if (!isSubscribed) return;
          if (res?.coachTip) setGeminiTip(res.coachTip);
          setGeminiLoading(false);
        })
        .catch(() => {
          if (isSubscribed) setGeminiLoading(false);
        });
    }, 700);

    return () => {
      isSubscribed = false;
      window.clearTimeout(timer);
    };
  }, [game.fen(), hasApiKey, isPlayerTurn, botThinking, color, bestMoveSan, opponentThreat?.description]);

  // 8. Board Arrows: Hover Branch (Blue), Severe Threat (Red), Best Move (Green)
  const boardArrows = useMemo<[string, string, string?][]>(() => {
    const arrows: [string, string, string?][] = [];
    const validSq = (sq?: string) => Boolean(sq && /^[a-h][1-8]$/.test(sq));

    if (hoveredBranch && validSq(hoveredBranch.from) && validSq(hoveredBranch.to)) {
      arrows.push([hoveredBranch.from, hoveredBranch.to, 'blue']);
      return arrows;
    }

    if (
      opponentThreat?.isSevereThreat &&
      validSq(opponentThreat.from) &&
      validSq(opponentThreat.to)
    ) {
      arrows.push([opponentThreat.from, opponentThreat.to, 'red']);
    }

    if (isPlayerTurn && engineEval?.bestMove && engineEval.bestMove.length >= 4) {
      const from = engineEval.bestMove.slice(0, 2);
      const to = engineEval.bestMove.slice(2, 4);
      if (validSq(from) && validSq(to) && !arrows.some(([f, t]) => f === from && t === to)) {
        arrows.push([from, to, 'green']);
      }
    }

    return arrows;
  }, [hoveredBranch, opponentThreat, engineEval?.bestMove, isPlayerTurn]);

  // 9. Board Square Highlights (Pins = Yellow, Hanging = Red)
  const boardShapes = useMemo<DrawShape[]>(() => {
    if (!boardFeatures) return [];
    const shapes: DrawShape[] = [];
    for (const p of boardFeatures.friendlyPins) {
      shapes.push({ orig: p.square as Key, brush: 'yellow' });
    }
    for (const h of boardFeatures.friendlyHanging) {
      shapes.push({ orig: h.square as Key, brush: 'red' });
    }
    return shapes;
  }, [boardFeatures]);

  const legalDests = useMemo(() => {
    const dests = new Map<Key, Key[]>();
    if (!isPlayerTurn || botThinking || game.isGameOver()) return dests;
    game.moves({ verbose: true }).forEach((m) => {
      const from = m.from as Key;
      const to = m.to as Key;
      if (!dests.has(from)) dests.set(from, []);
      dests.get(from)!.push(to);
    });
    return dests;
  }, [game, isPlayerTurn, botThinking]);

  const lastMoveSquares = useMemo<[Key, Key] | undefined>(() => {
    if (!lastRecord) return undefined;
    return [lastRecord.from, lastRecord.to];
  }, [lastRecord]);

  // Jump to any move in history to explore alternate opening lines
  const handleJumpToMove = (idx: number) => {
    if (idx < 0 || idx >= records.length) return;
    suppressBotRef.current = true;
    const sliced = records.slice(0, idx + 1);
    setRecords(sliced);
    setGame(new Chess(sliced[sliced.length - 1].afterFen));
  };

  const handleUndo = () => {
    if (records.length === 0) return;
    suppressBotRef.current = true;
    const sliced = records.slice(0, -1);
    setRecords(sliced);
    setGame(sliced.length > 0 ? new Chess(sliced[sliced.length - 1].afterFen) : new Chess());
  };

  const handleReset = () => {
    suppressBotRef.current = false;
    botTurnHandledRef.current = '';
    setRecords([]);
    setGame(new Chess());
  };

  const openingInfo = findOpeningByMoves(historyMoves);

  // Merge Lichess GM statistics into book branches if available
  const enrichedBranches = useMemo(() => {
    return bookBranches.map((branch) => {
      const stat = masterStats?.moves?.find((m) => m.san === branch.san);
      return {
        ...branch,
        stat,
      };
    });
  }, [bookBranches, masterStats]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col lg:flex-row gap-6 p-4 sm:p-6 text-slate-100">
      {/* ======================================================== */}
      {/* SOL SÜTUN: TAHTA + KONTROLLER + TAKTİK RADAR + HAMLELER  */}
      {/* ======================================================== */}
      <div className="w-full lg:w-[540px] flex flex-col gap-3.5 shrink-0">
        {/* Tahta ve Stockfish Eval Çubuğu */}
        <div className="flex gap-3 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-2xl">
          <div className="h-[430px] flex items-center">
            <EvaluationBar evaluation={engineEval} orientation={color} />
          </div>
          <div className="w-[430px] max-w-full aspect-square">
            <Chessboard
              fen={game.fen()}
              orientation={color}
              interactive={isPlayerTurn && !botThinking}
              turnColor={currentTurnColor}
              dests={legalDests}
              onMove={(orig, dest) => executeMove(orig, dest, 'q')}
              arrows={boardArrows}
              customShapes={boardShapes}
              lastMove={lastMoveSquares}
              check={game.inCheck()}
            />
          </div>
        </div>

        {/* Tahta Kontrol Butonları */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-2.5 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 font-semibold text-slate-200 hover:bg-slate-700 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Yeni</span>
            </button>
            <button
              type="button"
              onClick={handleUndo}
              disabled={records.length === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 font-semibold text-slate-200 hover:bg-slate-700 transition disabled:opacity-40"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span>Geri Al</span>
            </button>
            <button
              type="button"
              onClick={() => setColor((c) => (c === 'white' ? 'black' : 'white'))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 font-semibold text-slate-200 hover:bg-slate-700 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{color === 'white' ? 'Beyaz' : 'Siyah'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              suppressBotRef.current = false;
              setAutoBotPlay((prev) => !prev);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-semibold transition ${
              autoBotPlay
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300'
            }`}
          >
            {autoBotPlay ? <Bot className="h-3.5 w-3.5" /> : <Microscope className="h-3.5 w-3.5" />}
            <span>{autoBotPlay ? 'Kitap+Motor Bot' : 'Serbest İnceleme'}</span>
          </button>
        </div>

        {/* ⚡ Tahta Taktik Radarı (Tahtanın Altında) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Swords className="h-3.5 w-3.5 text-amber-400" />
              <span>Tahta Taktik Radarı</span>
            </span>
            <span className="text-[11px] text-slate-500 font-normal">
              {botThinking ? 'Rakip düşünüyor...' : 'Bitboard & Ray-Tracing'}
            </span>
          </div>

          {boardFeatures && boardFeatures.tacticalBulletPoints.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {boardFeatures.friendlyHanging.map((h) => (
                <span
                  key={`fh-${h.square}`}
                  className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-300"
                >
                  ⚠️ {h.square}: {roleToTr(h.pieceRole)} boşta
                </span>
              ))}
              {boardFeatures.friendlyPins.map((p) => (
                <span
                  key={`fp-${p.square}`}
                  className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300"
                >
                  🔒 {p.square}: {roleToTr(p.pieceRole)} açmazda
                </span>
              ))}
              {boardFeatures.opponentHanging.map((oh) => (
                <span
                  key={`oh-${oh.square}`}
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300"
                >
                  🎯 {oh.square}: Rakip {roleToTr(oh.pieceRole)} korumasız
                </span>
              ))}
              {boardFeatures.activeForks.map((f) => (
                <span
                  key={`fk-${f.attackerSquare}`}
                  className="inline-flex items-center gap-1 rounded-md border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 text-[11px] font-semibold text-purple-300"
                >
                  ⚔️ {f.attackerSquare}: Çatal
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">Tahtada açık taktik zaaf yok; taşlar korunaklı.</p>
          )}
        </div>

        {/* 📜 Tıklanabilir Hamle Geçmişi (PGN) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>Hamle Geçmişi</span>
            {records.length > 0 && (
              <span className="text-[10px] font-normal text-slate-500">
                Dallanmak için hamleye tıkla
              </span>
            )}
          </div>
          <div className="max-h-28 overflow-y-auto font-mono text-xs text-slate-300 flex flex-wrap gap-x-1.5 gap-y-1">
            {records.length === 0 ? (
              <span className="text-slate-500 text-[11px]">Başlangıç konumu — bir hamle yapın veya sağdan açılış dalı seçin.</span>
            ) : (
              records.map((rec, idx) => {
                const moveNum = Math.floor(idx / 2) + 1;
                const isWhite = idx % 2 === 0;
                const isLast = idx === records.length - 1;
                return (
                  <button
                    key={`${idx}-${rec.san}`}
                    type="button"
                    onClick={() => handleJumpToMove(idx)}
                    className={`inline-flex items-center gap-1 rounded px-1 py-0.5 transition hover:bg-slate-800 ${
                      isLast ? 'bg-amber-500/15 font-bold text-amber-300' : 'text-slate-200'
                    }`}
                  >
                    {isWhite && <span className="text-slate-500">{moveNum}.</span>}
                    <span>{rec.san}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SAĞ SÜTUN: AÇILIŞ DALLANMASI & DECODE XAI ANALİZİ        */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col gap-4">
        {/* 1. 🏛️ Açılış Bilgisi + Son Hamle Karnesi + Dallanma ("Nereye Gider?") */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
              <Compass className="h-3.5 w-3.5 text-amber-400" />
              <span>{openingInfo?.eco || 'A00'} • {openingInfo?.name || 'Başlangıç Konumu'}</span>
            </span>

            <button
              type="button"
              onClick={() => setShowKeyInput((p) => !p)}
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition"
            >
              <KeyIcon className="h-3 w-3" />
              <span>{hasApiKey ? 'Gemini: Aktif' : 'API Anahtarı'}</span>
            </button>
          </div>

          {showKeyInput && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs">
              <input
                type="password"
                placeholder="Gemini API Anahtarı..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="flex-1 bg-transparent px-2 text-slate-100 outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  geminiCoachService.setApiKey(keyInput);
                  setShowKeyInput(false);
                }}
                className="rounded-lg bg-amber-500 px-3 py-1 font-bold text-slate-950"
              >
                Kaydet
              </button>
            </div>
          )}

          {/* Son Oynanan Hamlenin Karnesi (Move Review + Delta) */}
          {lastMoveVerdict && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                    lastMoveVerdict.tone === 'book'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : lastMoveVerdict.tone === 'best' || lastMoveVerdict.tone === 'good'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : lastMoveVerdict.tone === 'inaccuracy'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {lastMoveVerdict.badge}
                </span>
                <span className="text-xs font-medium text-slate-200">{lastMoveVerdict.summary}</span>
              </div>
              {lastMoveVerdict.reasons.length > 0 && (
                <ul className="space-y-0.5 pl-1">
                  {lastMoveVerdict.reasons.map((r, i) => (
                    <li key={i} className="text-[11px] text-slate-300">
                      {r}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Görsel Açılış Ağacı: Bu Konumdan Hangi Açılış Dallarına Gidilir? */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5 text-cyan-400" />
                <span>
                  {enrichedBranches.length > 0
                    ? 'Görsel Açılış Ağacı (Nereye Gider?)'
                    : 'Açılış Kitabı Dışına Çıkıldı'}
                </span>
              </span>
              {masterStats?.totalGames ? (
                <span className="text-[10px] font-normal text-slate-500">
                  {masterStats.totalGames.toLocaleString('tr-TR')} Usta Maçı
                </span>
              ) : null}
            </div>

            {enrichedBranches.length > 0 ? (
              <div className="pt-1">
                {/* Ağacın Kök Düğümü */}
                <div className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-950/30 px-2.5 py-1 text-[11px] font-bold text-cyan-200">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                  <span>
                    {records.length > 0
                      ? `${Math.ceil(records.length / 2)}. ${records[records.length - 1].san}`
                      : 'Başlangıç'}
                  </span>
                  <span className="text-slate-400 font-normal truncate max-w-[200px]">
                    ({openingInfo?.name || 'Merkez Mücadelesi'})
                  </span>
                </div>

                {/* Dikey Ana Gövde ve Dal Bağlantıları */}
                <div className="relative ml-3 border-l-2 border-cyan-500/35 pl-4 pt-2.5 space-y-2.5">
                  {enrichedBranches.map((b, idx) => (
                    <div key={b.san} className="relative">
                      {/* Yatay Dal Kolu ve Düğüm Noktası */}
                      <span
                        aria-hidden="true"
                        className="absolute -left-4 top-4 h-[2px] w-4 bg-cyan-500/40"
                      />
                      <span
                        aria-hidden="true"
                        className={`absolute -left-[21px] top-[13px] h-2.5 w-2.5 rounded-full ring-2 ring-slate-900 ${
                          idx === 0 ? 'bg-emerald-400' : 'bg-cyan-400'
                        }`}
                      />

                      <button
                        type="button"
                        disabled={!isPlayerTurn || botThinking}
                        onMouseEnter={() => setHoveredBranch(b)}
                        onMouseLeave={() => setHoveredBranch(null)}
                        onClick={() => executeMove(b.from, b.to, 'q')}
                        className="group w-full flex flex-col gap-1.5 rounded-xl border border-slate-800 bg-slate-950/75 p-2.5 text-left transition hover:border-cyan-500/60 hover:bg-slate-900 disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between gap-2 w-full">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`font-mono font-black text-sm px-2 py-0.5 rounded-md ${
                                idx === 0
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                              }`}
                            >
                              {b.san}
                            </span>
                            <span className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1">
                              <ArrowRight className="h-3 w-3 text-slate-500 shrink-0" />
                              <span className="truncate">{b.leadsTo}</span>
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">{b.eco}</span>
                        </div>

                        {b.stat && (
                          <div className="space-y-1 w-full">
                            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="bg-slate-100"
                                style={{ width: `${b.stat.whiteWinRate}%` }}
                                title={`Beyaz %${b.stat.whiteWinRate}`}
                              />
                              <div
                                className="bg-slate-500"
                                style={{ width: `${b.stat.drawRate}%` }}
                                title={`Berabere %${b.stat.drawRate}`}
                              />
                              <div
                                className="bg-slate-950"
                                style={{ width: `${b.stat.blackWinRate}%` }}
                                title={`Siyah %${b.stat.blackWinRate}`}
                              />
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Beyaz %{b.stat.whiteWinRate} • Berabere %{b.stat.drawRate} • Siyah %{b.stat.blackWinRate}
                            </div>
                          </div>
                        )}
                      </button>

                      {/* 2. Seviye Alt Dallar (Karşı Cevaplar) */}
                      {b.subBranches && b.subBranches.length > 0 && (
                        <div className="ml-4 mt-1.5 border-l border-slate-700/80 pl-3 space-y-1">
                          {b.subBranches.map((sub) => (
                            <div
                              key={`${b.san}-${sub.san}`}
                              className="relative flex items-center gap-1.5 text-[11px] text-slate-400"
                            >
                              <span
                                aria-hidden="true"
                                className="absolute -left-3 top-2 h-[1px] w-2.5 bg-slate-700"
                              />
                              <span className="font-mono font-bold text-slate-300 bg-slate-800/80 px-1.5 py-0.2 rounded">
                                {sub.san}
                              </span>
                              <span className="truncate">{sub.leadsTo}</span>
                              <span className="text-[9px] font-mono text-slate-500 shrink-0">({sub.eco})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">
                Bu varyant açılış kitabı dışındadır; analiz tamamen Stockfish + Decode XAI kurallarıyla devam ediyor.
              </p>
            )}
          </div>
        </div>

        {/* 2. 🔴 RAKİP NE İSTİYOR? (Eşikli Null-Move Tehdit Radarı) */}
        <div
          className={`rounded-2xl border p-4 shadow-xl ${
            opponentThreat?.isSevereThreat
              ? 'border-rose-500/40 bg-rose-950/25'
              : 'border-slate-800 bg-slate-900/70'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm mb-1.5">
            <span
              className={`flex h-2.5 w-2.5 rounded-full ${
                opponentThreat?.isSevereThreat ? 'bg-rose-500 animate-pulse' : 'bg-slate-500'
              }`}
            />
            <span className={opponentThreat?.isSevereThreat ? 'text-rose-300' : 'text-slate-300'}>
              Rakip Ne İstiyor? {opponentThreat?.isSevereThreat ? '(Kırmızı Ok 🔴)' : ''}
            </span>
          </div>

          {opponentThreat ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
                {opponentThreat.description}
              </p>
              {opponentThreat.isSevereThreat && opponentThreat.san && opponentThreat.san !== '+' && (
                <span className="font-mono text-xs font-bold text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded border border-rose-500/30">
                  Tehdit: {opponentThreat.san}
                </span>
              )}
            </div>
          ) : (
            <p className="text-slate-400 text-xs">
              Rakip tehdit profili hesaplanıyor veya başlangıç pozisyonu dengede.
            </p>
          )}
        </div>

        {/* 3. 🟢 MOTORUN EN İYİ PLANI & NEDENİ (DecodeChess Classic Eval + chessops Delta) */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-emerald-300 text-sm">
              <Shield className="h-4 w-4 text-emerald-400" />
              <span>En İyi Plan & Nedeni (Yeşil Ok 🟢)</span>
            </div>
            {engineEval && (
              <span className="text-xs font-mono text-slate-300">
                Skor: {engineEval.isMate ? `#${engineEval.mateIn}` : `${(engineEval.score / 100).toFixed(2)}`}
              </span>
            )}
          </div>

          {bestMoveSan ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 font-mono font-bold text-emerald-300 text-base">
                  {bestMoveSan}
                </span>
                {bestPvSan.length > 1 && (
                  <span className="text-[11px] font-mono text-slate-400">
                    Rota: {bestPvSan.join(' → ')}
                  </span>
                )}
              </div>

              {bestMoveReasons.length > 0 ? (
                <ul className="space-y-1 pt-1">
                  {bestMoveReasons.map((reason, idx) => (
                    <li key={idx} className="text-xs text-slate-200 leading-relaxed">
                      {reason}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">
                  Taş ve piyon dengesinin klasik değerlendirme farkı hesaplanıyor...
                </p>
              )}
            </div>
          ) : (
            <p className="text-slate-400 text-xs">Stockfish derin devam yolunu hesaplıyor...</p>
          )}
        </div>

        {/* 4. 💡 KISA KOÇLUK SENTEZİ (Yalnızca Gemini Aktifse) */}
        {hasApiKey && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-xl">
            <div className="flex items-center gap-2 font-bold text-amber-300 text-xs mb-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Kısa Özet</span>
              {geminiLoading && (
                <span className="text-[10px] text-amber-400/70 animate-pulse">(Yorumlanıyor...)</span>
              )}
            </div>
            <p className="text-slate-200 text-xs leading-relaxed">
              {geminiTip || 'Yukarıdaki açılış dalları ve motor farklarına göre konum yorumlanıyor...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
