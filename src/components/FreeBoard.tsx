import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import type { Key } from 'chessground/types';
import { Chessboard } from './Chessboard';
import { EvaluationBar } from './EvaluationBar';
import { stockfishService } from '../services/stockfishService';
import { blunderBookService } from '../services/blunderBookService';
import { findOpeningByMoves } from '../data/openingsDatabase';
import { soundManager } from '../utils/sound';
import type { Color, EngineEvaluation } from '../types/chess';
import {
  Swords,
  RotateCcw,
  Undo2,
  RefreshCw,
  Clock,
  Lightbulb,
  Eye,
  EyeOff,
  Copy,
  Check,
  BookmarkPlus,
  Trophy,
  Users,
  Bot,
} from 'lucide-react';

type OpponentMode = '800' | '1200' | '1600' | '2200' | 'local';
type TimeControl = 'unlimited' | '180' | '300' | '600';

const OPPONENT_LABELS: Record<OpponentMode, { label: string; desc: string; depth: number }> = {
  '800': { label: '800 ELO', desc: 'Başlangıç Bot', depth: 2 },
  '1200': { label: '1200 ELO', desc: 'Kulüp Botu', depth: 5 },
  '1600': { label: '1600 ELO', desc: 'Turnuva Botu', depth: 8 },
  '2200': { label: '2200+ ELO', desc: 'Tam Güç Stockfish', depth: 12 },
  local: { label: '2 Kişilik', desc: 'Aynı Ekran', depth: 0 },
};

