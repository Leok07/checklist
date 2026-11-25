import { useState, useEffect, useCallback, useRef } from 'react';
import { ChecklistItem, PersonAssignment, TaskDraft } from '../types/checklist';
import { withTaskDefaults } from '../data/customization';
import { sortTasksDeterministic } from '../workers/taskProcessingCore';
import { scheduleIdleTask } from '../utils/idleScheduler';
import {
  isFirebaseConfigured,
  subscribeToTasks,
  addTaskAtomic,
  updateTaskCompletionAtomic,
  updateTaskFullAtomic,
  updateTaskOrderAndAssigneeAtomic,
  updateTaskQuantityAtomic,
  updateTaskSubtasksAtomic,
  batchUpdateCompletionAtomic,
  deleteTaskAtomic,
  clearAllTasksAtomic,
} from '../services/firebase';

const STORAGE_KEY = 'task_viagem_v5';
const LEGACY_STORAGE_KEYS = [
  'checklist_praia_itens_v1',
  'checklist_praia_itens_v2',
  'checklist_praia_itens_v3',
  'task_viagem_v4',
];

function computeTopOrder(list: ChecklistItem[], person: PersonAssignment): number {
  const personItems = list.filter((i) => i.assignedTo === person);
  if (personItems.length === 0) return 1000;
  let minOrder = personItems[0].order;
  for (let i = 1; i < personItems.length; i++) {
    if (personItems[i].order < minOrder) minOrder = personItems[i].order;
  }
  return minOrder - 1000;
}

function computeFractionalOrder(targetList: ChecklistItem[], targetIndex: number): number {
  if (targetList.length === 0) return 1000;
  if (targetIndex <= 0) return targetList[0].order - 1000;
  if (targetIndex >= targetList.length) return targetList[targetList.length - 1].order + 1000;
  const prev = targetList[targetIndex - 1].order;
  const next = targetList[targetIndex].order;
  if (Math.abs(next - prev) < 0.0001) {
    return prev + 0.00005;
  }
  return (prev + next) / 2;
}

