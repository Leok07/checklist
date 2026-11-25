import { useState, useMemo, useCallback } from 'react';
import { useChecklist } from './hooks/useChecklist';
import { useTheme } from './hooks/useTheme';
import { CategoryId, FilterStatus, PersonAssignment } from './types/checklist';
import { CATEGORIES, CATEGORY_MAP } from './data/defaultItems';
import { Header } from './components/Header';
import { PersonColumn } from './components/PersonColumn';
import { AddItemModal } from './components/AddItemModal';
import { ActionToolbar } from './components/ActionToolbar';
import { Toast } from './components/Toast';
import { Waves, Search, X } from 'lucide-react';

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
    clearAllTasks,
    exportAsText,
    stats,
    isCloudConfigured,
    isCloudSyncing,
    cloudError,
  } = useChecklist();

  const { theme, toggleTheme } = useTheme();

  // Estados de busca e filtro
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalTargetPerson, setModalTargetPerson] = useState<PersonAssignment>('leeo');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const handleCloseToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsAddModalOpen(false);
  }, []);

  const handleOpenAdd = useCallback((person: PersonAssignment) => {
    setModalTargetPerson(person);
    setIsAddModalOpen(true);
  }, []);

  const handleAddItem = useCallback(
    async (name: string, categoryId: CategoryId, assignedTo: PersonAssignment) => {
      const success = await addItem(name, categoryId, assignedTo);
      if (success) {
        showToast(`Task "${name}" adicionada para ${assignedTo === 'leeo' ? 'Leeo' : 'Marii'}.`);
      }
    },
    [addItem, showToast]
  );

  const handleCopyList = useCallback(async () => {
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
  }, [exportAsText, showToast]);

  // Filtragem centralizada e estável
  const { leeoItems, mariiItems } = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const leeo: typeof items = [];
    const marii: typeof items = [];

    for (const item of items) {
      if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) {
        continue;
      }
      if (statusFilter === 'pending' && item.completed) {
        continue;
      }
      if (statusFilter === 'completed' && !item.completed) {
        continue;
      }
      if (normalizedQuery) {
        const matchesName = item.name.toLowerCase().includes(normalizedQuery);
        const matchesCat = CATEGORY_MAP[item.categoryId]?.label.toLowerCase().includes(normalizedQuery);
        if (!matchesName && !matchesCat) {
          continue;
        }
      }

      if (item.assignedTo === 'leeo') {
        leeo.push(item);
      } else {
        marii.push(item);
      }
    }

    return { leeoItems: leeo, mariiItems: marii };
  }, [items, selectedCategory, statusFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F17] text-slate-800 dark:text-slate-100 flex flex-col justify-between transition-colors duration-200 selection:bg-ocean-500 selection:text-white">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 w-full pb-20 sm:pb-16">
        {/* Cabeçalho */}
        <Header
          onOpenAddModal={() => handleOpenAdd('leeo')}
          onCopyList={handleCopyList}
          theme={theme}
          onToggleTheme={toggleTheme}
          isCloudConfigured={isCloudConfigured}
          isCloudSyncing={isCloudSyncing}
          cloudError={cloudError}
        />

        {/* Barra Compacta de Busca e Filtros */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-5 text-xs">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar tarefas..."
              aria-label="Pesquisar tarefas"
              className="w-full pl-9 pr-9 py-2.5 sm:py-2 text-base sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ocean-500/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpar pesquisa"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Filtro Status */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-2 sm:py-1.5 rounded-lg font-medium transition ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-2 sm:py-1.5 rounded-lg font-medium transition ${
                  statusFilter === 'pending'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Pendentes
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-2 sm:py-1.5 rounded-lg font-medium transition ${
                  statusFilter === 'completed'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Prontas
              </button>
            </div>

            {/* Filtro Categoria */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as CategoryId | 'all')}
              aria-label="Filtrar por categoria"
              className="py-2 sm:py-1.5 px-2.5 text-base sm:text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 font-medium"
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
            <PersonColumn
              person="leeo"
              name="Leeo"
              emptyLabel="Nenhuma task para o Leeo."
              addPromptLabel="+ Adicionar tarefa para o Leeo"
              items={leeoItems}
              stats={stats.leeo}
              onAdd={handleOpenAdd}
              onToggle={toggleItem}
              onRemove={removeItem}
              onEdit={editItem}
              onReassign={reassignItem}
            />

            <PersonColumn
              person="marii"
              name="Marii"
              emptyLabel="Nenhuma task para a Marii."
              addPromptLabel="+ Adicionar tarefa para a Marii"
              items={mariiItems}
              stats={stats.marii}
              onAdd={handleOpenAdd}
              onToggle={toggleItem}
              onRemove={removeItem}
              onEdit={editItem}
              onReassign={reassignItem}
            />
          </div>
        </main>

        {/* Ações em Massa */}
        {items.length > 0 && (
          <ActionToolbar
            onCheckAll={() => checkAll()}
            onUncheckAll={() => uncheckAll()}
            onClearAll={clearAllTasks}
            totalItems={stats.total}
            filteredCount={leeoItems.length + mariiItems.length}
          />
        )}
      </div>

      {/* Rodapé Minimalista */}
      <footer className="border-t border-slate-200/70 dark:border-slate-800/80 py-5 text-center text-xs text-slate-400 dark:text-slate-500">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <Waves className="w-4 h-4 text-ocean-500" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Task de Viagem</span>
        </div>
        <p>Leeo e Marii</p>
      </footer>

      {/* Modal de Adição */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        onAdd={handleAddItem}
        initialAssignedTo={modalTargetPerson}
      />

      {/* Toast */}
      <Toast
        message={toastMessage}
        onClose={handleCloseToast}
      />
    </div>
  );
}

export default App;