const TIME_LABELS: Record<TimeControl, string> = {
  unlimited: 'Süresiz',
  '180': '3 dk Blitz',
  '300': '5 dk Blitz',
  '600': '10 dk Rapid',
};

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const FreeBoard: React.FC = () => {
  const [game, setGame] = useState<Chess>(() => new Chess());
  const [historyMoves, setHistoryMoves] = useState<string[]>([]);
  const [historyFens, setHistoryFens] = useState<string[]>([]);
  const [lastMoveSquares, setLastMoveSquares] = useState<[Key, Key] | undefined>();

  const [playerColor, setPlayerColor] = useState<Color>('white');
  const [opponentMode, setOpponentMode] = useState<OpponentMode>('1200');
  const [timeControl, setTimeControl] = useState<TimeControl>('300');
  const [whiteTime, setWhiteTime] = useState<number>(300);
  const [blackTime, setBlackTime] = useState<number>(300);
  const [clockStarted, setClockStarted] = useState<boolean>(false);
  const [timeoutWinner, setTimeoutWinner] = useState<Color | null>(null);

  const [showEvalBar, setShowEvalBar] = useState<boolean>(false);
  const [engineEval, setEngineEval] = useState<EngineEvaluation | null>(null);
  const [hintMove, setHintMove] = useState<{ from: string; to: string; san: string } | null>(null);
  const [hintLoading, setHintLoading] = useState<boolean>(false);
  const [botThinking, setBotThinking] = useState<boolean>(false);

  const [copiedType, setCopiedType] = useState<'fen' | 'pgn' | null>(null);
  const [blunderSaved, setBlunderSaved] = useState<boolean>(false);

  const gameRef = useRef(game);
  gameRef.current = game;
  const botTurnHandledRef = useRef<string>('');

  const turnColor: Color = game.turn() === 'w' ? 'white' : 'black';
  const isGameEnded = game.isGameOver() || timeoutWinner !== null;
  const isHumanTurn =
    !isGameEnded && (opponentMode === 'local' || turnColor === playerColor);

  const gameResultBanner = useMemo(() => {
    if (timeoutWinner) {
      return `${timeoutWinner === 'white' ? 'Beyaz' : 'Siyah'} süre üstünlüğüyle kazandı!`;
    }
    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Siyah' : 'Beyaz';
      return `Şah Mat! ${winner} kazandı.`;
    }
    if (game.isStalemate()) return 'Pat! Oyun berabere.';
    if (game.isThreefoldRepetition()) return 'Üç konum tekrarı — Berabere.';
    if (game.isInsufficientMaterial()) return 'Yetersiz materyal — Berabere.';
    if (game.isDraw()) return 'Oyun berabere bitti.';
    return null;
  }, [game, timeoutWinner]);

  const executeMove = useCallback((from: string, to: string, promotion: string = 'q'): boolean => {
    const current = gameRef.current;
    const next = new Chess(current.fen());
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
    if (next.isCheckmate()) soundManager.playSuccess();

    setHistoryFens((prev) => [...prev, current.fen()]);
    setHistoryMoves((prev) => [...prev, moveObj.san]);
    setLastMoveSquares([from as Key, to as Key]);
    setHintMove(null);
    setBlunderSaved(false);
    setClockStarted(true);
    setGame(next);
    return true;
  }, []);

  // Countdown Clock Ticker
  useEffect(() => {
    if (timeControl === 'unlimited' || !clockStarted || isGameEnded) return;

    const interval = window.setInterval(() => {
      if (gameRef.current.turn() === 'w') {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            setTimeoutWinner('black');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            setTimeoutWinner('white');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timeControl, clockStarted, isGameEnded]);

  // Bot & Optional Live Eval Effect
  useEffect(() => {
    const fen = game.fen();
    if (isGameEnded) {
      setBotThinking(false);
      return;
    }

    const isBotTurn = opponentMode !== 'local' && turnColor !== playerColor;

    if (isBotTurn) {
      setBotThinking(true);
      const alreadyHandled = botTurnHandledRef.current === fen;
      const cfg = OPPONENT_LABELS[opponentMode];

      if ((opponentMode === '800' || opponentMode === '1200') && !alreadyHandled) {
        stockfishService.evaluatePositionMultiPV(
          fen,
          cfg.depth,
          (ev) => setEngineEval(ev),
          (lines) => {
            if (botTurnHandledRef.current === fen || gameRef.current.fen() !== fen) return;
            botTurnHandledRef.current = fen;
            const pool = opponentMode === '800' ? lines.slice(0, 3) : lines.slice(0, 2);
            const picked =
              pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)]?.move : '';
            setTimeout(() => {
              if (gameRef.current.fen() !== fen) return;
              setBotThinking(false);
              if (picked && picked.length >= 4) {
                executeMove(picked.slice(0, 2), picked.slice(2, 4), picked[4] || 'q');
              }
            }, 350);
          }
        );
      } else {
        stockfishService.evaluatePosition(fen, cfg.depth, (ev) => {
          setEngineEval(ev);
          if (!alreadyHandled && ev.bestMove && ev.bestMove.length >= 4) {
            botTurnHandledRef.current = fen;
            const uci = ev.bestMove;
            setTimeout(() => {
              if (gameRef.current.fen() !== fen) return;
              setBotThinking(false);
              executeMove(uci.slice(0, 2), uci.slice(2, 4), uci[4] || 'q');
            }, 350);
          }
        });
      }

      return () => stockfishService.stop();
    }

    setBotThinking(false);
    if (showEvalBar) {
      stockfishService.evaluatePosition(fen, 11, (ev) => setEngineEval(ev));
      return () => stockfishService.stop();
    }
  }, [game, turnColor, playerColor, opponentMode, showEvalBar, isGameEnded, executeMove]);

  const handleNewGame = (newTime?: TimeControl) => {
    stockfishService.stop();
    const tc = newTime ?? timeControl;
    const initialSec = tc === 'unlimited' ? 0 : parseInt(tc, 10);
    botTurnHandledRef.current = '';
    setWhiteTime(initialSec);
    setBlackTime(initialSec);
    setClockStarted(false);
    setTimeoutWinner(null);
    setBotThinking(false);
    setEngineEval(null);
    setHintMove(null);
    setBlunderSaved(false);
    setLastMoveSquares(undefined);
    setHistoryFens([]);
    setHistoryMoves([]);
    setGame(new Chess());
  };

  const handleUndo = () => {
    if (historyFens.length === 0) return;
    stockfishService.stop();
    const stepsBack = opponentMode !== 'local' && historyFens.length >= 2 && isHumanTurn ? 2 : 1;
    const targetIdx = Math.max(0, historyFens.length - stepsBack);
    const targetFen = historyFens[targetIdx];
    setHistoryFens((prev) => prev.slice(0, targetIdx));
    setHistoryMoves((prev) => prev.slice(0, targetIdx));
    setTimeoutWinner(null);
    setHintMove(null);
    setLastMoveSquares(undefined);
    botTurnHandledRef.current = '';
    setGame(new Chess(targetFen));
  };

  const handleRequestHint = () => {
    if (isGameEnded || hintLoading) return;
    setHintLoading(true);
    const curFen = game.fen();
    stockfishService.evaluatePosition(curFen, 11, (ev) => {
      if (ev.fen && ev.fen !== curFen) return;
      if (ev.bestMove && ev.bestMove.length >= 4) {
        const from = ev.bestMove.slice(0, 2);
        const to = ev.bestMove.slice(2, 4);
        setHintMove({ from, to, san: ev.bestMoveSan || ev.bestMove });
        setHintLoading(false);
      }
    });
  };

  const handleSaveBlunder = () => {
    if (historyMoves.length === 0 || historyFens.length === 0) return;
    const prevFen = historyFens[historyFens.length - 1];
    const playedSan = historyMoves[historyMoves.length - 1];
    const opening = findOpeningByMoves(historyMoves);
    blunderBookService.save({
      fen: prevFen,
      historyMoves: historyMoves.slice(0, -1),
      playedSan,
      bestMoveSan: hintMove?.san || engineEval?.bestMoveSan || '?',
      openingName: opening?.name || 'Serbest Oyun',
      explanation: `${playedSan} hamlesi sonrası konum değerlendirmesi tekrar edilmek üzere kaydedildi.`,
    });
    setBlunderSaved(true);
    soundManager.playSuccess();
  };

  const handleCopy = (type: 'fen' | 'pgn') => {
    const text = type === 'fen' ? game.fen() : game.pgn() || historyMoves.join(' ');
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedType(type);
      window.setTimeout(() => setCopiedType(null), 1500);
    });
  };

  const arrows = useMemo<[string, string, string?][]>(() => {
    if (!hintMove) return [];
    return [[hintMove.from, hintMove.to, 'green']];
  }, [hintMove]);

  const openingInfo = findOpeningByMoves(historyMoves);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col lg:flex-row gap-6 p-4 sm:p-6 text-slate-100">
      {/* SOL: SAATLER + TAHTA + KONTROLLER */}
      <div className="w-full lg:w-[560px] flex flex-col gap-3 shrink-0">
        {/* Üst Saat & Rakip Barı */}
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs font-bold">
            {opponentMode === 'local' ? (
              <Users className="h-4 w-4 text-cyan-400" />
            ) : (
              <Bot className="h-4 w-4 text-amber-400" />
            )}
            <span>
              {opponentMode === 'local'
                ? playerColor === 'white'
                  ? 'Siyah Oyuncu'
                  : 'Beyaz Oyuncu'
                : `${OPPONENT_LABELS[opponentMode].label} (${OPPONENT_LABELS[opponentMode].desc})`}
            </span>
            {botThinking && (
              <span className="text-[11px] font-medium text-amber-400 animate-pulse">Düşünüyor...</span>
            )}
          </div>
          {timeControl !== 'unlimited' && (
            <div
              className={`font-mono font-black text-sm px-2.5 py-1 rounded-lg border ${
                turnColor !== playerColor && clockStarted
                  ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
                  : 'border-slate-700 bg-slate-950 text-slate-300'
              }`}
            >
              {formatClock(playerColor === 'white' ? blackTime : whiteTime)}
            </div>
          )}
        </div>

        {/* Tahta (+ İsteğe Bağlı Eval Bar) */}
        <div className="flex gap-3 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-2xl">
          {showEvalBar && (
            <div className="h-[440px] flex items-center">
              <EvaluationBar evaluation={engineEval} orientation={playerColor} />
            </div>
          )}
          <div className="w-[440px] max-w-full aspect-square">
            <Chessboard
              fen={game.fen()}
              orientation={playerColor}
              interactive={isHumanTurn && !botThinking}
              turnColor={turnColor}
              onMove={(orig, dest) => executeMove(orig, dest, 'q')}
              arrows={arrows}
              lastMove={lastMoveSquares}
              check={game.inCheck()}
            />
          </div>
        </div>

        {/* Alt Saat & Oyuncu Barı */}
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs font-bold">
            <Swords className="h-4 w-4 text-emerald-400" />
            <span>
              Sen ({playerColor === 'white' ? 'Beyaz' : 'Siyah'})
            </span>
          </div>
          {timeControl !== 'unlimited' && (
            <div
              className={`font-mono font-black text-sm px-2.5 py-1 rounded-lg border ${
                turnColor === playerColor && clockStarted
                  ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                  : 'border-slate-700 bg-slate-950 text-slate-300'
              }`}
            >
              {formatClock(playerColor === 'white' ? whiteTime : blackTime)}
            </div>
          )}
        </div>

        {/* Hızlı Aksiyonlar */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleNewGame()}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 font-semibold text-slate-200 hover:bg-slate-700 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Yeni Maç</span>
            </button>
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyFens.length === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 font-semibold text-slate-200 hover:bg-slate-700 transition disabled:opacity-40"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span>Geri Al</span>
            </button>
            <button
              type="button"
              onClick={() => setPlayerColor((c) => (c === 'white' ? 'black' : 'white'))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 font-semibold text-slate-200 hover:bg-slate-700 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{playerColor === 'white' ? 'Beyaz' : 'Siyah'}</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRequestHint}
              disabled={isGameEnded || hintLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 font-semibold text-amber-300 hover:bg-amber-500/25 transition disabled:opacity-40"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              <span>{hintLoading ? '...' : hintMove ? `İpucu: ${hintMove.san}` : 'İpucu'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowEvalBar((p) => !p)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 font-semibold text-slate-300 hover:bg-slate-700 transition"
              title="Değerlendirme Çubuğunu Aç/Kapat"
            >
              {showEvalBar ? <Eye className="h-3.5 w-3.5 text-cyan-400" /> : <EyeOff className="h-3.5 w-3.5" />}
              <span>Eval</span>
            </button>
          </div>
        </div>
      </div>

      {/* SAĞ: ARENA AYARLARI + SKOR + HAMLE LİSTESİ + DIŞA AKTAR */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Maç Sonucu Banner */}
        {gameResultBanner && (
          <div className="flex items-center justify-between rounded-2xl border border-amber-500/40 bg-amber-950/30 p-4 shadow-xl">
            <div className="flex items-center gap-2.5">
              <Trophy className="h-5 w-5 text-amber-400 shrink-0" />
              <span className="font-bold text-sm text-amber-200">{gameResultBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => handleNewGame()}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
            >
              Tekrar Oyna
            </button>
          </div>
        )}

        {/* Rakip / ELO & Süre Seçici */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Swords className="h-4 w-4 text-cyan-400" />
              <span>Serbest Oyun & Maç Arenası</span>
            </h2>
            {openingInfo && (
              <span className="text-[11px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                {openingInfo.eco} • {openingInfo.name}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Rakip Gücü & Mod
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(Object.keys(OPPONENT_LABELS) as OpponentMode[]).map((modeKey) => {
                const active = opponentMode === modeKey;
                return (
                  <button
                    key={modeKey}
                    type="button"
                    onClick={() => {
                      setOpponentMode(modeKey);
                      botTurnHandledRef.current = '';
                    }}
                    className={`rounded-xl border p-2 text-left transition ${
                      active
                        ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-200'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs">{OPPONENT_LABELS[modeKey].label}</div>
                    <div className="text-[10px] opacity-80">{OPPONENT_LABELS[modeKey].desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Clock className="h-3 w-3" /> Saat Kontrolü
            </span>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TIME_LABELS) as TimeControl[]).map((tc) => (
                <button
                  key={tc}
                  type="button"
                  onClick={() => {
                    setTimeControl(tc);
                    handleNewGame(tc);
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    timeControl === tc
                      ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {TIME_LABELS[tc]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Hamle Listesi */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl flex-1 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Notasyon (PGN)</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSaveBlunder}
                disabled={historyMoves.length === 0 || blunderSaved}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-40 ${
                  blunderSaved
                    ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                    : 'border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                }`}
              >
                <BookmarkPlus className="h-3.5 w-3.5" />
                <span>{blunderSaved ? 'Hata Defterine Eklendi' : 'Konumu Deftere Kaydet'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopy('pgn')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700"
              >
                {copiedType === 'pgn' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>PGN</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopy('fen')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700"
              >
                {copiedType === 'fen' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>FEN</span>
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-[160px] max-h-[320px] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70 p-3 font-mono text-xs text-slate-300">
            {historyMoves.length === 0 ? (
              <p className="text-slate-500 text-xs">İlk hamleyi oynayarak maçı başlatın.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                {Array.from({ length: Math.ceil(historyMoves.length / 2) }).map((_, pairIdx) => {
                  const wSan = historyMoves[pairIdx * 2];
                  const bSan = historyMoves[pairIdx * 2 + 1];
                  return (
                    <div key={pairIdx} className="flex items-center gap-2 border-b border-slate-800/50 pb-1">
                      <span className="text-slate-500 w-5">{pairIdx + 1}.</span>
                      <span className="text-slate-100 font-semibold w-14">{wSan}</span>
                      <span className="text-slate-300 w-14">{bSan || ''}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
