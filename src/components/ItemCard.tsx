import React, { useState } from 'react';
import { Check, Trash2, Edit3, CheckCircle, X, ArrowLeftRight } from 'lucide-react';
import { ChecklistItem, CategoryId, PersonAssignment } from '../types/checklist';
import { CATEGORIES, CATEGORY_MAP } from '../data/defaultItems';

interface ItemCardProps {
  item: ChecklistItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, newName: string, categoryId?: CategoryId, assignedTo?: PersonAssignment) => void;
  onReassign?: (id: string) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  item,
  onToggle,
  onRemove,
  onEdit,
  onReassign,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(item.name);
  const [editedCategory, setEditedCategory] = useState<CategoryId>(item.categoryId);
  const [editedAssignedTo, setEditedAssignedTo] = useState<PersonAssignment>(item.assignedTo);

  const category = CATEGORY_MAP[item.categoryId] ?? CATEGORIES[0];

  const startEditing = () => {
    setEditedName(item.name);
    setEditedCategory(item.categoryId);
    setEditedAssignedTo(item.assignedTo);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditedName(item.name);
    setEditedCategory(item.categoryId);
    setEditedAssignedTo(item.assignedTo);
    setIsEditing(false);
  };

  const handleSave = () => {
    if (editedName.trim()) {
      onEdit(item.id, editedName, editedCategory, editedAssignedTo);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  if (isEditing) {
    return (
      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-ocean-500 shadow-md flex flex-col gap-2.5 transition text-xs">
        <input
          type="text"
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          aria-label="Nome da tarefa"
          className="w-full px-3 py-2 text-base sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500/30"
          placeholder="Nome da tarefa"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={editedCategory}
            onChange={(e) => setEditedCategory(e.target.value as CategoryId)}
            aria-label="Categoria da tarefa"
            className="w-full px-2 py-2 sm:py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-base sm:text-xs"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={editedAssignedTo}
            onChange={(e) => setEditedAssignedTo(e.target.value as PersonAssignment)}
            aria-label="Responsável pela tarefa"
            className="w-full px-2 py-2 sm:py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-base sm:text-xs font-semibold"
          >
            <option value="leeo">Leeo</option>
            <option value="marii">Marii</option>
          </select>
        </div>
        <div className="flex justify-end gap-1.5 pt-1">
          <button
            type="button"
            onClick={cancelEditing}
            aria-label="Cancelar edição"
            className="px-3 py-2 sm:py-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg bg-slate-100 dark:bg-slate-800 min-h-[40px] sm:min-h-[32px] flex items-center justify-center"
          >
            <X className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-3.5 py-2 sm:py-1 text-xs text-white rounded-lg bg-ocean-600 hover:bg-ocean-700 flex items-center gap-1 font-medium min-h-[40px] sm:min-h-[32px]"
          >
            <CheckCircle className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            Salvar
          </button>
        </div>
      </div>
    );
  }

  const isLeeo = item.assignedTo === 'leeo';

  return (
    <div
      className={`group relative flex items-center justify-between p-2 sm:p-3 rounded-xl border transition-all duration-150 ${
        item.completed
          ? 'bg-slate-50/70 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/50 text-slate-400 dark:text-slate-500'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
      }`}
    >
      {/* Área Principal Clicável */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onToggle(item.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle(item.id);
          }
        }}
        aria-pressed={item.completed}
        className="flex items-center gap-2.5 flex-1 min-w-0 pr-1 cursor-pointer select-none active:opacity-75 min-h-[44px] sm:min-h-0"
      >
        {/* Checkbox */}
        <div
          className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors border shrink-0 ${
            item.completed
              ? isLeeo
                ? 'bg-sky-600 border-sky-600 text-white'
                : 'bg-violet-600 border-violet-600 text-white'
              : 'border-slate-300 dark:border-slate-600 hover:border-ocean-500 bg-white dark:bg-slate-800'
          }`}
        >
          {item.completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
        </div>

        {/* Textos */}
        <div className="min-w-0 flex-1">
          <p
            className={`text-xs sm:text-sm font-medium leading-tight break-words transition-all ${
              item.completed
                ? 'line-through text-slate-400 dark:text-slate-500'
                : 'text-slate-800 dark:text-slate-100'
            }`}
          >
            {item.name}
          </p>
          <span className="inline-block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            {category.label}
          </span>
        </div>
      </div>

      {/* Ações Rápidas com alvo de toque confortável */}
      <div className="flex items-center gap-0.5 shrink-0">
        {onReassign && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReassign(item.id);
            }}
            aria-label={isLeeo ? `Passar ${item.name} para Marii` : `Passar ${item.name} para Leeo`}
            title={isLeeo ? 'Passar tarefa para Marii' : 'Passar tarefa para Leeo'}
            className="min-w-[40px] min-h-[40px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center text-slate-400 hover:text-ocean-600 dark:hover:text-ocean-400 hover:bg-ocean-50 dark:hover:bg-ocean-950/40 rounded-lg transition"
          >
            <ArrowLeftRight className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            startEditing();
          }}
          aria-label={`Editar ${item.name}`}
          title="Editar tarefa"
          className="min-w-[40px] min-h-[40px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
        >
          <Edit3 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item.id);
          }}
          aria-label={`Remover ${item.name}`}
          title="Remover tarefa"
          className="min-w-[40px] min-h-[40px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
        >
          <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
        </button>
      </div>
    </div>
  );
};
