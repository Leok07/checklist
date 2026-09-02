import React, { useState } from 'react';
import { Check, Trash2, Edit3, CheckCircle, X, User } from 'lucide-react';
import { ChecklistItem, CategoryId, PersonAssignment } from '../types/checklist';
import { CATEGORIES } from '../data/defaultItems';

interface ItemCardProps {
  item: ChecklistItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, newName: string, categoryId?: CategoryId, assignedTo?: PersonAssignment) => void;
  onReassign?: (id: string, assignedTo: PersonAssignment) => void;
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
  const [editedAssignedTo, setEditedAssignedTo] = useState<PersonAssignment>(item.assignedTo || 'ambos');

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
      setEditedAssignedTo(item.assignedTo || 'ambos');
      setIsEditing(false);
    }
  };

  const cycleAssignedTo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onReassign) return;
    const next: Record<PersonAssignment, PersonAssignment> = {
      leeo: 'marii',
      marii: 'ambos',
      ambos: 'leeo',
    };
    onReassign(item.id, next[item.assignedTo || 'ambos']);
  };

  if (isEditing) {
    return (
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-ocean-500/50 dark:border-ocean-500/60 shadow-md flex flex-col gap-3 transition">
        <div className="flex flex-col gap-2.5">
          <input
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full px-3.5 py-2.5 text-base sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500/30 focus:border-ocean-600"
            placeholder="Nome do item"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              value={editedCategory}
              onChange={(e) => setEditedCategory(e.target.value as CategoryId)}
              className="w-full px-3 py-2 text-base sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500/30 focus:border-ocean-600"
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
              className="w-full px-3 py-2 text-base sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500/30 focus:border-ocean-600"
            >
              <option value="leeo">Lado do Leeo</option>
              <option value="marii">Lado da Marii</option>
              <option value="ambos">Ambos / Compartilhado</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={() => {
              setEditedName(item.name);
              setEditedAssignedTo(item.assignedTo || 'ambos');
              setIsEditing(false);
            }}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-1 min-h-[38px]"
          >
            <X className="w-3.5 h-3.5" />
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs font-medium text-white rounded-lg bg-ocean-600 hover:bg-ocean-700 transition flex items-center gap-1 min-h-[38px]"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Salvar
          </button>
        </div>
      </div>
    );
  }

  const assigned = item.assignedTo || 'ambos';

  return (
    <div
      className={`group relative flex items-center justify-between p-3 sm:p-4 rounded-xl border transition-all duration-150 ${
        item.completed
          ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 text-slate-400 dark:text-slate-500'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
      }`}
    >
      {/* Área Principal Clicável Touch-Friendly */}
      <div
        onClick={() => onToggle(item.id)}
        className="flex items-center gap-3 flex-1 min-w-0 pr-2 cursor-pointer select-none active:opacity-75"
      >
        {/* Checkbox */}
        <div className="w-10 h-10 -ml-1 flex items-center justify-center shrink-0">
          <div
            className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors border ${
              item.completed
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'border-slate-300 dark:border-slate-600 hover:border-ocean-500 bg-white dark:bg-slate-800'
            }`}
          >
            {item.completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
          </div>
        </div>

        {/* Textos */}
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm sm:text-base font-medium leading-snug break-words transition-all ${
              item.completed
                ? 'line-through text-slate-400 dark:text-slate-500'
                : 'text-slate-800 dark:text-slate-100'
            }`}
          >
            {item.name}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[11px] font-medium tracking-tight text-slate-400 dark:text-slate-500">
              {category.label}
            </span>

            {/* Badge de Atribuição (Leeo / Marii / Ambos) */}
            <button
              type="button"
              onClick={cycleAssignedTo}
              title="Clique para alternar entre Leeo, Marii e Ambos"
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md transition ${
                assigned === 'leeo'
                  ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100'
                  : assigned === 'marii'
                  ? 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 hover:bg-violet-100'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              <User className="w-2.5 h-2.5" />
              <span>
                {assigned === 'leeo' ? 'Leeo' : assigned === 'marii' ? 'Marii' : 'Ambos'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Ações (Editar e Deletar) */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          aria-label={`Editar ${item.name}`}
          title="Editar nome, categoria ou responsável"
          className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition min-w-[38px] min-h-[38px] flex items-center justify-center"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item.id);
          }}
          aria-label={`Remover ${item.name}`}
          title="Remover item do checklist"
          className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition min-w-[38px] min-h-[38px] flex items-center justify-center"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
