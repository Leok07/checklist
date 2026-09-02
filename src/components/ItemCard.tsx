import React, { useState } from 'react';
import { Check, Trash2, Edit3, CheckCircle, X, ArrowLeftRight } from 'lucide-react';
import { ChecklistItem, CategoryId, PersonAssignment } from '../types/checklist';
import { CATEGORIES } from '../data/defaultItems';

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

  const category = CATEGORIES.find((c) => c.id === item.categoryId) || CATEGORIES[0];

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
      setEditedName(item.name);
      setEditedCategory(item.categoryId);
      setEditedAssignedTo(item.assignedTo);
      setIsEditing(false);
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
          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500/30"
          placeholder="Nome do item"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={editedCategory}
            onChange={(e) => setEditedCategory(e.target.value as CategoryId)}
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs"
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
            className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg text-xs font-semibold"
          >
            <option value="leeo">Leeo</option>
            <option value="marii">Marii</option>
          </select>
        </div>
        <div className="flex justify-end gap-1.5 pt-1">
          <button
            onClick={() => {
              setEditedName(item.name);
              setEditedAssignedTo(item.assignedTo);
              setIsEditing(false);
            }}
            className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white rounded bg-slate-100 dark:bg-slate-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 text-xs text-white rounded bg-ocean-600 hover:bg-ocean-700 flex items-center gap-1 font-medium"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Salvar
          </button>
        </div>
      </div>
    );
  }

  const isLeeo = item.assignedTo === 'leeo';

  return (
    <div
      className={`group relative flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all duration-150 ${
        item.completed
          ? 'bg-slate-50/70 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/50 text-slate-400 dark:text-slate-500'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
      }`}
    >
      {/* Área Principal Clicável */}
      <div
        onClick={() => onToggle(item.id)}
        className="flex items-center gap-2.5 flex-1 min-w-0 pr-2 cursor-pointer select-none active:opacity-75"
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

      {/* Ações Rápidas */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* Botão de Transferir para o outro com 1 toque */}
        {onReassign && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReassign(item.id);
            }}
            title={isLeeo ? 'Passar item para a Marii' : 'Passar item para o Leeo'}
            className="p-1.5 text-slate-400 hover:text-ocean-600 dark:hover:text-ocean-400 hover:bg-ocean-50 dark:hover:bg-ocean-950/40 rounded-lg transition"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          title="Editar item"
          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item.id);
          }}
          title="Remover item"
          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
