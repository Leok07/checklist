import React, { useState, useEffect } from 'react';
import { Plus, Copy, CheckSquare, Moon, Sun, Cloud, RefreshCw, AlertCircle, X } from 'lucide-react';
import { Theme } from '../hooks/useTheme';

interface HeaderProps {
  onOpenAddModal: () => void;
  onCopyList: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  isCloudConfigured?: boolean;
  isCloudSyncing?: boolean;
  cloudError?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAddModal,
  onCopyList,
  theme,
  onToggleTheme,
  isCloudConfigured = false,
  isCloudSyncing = false,
  cloudError = null,
}) => {
  const [showErrorModal, setShowErrorModal] = useState(false);

  useEffect(() => {
    if (!showErrorModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowErrorModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showErrorModal]);

  return (
    <header className="pt-5 sm:pt-8 pb-5 border-b border-slate-200/80 dark:border-slate-800/90 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start justify-between sm:block">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ocean-600 text-white flex items-center justify-center shadow-sm shadow-ocean-500/20 shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-ocean-600 dark:text-ocean-400 block">
                  Viagem & Bagagem
                </span>

                {isCloudConfigured ? (
                  cloudError ? (
                    <button
                      type="button"
                      onClick={() => setShowErrorModal(true)}
                      className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 cursor-pointer hover:bg-rose-100 transition"
                      title="Clique para ver detalhes do erro do Firebase"
                    >
                      <AlertCircle className="w-2.5 h-2.5" />
                      <span>Erro na nuvem (clique)</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      {isCloudSyncing ? (
                        <>
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          Sincronizando
                        </>
                      ) : (
                        <>
                          <Cloud className="w-2.5 h-2.5" />
                          Nuvem ativa
                        </>
                      )}
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    Modo local
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Task de Viagem
              </h1>
            </div>
          </div>

          {/* Toggle de Tema no Mobile */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            className="sm:hidden p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
          Organize sua viagem a dois com facilidade e sincronização em tempo real entre celulares.
        </p>

        {/* Barra de Ações Rápidas */}
        <div className="flex items-center gap-2 pt-1 sm:pt-0">
          <button
            type="button"
            onClick={onCopyList}
            title="Copiar lista formatada para o WhatsApp ou anotações"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition shadow-sm min-h-[44px]"
          >
            <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
            <span>Copiar lista</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddModal}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium text-white bg-ocean-600 rounded-xl hover:bg-ocean-700 active:scale-95 transition shadow-sm shadow-ocean-500/20 min-h-[44px]"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Nova task</span>
          </button>

          {/* Toggle de Tema no Desktop */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            className="hidden sm:inline-flex p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition shadow-sm min-h-[44px] min-w-[44px] items-center justify-center"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>
      </div>

      {/* Modal de Detalhes do Erro da Nuvem */}
      {showErrorModal && cloudError && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="firebase-error-modal-title"
          onClick={() => setShowErrorModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-900"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h3
                  id="firebase-error-modal-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  Diagnóstico do Firebase
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowErrorModal(false)}
                aria-label="Fechar diagnóstico"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 p-3 rounded-xl border border-rose-200 dark:border-rose-900 mb-4 font-mono break-words">
              {cloudError}
            </p>

            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2 mb-5">
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Como configurar com segurança no Firebase:
              </p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>No menu da esquerda, vá em <strong>Firestore Database</strong> e verifique se o banco foi criado.</li>
                <li>Na aba <strong>Regras (Rules)</strong>, restrinja o acesso apenas à coleção <code>viagem_tasks</code> validando os campos (<code>name</code>, <code>assignedTo in [&apos;leeo&apos;, &apos;marii&apos;]</code> e <code>completed is bool</code>).</li>
                <li>Para maior segurança em produção, ative o <strong>Firebase App Check</strong> ou <strong>Authentication</strong>.</li>
              </ol>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowErrorModal(false)}
                className="px-4 py-2 text-xs font-medium text-white bg-ocean-600 rounded-lg hover:bg-ocean-700 transition min-h-[40px]"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