export function useChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('task_viagem_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return sortTasksDeterministic(
            parsed
              .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'))
              .map((row) => withTaskDefaults(row))
              .filter((item) => item.name.length > 0)
          );
        }
      }
    } catch {
      // Ignora erro de leitura do storage
    }
    return [];
  });

  const itemsRef = useRef<ChecklistItem[]>(items);
  itemsRef.current = items;

  const lastDeletedRef = useRef<ChecklistItem | null>(null);
  const [pendingCloudOps, setPendingCloudOps] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(isFirebaseConfigured);
  const [cloudError, setCloudError] = useState<string | null>(null);

  const startCloudOp = useCallback(() => {
    setPendingCloudOps((count) => count + 1);
  }, []);

  const endCloudOp = useCallback(() => {
    setPendingCloudOps((count) => Math.max(0, count - 1));
  }, []);

  // Limpeza de chaves legadas em tempo ocioso (nunca trava frame de UI)
  useEffect(() => {
    return scheduleIdleTask(() => {
      try {
        LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
      } catch {
        // Ignora
      }
    });
  }, []);

  // Escuta atualizacoes da nuvem em tempo real
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

  // Persistencia local agendada em requestIdleCallback (zero stutter em gestos)
  useEffect(() => {
    const snapshot = items;
    return scheduleIdleTask(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } catch {
        // Ignora erro de quota
      }
    });
  }, [items]);

  // Adicionar tarefa customizada (atomico + rollback)
  const addItem = useCallback(
    async (draft: TaskDraft): Promise<ChecklistItem | null> => {
      const trimmed = draft.name.trim();
      if (!trimmed) return null;

      const now = Date.now();
      const newItem: ChecklistItem = {
        ...draft,
        id: `task-${now}-${Math.random().toString(36).substring(2, 7)}`,
        name: trimmed,
        note: draft.note.trim().slice(0, 180),
        quantity: Math.min(99, Math.max(1, Math.round(draft.quantity || 1))),
        completed: false,
        createdAt: now,
        order: computeTopOrder(itemsRef.current, draft.assignedTo),
      };

      setItems((prev) => sortTasksDeterministic([newItem, ...prev.filter((i) => i.id !== newItem.id)]));

      if (isFirebaseConfigured) {
        startCloudOp();
        const res = await addTaskAtomic(newItem);
        endCloudOp();
        if (!res.success) {
          setItems((prev) => prev.filter((i) => i.id !== newItem.id));
          setCloudError(res.error || 'Falha ao adicionar tarefa na nuvem.');
          return null;
        }
        setCloudError(null);
      }

      return newItem;
    },
    [startCloudOp, endCloudOp]
  );

  // Alternar conclusao (atomico + rollback)
  const toggleItem = useCallback(
    async (id: string): Promise<boolean> => {
      const current = itemsRef.current.find((item) => item.id === id);
      if (!current) return false;

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

      return targetCompleted;
    },
    [startCloudOp, endCloudOp]
  );

  // Atualizar todos os detalhes customizados da tarefa (atomico + rollback)
  const updateItemFull = useCallback(
    async (id: string, draft: TaskDraft): Promise<boolean> => {
      const trimmed = draft.name.trim();
      if (!trimmed) return false;

      const previousItem = itemsRef.current.find((item) => item.id === id);
      if (!previousItem) return false;

      const sanitizedDraft: TaskDraft = {
        ...draft,
        name: trimmed,
        note: draft.note.trim().slice(0, 180),
        quantity: Math.min(99, Math.max(1, Math.round(draft.quantity || 1))),
      };

      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...sanitizedDraft } : item))
      );

      if (isFirebaseConfigured) {
        startCloudOp();
        const res = await updateTaskFullAtomic(id, sanitizedDraft);
        endCloudOp();
        if (!res.success) {
          setItems((prev) => prev.map((item) => (item.id === id ? previousItem : item)));
          setCloudError(res.error || 'Falha ao salvar personalização na nuvem.');
          return false;
        }
        setCloudError(null);
      }

      return true;
    },
    [startCloudOp, endCloudOp]
  );

  // Mover entre Leeo/Marii e/ou reordenar verticalmente via indexacao fracionaria (1 doc atomico!)
  const moveOrReorderItem = useCallback(
    async (id: string, targetPerson: PersonAssignment, targetIndex: number): Promise<boolean> => {
      const current = itemsRef.current.find((item) => item.id === id);
      if (!current) return false;

      const othersInTarget = sortTasksDeterministic(
        itemsRef.current.filter((i) => i.assignedTo === targetPerson && i.id !== id)
      );
      const nextOrder = computeFractionalOrder(othersInTarget, targetIndex);

      if (current.assignedTo === targetPerson && Math.abs(current.order - nextOrder) < 0.00001) {
        return false;
      }

      const previousAssigned = current.assignedTo;
      const previousOrder = current.order;

      setItems((prev) =>
        sortTasksDeterministic(
          prev.map((item) =>
            item.id === id ? { ...item, assignedTo: targetPerson, order: nextOrder } : item
          )
        )
      );

      if (isFirebaseConfigured) {
        startCloudOp();
        const res = await updateTaskOrderAndAssigneeAtomic(id, targetPerson, nextOrder);
        endCloudOp();
        if (!res.success) {
          setItems((prev) =>
            sortTasksDeterministic(
              prev.map((item) =>
                item.id === id
                  ? { ...item, assignedTo: previousAssigned, order: previousOrder }
                  : item
              )
            )
          );
          setCloudError(res.error || 'Falha ao mover tarefa na nuvem.');
          return false;
        }
        setCloudError(null);
      }

      return true;
    },
    [startCloudOp, endCloudOp]
  );

  // Incrementar/decrementar quantidade rapido no card (atomico + rollback)
  const updateQuantity = useCallback(
    async (id: string, delta: number) => {
      const current = itemsRef.current.find((item) => item.id === id);
      if (!current) return;

      const previousQty = current.quantity;
      const nextQty = Math.min(99, Math.max(1, previousQty + delta));
      if (nextQty === previousQty) return;

      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, quantity: nextQty } : item))
      );

      if (isFirebaseConfigured) {
        startCloudOp();
        const res = await updateTaskQuantityAtomic(id, nextQty);
        endCloudOp();
        if (!res.success) {
          setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, quantity: previousQty } : item))
          );
          setCloudError(res.error || 'Falha ao atualizar quantidade na nuvem.');
        } else {
          setCloudError(null);
        }
      }
    },
    [startCloudOp, endCloudOp]
  );

  // Alternar sub-task interna direto no card (atomico + rollback)
  const toggleSubtask = useCallback(
    async (taskId: string, subtaskId: string) => {
      const current = itemsRef.current.find((item) => item.id === taskId);
      if (!current) return;

      const previousSubtasks = current.subtasks;
      const nextSubtasks = previousSubtasks.map((sub) =>
        sub.id === subtaskId ? { ...sub, done: !sub.done } : sub
      );

      setItems((prev) =>
        prev.map((item) => (item.id === taskId ? { ...item, subtasks: nextSubtasks } : item))
      );

      if (isFirebaseConfigured) {
        startCloudOp();
        const res = await updateTaskSubtasksAtomic(taskId, nextSubtasks);
        endCloudOp();
        if (!res.success) {
          setItems((prev) =>
            prev.map((item) => (item.id === taskId ? { ...item, subtasks: previousSubtasks } : item))
          );
          setCloudError(res.error || 'Falha ao atualizar sub-tarefa na nuvem.');
        } else {
          setCloudError(null);
        }
      }
    },
    [startCloudOp, endCloudOp]
  );

  // Remover tarefa (atomico + guarda backup para Undo)
  const removeItem = useCallback(
    async (id: string): Promise<ChecklistItem | null> => {
      const removedItem = itemsRef.current.find((item) => item.id === id);
      if (!removedItem) return null;

      lastDeletedRef.current = removedItem;
      setItems((prev) => prev.filter((item) => item.id !== id));

      if (isFirebaseConfigured) {
        startCloudOp();
        const res = await deleteTaskAtomic(id);
        endCloudOp();
        if (!res.success) {
          setItems((prev) => {
            if (prev.some((i) => i.id === removedItem.id)) return prev;
            return sortTasksDeterministic([removedItem, ...prev]);
          });
          setCloudError(res.error || 'Falha ao remover tarefa na nuvem.');
          return null;
        }
        setCloudError(null);
      }

      return removedItem;
    },
    [startCloudOp, endCloudOp]
  );

  // Desfazer ultima exclusao
  const undoLastDelete = useCallback(async () => {
    const item = lastDeletedRef.current;
    if (!item) return false;
    lastDeletedRef.current = null;

    setItems((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      return sortTasksDeterministic([item, ...prev]);
    });

    if (isFirebaseConfigured) {
      startCloudOp();
      const res = await addTaskAtomic(item);
      endCloudOp();
      if (!res.success) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        setCloudError(res.error || 'Falha ao restaurar tarefa na nuvem.');
        return false;
      }
      setCloudError(null);
    }

    return true;
  }, [startCloudOp, endCloudOp]);

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

  return {
    items,
    addItem,
    toggleItem,
    updateItemFull,
    moveOrReorderItem,
    updateQuantity,
    toggleSubtask,
    removeItem,
    undoLastDelete,
    checkAll,
    uncheckAll,
    clearAllTasks,
    isCloudConfigured: isFirebaseConfigured,
    isCloudSyncing: isInitialLoading || pendingCloudOps > 0,
    cloudError,
  };
}
