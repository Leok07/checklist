import React from 'react';
import { PackageOpen, Plus, SearchX } from 'lucide-react';

interface EmptyStateProps {
  isSearch: boolean;
  onClearSearch?: () => void;
  onOpenAddModal: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  isSearch,
  onClearSearch,
  onOpenAddModal,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-6 sm:p-10 text-center my-6 transition-colors">
      <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
        {isSearch ? <SearchX className="w-6 h-6" /> : <PackageOpen className="w-6 h-6" />}
      </div>
      <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">
        {isSearch ? 'Nenhum item encontrado' : 'Nenhum item nesta visualização'}
      </h4>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-5">
        {isSearch
          ? 'Tente pesquisar com outro termo ou limpe o campo de busca.'
          : 'Adicione novos itens ou alterne os filtros acima para visualizar sua bagagem.'}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
        {isSearch && onClearSearch && (
          <button
            onClick={onClearSearch}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition min-h-[44px] flex items-center justify-center"
          >
            Limpar busca
          </button>
        )}
        <button
          onClick={onOpenAddModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-white bg-ocean-600 hover:bg-ocean-700 rounded-xl transition shadow-sm shadow-ocean-500/20 min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          Adicionar item
        </button>
      </div>
    </div>
  );
};
