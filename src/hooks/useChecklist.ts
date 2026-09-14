import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChecklistItem, CategoryId, PersonAssignment } from '../types/checklist';
import { CATEGORIES } from '../data/defaultItems';
import {
  isFirebaseConfigured,
  subscribeToTasks,
  addTaskAtomic,
  updateTaskCompletionAtomic,
  updateTaskDetailsAtomic,
  reassignTaskAtomic,
  deleteTaskAtomic,
  clearAllTasksAtomic,
} from '../services/firebase';

const STORAGE_KEY = 'task_viagem_v4';

// Limpeza de chaves antigas para garantir que presets antigos não reapareçam
try {
  localStorage.removeItem('checklist_praia_itens_v1');
  localStorage.removeItem('checklist_praia_itens_v2');
  localStorage.removeItem('checklist_praia_itens_v3');
} catch {
  // Ignora
}

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
      // Ignora erro
    }
    return [];
  });

  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // Escuta atualizações da nuvem em tempo real (cada tarefa é um documento isolado)
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    setIsCloudSyncing(true);
    const unsubscribe = subscribeToTasks(
      (cloudItems) => {
        setItems(cloudItems);
        setIsCloudSyncing(false);
        setCloudError(null);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudItems));
        } catch {
          // Ignora
        }
      },
      (errMsg) => {
        setIsCloudSyncing(false);
        setCloudError(errMsg);
      }
    );

    return () => unsubscribe();
  }, []);

  // Salva no localStorage local como cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignora
    }
  }, [items]);

  // Adicionar tarefa (atômico)
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

      // Atualização otimista
      setItems((prev) => [newItem, ...prev.filter((i) => i.id !== newItem.id)]);

      if (isFirebaseConfigured) {
        setIsCloudSyncing(true);
        const res = await addTaskAtomic(newItem);
        setIsCloudSyncing(false);
        if (!res.success && res.error) {
          setCloudError(res.error);
        }
      }

      return true;
    },
    []
  );

  // Alternar conclusão (atômico - não altera nada do outro usuário)
  const toggleItem = useCallback(
    async (id: string) => {
      let targetCompleted = false;

      // Atualização otimista
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            targetCompleted = !item.completed;
            return { ...item, completed: targetCompleted };
          }
          return item;
        })
      );

      if (isFirebaseConfigured) {
        setIsCloudSyncing(true);
        const res = await updateTaskCompletionAtomic(id, targetCompleted);
        setIsCloudSyncing(false);
        if (!res.success && res.error) {
          setCloudError(res.error);
        }
      }
    },
    []
  );

  // Remover tarefa (atômico)
  const removeItem = useCallback(
    async (id: string) => {
      // Atualização otimista
      setItems((prev) => prev.filter((item) => item.id !== id));

      if (isFirebaseConfigured) {
        setIsCloudSyncing(true);
        const res = await deleteTaskAtomic(id);
        setIsCloudSyncing(false);
        if (!res.success && res.error) {
          setCloudError(res.error);
        }
      }
    },
    []
  );

  // Editar tarefa (atômico)
  const editItem = useCallback(
    async (id: string, newName: string, newCategory?: CategoryId, newAssignedTo?: PersonAssignment) => {
      const trimmed = newName.trim();
      if (!trimmed) return false;

      let finalCat: CategoryId = 'geral';
      let finalAssigned: PersonAssignment = 'leeo';

      setItems((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            finalCat = newCategory || item.categoryId;
            finalAssigned = newAssignedTo || item.assignedTo;
            return {
              ...item,
              name: trimmed,
              categoryId: finalCat,
              assignedTo: finalAssigned,
            };
          }
          return item;
        })
      );

      if (isFirebaseConfigured) {
        setIsCloudSyncing(true);
        const res = await updateTaskDetailsAtomic(id, trimmed, finalCat, finalAssigned);
        setIsCloudSyncing(false);
        if (!res.success && res.error) {
          setCloudError(res.error);
        }
      }

      return true;
    },
    []
  );

  // Transferir tarefa para a outra pessoa com 1 toque (atômico)
  const reassignItem = useCallback(
    async (id: string) => {
      let nextAssigned: PersonAssignment = 'marii';

      setItems((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            nextAssigned = item.assignedTo === 'leeo' ? 'marii' : 'leeo';
            return { ...item, assignedTo: nextAssigned };
          }
          return item;
        })
      );

      if (isFirebaseConfigured) {
        setIsCloudSyncing(true);
        const res = await reassignTaskAtomic(id, nextAssigned);
        setIsCloudSyncing(false);
        if (!res.success && res.error) {
          setCloudError(res.error);
        }
      }
    },
    []
  );

  // Marcar todas de uma pessoa
  const checkAll = useCallback(
    async (person?: PersonAssignment) => {
      const updated = items.map((item) => {
        if (!person || item.assignedTo === person) {
          return { ...item, completed: true };
        }
        return item;
      });
      setItems(updated);

      if (isFirebaseConfigured) {
        const toUpdate = items.filter((i) => (!person || i.assignedTo === person) && !i.completed);
        for (const it of toUpdate) {
          await updateTaskCompletionAtomic(it.id, true);
        }
      }
    },
    [items]
  );

  // Desmarcar todas de uma pessoa
  const uncheckAll = useCallback(
    async (person?: PersonAssignment) => {
      const updated = items.map((item) => {
        if (!person || item.assignedTo === person) {
          return { ...item, completed: false };
        }
        return item;
      });
      setItems(updated);

      if (isFirebaseConfigured) {
        const toUpdate = items.filter((i) => (!person || i.assignedTo === person) && i.completed);
        for (const it of toUpdate) {
          await updateTaskCompletionAtomic(it.id, false);
        }
      }
    },
    [items]
  );

  // Limpar todas as tarefas
  const clearAllTasks = useCallback(async () => {
    const ids = items.map((i) => i.id);
    setItems([]);

    if (isFirebaseConfigured && ids.length > 0) {
      setIsCloudSyncing(true);
      await clearAllTasksAtomic(ids);
      setIsCloudSyncing(false);
    }
  }, [items]);

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
        const cat = CATEGORIES.find((c) => c.id === item.categoryId)?.label || '';
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
        const cat = CATEGORIES.find((c) => c.id === item.categoryId)?.label || '';
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
    isCloudSyncing,
    cloudError,
  };
}
