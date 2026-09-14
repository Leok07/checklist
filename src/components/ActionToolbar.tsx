import React, { useState } from 'react';
import { CheckSquare, Square, Trash2 } from 'lucide-react';

interface ActionToolbarProps {
  onCheckAll: () => void;
  onUncheckAll: () => void;
  onClearAll: () => void;
  totalItems: number;
  filteredCount: number;
}

export const ActionToolbar: React.FC<ActionToolbarProps> = ({
  onCheckAll,
  onUncheckAll,
  onClearAll,
  totalItems,
  filteredCount,
}) => {
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const handleConfirmClear = () => {
    onClearAll();
    setShowConfirmClear(false);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-5 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
      <div className="text-center sm:text-left">
        Exibindo <strong className="text-slate-700 dark:text-slate-300">{filteredCount}</strong> de{' '}
        <strong className="text-slate-700 dark:text-slate-300">{totalItems}</strong> tarefas
      </div>

      <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
        <button
          onClick={onCheckAll}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 transition min-h-[38px] active:scale-95"
        >
          <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Marcar todas</span>
        </button>

        <button
          onClick={onUncheckAll}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 transition min-h-[38px] active:scale-95"
        >
          <Square className="w-3.5 h-3.5 text-slate-400" />
          <span>Desmarcar todas</span>
        </button>

        {showConfirmClear ? (
          <div className="inline-flex items-center gap-2 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 px-3 py-1.5 rounded-lg min-h-[38px]">
            <span className="text-rose-700 dark:text-rose-300 font-medium">Limpar toda a lista?</span>
            <button
              onClick={handleConfirmClear}
              className="text-rose-800 dark:text-rose-200 font-bold hover:underline px-1"
            >
              Sim
            </button>
            <button
              onClick={() => setShowConfirmClear(false)}
              className="text-slate-500 dark:text-slate-400 hover:underline px-1"
            >
              Não
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirmClear(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition min-h-[38px] active:scale-95"
            title="Limpar todas as tarefas da viagem"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar lista</span>
          </button>
        )}
      </div>
    </div>
  );
};
