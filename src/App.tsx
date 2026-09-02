import { useState, useMemo } from 'react';
import { useChecklist } from './hooks/useChecklist';
import { useTheme } from './hooks/useTheme';
import { CategoryId, FilterStatus } from './types/checklist';
import { CATEGORIES } from './data/defaultItems';
import { Header } from './components/Header';
import { ProgressBar } from './components/ProgressBar';
import { CategoryFilter } from './components/CategoryFilter';
import { ItemCard } from './components/ItemCard';
import { AddItemModal } from './components/AddItemModal';
import { ActionToolbar } from './components/ActionToolbar';
import { EmptyState } from './components/EmptyState';
import { Toast } from './components/Toast';
import { Waves, Plus } from 'lucide-react';

export function App() {
  const {
    items,
    addItem,
    toggleItem,
    removeItem,
    editItem,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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

  // Itens filtrados
  const filteredItems = useMemo(() => {
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
        if (!matchesName && !matchesCategory) {
          return false;
        }
      }

      return true;
    });
  }, [items, selectedCategory, statusFilter, searchQuery]);

  // Ações de usuário
  const handleAddItem = (name: string, categoryId: CategoryId) => {
    const success = addItem(name, categoryId);
    if (success) {
      showToast(`Item "${name}" adicionado com sucesso.`);
    }
  };

  const handleCopyList = async () => {
    const text = exportAsText();
    try {
      await navigator.clipboard.writeText(text);
      showToast('Lista copiada para a área de transferência.');
    } catch {
      // Fallback simples
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast('Lista copiada com sucesso.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F17] text-slate-800 dark:text-slate-100 flex flex-col justify-between transition-colors duration-200 selection:bg-ocean-500 selection:text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full pb-24 sm:pb-16">
        {/* Cabeçalho */}
        <Header
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onCopyList={handleCopyList}
          theme={theme}
          onToggleTheme={toggleTheme}
          isCloudConfigured={isCloudConfigured}
          isCloudSyncing={isCloudSyncing}
          cloudError={cloudError}
          onForceSync={forceSyncToCloud}
        />

        {/* Barra de Progresso e Métricas */}
        <ProgressBar
          total={stats.total}
          completed={stats.completed}
          pending={stats.pending}
          percent={stats.progressPercent}
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

        {/* Lista de Itens */}
        <main className="space-y-5 sm:space-y-6">
          {filteredItems.length === 0 ? (
            <EmptyState
              isSearch={Boolean(searchQuery.trim())}
              onClearSearch={() => setSearchQuery('')}
              onOpenAddModal={() => setIsAddModalOpen(true)}
            />
          ) : selectedCategory === 'all' && !searchQuery.trim() ? (
            // Agrupado por Categorias quando não há pesquisa ativa
            CATEGORIES.map((cat) => {
              const itemsInCat = filteredItems.filter((i) => i.categoryId === cat.id);
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
                      />
                    ))}
                  </div>
                </section>
              );
            })
          ) : (
            // Lista direta quando filtrado por categoria ou na busca
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              {filteredItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onToggle={toggleItem}
                  onRemove={removeItem}
                  onEdit={editItem}
                />
              ))}
            </div>
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
              filteredCount={filteredItems.length}
            />
          </div>
        )}
      </div>

      {/* Botão Flutuante Rápido no Mobile (FAB) para Adicionar Item com 1 Toque */}
      <div className="sm:hidden fixed bottom-5 right-5 z-40">
        <button
          onClick={() => setIsAddModalOpen(true)}
          aria-label="Adicionar novo item"
          className="w-14 h-14 rounded-full bg-ocean-600 text-white flex items-center justify-center shadow-xl shadow-ocean-600/40 active:scale-95 transition"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Rodapé Minimalista */}
      <footer className="border-t border-slate-200/70 dark:border-slate-800/80 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Waves className="w-4 h-4 text-ocean-500" />
          <span className="font-semibold text-slate-600 dark:text-slate-300">Checklist de Praia</span>
        </div>
        <p>Pronto para publicação na Vercel via GitHub. Dados salvos localmente.</p>
      </footer>

      {/* Modal de Adição */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddItem}
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
