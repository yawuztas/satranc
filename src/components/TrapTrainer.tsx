import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import type { Key } from 'chessground/types';
import confetti from 'canvas-confetti';
import { TRAPS_DATA } from '../data/trapsData';
import type { OpeningTrap } from '../types/chess';
import { Chessboard } from './Chessboard';
import { soundManager } from '../utils/sound';
import {
  Skull,
  Award,
  RotateCcw,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Flame,
  HelpCircle
} from 'lucide-react';

export const TrapTrainer: React.FC = () => {
  const [difficultyFilter, setDifficultyFilter] = useState<'Tümü' | 'Kolay' | 'Orta' | 'Usta Tuzağı'>('Tümü');
  const [sideFilter, setSideFilter] = useState<'all' | 'white' | 'black'>('all');
  const [selectedTrap, setSelectedTrap] = useState<OpeningTrap>(TRAPS_DATA[0]);
  const [mode, setMode] = useState<'puzzle' | 'review'>('puzzle');

  const filteredTraps = TRAPS_DATA.filter((t) => {
    const okDiff = difficultyFilter === 'Tümü' || t.difficulty === difficultyFilter;
    const okSide = sideFilter === 'all' || t.side === sideFilter;
    return okDiff && okSide;
  });

  const handleNextTrap = () => {
    const pool = filteredTraps.length > 0 ? filteredTraps : TRAPS_DATA;
    const idx = pool.findIndex((t) => t.id === selectedTrap.id);
    const next = pool[(idx + 1) % pool.length];
    setSelectedTrap(next);
  };

  // Puzzle State
  const [chessInstance, setChessInstance] = useState<Chess>(new Chess());
  const [puzzleStep, setPuzzleStep] = useState<number>(0); // index in solutionMoves
  const [puzzleStatus, setPuzzleStatus] = useState<'playing' | 'solved' | 'failed'>('playing');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [hintActive, setHintActive] = useState<boolean>(false);
  const [lastMove, setLastMove] = useState<Key[] | undefined>(undefined);

  // Review Mode State
  const [reviewIndex, setReviewIndex] = useState<number>(0);

  // Initialize or reset puzzle
  const initPuzzle = (trap: OpeningTrap) => {
    const c = new Chess();
    // Play setup moves
    for (const m of trap.setupMoves) {
      c.move(m);
    }
    // Play blunder move
    const blunderMoveObj = c.move(trap.blunderMoveSan);

    setChessInstance(c);
    setPuzzleStep(0);
    setPuzzleStatus('playing');
    setHintActive(false);
    setFeedbackMessage(`Rakip az önce ${trap.blunderMoveSan} oynayarak büyük bir hata yaptı! Şimdi sıradaki ölümcül hamleyi bul.`);
    if (blunderMoveObj) {
      setLastMove([blunderMoveObj.from as Key, blunderMoveObj.to as Key]);
    }
  };

  useEffect(() => {
    initPuzzle(selectedTrap);
    setReviewIndex(0);
  }, [selectedTrap]);

  // Compute legal moves dests for Chessground
  const getDests = (): Map<Key, Key[]> => {
    const dests = new Map<Key, Key[]>();
    if (puzzleStatus === 'solved') return dests;

    chessInstance.moves({ verbose: true }).forEach((m) => {
      const from = m.from as Key;
      const to = m.to as Key;
      if (!dests.has(from)) {
        dests.set(from, []);
      }
      dests.get(from)!.push(to);
    });
    return dests;
  };

  // Handle user move in Puzzle Mode
  const handleUserMove = (orig: Key, dest: Key) => {
    if (puzzleStatus === 'solved') return;

    const currentChess = new Chess(chessInstance.fen());
    const attemptedMove = currentChess.move({ from: orig, to: dest, promotion: 'q' });

    if (!attemptedMove) return;

    const expectedSan = selectedTrap.solutionMoves[puzzleStep];

    // Check if user's move matches expected solution
    if (attemptedMove.san === expectedSan) {
      // Correct move!
      soundManager.playCapture();
      setLastMove([orig, dest]);
      setChessInstance(currentChess);
      setHintActive(false);

      const nextStep = puzzleStep + 1;

      // Check if puzzle is finished
      if (nextStep >= selectedTrap.solutionMoves.length) {
        setPuzzleStatus('solved');
        setFeedbackMessage('🎉 Tebrikler! Tuzağı kusursuz şekilde uyguladın ve galibiyeti aldın!');
        soundManager.playSuccess();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        // Opponent's counter-move (forced)
        setPuzzleStep(nextStep);
        setFeedbackMessage('Doğru hamle! Rakip zorunlu cevabını veriyor...');

        setTimeout(() => {
          const oppSan = selectedTrap.solutionMoves[nextStep];
          const oppMove = currentChess.move(oppSan);
          if (oppMove) {
            setLastMove([oppMove.from as Key, oppMove.to as Key]);
            soundManager.playMove();
            setChessInstance(new Chess(currentChess.fen()));
            const stepAfterOpp = nextStep + 1;
            setPuzzleStep(stepAfterOpp);

            if (stepAfterOpp >= selectedTrap.solutionMoves.length) {
              setPuzzleStatus('solved');
              setFeedbackMessage('🎉 Muazzam! Mat veya taş kazancı ile tuzağı tamamladın!');
              soundManager.playSuccess();
              confetti({ particleCount: 90, spread: 80 });
            } else {
              setFeedbackMessage('Şimdi sıradaki bitirici hamleyi oyna!');
            }
          }
        }, 600);
      }
    } else {
      // Wrong move
      soundManager.playError();
      setFeedbackMessage(`❌ ${attemptedMove.san} doğru hamle değil. Rakibe fırsat vermeden en keskin hamleyi ara!`);
    }
  };

  // Provide hint
  const handleHint = () => {
    setHintActive(true);
    const expectedSan = selectedTrap.solutionMoves[puzzleStep];
    const testChess = new Chess(chessInstance.fen());
    const m = testChess.move(expectedSan);
    if (m) {
      setFeedbackMessage(`💡 İpucu: ${m.piece.toUpperCase()} taşını ${m.from} karesinden ${m.to} karesine oynamayı düşün!`);
    }
  };

  // Determine hint arrow
  const hintArrows: [string, string, string?][] = [];
  if (hintActive && puzzleStatus === 'playing') {
    const expectedSan = selectedTrap.solutionMoves[puzzleStep];
    const testChess = new Chess(chessInstance.fen());
    const m = testChess.move(expectedSan);
    if (m) {
      hintArrows.push([m.from, m.to, 'blue']);
    }
  }

  // Review mode step selection
  const currentReviewStep = selectedTrap.steps[reviewIndex];

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto px-2 sm:px-4 py-4">
      {/* Top Header & Trap Selector */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1">
              <Skull className="w-4 h-4" />
              <span>Açılış Tuzakları & Taktik Avı</span>
              <span className="text-slate-500">•</span>
              <span className="text-amber-400">{selectedTrap.openingName}</span>
              <span className="text-slate-500">•</span>
              <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono text-[11px]">{selectedTrap.difficulty}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
              {selectedTrap.name}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl leading-relaxed">
              {selectedTrap.story}
            </p>
          </div>

          {/* Mode Switcher (Bulmaca Modu vs Adım Adım İncele) */}
          <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-700 self-start md:self-auto">
            <button
              onClick={() => { setMode('puzzle'); initPuzzle(selectedTrap); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                mode === 'puzzle'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" /> Tuzağı Çöz (Puzzle)
            </button>
            <button
              onClick={() => setMode('review')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                mode === 'review'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" /> Adım Adım İncele
            </button>
          </div>
        </div>

        {/* Filters & Trap Switcher Buttons */}
        <div className="mt-4 pt-4 border-t border-slate-700/60 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 font-semibold mr-1">Zorluk:</span>
              {(['Tümü', 'Kolay', 'Orta', 'Usta Tuzağı'] as const).map((diff) => (
                <button
                  key={diff}
                  type="button"
                  onClick={() => setDifficultyFilter(diff)}
                  className={`px-2.5 py-1 rounded-md font-bold transition ${
                    difficultyFilter === diff
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700/70'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold mr-1">Taraf:</span>
              {([
                { id: 'all', label: 'Tümü' },
                { id: 'white', label: '⚪ Beyaz' },
                { id: 'black', label: '⚫ Siyah' },
              ] as const).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSideFilter(s.id)}
                  className={`px-2.5 py-1 rounded-md font-bold transition ${
                    sideFilter === s.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700/70'
                  }`}
                >
                  {s.label}
                </button>
              ))}
              <span className="ml-2 text-slate-500 font-mono">
                ({filteredTraps.length}/{TRAPS_DATA.length})
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {filteredTraps.map((trap) => (
              <button
                key={trap.id}
                onClick={() => setSelectedTrap(trap)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedTrap.id === trap.id
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-transparent'
                }`}
              >
                {trap.side === 'white' ? '⚪ ' : '⚫ '}
                {trap.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Board & Puzzle Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Chessboard */}
        <div className="lg:col-span-7 flex flex-col items-center bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="w-full max-w-[500px]">
            {mode === 'puzzle' ? (
              <Chessboard
                fen={chessInstance.fen()}
                orientation={selectedTrap.side}
                turnColor={chessInstance.turn() === 'w' ? 'white' : 'black'}
                interactive={puzzleStatus !== 'solved'}
                dests={getDests()}
                onMove={handleUserMove}
                arrows={hintArrows}
                lastMove={lastMove}
                check={chessInstance.inCheck()}
              />
            ) : (
              <Chessboard
                fen={currentReviewStep?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}
                orientation={selectedTrap.side}
                interactive={false}
              />
            )}
          </div>

          {/* Puzzle Mode Action Toolbar */}
          {mode === 'puzzle' ? (
            <div className="w-full max-w-[500px] mt-4 flex items-center justify-between bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                {selectedTrap.side === 'white' ? '⚪ Beyaz' : '⚫ Siyah'} ile Oynuyorsun
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleHint}
                  disabled={puzzleStatus === 'solved'}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-40"
                >
                  <Lightbulb className="w-3.5 h-3.5" /> İpucu Al
                </button>
                <button
                  onClick={() => initPuzzle(selectedTrap)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Baştan Başla
                </button>
              </div>
            </div>
          ) : (
            /* Review Mode Step Toolbar */
            <div className="w-full max-w-[500px] mt-4 flex items-center justify-between bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-2.5">
              <button
                onClick={() => setReviewIndex(Math.max(0, reviewIndex - 1))}
                disabled={reviewIndex === 0}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-xs font-semibold"
              >
                Geri
              </button>
              <span className="text-xs font-mono font-bold text-slate-300">
                Hamle {reviewIndex + 1} / {selectedTrap.steps.length}
              </span>
              <button
                onClick={() => setReviewIndex(Math.min(selectedTrap.steps.length - 1, reviewIndex + 1))}
                disabled={reviewIndex === selectedTrap.steps.length - 1}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-xs font-semibold"
              >
                İleri
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Status, Explanations & Strategic Lessons */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {mode === 'puzzle' ? (
            <>
              {/* Puzzle Task & Status Card */}
              <div className={`p-5 rounded-2xl border shadow-xl transition-all ${
                puzzleStatus === 'solved'
                  ? 'bg-emerald-950/60 border-emerald-500/50'
                  : 'bg-slate-800/90 border-slate-700/80'
              }`}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" /> Görev Hedefi
                  </span>
                  {puzzleStatus === 'solved' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1 border border-emerald-500/40">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Başarılı!
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-white mt-3">
                  {selectedTrap.puzzleGoal}
                </h3>

                <div className="mt-3 p-3 rounded-xl bg-slate-900/80 border border-slate-700 text-xs text-slate-200 leading-relaxed font-medium">
                  {feedbackMessage}
                </div>

                {puzzleStatus === 'solved' && (
                  <button
                    type="button"
                    onClick={handleNextTrap}
                    className="mt-3 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <span>Sonraki Tuzağa Geç →</span>
                  </button>
                )}
              </div>

              {/* Strategic Takeaway Card */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
                <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-amber-400" /> Tuzağın Stratejik Dersi
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {selectedTrap.strategicLesson}
                </p>
              </div>
            </>
          ) : (
            /* Review Mode Step Details */
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                  Adım {reviewIndex + 1}
                </span>
                {currentReviewStep?.isBlunder && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-1 border border-rose-500/40">
                    <AlertTriangle className="w-3.5 h-3.5" /> Ölümcül Hata!
                  </span>
                )}
                {currentReviewStep?.isPunishment && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1 border border-emerald-500/40">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Cezalandırma!
                  </span>
                )}
              </div>

              <div className="text-lg font-bold text-white font-mono">
                {currentReviewStep?.san}
              </div>

              <p className="text-slate-300 text-sm leading-relaxed">
                {currentReviewStep?.comment}
              </p>

              {/* Step Sequence Quick Selector */}
              <div className="pt-3 border-t border-slate-700">
                <span className="text-xs font-semibold text-slate-400 block mb-2">Tüm Hamleler:</span>
                <div className="flex flex-wrap gap-1">
                  {selectedTrap.steps.map((st, i) => (
                    <button
                      key={i}
                      onClick={() => setReviewIndex(i)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-colors ${
                        i === reviewIndex
                          ? 'bg-blue-600 text-white font-bold'
                          : st.isBlunder
                          ? 'bg-rose-900/60 text-rose-300 border border-rose-700'
                          : st.isPunishment
                          ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {st.san}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
