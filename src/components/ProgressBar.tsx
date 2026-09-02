import React from 'react';
import { CheckCheck, Clock, Compass, User } from 'lucide-react';

interface PersonStats {
  total: number;
  completed: number;
  pending: number;
  progressPercent: number;
}

interface ProgressBarProps {
  total: number;
  completed: number;
  pending: number;
  percent: number;
  leeoStats?: PersonStats;
  mariiStats?: PersonStats;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  total,
  completed,
  pending,
  percent,
  leeoStats,
  mariiStats,
}) => {
  const isAllDone = total > 0 && completed === total;

  return (
    <section className="bg-white dark:bg-slate-900/90 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-6 transition-colors">
      {/* Barra Geral */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 sm:mb-4">
        <div>
          <span className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
            Progresso Geral da Viagem
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
              {percent}% concluído
            </h2>
            {isAllDone ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <CheckCheck className="w-3.5 h-3.5" />
                Tudo pronto
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

      {/* Barra de Progresso Geral */}
      <div className="w-full h-2.5 sm:h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60 mb-5">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isAllDone
              ? 'bg-emerald-500'
              : 'bg-gradient-to-r from-ocean-500 to-ocean-600'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Meio a Meio: Leeo vs Marii */}
      {leeoStats && mariiStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {/* Card Leeo */}
          <div className="bg-sky-50/60 dark:bg-sky-950/20 rounded-xl p-3 border border-sky-100 dark:border-sky-900/50">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-sky-800 dark:text-sky-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-600" />
                Mala do Leeo
              </span>
              <span className="font-bold text-sky-700 dark:text-sky-300">
                {leeoStats.progressPercent}% ({leeoStats.completed}/{leeoStats.total})
              </span>
            </div>
            <div className="w-full h-2 bg-sky-100 dark:bg-sky-900/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 transition-all duration-500 rounded-full"
                style={{ width: `${leeoStats.progressPercent}%` }}
              />
            </div>
          </div>

          {/* Card Marii */}
          <div className="bg-violet-50/60 dark:bg-violet-950/20 rounded-xl p-3 border border-violet-100 dark:border-violet-900/50">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-violet-800 dark:text-violet-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-violet-600" />
                Mala da Marii
              </span>
              <span className="font-bold text-violet-700 dark:text-violet-300">
                {mariiStats.progressPercent}% ({mariiStats.completed}/{mariiStats.total})
              </span>
            </div>
            <div className="w-full h-2 bg-violet-100 dark:bg-violet-900/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 transition-all duration-500 rounded-full"
                style={{ width: `${mariiStats.progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
