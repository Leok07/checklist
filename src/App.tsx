import { useState, useMemo, useCallback, useRef } from 'react';
import { Search, X, Flame } from 'lucide-react';
import { useChecklist } from './hooks/useChecklist';
import { useViceTheme } from './hooks/useViceTheme';
import { useTaskProcessor } from './workers/useTaskProcessor';
import {
  BagLocation,
  CategoryId,
  ChecklistItem,
  FilterStatus,
  PersonAssignment,
  SplitSnapMode,
  TaskDraft,
  TaskPriority,
} from './types/checklist';
import { BAG_LOCATIONS, resolveAccentOption } from './data/customization';
import { ViceAtmosphereBg } from './components/ViceAtmosphereBg';
import { Header } from './components/Header';
import { SplitStage, getSplitRatioFromSnap } from './components/SplitStage';
import { ViceFab } from './components/ViceFab';
import { TaskStudioSheet } from './components/TaskStudioSheet';
import { Toast } from './components/Toast';
import { NeonBurstCanvas, NeonBurstHandle } from './motion/NeonBurstCanvas';
import { triggerHaptic } from './motion/haptics';

interface ToastState {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function App() {
  const {
    items,
    addItem,
    toggleItem,
    updateItemFull,
    moveOrReorderItem,
    updateQuantity,
    toggleSubtask,
    removeItem,
    undoLastDelete,
    checkAll,
    uncheckAll,
    clearAllTasks,
    isCloudConfigured,
    isCloudSyncing,
    cloudError,
  } = useChecklist();

  const { atmosphere, preference, cycleAtmosphere } = useViceTheme();

  // Shell mobile-only ref (usado pelo FAB magnetico e Canvas de particulas)
  const shellRef = useRef<HTMLDivElement | null>(null);
  const burstRef = useRef<NeonBurstHandle | null>(null);

  // Estados de interface
  const [snapMode, setSnapMode] = useState<SplitSnapMode>('even');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [categoryFilter] = useState<CategoryId | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [bagFilter, setBagFilter] = useState<BagLocation | 'all'>('all');

