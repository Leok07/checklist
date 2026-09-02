import React, { useState } from 'react';
import { CheckSquare, Square, RotateCcw } from 'lucide-react';

interface ActionToolbarProps {
  onCheckAll: () => void;
  onUncheckAll: () => void;
  onResetToDefaults: () => void;
  totalItems: number;
  filteredCount: number;
}

export const ActionToolbar: React.FC<ActionToolbarProps> = ({
  onCheckAll,
  onUncheckAll,
  onResetToDefaults,
  totalItems,
  filteredCount,
}) => {
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const handleConfirmReset = () => {
    onResetToDefaults();
    setShowConfirmReset(false);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-5 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
      <div className="text-center sm:text-left">
        Exibindo <strong className="text-slate-700 dark:text-slate-300">{filteredCount}</strong> de{' '}
        <strong className="text-slate-700 dark:text-slate-300">{totalItems}</strong> itens
      </div>

      <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
        <button
          onClick={onCheckAll}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 transition min-h-[38px] active:scale-95"
        >
          <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Marcar todos</span>
        </button>

        <button
          onClick={onUncheckAll}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 transition min-h-[38px] active:scale-95"
        >
          <Square className="w-3.5 h-3.5 text-slate-400" />
          <span>Desmarcar todos</span>
        </button>

        {showConfirmReset ? (
          <div className="inline-flex items-center gap-2 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 px-3 py-1.5 rounded-lg min-h-[38px]">
            <span className="text-rose-700 dark:text-rose-300 font-medium">Restaurar originais?</span>
            <button
              onClick={handleConfirmReset}
              className="text-rose-800 dark:text-rose-200 font-bold hover:underline px-1"
            >
              Sim
            </button>
            <button
              onClick={() => setShowConfirmReset(false)}
              className="text-slate-500 dark:text-slate-400 hover:underline px-1"
            >
              Não
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirmReset(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition min-h-[38px] active:scale-95"
            title="Restaurar os 20 itens originais de praia"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar padrão</span>
          </button>
        )}
      </div>
    </div>
  );
};
