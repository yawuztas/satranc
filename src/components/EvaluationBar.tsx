import React from 'react';
import type { EngineEvaluation } from '../types/chess';

interface EvaluationBarProps {
  evaluation: EngineEvaluation | null;
  orientation?: 'white' | 'black';
  className?: string;
}

export const EvaluationBar: React.FC<EvaluationBarProps> = ({
  evaluation,
  orientation = 'white',
  className = '',
}) => {
  if (!evaluation) {
    return (
      <div className={`w-6 h-full min-h-[300px] bg-slate-800 rounded-lg overflow-hidden flex flex-col justify-between items-center py-2 text-[10px] font-bold text-slate-400 border border-slate-700 ${className}`}>
        <span>-</span>
        <span>0.0</span>
        <span>+</span>
      </div>
    );
  }

  const { score, isMate, mateIn } = evaluation;

  // Calculate percentage of White's bar height (0 to 100%)
  let whitePercent = 50;
  let label = '0.0';

  if (isMate) {
    if (mateIn !== undefined && mateIn > 0) {
      whitePercent = 100;
      label = `M${mateIn}`;
    } else if (mateIn !== undefined && mateIn < 0) {
      whitePercent = 0;
      label = `-M${Math.abs(mateIn)}`;
    } else {
      whitePercent = score > 0 ? 100 : 0;
      label = score > 0 ? 'M' : '-M';
    }
  } else {
    // Sigmoid function for natural centipawn evaluation curve
    // cp = 0 -> 50%
    // cp = +300 (+3 piyon) -> ~80%
    // cp = +600 -> ~95%
    const winChance = 1 / (1 + Math.pow(10, -score / 400));
    whitePercent = Math.min(100, Math.max(0, winChance * 100));

    const pawnScore = score / 100;
    label = pawnScore > 0 ? `+${pawnScore.toFixed(1)}` : pawnScore.toFixed(1);
  }

  // Adjust display if board orientation is flipped
  const topPercent = orientation === 'white' ? 100 - whitePercent : whitePercent;

  return (
    <div
      className={`w-7 sm:w-8 h-full min-h-[360px] max-h-[500px] bg-slate-900 rounded-lg overflow-hidden flex flex-col relative border border-slate-700 shadow-md ${className}`}
      title={`Motor Değerlendirmesi: ${label} (Derinlik: ${evaluation.depth})`}
    >
      {/* Black section (top when orientation is white) */}
      <div
        className="w-full bg-slate-950 transition-all duration-300 relative flex justify-center items-start pt-1.5"
        style={{ height: `${topPercent}%` }}
      >
        {topPercent > 18 && (
          <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-300 select-none">
            {orientation === 'white' && score < 0 ? label : ''}
            {orientation === 'black' && score > 0 ? label : ''}
          </span>
        )}
      </div>

      {/* White section (bottom when orientation is white) */}
      <div
        className="w-full bg-slate-100 transition-all duration-300 relative flex justify-center items-end pb-1.5"
        style={{ height: `${100 - topPercent}%` }}
      >
        {100 - topPercent > 18 && (
          <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-900 select-none">
            {orientation === 'white' && score >= 0 ? label : ''}
            {orientation === 'black' && score <= 0 ? label : ''}
          </span>
        )}
      </div>

      {/* Central tick mark */}
      <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-amber-500/60 pointer-events-none -translate-y-1/2 z-10" />
    </div>
  );
};
