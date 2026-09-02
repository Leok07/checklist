import React from 'react';
import { Columns2, User, Users } from 'lucide-react';
import { ViewMode } from '../types/checklist';

interface SplitViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  leeoPercent: number;
  mariiPercent: number;
}

export const SplitViewToggle: React.FC<SplitViewToggleProps> = ({
  currentView,
  onViewChange,
  leeoPercent,
  mariiPercent,
}) => {
  return (
    <div className="flex items-center justify-center sm:justify-start gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-2xl mb-6 max-w-full overflow-x-auto">
      <button
        onClick={() => onViewChange('split')}
        className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition min-h-[42px] shrink-0 ${
          currentView === 'split'
            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <Columns2 className="w-4 h-4 text-ocean-600 dark:text-ocean-400" />
        <span>Meio a Meio</span>
      </button>

      <button
        onClick={() => onViewChange('leeo')}
        className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition min-h-[42px] shrink-0 ${
          currentView === 'leeo'
            ? 'bg-sky-600 text-white shadow-sm shadow-sky-500/30'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <User className="w-4 h-4" />
        <span>Lado do Leeo</span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            currentView === 'leeo'
              ? 'bg-sky-700 text-sky-100'
              : 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
          }`}
        >
          {leeoPercent}%
        </span>
      </button>

      <button
        onClick={() => onViewChange('marii')}
        className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition min-h-[42px] shrink-0 ${
          currentView === 'marii'
            ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <User className="w-4 h-4" />
        <span>Lado da Marii</span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            currentView === 'marii'
              ? 'bg-violet-700 text-violet-100'
              : 'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300'
          }`}
        >
          {mariiPercent}%
        </span>
      </button>

      <button
        onClick={() => onViewChange('all')}
        className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition min-h-[42px] shrink-0 ${
          currentView === 'all'
            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <Users className="w-4 h-4 text-slate-500" />
        <span>Visão Geral</span>
      </button>
    </div>
  );
};
