import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import type { Key } from 'chessground/types';
import confetti from 'canvas-confetti';
import { Chessboard } from './Chessboard';
import { blunderBookService, type BlunderRecord } from '../services/blunderBookService';
import { soundManager } from '../utils/sound';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Trophy,
  ArrowRight
} from 'lucide-react';

export const BlunderBook: React.FC = () => {
  const [blunders, setBlunders] = useState<BlunderRecord[]>(() => blunderBookService.getAll());
  const [selectedBlunder, setSelectedBlunder] = useState<BlunderRecord | null>(blunders[0] || null);

  // Practice Board State
  const [chessInstance, setChessInstance] = useState<Chess>(() => {
    return selectedBlunder ? new Chess(selectedBlunder.fen) : new Chess();
  });
  const [status, setStatus] = useState<'thinking' | 'solved' | 'failed'>('thinking');
  const [message, setMessage] = useState<string>('');
  const [lastMove, setLastMove] = useState<Key[] | undefined>(undefined);

  useEffect(() => {
    if (selectedBlunder) {
      setChessInstance(new Chess(selectedBlunder.fen));
      setStatus('thinking');
      setMessage(`Bu konumda daha önce "${selectedBlunder.playedSan}" oynamıştın. Doğru büyükusta hamlesini bul!`);
      setLastMove(undefined);
    }
  }, [selectedBlunder]);

  const refreshList = () => {
    const list = blunderBookService.getAll();
    setBlunders(list);
    if (selectedBlunder) {
      const updated = list.find((b) => b.id === selectedBlunder.id) || list[0] || null;
      setSelectedBlunder(updated);
    } else {
      setSelectedBlunder(list[0] || null);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    blunderBookService.delete(id);
    refreshList();
  };

  const handleClearAll = () => {
    if (window.confirm('Tüm kayıtlı hatalarınızı silmek istediğinize emin misiniz?')) {
      blunderBookService.clear();
      refreshList();
    }
  };

  // Compute legal moves dests for Chessground
  const getDests = (): Map<Key, Key[]> => {
    const dests = new Map<Key, Key[]>();
    if (status === 'solved') return dests;

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

  // Handle board move
  const handleUserMove = (orig: Key, dest: Key) => {
    if (!selectedBlunder || status === 'solved') return;

    const currentChess = new Chess(chessInstance.fen());
    const attemptedMove = currentChess.move({ from: orig, to: dest, promotion: 'q' });
    if (!attemptedMove) return;

    setLastMove([orig, dest]);
    setChessInstance(currentChess);

    if (attemptedMove.san === selectedBlunder.bestMoveSan) {
      setStatus('solved');
      setMessage(`🎉 Bravo! Doğru hamle "${selectedBlunder.bestMoveSan}". ${selectedBlunder.explanation}`);
      soundManager.playSuccess();
      blunderBookService.recordAttempt(selectedBlunder.id, true);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      refreshList();
    } else {
      setStatus('failed');
      setMessage(`❌ "${attemptedMove.san}" doğru hamle değil. Doğru hamle: "${selectedBlunder.bestMoveSan}". Tekrar dene!`);
      soundManager.playError();
      blunderBookService.recordAttempt(selectedBlunder.id, false);
      refreshList();
    }
  };

  const handleResetCurrent = () => {
    if (selectedBlunder) {
      setChessInstance(new Chess(selectedBlunder.fen));
      setStatus('thinking');
      setMessage(`Bu konumda daha önce "${selectedBlunder.playedSan}" oynamıştın. Doğru büyükusta hamlesini bul!`);
      setLastMove(undefined);
    }
  };

  if (blunders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg">
          <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Hata Defterin Henüz Tertemiz!</h3>
        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          Satranç Hocası veya Serbest Oyun modunda oynarken yaptığın taktik hataları veya kaçırdığın fırsatları 
          tek tıkla buraya kaydedebilir, daha sonra aralıklı tekrar yöntemiyle pekiştirebilirsin.
        </p>
      </div>
    );
  }

  const turnColor = chessInstance.turn() === 'w' ? 'white' : 'black';
  const solvedCount = blunders.filter((b) => b.isMastered).length;

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl mx-auto px-2 sm:px-4 py-3">
      {/* Left Column: Interactive Chessboard */}
      <div className="flex-1 flex flex-col items-center justify-start bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Hata Tekrarı</span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-300 font-medium">{selectedBlunder?.openingName || 'Açılış'}</span>
            </div>
            <h2 className="text-base font-extrabold text-white mt-0.5">
              Yanlış Hamle: <span className="text-rose-400 font-mono line-through">{selectedBlunder?.playedSan}</span>
            </h2>
          </div>

          <button
            type="button"
            onClick={handleResetCurrent}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Tekrar Başla</span>
          </button>
        </div>

        {/* Board Container */}
        <div className="w-full max-w-[460px] aspect-square mb-4">
          <Chessboard
            fen={chessInstance.fen()}
            orientation={turnColor}
            turnColor={turnColor}
            interactive={status !== 'solved'}
            dests={getDests()}
            onMove={handleUserMove}
            lastMove={lastMove}
            check={chessInstance.inCheck()}
          />
        </div>

        {/* Feedback Alert */}
        <div
          className={`w-full max-w-[460px] p-3 rounded-xl border text-xs font-medium leading-relaxed transition ${
            status === 'solved'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : status === 'failed'
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
              : 'border-slate-800 bg-slate-950/70 text-slate-300'
          }`}
        >
          {message}
        </div>
      </div>

      {/* Right Column: Blunder List & Statistics */}
      <div className="w-full lg:w-96 flex flex-col gap-4">
        {/* Stats card */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 block mb-1">Toplam Hata</span>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span className="text-xl font-black text-white">{blunders.length}</span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-400 block mb-1">Pekiştirilen</span>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xl font-black text-emerald-400">{solvedCount}</span>
            </div>
          </div>
        </div>

        {/* Header & Clear Button */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-300">Kayıtlı Pozisyonlar ({blunders.length})</span>
          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
          >
            <Trash2 className="w-3 h-3" />
            <span>Tümünü Temizle</span>
          </button>
        </div>

        {/* Blunder Cards Scroll Area */}
        <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-1">
          {blunders.map((item) => {
            const isSelected = selectedBlunder?.id === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedBlunder(item)}
                className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'border-amber-500/60 bg-amber-500/10 shadow-sm'
                    : 'border-slate-800 bg-slate-900/70 hover:bg-slate-850 hover:border-slate-700'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-white truncate">{item.openingName}</span>
                    {item.isMastered && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Pekiştirildi
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px]">
                    <span className="text-rose-400 font-mono font-bold line-through">{item.playedSan}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                    <span className="text-emerald-400 font-mono font-bold">{item.bestMoveSan}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleDelete(item.id, e)}
                  title="Listeden Kaldır"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