  const [studioOpen, setStudioOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [studioInitialPerson, setStudioInitialPerson] = useState<PersonAssignment>('leeo');
  const [fabHoverTarget, setFabHoverTarget] = useState<PersonAssignment | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const filterCriteria = useMemo(
    () => ({
      query: searchQuery,
      status: statusFilter,
      category: categoryFilter,
      priority: priorityFilter,
      bag: bagFilter,
    }),
    [searchQuery, statusFilter, categoryFilter, priorityFilter, bagFilter]
  );

  const { leeoItems, mariiItems, stats, generateExportAsync } = useTaskProcessor(
    items,
    filterCriteria
  );

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      statusFilter !== 'all' ||
      priorityFilter !== 'all' ||
      bagFilter !== 'all'
  );

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setBagFilter('all');
  }, []);

  const showToast = useCallback((message: string, actionLabel?: string, onAction?: () => void) => {
    setToast({ message, actionLabel, onAction });
  }, []);

  const handleCloseToast = useCallback(() => {
    setToast(null);
  }, []);

  const handleOpenNewFor = useCallback((person: PersonAssignment) => {
    setEditingItem(null);
    setStudioInitialPerson(person);
    setStudioOpen(true);
  }, []);

  const handleOpenCustomize = useCallback((item: ChecklistItem) => {
    setEditingItem(item);
    setStudioInitialPerson(item.assignedTo);
    setStudioOpen(true);
  }, []);

  const handleCloseStudio = useCallback(() => {
    setStudioOpen(false);
    setEditingItem(null);
  }, []);

  const handleSaveNew = useCallback(
    async (draft: TaskDraft) => {
      const created = await addItem(draft);
      if (created) {
        showToast(
          `"${created.name}" adicionada para ${created.assignedTo === 'leeo' ? 'Leeo' : 'Marii'}.`
        );
      }
    },
    [addItem, showToast]
  );

  const handleSaveEdit = useCallback(
    async (id: string, draft: TaskDraft) => {
      const ok = await updateItemFull(id, draft);
      if (ok) {
        showToast(`"${draft.name}" atualizada.`);
      }
    },
    [updateItemFull, showToast]
  );

  const handleToggle = useCallback(
    async (id: string, clientX: number, clientY: number) => {
      const target = items.find((i) => i.id === id);
      const becameCompleted = await toggleItem(id);
      if (becameCompleted && target) {
        const accent = resolveAccentOption(target.accentColor, target.assignedTo);
        burstRef.current?.burst(clientX, clientY, accent.hex, '#FFB84D');
      }
    },
    [items, toggleItem]
  );

  const handleRemove = useCallback(
    async (id: string) => {
      const removed = await removeItem(id);
      if (removed) {
        showToast(`"${removed.name}" removida.`, 'Desfazer', () => {
          triggerHaptic('snap');
          void undoLastDelete();
        });
      }
    },
    [removeItem, showToast, undoLastDelete]
  );

  const handleMoveOrReorder = useCallback(
    async (
      id: string,
      targetPerson: PersonAssignment,
      targetIndex: number,
      dropX: number,
      dropY: number
    ) => {
      const current = items.find((i) => i.id === id);
      const moved = await moveOrReorderItem(id, targetPerson, targetIndex);
      if (moved && current) {
        const switchedPerson = current.assignedTo !== targetPerson;
        if (switchedPerson) {
          triggerHaptic('transfer');
          burstRef.current?.burst(
            dropX,
            dropY,
            targetPerson === 'leeo' ? '#00F0FF' : '#FF2E93',
            '#FFB84D'
          );
          showToast(
            `"${current.name}" movida para ${targetPerson === 'leeo' ? 'Leeo' : 'Marii'}.`
          );
        } else {
          triggerHaptic('snap');
        }
      }
    },
    [items, moveOrReorderItem, showToast]
  );

  const handleFabDropOnPerson = useCallback(
    (person: PersonAssignment, x: number, y: number) => {
      burstRef.current?.burst(
        x,
        y,
        person === 'leeo' ? '#00F0FF' : '#FF2E93',
        '#FFB84D'
      );
      handleOpenNewFor(person);
    },
    [handleOpenNewFor]
  );

  const handleCopyList = useCallback(async () => {
    const text = await generateExportAsync();
    try {
      await navigator.clipboard.writeText(text);
      showToast('Lista copiada para a área de transferência.');
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast('Lista copiada com sucesso.');
    }
  }, [generateExportAsync, showToast]);

  const splitRatio = getSplitRatioFromSnap(snapMode);

  return (
    <div className="h-[100dvh] w-full flex items-center justify-center overflow-hidden">
      {/* Moldura Mobile-Only (100% tela cheia no celular; centralizada estilo app no desktop) */}
      <div
        ref={shellRef}
        className="relative w-full max-w-[430px] h-[100dvh] sm:h-[min(100dvh,900px)] sm:rounded-[34px] sm:border sm:border-[var(--vice-border-strong)] sm:shadow-[0_24px_80px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden"
      >
        {/* Fundo Atmosferico GTA 6 (Day / Sunset / Night pela hora real) */}
        <ViceAtmosphereBg atmosphere={atmosphere} />

        {/* Canvas GPU-first de explosao neon ao concluir/transferir */}
        <NeonBurstCanvas ref={burstRef} />

        {/* Camada Interativa Principal */}
        <div className="relative z-10 flex flex-col flex-1 min-h-0">
          <Header
            atmosphere={atmosphere}
            preference={preference}
            onCycleAtmosphere={cycleAtmosphere}
            isSearchOpen={isSearchOpen}
            hasActiveFilters={hasActiveFilters}
            onToggleSearch={() => setIsSearchOpen((prev) => !prev)}
            onCopyList={handleCopyList}
            onCheckAll={() => void checkAll()}
            onUncheckAll={() => void uncheckAll()}
            onClearAll={() => void clearAllTasks()}
            totalItems={stats.total}
            isCloudConfigured={isCloudConfigured}
            isCloudSyncing={isCloudSyncing}
            cloudError={cloudError}
          />

          {/* Barra Expansivel de Busca & Filtros Rapidos */}
          {isSearchOpen && (
            <div className="shrink-0 px-3 py-2.5 border-b border-[var(--vice-border)] bg-[var(--vice-shell-bg)] backdrop-blur-md space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--vice-text-muted)] pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome, tag, nota ou mala..."
                  aria-label="Buscar tarefas"
                  className="w-full pl-9 pr-9 py-2 text-base sm:text-xs rounded-xl border border-[var(--vice-border-strong)] bg-[var(--vice-surface)] text-[var(--vice-text-primary)] placeholder:text-[var(--vice-text-muted)] focus:outline-none focus:border-[#00E5FF]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Limpar busca"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--vice-text-muted)]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Chips horizontais rapidos */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                {(['all', 'pending', 'completed'] as FilterStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setStatusFilter(st);
                    }}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border ${
                      statusFilter === st
                        ? 'border-[#00E5FF] bg-[#00E5FF]/20 text-[#00E5FF]'
                        : 'border-[var(--vice-border)] bg-[var(--vice-surface-subtle)] text-[var(--vice-text-secondary)]'
                    }`}
                  >
                    {st === 'all' ? 'Todas' : st === 'pending' ? 'Pendentes' : 'Prontas'}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    setPriorityFilter((p) => (p === 'urgent' ? 'all' : 'urgent'));
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border ${
                    priorityFilter === 'urgent'
                      ? 'border-[#FF3B5C] bg-[#FF3B5C]/20 text-[#FF3B5C]'
                      : 'border-[var(--vice-border)] bg-[var(--vice-surface-subtle)] text-[var(--vice-text-secondary)]'
                  }`}
                >
                  <Flame className="w-3 h-3" />
                  <span>Urgentes</span>
                </button>

                {BAG_LOCATIONS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setBagFilter((b) => (b === id ? 'all' : id));
                    }}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border ${
                      bagFilter === id
                        ? 'border-[#FF2E93] bg-[#FF2E93]/20 text-[#FF4DA6]'
                        : 'border-[var(--vice-border)] bg-[var(--vice-surface-subtle)] text-[var(--vice-text-secondary)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap text-[#FFB84D]"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* PALCO MEIO A MEIO 50/50 COM DIVISOR CENTRAL NEON ARRASTAVEL */}
          <SplitStage
            leeoItems={leeoItems}
            mariiItems={mariiItems}
            stats={stats}
            snapMode={snapMode}
            onSnapModeChange={setSnapMode}
            fabHoverTarget={fabHoverTarget}
            onAdd={handleOpenNewFor}
            onToggle={handleToggle}
            onCustomize={handleOpenCustomize}
            onRemove={handleRemove}
            onUpdateQuantity={(id, delta) => void updateQuantity(id, delta)}
            onToggleSubtask={(taskId, subId) => void toggleSubtask(taskId, subId)}
            onMoveOrReorder={handleMoveOrReorder}
          />
        </div>

        {/* BOTAO "+" FLUTUANTE MAGNETICO ARRASTAVEL */}
        <ViceFab
          containerRef={shellRef}
          splitRatio={splitRatio}
          hoverTarget={fabHoverTarget}
          onHoverTargetChange={setFabHoverTarget}
          onTap={() =>
            handleOpenNewFor(snapMode === 'marii' ? 'marii' : 'leeo')
          }
          onDropOnPerson={handleFabDropOnPerson}
        />

        {/* ESTUDIO DE CRIACAO E CUSTOMIZACAO ABSURDA */}
        <TaskStudioSheet
          isOpen={studioOpen}
          editingItem={editingItem}
          initialPerson={studioInitialPerson}
          onClose={handleCloseStudio}
          onSaveNew={handleSaveNew}
          onSaveEdit={handleSaveEdit}
          onDelete={handleRemove}
        />

        {/* TOAST VICE COM AUTO-DISMISS E UNDO */}
        <Toast
          message={toast?.message ?? null}
          actionLabel={toast?.actionLabel}
          onAction={toast?.onAction}
          onClose={handleCloseToast}
        />
      </div>
    </div>
  );
}

export default App;
