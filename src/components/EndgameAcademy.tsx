import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from './Chessboard';
import { ENDGAME_LESSONS } from '../data/endgameData';
import type { EndgameLesson, EndgameLessonStep } from '../types/endgame';
import { fetchEndgameTablebase, type TablebaseResponse } from '../services/lichessService';
import { stockfishService } from '../services/stockfishService';
import { soundManager } from '../utils/sound';
import {
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  Cpu,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Bot,
} from 'lucide-react';

export const EndgameAcademy: React.FC = () => {
  const [selectedLesson, setSelectedLesson] = useState<EndgameLesson>(ENDGAME_LESSONS[0]);
  const [game, setGame] = useState<Chess>(() => new Chess(selectedLesson.startingFen));
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [lessonCompleted, setLessonCompleted] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [practiceVsBot, setPracticeVsBot] = useState<boolean>(false);
  const [botThinking, setBotThinking] = useState<boolean>(false);

  // Tablebase State
  const [tablebaseLoading, setTablebaseLoading] = useState<boolean>(false);
  const [tablebaseData, setTablebaseData] = useState<TablebaseResponse | null>(null);
  const [customFenInput, setCustomFenInput] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  const gameRef = useRef(game);
  gameRef.current = game;
  const botHandledFenRef = useRef<string>('');

  // Reset board when lesson changes
  const handleSelectLesson = (lesson: EndgameLesson) => {
    stockfishService.stop();
    botHandledFenRef.current = '';
    setSelectedLesson(lesson);
    const newGame = new Chess(lesson.startingFen);
    setGame(newGame);
    setCurrentStepIndex(0);
    setFeedback(null);
    setLessonCompleted(false);
    setShowHint(false);
    setPracticeVsBot(false);
    setBotThinking(false);
    setIsCustomMode(false);
    loadTablebase(lesson.startingFen);
  };

  const loadTablebase = async (fen: string) => {
    setTablebaseLoading(true);
    const res = await fetchEndgameTablebase(fen);
    setTablebaseData(res);
    setTablebaseLoading(false);
  };

  useEffect(() => {
    loadTablebase(selectedLesson.startingFen);
    return () => stockfishService.stop();
  }, []);

  // Engine Auto-Reply when practicing against Stockfish
  useEffect(() => {
    if (!practiceVsBot || game.isGameOver()) {
      setBotThinking(false);
      return;
    }

    const playerTurnChar = selectedLesson.playerColor === 'white' ? 'w' : 'b';
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
              loadTablebase(next.fen());
              if (next.isGameOver()) {
                setFeedback({
                  type: next.isCheckmate() ? 'success' : 'info',
                  message: next.isCheckmate() ? 'Oyun Şah Mat ile bitti!' : 'Oyun berabere sonuçlandı.',
                });
              }
            }
          } catch {
            setBotThinking(false);
          }
        }, 400);
      }
    });

    return () => stockfishService.stop();
  }, [game, practiceVsBot, selectedLesson.playerColor]);

  const currentStep: EndgameLessonStep | undefined = selectedLesson.steps[currentStepIndex];

  // Handle user moves on the board
  const handleMove = (from: string, to: string) => {
    if (botThinking) return;
    if (lessonCompleted && !isCustomMode && !practiceVsBot) return;

    try {
      const tempGame = new Chess(game.fen());
      const move = tempGame.move({ from, to, promotion: 'q' });
      if (!move) return;

      if (isCustomMode || practiceVsBot) {
        setGame(tempGame);
        soundManager.playMove();
        loadTablebase(tempGame.fen());
        if (tempGame.isCheckmate()) {
          soundManager.playSuccess();
          setFeedback({ type: 'success', message: 'Şah Mat! Oyunsonunu kusursuz bitirdiniz!' });
        } else if (tempGame.isGameOver()) {
          setFeedback({ type: 'info', message: 'Oyun berabere sonuçlandı.' });
        }
        return;
      }

      // Check against current step expected move
      if (currentStep && move.san === currentStep.expectedMove) {
        setShowHint(false);
        setGame(tempGame);
        soundManager.playMove();
        loadTablebase(tempGame.fen());
        setFeedback({
          type: 'success',
          message: `Harika! ${move.san} doğru hamle. ${currentStep.explanation}`
        });

        // Check if there is an opponent reply
        if (currentStep.opponentReply) {
          const replySan = currentStep.opponentReply.san;
          setTimeout(() => {
            try {
              const replyMove = tempGame.move(replySan);
              if (replyMove) {
                setGame(new Chess(tempGame.fen()));
                soundManager.playMove();
                loadTablebase(tempGame.fen());
              }
            } catch (e) {
              console.error(e);
            }
          }, 550);
        }

        // Advance to next step or complete
        if (currentStepIndex + 1 < selectedLesson.steps.length) {
          setCurrentStepIndex((prev) => prev + 1);
        } else {
          setLessonCompleted(true);
          soundManager.playSuccess();
          setFeedback({
            type: 'success',
            message: 'Tebrikler! Temel adımları tamamladınız. İsterseniz "Motorla Devam Et" diyerek oyunu bitirebilirsiniz.'
          });
        }
      } else {
        soundManager.playError();
        setFeedback({
          type: 'error',
          message: `Dikkat! ${move.san} beklenen tekniğe uymuyor. İpucu alabilir veya tekrar deneyebilirsiniz.`
        });
      }
    } catch {
      // Illegal move
    }
  };

  const handleReset = () => {
    stockfishService.stop();
    botHandledFenRef.current = '';
    const newGame = new Chess(selectedLesson.startingFen);
    setGame(newGame);
    setCurrentStepIndex(0);
    setFeedback(null);
    setLessonCompleted(false);
    setShowHint(false);
    setPracticeVsBot(false);
    setBotThinking(false);
    loadTablebase(selectedLesson.startingFen);
  };

  const handleShowHint = () => {
    if (!currentStep || lessonCompleted) return;
    setShowHint(true);
    setFeedback({
      type: 'info',
      message: `💡 İpucu: Beklenen hamle "${currentStep.expectedMove}" — ${currentStep.keyConcept}.`,
    });
  };

  const handleApplyCustomFen = () => {
    try {
      const g = new Chess(customFenInput.trim());
      setGame(g);
      setIsCustomMode(true);
      setPracticeVsBot(false);
      setFeedback({ type: 'info', message: 'Özel FEN konumu yüklendi. Syzygy ile serbestçe test edebilirsiniz.' });
      loadTablebase(customFenInput.trim());
    } catch {
      setFeedback({ type: 'error', message: 'Geçersiz FEN dizesi girildi.' });
    }
  };

  // Show hint arrow explicitly on demand, or lesson guide arrows after hint/step
  const activeArrows = showHint && currentStep?.arrows ? currentStep.arrows : [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 w-full space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                👑 Büyükusta Oyun Sonu Akademisi
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 flex items-center gap-1">
                <Cpu className="w-3 h-3" /> Syzygy 7-Taş Tablebase Entegre
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Oyun Sonu Sanatı & Kesin Çözümler
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Tahtadaki taşları sürükleyerek <strong className="text-amber-300">Lucena Köprüsü</strong>, <strong className="text-amber-300">Opozisyon</strong>, <strong className="text-amber-300">Philidor Savunması</strong> ve <strong className="text-amber-300">Uzak Geçer</strong> tekniklerini adım adım uygulayın.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleShowHint}
              disabled={lessonCompleted || practiceVsBot || isCustomMode}
              className="px-3.5 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/40 flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Lightbulb className="w-4 h-4" />
              <span>İpucu Göster</span>
            </button>
            <button
              type="button"
              onClick={() => {
                botHandledFenRef.current = '';
                setPracticeVsBot((p) => !p);
                setFeedback({
                  type: 'info',
                  message: !practiceVsBot
                    ? 'Stockfish motoruna karşı serbest tamamlama modu açıldı!'
                    : 'Ders rehber moduna dönüldü.',
                });
              }}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors ${
                practiceVsBot
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>{practiceVsBot ? 'Motor Aktif' : 'Motorla Devam Et'}</span>
            </button>
            <button
              onClick={handleReset}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Dersi Başa Al</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Lessons Sidebar + Chessboard + Interactive Explanations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Lessons Directory (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Oyun Sonu Dersleri</span>
            </h2>

            <div className="space-y-2">
              {ENDGAME_LESSONS.map((lesson) => {
                const isSelected = selectedLesson.id === lesson.id && !isCustomMode;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => handleSelectLesson(lesson)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{lesson.title}</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400">{lesson.category}</span>
                      <span className="text-[10px] text-slate-500">•</span>
                      <span className="text-[10px] text-amber-400/90 font-medium">{lesson.difficulty}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom FEN Tablebase Solver Box */}
            <div className="mt-5 pt-4 border-t border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-2">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                <span>Özel Konum Çöz (FEN)</span>
              </h3>
              <p className="text-[11px] text-slate-400 mb-2">
                7 veya daha az taşlı herhangi bir FEN konumunu yapıştırıp matematiksel sonucu görün:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="8/8/8/3P4/8/8/8/k6K w - - 0 1"
                  value={customFenInput}
                  onChange={(e) => setCustomFenInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleApplyCustomFen}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-colors whitespace-nowrap"
                >
                  Yükle
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Board (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[480px]">
            <Chessboard
              fen={game.fen()}
              orientation={selectedLesson.playerColor}
              interactive={!botThinking && (!lessonCompleted || practiceVsBot || isCustomMode)}
              arrows={activeArrows}
              onMove={handleMove}
            />

            {/* Bottom mini status bar */}
            <div className="mt-3 bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                Hamle Sırası: <strong className="text-amber-400">{game.turn() === 'w' ? 'Beyaz' : 'Siyah'}</strong>
              </span>
              <span className="text-[11px] text-slate-400">
                Adım: <strong className="text-white">{currentStepIndex + 1}</strong> / {selectedLesson.steps.length}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Step Guidance & Syzygy Tablebase Results (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Active Lesson Principle */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">{selectedLesson.title}</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedLesson.summary}
            </p>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 mb-1">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Büyükusta İlkesi:</span>
              </div>
              <p className="text-xs text-amber-100/90 leading-snug">
                {selectedLesson.grandmasterPrinciple}
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-blue-400" />
                <span>Altın Kural:</span>
              </div>
              <p className="text-xs text-slate-400 leading-snug">
                {selectedLesson.keyRule}
              </p>
            </div>
          </div>

          {/* Feedback & Current Move Goal */}
          {feedback && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-2.5 text-xs ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : feedback.type === 'error'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                  : 'bg-blue-500/10 border-blue-500/30 text-blue-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : feedback.type === 'error' ? (
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <Lightbulb className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">{feedback.message}</div>
            </div>
          )}

          {/* Current Step Goal */}
          {currentStep && !lessonCompleted && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                <span>Şimdiki Göreviniz:</span>
              </div>
              <p className="text-xs text-slate-300">
                <strong className="text-amber-400">{currentStep.keyConcept}</strong> uygulayın. Tahtada doğru hamleyi yapın.
              </p>
            </div>
          )}

          {/* Syzygy 7-Piece Tablebase Live Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Syzygy 7-Taş Kesin Çözücü
                </h4>
              </div>
              {tablebaseLoading && <span className="text-[10px] text-amber-400 animate-pulse">Hesaplanıyor...</span>}
            </div>

            {tablebaseData ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800">
                  <span className="text-slate-400">Teorik Sonuç:</span>
                  <span
                    className={`font-black uppercase px-2 py-0.5 rounded text-[11px] ${
                      tablebaseData.category === 'win'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : tablebaseData.category === 'draw'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {tablebaseData.category === 'win'
                      ? 'Kesin Kazanç'
                      : tablebaseData.category === 'draw'
                      ? 'Teorik Berabere'
                      : 'Kayıp Konum'}
                  </span>
                </div>

                {tablebaseData.dtz !== null && (
                  <div className="flex items-center justify-between px-2 text-slate-400 text-[11px]">
                    <span>Terfiye / Değişime Mesafe (DTZ):</span>
                    <strong className="text-white">{Math.abs(tablebaseData.dtz)} hamle</strong>
                  </div>
                )}

                {/* Best Moves according to Syzygy */}
                {tablebaseData.moves && tablebaseData.moves.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] text-slate-400 font-semibold block mb-1">
                      Kusursuz Hamleler (Syzygy Sıralaması):
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                      {tablebaseData.moves.slice(0, 6).map((m, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-1.5 rounded bg-slate-950 border border-slate-800/80 text-[11px]"
                        >
                          <strong className="text-amber-300 font-mono">{m.san || m.uci}</strong>
                          <span
                            className={`text-[9px] font-bold px-1 rounded ${
                              m.category === 'win'
                                ? 'text-emerald-400'
                                : m.category === 'draw'
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {m.category === 'win' ? 'Kazanç' : m.category === 'draw' ? 'Berabere' : 'Kayıp'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 italic text-center py-2">
                Tahtadaki taş sayısı 7 veya daha az olduğunda Syzygy otomatik olarak %100 matematiksel çözümü gösterir.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
