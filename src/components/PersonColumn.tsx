import React from 'react';
import { Plus } from 'lucide-react';
import { ChecklistItem, CategoryId, PersonAssignment } from '../types/checklist';
import { ItemCard } from './ItemCard';

interface PersonStats {
  total: number;
  completed: number;
  pending: number;
  progressPercent: number;
}

interface PersonColumnProps {
  person: PersonAssignment;
  name: string;
  emptyLabel: string;
  addPromptLabel: string;
  items: ChecklistItem[];
  stats: PersonStats;
  onAdd: (person: PersonAssignment) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, newName: string, categoryId?: CategoryId, assignedTo?: PersonAssignment) => void;
  onReassign: (id: string) => void;
}

const ACCENT_STYLES: Record<
  PersonAssignment,
  {
    title: string;
    badge: string;
    addButton: string;
    track: string;
    bar: string;
    percent: string;
    emptyLink: string;
  }
> = {
  leeo: {
    title: 'text-sky-700 dark:text-sky-400',
    badge: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    addButton: 'bg-sky-600 hover:bg-sky-700 shadow-sky-500/20',
    track: 'bg-sky-100 dark:bg-sky-950',
    bar: 'bg-sky-500',
    percent: 'text-sky-700 dark:text-sky-400',
    emptyLink: 'text-sky-600 dark:text-sky-400',
  },
  marii: {
    title: 'text-violet-700 dark:text-violet-400',
    badge: 'bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800',
    addButton: 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/20',
    track: 'bg-violet-100 dark:bg-violet-950',
    bar: 'bg-violet-500',
    percent: 'text-violet-700 dark:text-violet-400',
    emptyLink: 'text-violet-600 dark:text-violet-400',
  },
};

export const PersonColumn: React.FC<PersonColumnProps> = ({
  person,
  name,
  emptyLabel,
  addPromptLabel,
  items,
  stats,
  onAdd,
  onToggle,
  onRemove,
  onEdit,
  onReassign,
}) => {
  const styles = ACCENT_STYLES[person];

  return (
    <section className="p-4 sm:p-5 flex flex-col min-h-[300px]">
      {/* Cabeçalho da Coluna */}
      <div className="pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className={`text-xl sm:text-2xl font-bold tracking-tight ${styles.title}`}>
              {name}
            </h2>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${styles.badge}`}>
              {stats.completed}/{stats.total} tarefas
            </span>
          </div>
          <button
            type="button"
            onClick={() => onAdd(person)}
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white active:scale-95 rounded-xl transition shadow-sm min-h-[38px] ${styles.addButton}`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar</span>
          </button>
        </div>

        {/* Barra de Progresso */}
        <div className="flex items-center gap-2">
          <div className={`flex-1 h-2 rounded-full overflow-hidden ${styles.track}`}>
            <div
              className={`h-full transition-all duration-300 rounded-full ${styles.bar}`}
              style={{ width: `${stats.progressPercent}%` }}
            />
          </div>
          <span className={`text-xs font-bold shrink-0 ${styles.percent}`}>
            {stats.progressPercent}%
          </span>
        </div>
      </div>

      {/* Lista de Tarefas */}
      <div className="space-y-2 flex-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
            <p className="text-xs">{emptyLabel}</p>
            <button
              type="button"
              onClick={() => onAdd(person)}
              className={`text-xs font-semibold hover:underline py-1 ${styles.emptyLink}`}
            >
              {addPromptLabel}
            </button>
          </div>
        ) : (
          items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onToggle={onToggle}
              onRemove={onRemove}
              onEdit={onEdit}
              onReassign={onReassign}
            />
          ))
        )}
      </div>
    </section>
  );
};
