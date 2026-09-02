import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Sparkles } from 'lucide-react';
import { CategoryId } from '../types/checklist';
import { CATEGORIES } from '../data/defaultItems';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, categoryId: CategoryId) => void;
}

const QUICK_SUGGESTIONS: { name: string; categoryId: CategoryId }[] = [
  { name: 'Óculos de sol', categoryId: 'praia' },
  { name: 'Chinelo ou sandália', categoryId: 'praia' },
  { name: 'Caixa térmica / cooler', categoryId: 'praticidade' },
  { name: 'Chapéu ou boné', categoryId: 'praia' },
  { name: 'Repelente', categoryId: 'saude_docs' },
  { name: 'Bateria portátil (Powerbank)', categoryId: 'praticidade' },
  { name: 'Kit primeiros socorros', categoryId: 'saude_docs' },
  { name: 'Saco impermeável', categoryId: 'praticidade' },
];

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CategoryId>('praia');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setName('');
      setCategory('praia');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), category);
      setName('');
      onClose();
    }
  };

  const handleSuggestionClick = (item: { name: string; categoryId: CategoryId }) => {
    setName(item.name);
    setCategory(item.categoryId);
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Container - Bottom Sheet no Mobile, Modal Centralizado no Desktop */}
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 relative animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Indicador de arraste no mobile */}
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800 mb-4 sm:mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-ocean-50 dark:bg-ocean-950 text-ocean-600 dark:text-ocean-400 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Adicionar Novo Item
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar modal"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Nome do Item
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Óculos de sol, Chinelo..."
              className="w-full px-3.5 py-3 sm:py-2.5 text-base sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-600 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryId)}
              className="w-full px-3.5 py-3 sm:py-2.5 text-base sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-600 transition"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sugestões Rápidas Touch-Friendly */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Sugestões rápidas para praia:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
              {QUICK_SUGGESTIONS.map((sug, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleSuggestionClick(sug)}
                  className="px-3 py-2 sm:py-1 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-ocean-50 dark:hover:bg-ocean-950/60 hover:text-ocean-700 dark:hover:text-ocean-300 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition active:scale-95"
                >
                  + {sug.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-3 sm:py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 sm:flex-initial px-5 py-3 sm:py-2 text-sm font-medium text-white bg-ocean-600 rounded-xl hover:bg-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm shadow-ocean-500/20 min-h-[44px]"
            >
              Adicionar Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
