import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Copy,
  Cloud,
  RefreshCw,
  AlertCircle,
  MoreHorizontal,
  CheckSquare,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { SPRING_BOUNCY } from '../motion/springEngine';
import { animateSpringOpacity, animateSpringTranslateY } from '../motion/waapiSpring';
import { triggerHaptic } from '../motion/haptics';

interface HeaderProps {
  isSearchOpen: boolean;
  hasActiveFilters: boolean;
  onToggleSearch: () => void;
  onCopyList: () => void;
  onCheckAll: () => void;
  onUncheckAll: () => void;
  onClearAll: () => void;
  totalItems: number;
  completedItems: number;
  isCloudConfigured: boolean;
  isCloudSyncing: boolean;
  cloudError: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  isSearchOpen,
  hasActiveFilters,
  onToggleSearch,
  onCopyList,
  onCheckAll,
  onUncheckAll,
  onClearAll,
  totalItems,
  completedItems,
  isCloudConfigured,
  isCloudSyncing,
  cloudError,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    animateSpringTranslateY(menuRef.current, -10, 0, 0, SPRING_BOUNCY);
    animateSpringOpacity(menuRef.current, 0, 1, 160);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen && !showErrorModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setConfirmClear(false);
        setShowErrorModal(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen, showErrorModal]);

  return (
    <header className="relative z-30 shrink-0 px-3 pt-safe pb-2.5 border-b border-[var(--vice-border)] bg-[var(--vice-shell-bg)]">
      <div className="flex items-center justify-between gap-2">
        {/* Identidade estilo GTA 6 Settings */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="font-display text-lg font-black tracking-wide uppercase leading-none text-[#F3ECF5] truncate">
              TASK DE VIAGEM
            </h1>
            {isCloudConfigured ? (
              cloudError ? (
                <button
                  type="button"
                  onClick={() => setShowErrorModal(true)}
                  aria-label="Ver erro de sincronização"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#E07AB0]/20 text-[#F09AC6] border border-[#F09AC6]/40"
                >
                  <AlertCircle className="w-2.5 h-2.5" />
                  <span>Erro</span>
                </button>
              ) : (
                <span
                  title={isCloudSyncing ? 'Sincronizando com Firebase' : 'Nuvem sincronizada'}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-[#E6DCE8]/12 text-[#E6DCE8] border border-[var(--vice-border)]"
                >
                  {isCloudSyncing ? (
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <Cloud className="w-2.5 h-2.5" />
                  )}
                </span>
              )
            ) : null}
          </div>

          <p className="mt-1 text-[10px] font-semibold tracking-wider uppercase text-[#8E7498]">
            {completedItems} / {totalItems} prontas
          </p>
        </div>

        {/* Acoes rapidas mobile (zero botoes "+") */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('tap');
              onToggleSearch();
            }}
            aria-label="Buscar e filtrar tarefas"
            className={`relative w-10 h-10 rounded-xl border flex items-center justify-center active:scale-90 ${
              isSearchOpen || hasActiveFilters
                ? 'border-[#ECE3EE]/70 pearl-highlight-bar'
                : 'border-[var(--vice-border)] bg-[var(--vice-surface-subtle)] text-[#C7B4CE]'
            }`}
          >
            <Search className="w-4 h-4" />
            {hasActiveFilters && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#E07AB0]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('tap');
              onCopyList();
            }}
            aria-label="Copiar lista formatada"
            title="Copiar lista para WhatsApp"
            className="w-10 h-10 rounded-xl border border-[var(--vice-border)] bg-[var(--vice-surface-subtle)] text-[#C7B4CE] flex items-center justify-center active:scale-90"
          >
            <Copy className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                setConfirmClear(false);
                setMenuOpen((prev) => !prev);
              }}
              aria-label="Mais ações"
              className="w-10 h-10 rounded-xl border border-[var(--vice-border)] bg-[var(--vice-surface-subtle)] text-[#C7B4CE] flex items-center justify-center active:scale-90"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmClear(false);
                  }}
                />
                <div
                  ref={menuRef}
                  className="absolute right-0 mt-2 w-52 z-50 rounded-2xl border border-[var(--vice-border-strong)] bg-[var(--vice-surface-strong)] shadow-2xl p-1.5 space-y-1"
                >
                  <button
                    type="button"
                    disabled={totalItems === 0}
                    onClick={() => {
                      triggerHaptic('check');
                      onCheckAll();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#F3ECF5] hover:bg-[var(--vice-surface-subtle)] disabled:opacity-40"
                  >
                    <CheckSquare className="w-4 h-4 text-[#E6DCE8]" />
                    <span>Marcar todas</span>
                  </button>
                  <button
                    type="button"
                    disabled={totalItems === 0}
                    onClick={() => {
                      triggerHaptic('tap');
                      onUncheckAll();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#F3ECF5] hover:bg-[var(--vice-surface-subtle)] disabled:opacity-40"
                  >
                    <Square className="w-4 h-4 text-[#8E7498]" />
                    <span>Desmarcar todas</span>
                  </button>

                  <div className="border-t border-[var(--vice-border)] my-1" />

                  {confirmClear ? (
                    <div className="p-2 rounded-xl bg-[#E07AB0]/15 border border-[#E07AB0]/35 space-y-2">
                      <p className="text-[11px] font-semibold text-[#F09AC6]">
                        Apagar todas as {totalItems} tarefas?
                      </p>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfirmClear(false)}
                          className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--vice-surface-subtle)] text-[#F3ECF5]"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('delete');
                            onClearAll();
                            setConfirmClear(false);
                            setMenuOpen(false);
                          }}
                          className="flex-1 py-1.5 rounded-lg text-[11px] font-bold bg-[#E07AB0] text-[#22122A]"
                        >
                          Limpar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={totalItems === 0}
                      onClick={() => setConfirmClear(true)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#F09AC6] hover:bg-[#E07AB0]/10 disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Limpar toda a lista</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Diagnostico do Firebase */}
      {showErrorModal && cloudError && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowErrorModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#16091F]/75"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-[#F09AC6]/40 bg-[var(--vice-sheet-bg)] p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-[#F09AC6]">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-display font-bold text-sm text-[#F3ECF5]">
                  Diagnóstico do Firebase
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowErrorModal(false)}
                aria-label="Fechar"
                className="p-1 text-[#8E7498]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-mono p-3 rounded-xl bg-[#E07AB0]/10 border border-[#E07AB0]/30 text-[#F09AC6] mb-3 break-words">
              {cloudError}
            </p>
            <p className="text-[11px] text-[#C7B4CE] leading-relaxed mb-4">
              Verifique no Console do Firebase se o Firestore Database está ativo e se as regras da coleção{' '}
              <code className="font-mono text-[#E6DCE8]">viagem_tasks</code> permitem leitura e escrita válidas.
            </p>
            <button
              type="button"
              onClick={() => setShowErrorModal(false)}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-[#22122A] pearl-highlight-bar"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
