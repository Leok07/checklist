import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Sparkles, User } from 'lucide-react';
import { CategoryId, PersonAssignment } from '../types/checklist';
import { CATEGORIES } from '../data/defaultItems';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, categoryId: CategoryId, assignedTo: PersonAssignment) => void;
  initialAssignedTo?: PersonAssignment;
}

const QUICK_SUGGESTIONS: { name: string; categoryId: CategoryId }[] = [
  { name: 'Óculos de sol', categoryId: 'praia' },
  { name: 'Chinelo ou sandália', categoryId: 'praia' },
  { name: 'Caixa térmica / cooler', categoryId: 'praticidade' },
  { name: 'Chapéu ou boné', categoryId: 'praia' },
  { name: 'Repelente', categoryId: 'saude_docs' },
  { name: 'Bateria portátil (Powerbank)', categoryId: 'praticidade' },
  { name: 'Kit de maquiagem / skincare', categoryId: 'higiene' },
  { name: 'Secador / prancha', categoryId: 'higiene' },
];

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  initialAssignedTo = 'leeo',
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CategoryId>('praia');
  const [assignedTo, setAssignedTo] = useState<PersonAssignment>(initialAssignedTo);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setCategory('praia');
      setAssignedTo('leeo');
      return;
    }

    setAssignedTo(initialAssignedTo);
    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, initialAssignedTo, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), category, assignedTo);
      setName('');
      onClose();
    }
  };

  // Mantém o responsável já selecionado pelo usuário ao clicar em uma sugestão rápida
  const handleSuggestionClick = (item: { name: string; categoryId: CategoryId }) => {
    setName(item.name);
    setCategory(item.categoryId);
    inputRef.current?.focus();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-task-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm transition-opacity"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 relative max-h-[90vh] overflow-y-auto"
      >
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800 mb-4 sm:mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-ocean-50 dark:bg-ocean-950 text-ocean-600 dark:text-ocean-400 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <h3
              id="add-task-modal-title"
              className="text-base sm:text-lg font-bold text-slate-900 dark:text-white"
            >
              Nova Task
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="task-name-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Nome da Task
            </label>
            <input
              id="task-name-input"
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Óculos de sol, Chinelo..."
              className="w-full px-3.5 py-3 sm:py-2.5 text-base sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean-500/20 focus:border-ocean-600 transition"
            />
          </div>

          {/* Quem vai levar? Apenas Leeo ou Marii */}
          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Quem vai levar?
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAssignedTo('leeo')}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-sm font-bold border transition min-h-[44px] ${
                  assignedTo === 'leeo'
                    ? 'bg-sky-600 text-white border-sky-600 shadow-sm shadow-sky-500/30'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sky-400'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Leeo</span>
              </button>

              <button
                type="button"
                onClick={() => setAssignedTo('marii')}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-sm font-bold border transition min-h-[44px] ${
                  assignedTo === 'marii'
                    ? 'bg-violet-600 text-white border-violet-600 shadow-sm shadow-violet-500/30'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-violet-400'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Marii</span>
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="task-category-select"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Categoria
            </label>
            <select
              id="task-category-select"
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

          {/* Sugestões Rápidas */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Sugestões rápidas:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {QUICK_SUGGESTIONS.map((sug) => (
                <button
                  type="button"
                  key={sug.name}
                  onClick={() => handleSuggestionClick(sug)}
                  className="px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-ocean-50 dark:hover:bg-ocean-950/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition active:scale-95"
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
              Adicionar Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
