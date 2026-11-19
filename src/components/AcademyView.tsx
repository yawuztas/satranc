import React, { useState } from 'react';
import { EndgameAcademy } from './EndgameAcademy';
import { MiddlegameCoach } from './MiddlegameCoach';
import { StrategyGuide } from './StrategyGuide';
import { Crown, Swords, Lightbulb, Compass } from 'lucide-react';

export type AcademySubTab = 'endgame' | 'middlegame' | 'strategy';

export const AcademyView: React.FC = () => {
  const [subTab, setSubTab] = useState<AcademySubTab>('endgame');

  return (
    <div className="flex flex-col flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4 py-3">
      {/* Academy Sub-Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-2.5 backdrop-blur-sm mb-4">
        <div className="flex items-center gap-2 px-2">
          <Compass className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-sm font-bold text-white leading-tight">Büyükusta Akademisi</h2>
            <p className="text-[11px] text-slate-400">Oyunsonu teorisi, taktik senaryolar ve konumsal strateji</p>
          </div>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setSubTab('endgame')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === 'endgame'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Oyunsonu (Syzygy)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('middlegame')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === 'middlegame'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Swords className="w-3.5 h-3.5 text-rose-400" />
            <span>Oyun Ortası & Taktik</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('strategy')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              subTab === 'strategy'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-blue-400" />
            <span>Strateji Rehberi</span>
          </button>
        </div>
      </div>

      {/* Active Academy Content */}
      <div className="flex-1">
        {subTab === 'endgame' && <EndgameAcademy />}
        {subTab === 'middlegame' && <MiddlegameCoach />}
        {subTab === 'strategy' && <StrategyGuide />}
      </div>
    </div>
  );
};
