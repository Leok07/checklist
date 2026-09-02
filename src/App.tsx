import { useState, useMemo } from 'react';
import { useChecklist } from './hooks/useChecklist';
import { useTheme } from './hooks/useTheme';
import { CategoryId, FilterStatus, ViewMode, PersonAssignment } from './types/checklist';
import { CATEGORIES } from './data/defaultItems';
import { Header } from './components/Header';
import { ProgressBar } from './components/ProgressBar';
import { SplitViewToggle } from './components/SplitViewToggle';
import { CategoryFilter } from './components/CategoryFilter';
import { ItemCard } from './components/ItemCard';
import { AddItemModal } from './components/AddItemModal';
import { ActionToolbar } from './components/ActionToolbar';
import { EmptyState } from './components/EmptyState';
import { Toast } from './components/Toast';
import { Waves, Plus, User } from 'lucide-react';

export function App() {
  const {
    items,
    addItem,
    toggleItem,
    removeItem,
    editItem,
    reassignItem,
    checkAll,
    uncheckAll,
    resetToDefaults,
    exportAsText,
    stats,
    isCloudConfigured,
    isCloudSyncing,
    cloudError,
    forceSyncToCloud,
  } = useChecklist();

  const { theme, toggleTheme } = useTheme();

  // Estados locais de interface
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalInitialPerson, setModalInitialPerson] = useState<PersonAssignment>('ambos');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  // Contagem de itens por categoria
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    CATEGORIES.forEach((cat) => {
      counts[cat.id] = items.filter((item) => item.categoryId === cat.id).length;
    });
    return counts;
  }, [items]);

  // Itens filtrados com base em busca, status e categoria
  const baseFilteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filtro de Categoria
      if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) {
        return false;
      }

      // Filtro de Status
      if (statusFilter === 'pending' && item.completed) {
        return false;
      }
      if (statusFilter === 'completed' && !item.completed) {
        return false;
      }

      // Filtro de Busca
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(query);
        const cat = CATEGORIES.find((c) => c.id === item.categoryId);
        const matchesCategory = cat?.label.toLowerCase().includes(query);
        const matchesPerson =
          (item.assignedTo === 'leeo' && 'leeo'.includes(query)) ||
          (item.assignedTo === 'marii' && 'marii'.includes(query)) ||
          (item.assignedTo === 'ambos' && 'ambos'.includes(query));
        if (!matchesName && !matchesCategory && !matchesPerson) {
          return false;
        }
      }

      return true;
    });
  }, [items, selectedCategory, statusFilter, searchQuery]);

  // Ações de usuário
  const handleAddItem = (name: string, categoryId: CategoryId, assignedTo: PersonAssignment) => {
    const success = addItem(name, categoryId, assignedTo);
    if (success) {
      showToast(`Item "${name}" adicionado.`);
    }
  };

  const handleOpenAddModal = (person: PersonAssignment = 'ambos') => {
    setModalInitialPerson(person);
    setIsAddModalOpen(true);
  };

  const handleCopyList = async () => {
    const text = exportAsText();
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
  };

  // Listas divididas para Meio a Meio
  const leeoItems = useMemo(() => {
    return baseFilteredItems.filter((i) => i.assignedTo === 'leeo' || i.assignedTo === 'ambos');
  }, [baseFilteredItems]);

  const mariiItems = useMemo(() => {
    return baseFilteredItems.filter((i) => i.assignedTo === 'marii' || i.assignedTo === 'ambos');
  }, [baseFilteredItems]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F17] text-slate-800 dark:text-slate-100 flex flex-col justify-between transition-colors duration-200 selection:bg-ocean-500 selection:text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 w-full pb-24 sm:pb-16">
        {/* Cabeçalho */}
        <Header
          onOpenAddModal={() => handleOpenAddModal('ambos')}
          onCopyList={handleCopyList}
          theme={theme}
          onToggleTheme={toggleTheme}
          isCloudConfigured={isCloudConfigured}
          isCloudSyncing={isCloudSyncing}
          cloudError={cloudError}
          onForceSync={forceSyncToCloud}
        />

        {/* Barra de Progresso com Métricas Individuais */}
        <ProgressBar
          total={stats.total}
          completed={stats.completed}
          pending={stats.pending}
          percent={stats.progressPercent}
          leeoStats={stats.leeo}
          mariiStats={stats.marii}
        />

        {/* Seletor Meio a Meio (Leeo vs Marii) */}
        <SplitViewToggle
          currentView={viewMode}
          onViewChange={setViewMode}
          leeoPercent={stats.leeo.progressPercent}
          mariiPercent={stats.marii.progressPercent}
        />

        {/* Barra de Filtros e Busca */}
        <CategoryFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
          categoryCounts={categoryCounts}
        />

        {/* Conteúdo Principal do Checklist */}
        <main className="space-y-6">
          {baseFilteredItems.length === 0 ? (
            <EmptyState
              isSearch={Boolean(searchQuery.trim())}
              onClearSearch={() => setSearchQuery('')}
              onOpenAddModal={() => handleOpenAddModal('ambos')}
            />
          ) : viewMode === 'split' ? (
            /* Modo Meio a Meio: Duas Colunas Lado a Lado no Desktop / Empilhadas no Mobile */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Coluna do Leeo */}
              <section className="bg-sky-50/30 dark:bg-sky-950/10 rounded-2xl p-4 sm:p-5 border border-sky-100 dark:border-sky-900/40 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-sky-100 dark:border-sky-900/40">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-sky-500/30">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-sky-950 dark:text-sky-200">
                        Lado do Leeo
                      </h3>
                      <span className="text-[11px] text-sky-700 dark:text-sky-400">
                        {stats.leeo.completed} de {stats.leeo.total} itens prontos ({stats.leeo.progressPercent}%)
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenAddModal('leeo')}
                    className="px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/60 hover:bg-sky-200 rounded-lg transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar
                  </button>
                </div>

                <div className="space-y-2">
                  {leeoItems.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">
                      Nenhum item atribuído ao Leeo nesta busca.
                    </p>
                  ) : (
                    leeoItems.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onToggle={toggleItem}
                        onRemove={removeItem}
                        onEdit={editItem}
                        onReassign={reassignItem}
                      />
                    ))
                  )}
                </div>
              </section>

              {/* Coluna da Marii */}
              <section className="bg-violet-50/30 dark:bg-violet-950/10 rounded-2xl p-4 sm:p-5 border border-violet-100 dark:border-violet-900/40 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-violet-100 dark:border-violet-900/40">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-violet-500/30">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-violet-950 dark:text-violet-200">
                        Lado da Marii
                      </h3>
                      <span className="text-[11px] text-violet-700 dark:text-violet-400">
                        {stats.marii.completed} de {stats.marii.total} itens prontos ({stats.marii.progressPercent}%)
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenAddModal('marii')}
                    className="px-2.5 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/60 hover:bg-violet-200 rounded-lg transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar
                  </button>
                </div>

                <div className="space-y-2">
                  {mariiItems.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">
                      Nenhum item atribuído à Marii nesta busca.
                    </p>
                  ) : (
                    mariiItems.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onToggle={toggleItem}
                        onRemove={removeItem}
                        onEdit={editItem}
                        onReassign={reassignItem}
                      />
                    ))
                  )}
                </div>
              </section>
            </div>
          ) : viewMode === 'leeo' ? (
            /* Foco Exclusivo: Lado do Leeo */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
                <div className="flex items-center gap-2.5">
                  <User className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                  <div>
                    <h3 className="text-sm font-bold text-sky-950 dark:text-sky-200">
                      Mala do Leeo (Itens individuais + compartilhados)
                    </h3>
                    <span className="text-xs text-sky-700 dark:text-sky-400">
                      {stats.leeo.completed} de {stats.leeo.total} itens prontos
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenAddModal('leeo')}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Novo item
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {leeoItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onToggle={toggleItem}
                    onRemove={removeItem}
                    onEdit={editItem}
                    onReassign={reassignItem}
                  />
                ))}
              </div>
            </div>
          ) : viewMode === 'marii' ? (
            /* Foco Exclusivo: Lado da Marii */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800">
                <div className="flex items-center gap-2.5">
                  <User className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  <div>
                    <h3 className="text-sm font-bold text-violet-950 dark:text-violet-200">
                      Mala da Marii (Itens individuais + compartilhados)
                    </h3>
                    <span className="text-xs text-violet-700 dark:text-violet-400">
                      {stats.marii.completed} de {stats.marii.total} itens prontos
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenAddModal('marii')}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Novo item
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {mariiItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onToggle={toggleItem}
                    onRemove={removeItem}
                    onEdit={editItem}
                    onReassign={reassignItem}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* Visão Geral: Agrupada por Categorias */
            CATEGORIES.map((cat) => {
              const itemsInCat = baseFilteredItems.filter((i) => i.categoryId === cat.id);
              if (itemsInCat.length === 0) return null;

              const completedInCat = itemsInCat.filter((i) => i.completed).length;

              return (
                <section key={cat.id} className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                        {cat.label}
                      </h3>
                      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        ({completedInCat}/{itemsInCat.length})
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
                      {cat.description}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                    {itemsInCat.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onToggle={toggleItem}
                        onRemove={removeItem}
                        onEdit={editItem}
                        onReassign={reassignItem}
                      />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </main>

        {/* Barra de Ações em Massa */}
        {items.length > 0 && (
          <div className="mt-6">
            <ActionToolbar
              onCheckAll={checkAll}
              onUncheckAll={uncheckAll}
              onResetToDefaults={resetToDefaults}
              totalItems={stats.total}
              filteredCount={baseFilteredItems.length}
            />
          </div>
        )}
      </div>

      {/* Botão Flutuante Rápido no Mobile (FAB) */}
      <div className="sm:hidden fixed bottom-5 right-5 z-40">
        <button
          onClick={() => handleOpenAddModal('ambos')}
          aria-label="Adicionar novo item"
          className="w-14 h-14 rounded-full bg-ocean-600 text-white flex items-center justify-center shadow-xl shadow-ocean-600/40 active:scale-95 transition"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Rodapé */}
      <footer className="border-t border-slate-200/70 dark:border-slate-800/80 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Waves className="w-4 h-4 text-ocean-500" />
          <span className="font-semibold text-slate-600 dark:text-slate-300">Checklist de Praia - Leeo e Marii</span>
        </div>
        <p>Sincronização em tempo real entre dispositivos. Dados salvos com segurança.</p>
      </footer>

      {/* Modal de Adição */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddItem}
        initialAssignedTo={modalInitialPerson}
      />

      {/* Notificação Toast */}
      <Toast
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
}

export default App;
