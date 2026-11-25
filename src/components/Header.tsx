import React, { useState, useEffect } from 'react';
import {
  Search,
  Copy,
  Sun,
  Sunset,
  Moon,
  Cloud,
  RefreshCw,
  AlertCircle,
  MoreHorizontal,
  CheckSquare,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { AtmospherePreference, ViceAtmosphere } from '../types/checklist';
import { getAtmosphereLabel } from '../hooks/useViceTheme';
import { triggerHaptic } from '../motion/haptics';

interface HeaderProps {
  atmosphere: ViceAtmosphere;
  preference: AtmospherePreference;
  onCycleAtmosphere: () => void;
  isSearchOpen: boolean;
  hasActiveFilters: boolean;
  onToggleSearch: () => void;
  onCopyList: () => void;
  onCheckAll: () => void;
  onUncheckAll: () => void;
  onClearAll: () => void;
  totalItems: number;
  isCloudConfigured: boolean;
  isCloudSyncing: boolean;
  cloudError: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  atmosphere,
  preference,
  onCycleAtmosphere,
  isSearchOpen,
  hasActiveFilters,
  onToggleSearch,
  onCopyList,
  onCheckAll,
  onUncheckAll,
  onClearAll,
  totalItems,
  isCloudConfigured,
  isCloudSyncing,
  cloudError,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

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

  const AtmosphereIcon = atmosphere === 'day' ? Sun : atmosphere === 'sunset' ? Sunset : Moon;
  const atmosphereText =
    preference === 'auto'
      ? `Auto · ${getAtmosphereLabel(atmosphere)}`
      : getAtmosphereLabel(atmosphere);

  return (
    <header className="relative z-30 shrink-0 px-3 pt-safe pb-2.5 border-b border-[var(--vice-border)] bg-[var(--vice-shell-bg)] backdrop-blur-md">
      <div className="flex items-center justify-between gap-2">
        {/* Identidade + Status da Nuvem */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="font-display text-lg font-black tracking-tight italic leading-none vice-title-text truncate">
              TASK DE VIAGEM
            </h1>
            {isCloudConfigured ? (
              cloudError ? (
                <button
                  type="button"
                  onClick={() => setShowErrorModal(true)}
                  aria-label="Ver erro de sincronização"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#FF3B5C]/20 text-[#FF3B5C] border border-[#FF3B5C]/40"
                >
                  <AlertCircle className="w-2.5 h-2.5" />
                  <span>Erro</span>
                </button>
              ) : (
                <span
                  title={isCloudSyncing ? 'Sincronizando com Firebase' : 'Nuvem sincronizada'}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-[#10F5A8]/15 text-[#10F5A8] border border-[#10F5A8]/30"
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

          {/* Pilula clicavel do ciclo de atmosfera por hora real */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('tap');
              onCycleAtmosphere();
            }}
            className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide text-[var(--vice-text-secondary)] hover:text-[var(--vice-text-primary)] active:scale-95 transition-transform"
            title="Alternar ciclo de tema (Auto pela hora real, Day, Sunset, Night)"
          >
            <AtmosphereIcon className="w-3 h-3 text-[#FFB84D]" />
            <span>{atmosphereText}</span>
          </button>
        </div>

        {/* Acoes rapidas mobile (>=40px toque) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('tap');
              onToggleSearch();
            }}
            aria-label="Buscar e filtrar tarefas"
            className={`relative w-10 h-10 rounded-xl border flex items-center justify-center active:scale-90 transition-transform ${
              isSearchOpen || hasActiveFilters
                ? 'border-[#00E5FF]/60 bg-[#00E5FF]/15 text-[#00E5FF]'
                : 'border-[var(--vice-border)] bg-[var(--vice-surface-subtle)] text-[var(--vice-text-secondary)]'
            }`}
          >
            <Search className="w-4 h-4" />
            {hasActiveFilters && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#FF2E93]" />
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
            className="w-10 h-10 rounded-xl border border-[var(--vice-border)] bg-[var(--vice-surface-subtle)] text-[var(--vice-text-secondary)] flex items-center justify-center active:scale-90 transition-transform"
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
              className="w-10 h-10 rounded-xl border border-[var(--vice-border)] bg-[var(--vice-surface-subtle)] text-[var(--vice-text-secondary)] flex items-center justify-center active:scale-90 transition-transform"
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
                <div className="absolute right-0 mt-2 w-52 z-50 rounded-2xl border border-[var(--vice-border-strong)] bg-[var(--vice-surface-strong)] shadow-2xl p-1.5 space-y-1">
                  <button
                    type="button"
                    disabled={totalItems === 0}
                    onClick={() => {
                      triggerHaptic('check');
                      onCheckAll();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[var(--vice-text-primary)] hover:bg-[var(--vice-surface-subtle)] disabled:opacity-40"
                  >
                    <CheckSquare className="w-4 h-4 text-[#10F5A8]" />
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
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[var(--vice-text-primary)] hover:bg-[var(--vice-surface-subtle)] disabled:opacity-40"
                  >
                    <Square className="w-4 h-4 text-[var(--vice-text-muted)]" />
                    <span>Desmarcar todas</span>
                  </button>

                  <div className="border-t border-[var(--vice-border)] my-1" />

                  {confirmClear ? (
                    <div className="p-2 rounded-xl bg-[#FF3B5C]/15 border border-[#FF3B5C]/35 space-y-2">
                      <p className="text-[11px] font-semibold text-[#FF3B5C]">
                        Apagar todas as {totalItems} tarefas?
                      </p>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfirmClear(false)}
                          className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--vice-surface-subtle)] text-[var(--vice-text-primary)]"
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
                          className="flex-1 py-1.5 rounded-lg text-[11px] font-bold bg-[#FF3B5C] text-white"
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
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#FF3B5C] hover:bg-[#FF3B5C]/10 disabled:opacity-40"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-[#FF3B5C]/40 bg-[var(--vice-sheet-bg)] p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-[#FF3B5C]">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-display font-bold text-sm text-[var(--vice-text-primary)]">
                  Diagnóstico do Firebase
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowErrorModal(false)}
                aria-label="Fechar"
                className="p-1 text-[var(--vice-text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-mono p-3 rounded-xl bg-[#FF3B5C]/10 border border-[#FF3B5C]/30 text-[#FF3B5C] mb-3 break-words">
              {cloudError}
            </p>
            <p className="text-[11px] text-[var(--vice-text-secondary)] leading-relaxed mb-4">
              Verifique no Console do Firebase se o Firestore Database está ativo e se as regras da coleção{' '}
              <code className="font-mono text-[#00E5FF]">viagem_tasks</code> permitem leitura e escrita válidas.
            </p>
            <button
              type="button"
              onClick={() => setShowErrorModal(false)}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#00B4D8] to-[#FF2E93]"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
