import React, { useState, useMemo } from 'react';
import { Chess } from 'chess.js';
import type { Key } from 'chessground/types';
import { STRATEGY_CONCEPTS } from '../data/strategyTipsData';
import type { StrategyConcept, Color } from '../types/chess';
import { Chessboard } from './Chessboard';
import { soundManager } from '../utils/sound';
import {
  Compass,
  CheckCircle,
  Lightbulb,
  Shield,
  Flame,
  Target,
  Zap,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Play,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const StrategyGuide: React.FC = () => {
  const [selectedConcept, setSelectedConcept] = useState<StrategyConcept>(STRATEGY_CONCEPTS[0]);
  const [orientation, setOrientation] = useState<Color>('white');
  const [game, setGame] = useState<Chess>(() => new Chess(STRATEGY_CONCEPTS[0].fen));
  const [planStep, setPlanStep] = useState<number>(0);
  const [customPlayedMoves, setCustomPlayedMoves] = useState<string[]>([]);
  const [lastMoveSquares, setLastMoveSquares] = useState<[Key, Key] | undefined>();

  const exampleMoves = selectedConcept.exampleMoves || [];

  const handleSelectConcept = (concept: StrategyConcept) => {
    setSelectedConcept(concept);
    setGame(new Chess(concept.fen));
    setPlanStep(0);
    setCustomPlayedMoves([]);
    setLastMoveSquares(undefined);
  };

  const applyPlanStep = (targetStep: number) => {
    const clamped = Math.max(0, Math.min(exampleMoves.length, targetStep));
    const c = new Chess(selectedConcept.fen);
    let lastSq: [Key, Key] | undefined;
    for (let i = 0; i < clamped; i++) {
      try {
        const m = c.move(exampleMoves[i]);
        if (m) lastSq = [m.from as Key, m.to as Key];
      } catch {
        break;
      }
    }
    setGame(c);
    setPlanStep(clamped);
    setCustomPlayedMoves([]);
    setLastMoveSquares(lastSq);
    if (clamped > 0) soundManager.playMove();
  };

  const handleBoardMove = (from: Key, to: Key) => {
    try {
      const next = new Chess(game.fen());
      const m = next.move({ from, to, promotion: 'q' });
      if (!m) return;
      if (m.captured) soundManager.playCapture();
      else soundManager.playMove();
      if (next.inCheck()) soundManager.playCheck();
      setGame(next);
      setLastMoveSquares([from, to]);
      setCustomPlayedMoves((prev) => [...prev, m.san]);
    } catch {
      // ignore invalid
    }
  };

  const isAtStartFen = useMemo(
    () => game.fen() === selectedConcept.fen,
    [game, selectedConcept.fen]
  );

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Castle': return <Shield className="w-4 h-4 text-blue-400" />;
      case 'Shield': return <Shield className="w-4 h-4 text-emerald-400" />;
      case 'Flame': return <Flame className="w-4 h-4 text-rose-400" />;
      case 'Target': return <Target className="w-4 h-4 text-amber-400" />;
      case 'Zap': return <Zap className="w-4 h-4 text-purple-400" />;
      default: return <Compass className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto px-2 sm:px-4 py-4">
      {/* Top Banner */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
          <Compass className="w-4 h-4" />
          <span>Oyun Ortası & Konumsal Ustalık</span>
          <span className="text-slate-500">•</span>
          <span className="text-blue-400">{selectedConcept.category}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Nereden Ne Çıkar? Profesyonel Oyun Planları
        </h1>
        <p className="text-slate-300 text-sm mt-1 max-w-3xl leading-relaxed">
          Tahtadaki taşları doğrudan oynatarak varyantları test edin veya örnek büyükusta planını adım adım ilerleterek uygulamasını görün.
        </p>

        {/* Concept Selector Pills */}
        <div className="mt-4 pt-4 border-t border-slate-700/60 flex flex-wrap gap-2">
          {STRATEGY_CONCEPTS.map((concept) => (
            <button
              key={concept.id}
              onClick={() => handleSelectConcept(concept)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                selectedConcept.id === concept.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/60'
              }`}
            >
              {getIcon(concept.icon)}
              <span>{concept.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Visual Interactive Board (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col items-center bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="w-full max-w-[500px]">
            <Chessboard
              fen={game.fen()}
              orientation={orientation}
              interactive={true}
              onMove={handleBoardMove}
              arrows={isAtStartFen ? (selectedConcept.arrows || []) : []}
              highlightSquares={isAtStartFen ? (selectedConcept.highlightSquares || []) : []}
              lastMove={lastMoveSquares}
              check={game.inCheck()}
            />
          </div>

          {/* Interactive Step-by-Step Plan Controls */}
          {exampleMoves.length > 0 && (
            <div className="w-full max-w-[500px] mt-4 bg-slate-900/90 border border-slate-700 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Örnek Planı Hamle Hamle İlerle:</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyPlanStep(0)}
                    disabled={planStep === 0 && customPlayedMoves.length === 0}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs text-slate-300 font-semibold"
                  >
                    Sıfırla
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPlanStep(planStep - 1)}
                    disabled={planStep === 0}
                    aria-label="Önceki Plan Hamlesi"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPlanStep(planStep + 1)}
                    disabled={planStep >= exampleMoves.length}
                    aria-label="Sonraki Plan Hamlesi"
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <span>İleri</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {exampleMoves.map((san, idx) => (
                  <button
                    key={`${idx}-${san}`}
                    type="button"
                    onClick={() => applyPlanStep(idx + 1)}
                    className={`px-2 py-0.5 rounded font-mono text-xs font-bold transition ${
                      idx < planStep
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                    }`}
                  >
                    {idx + 1}. {san}
                  </button>
                ))}
              </div>

              {customPlayedMoves.length > 0 && (
                <div className="text-[11px] font-mono text-amber-300 pt-1 border-t border-slate-800">
                  Serbest denemen: {customPlayedMoves.join(' ')}
                </div>
              )}
            </div>
          )}

          <div className="w-full max-w-[500px] mt-3 flex items-center justify-between bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5">
            <span className="text-xs text-slate-400 font-medium">
              Taşları sürükleyebilir veya plan düğmelerine tıklayabilirsiniz.
            </span>
            <button
              onClick={() => setOrientation(orientation === 'white' ? 'black' : 'white')}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs flex items-center gap-1.5 shrink-0"
              title="Tahtayı Çevir"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{orientation === 'white' ? 'Beyaz' : 'Siyah'}</span>
            </button>
          </div>
        </div>

        {/* Right Side: Pedagogical Advice & Rules of Thumb (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Main Explanation Card */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-700 text-xs font-bold text-amber-400">
              <Sparkles className="w-4 h-4" />
              <span>Stratejik İlke & Temel Fikir</span>
            </div>

            <h3 className="text-xl font-bold text-white mt-3">
              {selectedConcept.title}
            </h3>

            <p className="text-slate-300 text-sm mt-2 leading-relaxed">
              {selectedConcept.explanation}
            </p>

            {/* Pro Tip Box */}
            <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/30">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>Usta Tavsiyesi (Pro Tip)</span>
              </div>
              <p className="text-slate-200 text-xs leading-relaxed font-medium">
                {selectedConcept.proTips}
              </p>
            </div>
          </div>

          {/* Golden Rules of Thumb Card */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Akılda Tutulması Gereken Altın Kurallar
            </h4>

            <ul className="space-y-2.5">
              {selectedConcept.rulesOfThumb.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/50">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <span className="leading-relaxed">{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
