import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import { CategoryId, FilterStatus } from '../types/checklist';
import { CATEGORIES } from '../data/defaultItems';

interface CategoryFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: FilterStatus;
  onStatusChange: (status: FilterStatus) => void;
  selectedCategory: CategoryId | 'all';
  onCategorySelect: (category: CategoryId | 'all') => void;
  categoryCounts: Record<string, number>;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  selectedCategory,
  onCategorySelect,
  categoryCounts,
}) => {
  return (
    <div className="space-y-3 sm:space-y-4 mb-6">
      {/* Busca e Seletor de Status */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
        {/* Input de Busca - text-base no mobile evita auto-zoom no Safari iOS */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Pesquisar item no checklist..."
            className="w-full pl-10 pr-10 py-2.5 sm:py-2 text-base sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-600 transition shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              aria-label="Limpar pesquisa"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Selector */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
          <button
            onClick={() => onStatusChange('all')}
            className={`flex-1 sm:flex-initial px-3.5 py-2 sm:py-1.5 text-xs font-semibold rounded-lg transition min-h-[38px] sm:min-h-0 flex items-center justify-center ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => onStatusChange('pending')}
            className={`flex-1 sm:flex-initial px-3.5 py-2 sm:py-1.5 text-xs font-semibold rounded-lg transition min-h-[38px] sm:min-h-0 flex items-center justify-center ${
              statusFilter === 'pending'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Pendentes
          </button>
          <button
            onClick={() => onStatusChange('completed')}
            className={`flex-1 sm:flex-initial px-3.5 py-2 sm:py-1.5 text-xs font-semibold rounded-lg transition min-h-[38px] sm:min-h-0 flex items-center justify-center ${
              statusFilter === 'completed'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Prontos
          </button>
        </div>
      </div>

      {/* Chips de Categorias com Scroll Suave no Mobile */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs touch-pan-x -mx-4 px-4 sm:mx-0 sm:px-0">
        <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1 font-medium pl-1 pr-1 shrink-0">
          <Filter className="w-3.5 h-3.5" />
          Categorias:
        </span>

        <button
          onClick={() => onCategorySelect('all')}
          className={`px-3 py-2 sm:py-1.5 rounded-lg font-medium transition shrink-0 flex items-center gap-1.5 min-h-[36px] ${
            selectedCategory === 'all'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <span>Todas</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
              selectedCategory === 'all'
                ? 'bg-slate-800 dark:bg-slate-200 text-slate-200 dark:text-slate-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}
          >
            {categoryCounts.all || 0}
          </span>
        </button>

        {CATEGORIES.map((cat) => {
          const count = categoryCounts[cat.id] || 0;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onCategorySelect(cat.id)}
              className={`px-3 py-2 sm:py-1.5 rounded-lg font-medium transition shrink-0 flex items-center gap-1.5 min-h-[36px] ${
                isSelected
                  ? 'bg-ocean-600 text-white shadow-sm shadow-ocean-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                  isSelected
                    ? 'bg-ocean-700 text-ocean-100'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
