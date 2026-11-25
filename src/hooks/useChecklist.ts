import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChecklistItem, CategoryId, PersonAssignment } from '../types/checklist';
import { CATEGORY_MAP } from '../data/defaultItems';
import {
  isFirebaseConfigured,
  subscribeToTasks,
  addTaskAtomic,
  updateTaskCompletionAtomic,
  batchUpdateCompletionAtomic,
  updateTaskDetailsAtomic,
  reassignTaskAtomic,
  deleteTaskAtomic,
  clearAllTasksAtomic,
} from '../services/firebase';

const STORAGE_KEY = 'task_viagem_v4';
const LEGACY_STORAGE_KEYS = [
  'checklist_praia_itens_v1',
  'checklist_praia_itens_v2',
  'checklist_praia_itens_v3',
];

export function useChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Ignora erro de leitura do storage
    }
    return [];
  });

  // Referência sempre atualizada para leitura síncrona segura fora de updaters do React 18
  const itemsRef = useRef<ChecklistItem[]>(items);
  itemsRef.current = items;

  const [pendingCloudOps, setPendingCloudOps] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(isFirebaseConfigured);
  const [cloudError, setCloudError] = useState<string | null>(null);

  const startCloudOp = useCallback(() => {
    setPendingCloudOps((count) => count + 1);
  }, []);

  const endCloudOp = useCallback(() => {
    setPendingCloudOps((count) => Math.max(0, count - 1));
  }, []);

  // Limpeza de chaves antigas dentro de useEffect (evita side-effect no escopo do módulo)
  useEffect(() => {
    try {
      LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Ignora
    }
  }, []);

  // Escuta atualizações da nuvem em tempo real (cada tarefa é um documento isolado)
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const unsubscribe = subscribeToTasks(
      (cloudItems) => {
        setItems(cloudItems);
        setIsInitialLoading(false);
        setCloudError(null);
      },
      (errMsg) => {
        setIsInitialLoading(false);
        setCloudError(errMsg);
      }
    );

    return () => unsubscribe();
  }, []);

  // Única fonte de escrita no localStorage como cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignora erro de quota
    }
  }, [items]);

  // Adicionar tarefa (atômico com rollback em erro)
  const addItem = useCallback(
    async (name: string, categoryId: CategoryId = 'geral', assignedTo: PersonAssignment = 'leeo') => {
      const trimmed = name.trim();
      if (!trimmed) return false;

      const newItem: ChecklistItem = {
        id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: trimmed,
        categoryId,
        assignedTo,
        completed: false,
        createdAt: Date.now(),
      };

      setItems((prev) => [newItem, ...prev.filter((i) => i.id !== newItem.id)]);

      if (isFirebaseConfigured) {
        startCloudOp();
        const res = await addTaskAtomic(newItem);
        endCloudOp();
        if (!res.success) {
          setItems((prev) => prev.filter((i) => i.id !== newItem.id));
          setCloudError(res.error || 'Falha ao adicionar tarefa na nuvem.');
          return false;
        }
        setCloudError(null);
      }

      return true;
    },
    [startCloudOp, endCloudOp]
  );

  // Alternar conclusão (leitura síncrona via ref + atualização atômica + rollback)
  const toggleItem = useCallback(
    async (id: string) => {
      const current = itemsRef.current.find((item) => item.id === id);
      if (!current) return;

      const previousCompleted = current.completed;
      const targetCompleted = !previousCompleted;

      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, completed: targetCompleted } : item
        )
      );

      if (isFirebaseConfigured) {
        startCloudOp();
        const res = await updateTaskCompletionAtomic(id, targetCompleted);
        endCloudOp();
        if (!res.success) {
          setItems((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, completed: previousCompleted } : item
            )
          );
          setCloudError(res.error || 'Falha ao atualizar tarefa na nuvem.');
        } else {
          setCloudError(null);
        }
      }
    },
    [startCloudOp, endCloudOp]
  );

  // Remover tarefa (atômico com rollback)
  const removeItem = useCallback(
    async (id: string) => {
      const removedItem = itemsRef.current.find((item) => item.id === id);
      if (!removedItem) return;

      setItems((prev) => prev.filter((item) => item.id !== id));

      if (isFirebaseConfigured) {
        startCloudOp();
        const res = await deleteTaskAtomic(id);
        endCloudOp();
        if (!res.success) {
          setItems((prev) => {
            if (prev.some((i) => i.id === removedItem.id)) return prev;
            return [removedItem, ...prev].sort(
              (a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id)
            );
          });
          setCloudError(res.error || 'Falha ao remover tarefa na nuvem.');
        } else {
          setCloudError(null);
        }
      }
    },
    [startCloudOp, endCloudOp]
  );

  // Editar tarefa (leitura síncrona via ref + atualização atômica + rollback)
  const editItem = useCallback(
    async (id: string, newName: string, newCategory?: CategoryId, newAssignedTo?: PersonAssignment) => {
      const trimmed = newName.trim();
      if (!trimmed) return false;

      const previousItem = itemsRef.current.find((item) => item.id === id);
      if (!previousItem) return false;

      const finalCat: CategoryId = newCategory ?? previousItem.categoryId;
      const finalAssigned: PersonAssignment = newAssignedTo ?? previousItem.assignedTo;

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, name: trimmed, categoryId: finalCat, assignedTo: finalAssigned }
            : item
        )
      );

      if (isFirebaseConfigured) {
        startCloudOp();
        const res = await updateTaskDetailsAtomic(id, trimmed, finalCat, finalAssigned);
        endCloudOp();
        if (!res.success) {
          setItems((prev) =>
            prev.map((item) => (item.id === id ? previousItem : item))
          );
          setCloudError(res.error || 'Falha ao salvar edição na nuvem.');
          return false;
        }
        setCloudError(null);
      }

      return true;
    },
    [startCloudOp, endCloudOp]
  );

  // Transferir tarefa para a outra pessoa com 1 toque (leitura síncrona via ref + rollback)
  const reassignItem = useCallback(
    async (id: string) => {
      const current = itemsRef.current.find((item) => item.id === id);
      if (!current) return;

      const previousAssigned = current.assignedTo;
      const nextAssigned: PersonAssignment = previousAssigned === 'leeo' ? 'marii' : 'leeo';

      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, assignedTo: nextAssigned } : item
        )
      );

      if (isFirebaseConfigured) {
        startCloudOp();
        const res = await reassignTaskAtomic(id, nextAssigned);
        endCloudOp();
        if (!res.success) {
          setItems((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, assignedTo: previousAssigned } : item
            )
          );
          setCloudError(res.error || 'Falha ao transferir tarefa na nuvem.');
        } else {
          setCloudError(null);
        }
      }
    },
    [startCloudOp, endCloudOp]
  );

  // Marcar todas em lote (writeBatch + rollback)
  const checkAll = useCallback(
    async (person?: PersonAssignment) => {
      const snapshot = itemsRef.current;
      const toUpdateIds = snapshot
        .filter((i) => (!person || i.assignedTo === person) && !i.completed)
        .map((i) => i.id);

      if (toUpdateIds.length === 0) return;
      const idSet = new Set(toUpdateIds);

      setItems((prev) =>
        prev.map((item) => (idSet.has(item.id) ? { ...item, completed: true } : item))
      );

      if (isFirebaseConfigured) {
        startCloudOp();
        const res = await batchUpdateCompletionAtomic(toUpdateIds, true);
        endCloudOp();
        if (!res.success) {
          setItems((prev) =>
            prev.map((item) => (idSet.has(item.id) ? { ...item, completed: false } : item))
          );
          setCloudError(res.error || 'Falha ao marcar tarefas na nuvem.');
        } else {
          setCloudError(null);
        }
      }
    },
    [startCloudOp, endCloudOp]
  );

  // Desmarcar todas em lote (writeBatch + rollback)
  const uncheckAll = useCallback(
    async (person?: PersonAssignment) => {
      const snapshot = itemsRef.current;
      const toUpdateIds = snapshot
        .filter((i) => (!person || i.assignedTo === person) && i.completed)
        .map((i) => i.id);

      if (toUpdateIds.length === 0) return;
      const idSet = new Set(toUpdateIds);

      setItems((prev) =>
        prev.map((item) => (idSet.has(item.id) ? { ...item, completed: false } : item))
      );

      if (isFirebaseConfigured) {
        startCloudOp();
        const res = await batchUpdateCompletionAtomic(toUpdateIds, false);
        endCloudOp();
        if (!res.success) {
          setItems((prev) =>
            prev.map((item) => (idSet.has(item.id) ? { ...item, completed: true } : item))
          );
          setCloudError(res.error || 'Falha ao desmarcar tarefas na nuvem.');
        } else {
          setCloudError(null);
        }
      }
    },
    [startCloudOp, endCloudOp]
  );

  // Limpar todas as tarefas em lote (writeBatch fatiado + rollback)
  const clearAllTasks = useCallback(async () => {
    const snapshot = itemsRef.current;
    const ids = snapshot.map((i) => i.id);
    if (ids.length === 0) return;

    setItems([]);

    if (isFirebaseConfigured) {
      startCloudOp();
      const res = await clearAllTasksAtomic(ids);
      endCloudOp();
      if (!res.success) {
        setItems(snapshot);
        setCloudError(res.error || 'Falha ao limpar tarefas na nuvem.');
      } else {
        setCloudError(null);
      }
    }
  }, [startCloudOp, endCloudOp]);

  // Estatísticas
  const stats = useMemo(() => {
    const total = items.length;
    const completed = items.filter((i) => i.completed).length;
    const pending = total - completed;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const leeoItems = items.filter((i) => i.assignedTo === 'leeo');
    const leeoCompleted = leeoItems.filter((i) => i.completed).length;
    const leeoPending = leeoItems.length - leeoCompleted;
    const leeoPercent = leeoItems.length > 0 ? Math.round((leeoCompleted / leeoItems.length) * 100) : 0;

    const mariiItems = items.filter((i) => i.assignedTo === 'marii');
    const mariiCompleted = mariiItems.filter((i) => i.completed).length;
    const mariiPending = mariiItems.length - mariiCompleted;
    const mariiPercent = mariiItems.length > 0 ? Math.round((mariiCompleted / mariiItems.length) * 100) : 0;

    return {
      total,
      completed,
      pending,
      progressPercent,
      leeo: {
        total: leeoItems.length,
        completed: leeoCompleted,
        pending: leeoPending,
        progressPercent: leeoPercent,
      },
      marii: {
        total: mariiItems.length,
        completed: mariiCompleted,
        pending: mariiPending,
        progressPercent: mariiPercent,
      },
    };
  }, [items]);

  // Exportação limpa
  const exportAsText = useCallback(() => {
    const lines: string[] = [];
    lines.push('TASK DE VIAGEM - LEEO E MARII');
    lines.push(`Total: ${stats.completed}/${stats.total} tarefas concluídas (${stats.progressPercent}%)`);
    lines.push('----------------------------------------');

    lines.push('');
    lines.push(`[ LEEO - ${stats.leeo.completed}/${stats.leeo.total} prontas (${stats.leeo.progressPercent}%) ]`);
    const leeoItems = items.filter((i) => i.assignedTo === 'leeo');
    if (leeoItems.length === 0) {
      lines.push('(Nenhuma tarefa)');
    } else {
      leeoItems.forEach((item) => {
        const mark = item.completed ? '[X]' : '[ ]';
        const cat = CATEGORY_MAP[item.categoryId]?.label || '';
        lines.push(`${mark} ${item.name} (${cat})`);
      });
    }

    lines.push('');
    lines.push(`[ MARII - ${stats.marii.completed}/${stats.marii.total} prontas (${stats.marii.progressPercent}%) ]`);
    const mariiItems = items.filter((i) => i.assignedTo === 'marii');
    if (mariiItems.length === 0) {
      lines.push('(Nenhuma tarefa)');
    } else {
      mariiItems.forEach((item) => {
        const mark = item.completed ? '[X]' : '[ ]';
        const cat = CATEGORY_MAP[item.categoryId]?.label || '';
        lines.push(`${mark} ${item.name} (${cat})`);
      });
    }

    lines.push('');
    lines.push('----------------------------------------');
    lines.push('Gerado pelo Task de Viagem');

    return lines.join('\n');
  }, [items, stats]);

  return {
    items,
    addItem,
    toggleItem,
    removeItem,
    editItem,
    reassignItem,
    checkAll,
    uncheckAll,
    clearAllTasks,
    exportAsText,
    stats,
    isCloudConfigured: isFirebaseConfigured,
    isCloudSyncing: isInitialLoading || pendingCloudOps > 0,
    cloudError,
  };
}
