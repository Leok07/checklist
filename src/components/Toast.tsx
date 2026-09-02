import React from 'react';
import { CheckCircle2, Info } from 'lucide-react';

interface ToastProps {
  message: string | null;
  type?: 'success' | 'info';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 flex items-center justify-between gap-3 bg-slate-900 dark:bg-slate-800 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-800 dark:border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="flex items-center gap-2.5 min-w-0">
        {type === 'success' ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
        ) : (
          <Info className="w-5 h-5 text-ocean-400 shrink-0" />
        )}
        <span className="text-xs sm:text-sm font-medium truncate">{message}</span>
      </div>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-white text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 transition shrink-0 min-h-[36px] flex items-center justify-center"
      >
        OK
      </button>
    </div>
  );
};
