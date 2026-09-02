import { useState, useMemo } from 'react';
import { useChecklist } from './hooks/useChecklist';
import { useTheme } from './hooks/useTheme';
import { CategoryId, FilterStatus, PersonAssignment } from './types/checklist';
import { CATEGORIES } from './data/defaultItems';
import { Header } from './components/Header';
import { ItemCard } from './components/ItemCard';
import { AddItemModal } from './components/AddItemModal';
import { ActionToolbar } from './components/ActionToolbar';
import { Toast } from './components/Toast';
import { Waves, Plus, Search, X } from 'lucide-react';

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

  // Estados de busca e filtro
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalTargetPerson, setModalTargetPerson] = useState<PersonAssignment>('leeo');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleOpenAdd = (person: PersonAssignment) => {
    setModalTargetPerson(person);
    setIsAddModalOpen(true);
  };

  const handleAddItem = (name: string, categoryId: CategoryId, assignedTo: PersonAssignment) => {
    const success = addItem(name, categoryId, assignedTo);
    if (success) {
      showToast(`Item "${name}" adicionado para ${assignedTo === 'leeo' ? 'Leeo' : 'Marii'}.`);
    }
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

  // Filtragem
  const filterItems = (list: typeof items) => {
    return list.filter((item) => {
      if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) {
        return false;
      }
      if (statusFilter === 'pending' && item.completed) {
        return false;
      }
      if (statusFilter === 'completed' && !item.completed) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const cat = CATEGORIES.find((c) => c.id === item.categoryId);
        const matchesCat = cat?.label.toLowerCase().includes(q);
        if (!matchesName && !matchesCat) return false;
      }
      return true;
    });
  };

  const leeoItems = useMemo(() => {
    return filterItems(items.filter((i) => i.assignedTo === 'leeo'));
  }, [items, selectedCategory, statusFilter, searchQuery]);

  const mariiItems = useMemo(() => {
    return filterItems(items.filter((i) => i.assignedTo === 'marii'));
  }, [items, selectedCategory, statusFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F17] text-slate-800 dark:text-slate-100 flex flex-col justify-between transition-colors duration-200 selection:bg-ocean-500 selection:text-white">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 w-full pb-20 sm:pb-16">
        {/* Cabeçalho Limpo */}
        <Header
          onOpenAddModal={() => handleOpenAdd('leeo')}
          onCopyList={handleCopyList}
          theme={theme}
          onToggleTheme={toggleTheme}
          isCloudConfigured={isCloudConfigured}
          isCloudSyncing={isCloudSyncing}
          cloudError={cloudError}
          onForceSync={forceSyncToCloud}
        />

        {/* Barra Compacta de Busca e Filtros Rápidos */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-5 text-xs">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar itens..."
              className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ocean-500/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Filtro Status */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  statusFilter === 'pending'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Pendentes
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  statusFilter === 'completed'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Prontos
              </button>
            </div>

            {/* Filtro Categoria */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="py-1.5 px-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 font-medium"
            >
              <option value="all">Todas Categorias</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TELA MEIO A MEIO (DIRETO AO PONTO COM DIVISOR CENTRAL) */}
        <main className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
            
            {/* LADO ESQUERDO: LEEO */}
            <section className="p-4 sm:p-5 flex flex-col">
              {/* Topo Leeo */}
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-sky-700 dark:text-sky-400">
                      Leeo
                    </h2>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      {stats.leeo.completed}/{stats.leeo.total} itens
                    </span>
                  </div>
                  <button
                    onClick={() => handleOpenAdd('leeo')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:scale-95 rounded-xl transition shadow-sm shadow-sky-500/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>

                {/* Barra Leeo */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-sky-100 dark:bg-sky-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 transition-all duration-300 rounded-full"
                      style={{ width: `${stats.leeo.progressPercent}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-sky-700 dark:text-sky-400 shrink-0">
                    {stats.leeo.progressPercent}%
                  </span>
                </div>
              </div>

              {/* Lista Leeo */}
              <div className="space-y-2 flex-1">
                {leeoItems.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-8">
                    Nenhum item para o Leeo.
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

            {/* LADO DIREITO: MARII */}
            <section className="p-4 sm:p-5 flex flex-col">
              {/* Topo Marii */}
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-violet-700 dark:text-violet-400">
                      Marii
                    </h2>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                      {stats.marii.completed}/{stats.marii.total} itens
                    </span>
                  </div>
                  <button
                    onClick={() => handleOpenAdd('marii')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 active:scale-95 rounded-xl transition shadow-sm shadow-violet-500/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>

                {/* Barra Marii */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-violet-100 dark:bg-violet-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 transition-all duration-300 rounded-full"
                      style={{ width: `${stats.marii.progressPercent}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-violet-700 dark:text-violet-400 shrink-0">
                    {stats.marii.progressPercent}%
                  </span>
                </div>
              </div>

              {/* Lista Marii */}
              <div className="space-y-2 flex-1">
                {mariiItems.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-8">
                    Nenhum item para a Marii.
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
        </main>

        {/* Ações em Massa */}
        <ActionToolbar
          onCheckAll={checkAll}
          onUncheckAll={uncheckAll}
          onResetToDefaults={resetToDefaults}
          totalItems={stats.total}
          filteredCount={leeoItems.length + mariiItems.length}
        />
      </div>

      {/* Rodapé Minimalista */}
      <footer className="border-t border-slate-200/70 dark:border-slate-800/80 py-5 text-center text-xs text-slate-400 dark:text-slate-500">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <Waves className="w-4 h-4 text-ocean-500" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Checklist de Praia</span>
        </div>
        <p>Leeo e Marii</p>
      </footer>

      {/* Modal de Adição */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddItem}
        initialAssignedTo={modalTargetPerson}
      />

      {/* Toast */}
      <Toast
        message={toastMessage}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
}

export default App;
