import React from 'react';
import { CheckCheck, Clock, Compass } from 'lucide-react';

interface ProgressBarProps {
  total: number;
  completed: number;
  pending: number;
  percent: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  total,
  completed,
  pending,
  percent,
}) => {
  const isAllDone = total > 0 && completed === total;

  return (
    <section className="bg-white dark:bg-slate-900/90 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 sm:mb-4">
        <div>
          <span className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
            Status da Bagagem
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
              {percent}% concluído
            </h2>
            {isAllDone ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <CheckCheck className="w-3.5 h-3.5" />
                Mala completa
              </span>
            ) : completed > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-ocean-50 dark:bg-ocean-950/50 text-ocean-700 dark:text-ocean-400 border border-ocean-200 dark:border-ocean-800">
                <Clock className="w-3.5 h-3.5" />
                Em andamento
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <Compass className="w-3.5 h-3.5" />
                A iniciar
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
            <span>
              <strong className="font-semibold text-slate-800 dark:text-slate-100">{completed}</strong> prontos
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0"></span>
            <span>
              <strong className="font-semibold text-slate-800 dark:text-slate-100">{pending}</strong> pendentes
            </span>
          </div>
          <div className="text-slate-400 dark:text-slate-500 hidden xs:inline sm:inline">
            Total: <strong className="font-semibold text-slate-700 dark:text-slate-300">{total}</strong>
          </div>
        </div>
      </div>

      {/* Barra de Progresso */}
      <div className="w-full h-2.5 sm:h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isAllDone
              ? 'bg-emerald-500'
              : 'bg-gradient-to-r from-ocean-500 to-ocean-600'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {isAllDone && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2.5 text-center sm:text-left">
          Tudo pronto para a viagem. Tenha um excelente descanso!
        </p>
      )}
    </section>
  );
};
