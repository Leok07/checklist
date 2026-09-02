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

const QUICK_SUGGESTIONS: { name: string; categoryId: CategoryId; assignedTo: PersonAssignment }[] = [
  { name: 'Óculos de sol', categoryId: 'praia', assignedTo: 'leeo' },
  { name: 'Chinelo ou sandália', categoryId: 'praia', assignedTo: 'marii' },
  { name: 'Caixa térmica / cooler', categoryId: 'praticidade', assignedTo: 'leeo' },
  { name: 'Chapéu ou boné', categoryId: 'praia', assignedTo: 'marii' },
  { name: 'Repelente', categoryId: 'saude_docs', assignedTo: 'leeo' },
  { name: 'Bateria portátil (Powerbank)', categoryId: 'praticidade', assignedTo: 'leeo' },
  { name: 'Kit de maquiagem / skincare', categoryId: 'higiene', assignedTo: 'marii' },
  { name: 'Secador / prancha', categoryId: 'higiene', assignedTo: 'marii' },
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
    if (isOpen) {
      setAssignedTo(initialAssignedTo);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setName('');
      setCategory('praia');
      setAssignedTo('leeo');
    }
  }, [isOpen, initialAssignedTo]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), category, assignedTo);
      setName('');
      onClose();
    }
  };

  const handleSuggestionClick = (item: { name: string; categoryId: CategoryId; assignedTo: PersonAssignment }) => {
    setName(item.name);
    setCategory(item.categoryId);
    setAssignedTo(item.assignedTo);
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 relative animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />

        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 dark:border-slate-800 mb-4 sm:mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-ocean-50 dark:bg-ocean-950 text-ocean-600 dark:text-ocean-400 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Adicionar Item
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

          {/* Quem vai levar? Apenas Leeo ou Marii */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Quem vai levar?
            </label>
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

          {/* Sugestões Rápidas */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Sugestões rápidas:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {QUICK_SUGGESTIONS.map((sug, idx) => (
                <button
                  type="button"
                  key={idx}
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
              Adicionar Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
