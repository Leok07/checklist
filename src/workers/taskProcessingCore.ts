import {
  BagLocation,
  CategoryId,
  ChecklistItem,
  ChecklistStats,
  FilterStatus,
  TaskPriority,
} from '../types/checklist';
import { CATEGORY_MAP } from '../data/defaultItems';

export interface TaskFilterCriteria {
  query: string;
  status: FilterStatus;
  category: CategoryId | 'all';
  priority: TaskPriority | 'all';
  bag: BagLocation | 'all';
}

const BAG_LABELS: Record<BagLocation, string> = {
  mala: 'Mala',
  mochila: 'Mochila',
  mao: 'Mao',
  carro: 'Carro',
  necessaire: 'Necessaire',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  normal: '',
  essential: 'ESSENCIAL',
  urgent: 'URGENTE',
};

export function sortTasksDeterministic(list: ChecklistItem[]): ChecklistItem[] {
  return [...list].sort(
    (a, b) => a.order - b.order || b.createdAt - a.createdAt || a.id.localeCompare(b.id)
  );
}

export function computeTaskStats(items: ChecklistItem[]): ChecklistStats {
  let total = 0;
  let completed = 0;
  let totalUnits = 0;

  let leeoTotal = 0;
  let leeoCompleted = 0;
  let leeoUnits = 0;
  let leeoUrgent = 0;

  let mariiTotal = 0;
  let mariiCompleted = 0;
  let mariiUnits = 0;
  let mariiUrgent = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const qty = item.quantity || 1;
    total++;
    totalUnits += qty;
    if (item.completed) completed++;

    if (item.assignedTo === 'leeo') {
      leeoTotal++;
      leeoUnits += qty;
      if (item.completed) leeoCompleted++;
      else if (item.priority === 'urgent') leeoUrgent++;
    } else {
      mariiTotal++;
      mariiUnits += qty;
      if (item.completed) mariiCompleted++;
      else if (item.priority === 'urgent') mariiUrgent++;
    }
  }

  return {
    total,
    completed,
    pending: total - completed,
    progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
    totalUnits,
    leeo: {
      total: leeoTotal,
      completed: leeoCompleted,
      pending: leeoTotal - leeoCompleted,
      progressPercent: leeoTotal > 0 ? Math.round((leeoCompleted / leeoTotal) * 100) : 0,
      totalUnits: leeoUnits,
      urgentPending: leeoUrgent,
    },
    marii: {
      total: mariiTotal,
      completed: mariiCompleted,
      pending: mariiTotal - mariiCompleted,
      progressPercent: mariiTotal > 0 ? Math.round((mariiCompleted / mariiTotal) * 100) : 0,
      totalUnits: mariiUnits,
      urgentPending: mariiUrgent,
    },
  };
}

export function filterAndPartitionTasks(
  items: ChecklistItem[],
  criteria: TaskFilterCriteria
): { leeoItems: ChecklistItem[]; mariiItems: ChecklistItem[] } {
  const q = criteria.query.toLowerCase().trim();
  const leeoItems: ChecklistItem[] = [];
  const mariiItems: ChecklistItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (criteria.category !== 'all' && item.categoryId !== criteria.category) continue;
    if (criteria.status === 'pending' && item.completed) continue;
    if (criteria.status === 'completed' && !item.completed) continue;
    if (criteria.priority !== 'all' && item.priority !== criteria.priority) continue;
    if (criteria.bag !== 'all' && item.bag !== criteria.bag) continue;

    if (q) {
      const catLabel = CATEGORY_MAP[item.categoryId]?.label.toLowerCase() || '';
      const bagLabel = (BAG_LABELS[item.bag] || '').toLowerCase();
      const matchesName = item.name.toLowerCase().includes(q);
      const matchesNote = item.note ? item.note.toLowerCase().includes(q) : false;
      const matchesTag = item.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchesName && !matchesNote && !matchesTag && !catLabel.includes(q) && !bagLabel.includes(q)) {
        continue;
      }
    }

    if (item.assignedTo === 'leeo') {
      leeoItems.push(item);
    } else {
      mariiItems.push(item);
    }
  }

  return { leeoItems, mariiItems };
}

export function buildExportText(items: ChecklistItem[], stats: ChecklistStats): string {
  const lines: string[] = [];
  lines.push('TASK DE VIAGEM - LEEO E MARII');
  lines.push(
    `Progresso: ${stats.completed}/${stats.total} tarefas (${stats.progressPercent}%) | ${stats.totalUnits} unidades`
  );
  lines.push('----------------------------------------');

  const pushPersonSection = (title: string, person: 'leeo' | 'marii', personStats: ChecklistStats['leeo']) => {
    lines.push('');
    lines.push(`[ ${title} - ${personStats.completed}/${personStats.total} prontas (${personStats.progressPercent}%) ]`);
    const list = items.filter((i) => i.assignedTo === person);
    if (list.length === 0) {
      lines.push('(Nenhuma tarefa)');
      return;
    }

    list.forEach((item) => {
      const mark = item.completed ? '[X]' : '[ ]';
      const qty = item.quantity > 1 ? ` x${item.quantity}` : '';
      const prio = PRIORITY_LABELS[item.priority] ? ` [${PRIORITY_LABELS[item.priority]}]` : '';
      const bag = BAG_LABELS[item.bag] ? ` | ${BAG_LABELS[item.bag]}` : '';
      const tags = item.tags.length > 0 ? ` (${item.tags.map((t) => `#${t}`).join(' ')})` : '';
      lines.push(`${mark} ${item.name}${qty}${prio}${bag}${tags}`);

      if (item.note) {
        lines.push(`    Nota: ${item.note}`);
      }
      if (item.subtasks.length > 0) {
        item.subtasks.forEach((sub) => {
          lines.push(`    ${sub.done ? '[x]' : '[ ]'} ${sub.text}`);
        });
      }
    });
  };

  pushPersonSection('LEEO', 'leeo', stats.leeo);
  pushPersonSection('MARII', 'marii', stats.marii);

  lines.push('');
  lines.push('----------------------------------------');
  lines.push('Gerado pelo Task de Viagem');
  return lines.join('\n');
}
