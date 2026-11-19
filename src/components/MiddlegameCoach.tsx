import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from './Chessboard';
import { MIDDLEGAME_SCENARIOS, type MiddlegameScenario } from '../data/middlegameData';
import { stockfishService } from '../services/stockfishService';
import { soundManager } from '../utils/sound';
import {
  Compass,
  RotateCcw,
  AlertTriangle,
  Lightbulb,
  Target,
  Layers,
  Zap,
  Bot
} from 'lucide-react';

export const MiddlegameCoach: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<MiddlegameScenario>(MIDDLEGAME_SCENARIOS[0]);
  const [game, setGame] = useState<Chess>(() => new Chess(selectedScenario.fen));
  const [selectedMoveIndex, setSelectedMoveIndex] = useState<number | null>(null);
  const [continueVsBot, setContinueVsBot] = useState<boolean>(false);
  const [botThinking, setBotThinking] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'best' | 'playable' | 'mistake';
    title: string;
    explanation: string;
    rating: number;
  } | null>(null);

  const gameRef = useRef(game);
  gameRef.current = game;
  const botHandledFenRef = useRef<string>('');

  useEffect(() => {
    return () => stockfishService.stop();
  }, []);

  // Engine Auto-Play when continuing scenario against Stockfish
  useEffect(() => {
    if (!continueVsBot || game.isGameOver()) {
      setBotThinking(false);
      return;
    }

    const playerTurnChar = selectedScenario.playerTurn === 'white' ? 'w' : 'b';
    if (game.turn() === playerTurnChar) {
      setBotThinking(false);
      return;
    }

    const fen = game.fen();
    if (botHandledFenRef.current === fen) return;

    setBotThinking(true);
    stockfishService.evaluatePosition(fen, 10, (ev) => {
      if (botHandledFenRef.current === fen || gameRef.current.fen() !== fen) return;
      if (ev.bestMove && ev.bestMove.length >= 4) {
        botHandledFenRef.current = fen;
        const uci = ev.bestMove;
        window.setTimeout(() => {
          if (gameRef.current.fen() !== fen) return;
          const next = new Chess(fen);
          try {
            const moved = next.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' });
            setBotThinking(false);
            if (moved) {
              setGame(next);
              soundManager.playMove();
            }
          } catch {
            setBotThinking(false);
          }
        }, 450);
      }
    });

    return () => stockfishService.stop();
  }, [game, continueVsBot, selectedScenario.playerTurn]);

  const handleSelectScenario = (scenario: MiddlegameScenario) => {
    stockfishService.stop();
    botHandledFenRef.current = '';
    setSelectedScenario(scenario);
    setGame(new Chess(scenario.fen));
    setSelectedMoveIndex(null);
    setContinueVsBot(false);
    setBotThinking(false);
    setFeedback(null);
  };

  const handleReset = () => {
    stockfishService.stop();
    botHandledFenRef.current = '';
    setGame(new Chess(selectedScenario.fen));
    setSelectedMoveIndex(null);
    setContinueVsBot(false);
    setBotThinking(false);
    setFeedback(null);
  };

  // Handle board drag-and-drop
  const handleBoardMove = (from: string, to: string) => {
    if (botThinking) return;
    try {
      const tempGame = new Chess(game.fen());
      const move = tempGame.move({ from, to, promotion: 'q' });
      if (!move) return;

      // On first move in scenario, check candidate match
      if (game.fen() === selectedScenario.fen) {
        const candidateIndex = selectedScenario.candidateMoves.findIndex(
          (c) => c.san.toLowerCase() === move.san.toLowerCase()
        );
        if (candidateIndex !== -1) {
          handleCandidateSelect(candidateIndex);
          return;
        }
      }

      setGame(tempGame);
      if (move.captured) soundManager.playCapture();
      else soundManager.playMove();
      if (!continueVsBot) {
        setFeedback({
          type: 'playable',
          title: `Oynanan Hamle: ${move.san}`,
          explanation: 'Konumda kendi devam yolunuzu test ediyorsunuz. İsterseniz üstten "Bota Karşı Devam Et" açabilirsiniz.',
          rating: 75
        });
      }
    } catch {
      // Illegal move
    }
  };

  const handleCandidateSelect = (index: number) => {
    const candidate = selectedScenario.candidateMoves[index];
    setSelectedMoveIndex(index);
    botHandledFenRef.current = '';

    // Apply move to board
    try {
      const tempGame = new Chess(selectedScenario.fen);
      tempGame.move(candidate.san);
      setGame(tempGame);

      if (candidate.quality === 'best') {
        soundManager.playSuccess();
      } else if (candidate.quality === 'mistake') {
        soundManager.playError();
      } else {
        soundManager.playMove();
      }

      setFeedback({
        type: candidate.quality,
        title: candidate.title,
        explanation: candidate.explanation,
        rating: candidate.strategicRating
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 w-full space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ⚔️ Büyükusta Oyun Ortası & Dengesizlik Koçu
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 flex items-center gap-1">
                <Target className="w-3 h-3" /> Jeremy Silman & Kotov Metodolojisi
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Nasıl Düşünmelisin? Plan Kurma Sanatı
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Tahtada hamlenizi oynayın veya aday planları seçin; ardından <strong className="text-emerald-300">Stockfish botuna karşı</strong> konumu devam ettirerek planınızın sonucunu görün.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                botHandledFenRef.current = '';
                setContinueVsBot((prev) => !prev);
              }}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors ${
                continueVsBot
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>{continueVsBot ? 'Bot Rakip: Açık' : 'Konumu Bota Karşı Devam Ettir'}</span>
            </button>
            <button
              onClick={handleReset}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-emerald-400" />
              <span>Konumu Başa Al</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Scenarios Directory + Board + Positional Imbalances */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Scenarios List (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Strateji Konuları</span>
            </h2>

            <div className="space-y-2">
              {MIDDLEGAME_SCENARIOS.map((scen) => {
                const isSelected = selectedScenario.id === scen.id;
                return (
                  <button
                    key={scen.id}
                    onClick={() => handleSelectScenario(scen)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/50 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold block">{scen.title}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400">{scen.theme}</span>
                      <span className="text-[10px] text-slate-500">•</span>
                      <span className="text-[10px] text-emerald-400/90 font-medium">Usta Eğitimi</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center: Board (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[480px]">
            <Chessboard
              fen={game.fen()}
              orientation={selectedScenario.playerTurn}
              interactive={!botThinking}
              arrows={game.fen() === selectedScenario.fen ? selectedScenario.arrows : []}
              onMove={handleBoardMove}
            />

            {/* Bottom status */}
            <div className="mt-3 bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                Sıra: <strong className="text-emerald-400">{game.turn() === 'w' ? 'Beyaz' : 'Siyah'}</strong>
                {botThinking && <span className="text-[11px] text-amber-400 animate-pulse ml-1">(Düşünüyor...)</span>}
              </span>
              <span className="text-[11px] text-slate-400">
                Tema: <strong className="text-white">{selectedScenario.theme}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Imbalance Scanner & Candidate Moves (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Jeremy Silman Imbalance Scanner */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Konumsal Röntgen (Dengesizlikler)</h3>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-mono font-bold">
                Silman Metodu
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="font-bold text-slate-300 block mb-0.5 text-[11px] text-emerald-300">
                  🐎 Hafif Taş Dengesi:
                </span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {selectedScenario.imbalances.minorPieces}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="font-bold text-slate-300 block mb-0.5 text-[11px] text-amber-300">
                  ♟️ Piyon Yapısı & Hatlar:
                </span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {selectedScenario.imbalances.pawnStructure} {selectedScenario.imbalances.spaceAndFiles}
                </p>
              </div>

              {/* Worst piece highlight */}
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <span className="font-bold text-rose-300 block mb-0.5 text-[11px] flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  <span>En Kötü Taşın Tespiti:</span>
                </span>
                <p className="text-rose-100/90 text-[11px] leading-relaxed">
                  <strong className="text-rose-300">{selectedScenario.imbalances.worstPiece.piece}:</strong> {selectedScenario.imbalances.worstPiece.advice}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <span className="font-bold text-indigo-300 block mb-0.5 text-[11px] flex items-center gap-1">
                  <Lightbulb className="w-3 h-3 text-indigo-400" />
                  <span>Tavsiye Edilen Stratejik Plan:</span>
                </span>
                <p className="text-indigo-100/90 text-[11px] leading-relaxed">
                  {selectedScenario.imbalances.recommendedPlan}
                </p>
              </div>
            </div>
          </div>

          {/* Candidate Moves (Aday Hamleler) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Aday Hamleler: Hangisini Oynarsın?</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Tahtada taş sürükleyerek veya aşağıdaki seçeneklere tıklayarak hamlenizi test edin:
            </p>

            <div className="space-y-2">
              {selectedScenario.candidateMoves.map((cand, idx) => {
                const isSelected = selectedMoveIndex === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleCandidateSelect(idx)}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all ${
                      isSelected
                        ? cand.quality === 'best'
                          ? 'bg-emerald-500/20 border-emerald-500 text-white'
                          : cand.quality === 'mistake'
                          ? 'bg-rose-500/20 border-rose-500 text-white'
                          : 'bg-amber-500/20 border-amber-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black font-mono text-sm text-amber-400">{cand.san}</span>
                      <span className="text-[10px] text-slate-400">{cand.title}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Feedback box */}
            {feedback && (
              <div
                className={`p-3 rounded-xl border text-xs mt-3 space-y-1.5 ${
                  feedback.type === 'best'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : feedback.type === 'mistake'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>{feedback.title}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-950 font-mono">
                    Strateji Puanı: %{feedback.rating}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {feedback.explanation}
                </p>
              </div>
            )}

            {/* Master principle takeaway */}
            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 italic">
              💡 <strong>Büyükusta Notu:</strong> {selectedScenario.masterLesson}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
