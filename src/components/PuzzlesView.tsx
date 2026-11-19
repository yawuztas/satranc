import React, { useState } from 'react';
import { TrapTrainer } from './TrapTrainer';
import { BlunderBook } from './BlunderBook';
import { blunderBookService } from '../services/blunderBookService';
import { Skull, BookOpen } from 'lucide-react';

export const PuzzlesView: React.FC = () => {
  const [subTab, setSubTab] = useState<'traps' | 'blunders'>('traps');
  const blunderCount = blunderBookService.getCount();

  return (
    <div className="flex flex-col flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4 py-3">
      {/* Sub Header Tabs */}
      <div className="flex items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-2.5 backdrop-blur-sm mb-4">
        <div className="flex items-center gap-2 px-2">
          <Skull className="w-5 h-5 text-rose-400" />
          <div>
            <h2 className="text-sm font-bold text-white leading-tight">Taktik & Tuzak Merkezi</h2>
            <p className="text-[11px] text-slate-400">Ünlü açılış tuzakları ve kendi maçlarından hata tekrarı</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setSubTab('traps')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === 'traps'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Skull className="w-3.5 h-3.5 text-rose-400" />
            <span>Açılış Tuzakları</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('blunders')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === 'blunders'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Hata Defterim</span>
            {blunderCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-200 text-[10px] font-bold">
                {blunderCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1">
        {subTab === 'traps' ? <TrapTrainer /> : <BlunderBook />}
      </div>
    </div>
  );
};
