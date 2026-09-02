import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChecklistItem, CategoryId, PersonAssignment } from '../types/checklist';
import { INITIAL_ITEMS, CATEGORIES } from '../data/defaultItems';
import { isFirebaseConfigured, subscribeToChecklist, saveChecklistToCloud } from '../services/firebase';

const STORAGE_KEY = 'checklist_praia_itens_v3';

function normalizeItems(rawItems: any[]): ChecklistItem[] {
  return rawItems.map((item, index) => {
    let assignedTo: PersonAssignment = 'leeo';
    if (item.assignedTo === 'marii') {
      assignedTo = 'marii';
    } else if (item.assignedTo === 'leeo') {
      assignedTo = 'leeo';
    } else {
      // Se era 'ambos' ou indefinido, distribui equilibradamente
      assignedTo = index % 2 === 0 ? 'leeo' : 'marii';
    }
    return {
      ...item,
      assignedTo,
    };
  });
}

export function useChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('checklist_praia_itens_v2') || localStorage.getItem('checklist_praia_itens_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return normalizeItems(parsed);
        }
      }
    } catch {
      // Usa lista padrão
    }
    return INITIAL_ITEMS;
  });

  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const isIncomingFromCloud = useRef(false);

  // Escuta alterações em tempo real do Firebase (se configurado)
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const unsubscribe = subscribeToChecklist(
      (cloudItems) => {
        if (Array.isArray(cloudItems) && cloudItems.length > 0) {
          isIncomingFromCloud.current = true;
          setItems(normalizeItems(cloudItems));
          setCloudError(null);
        }
      },
      (errMsg) => {
        setCloudError(errMsg);
      }
    );

    return () => unsubscribe();
  }, []);

  // Salva no localStorage e sincroniza na nuvem
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignora erros de quota
    }

    if (isIncomingFromCloud.current) {
      isIncomingFromCloud.current = false;
      return;
    }

    if (isFirebaseConfigured) {
      setIsCloudSyncing(true);
      const timer = setTimeout(async () => {
        const res = await saveChecklistToCloud(items);
        setIsCloudSyncing(false);
        if (!res.success && res.error) {
          setCloudError(res.error);
        } else {
          setCloudError(null);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [items]);

  const forceSyncToCloud = useCallback(async () => {
    if (!isFirebaseConfigured) return false;
    setIsCloudSyncing(true);
    const res = await saveChecklistToCloud(items);
    setIsCloudSyncing(false);
    if (!res.success && res.error) {
      setCloudError(res.error);
      return false;
    }
    setCloudError(null);
    return true;
  }, [items]);

  const addItem = useCallback(
    (name: string, categoryId: CategoryId = 'geral', assignedTo: PersonAssignment = 'leeo') => {
      const trimmed = name.trim();
      if (!trimmed) return false;

      const newItem: ChecklistItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: trimmed,
        categoryId,
        assignedTo,
        completed: false,
        createdAt: Date.now(),
      };

      setItems((prev) => [newItem, ...prev]);
      return true;
    },
    []
  );

  const toggleItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const editItem = useCallback(
    (id: string, newName: string, newCategory?: CategoryId, newAssignedTo?: PersonAssignment) => {
      const trimmed = newName.trim();
      if (!trimmed) return false;

      setItems((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            return {
              ...item,
              name: trimmed,
              categoryId: newCategory || item.categoryId,
              assignedTo: newAssignedTo || item.assignedTo,
            };
          }
          return item;
        })
      );
      return true;
    },
    []
  );

  const reassignItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextAssigned: PersonAssignment = item.assignedTo === 'leeo' ? 'marii' : 'leeo';
          return { ...item, assignedTo: nextAssigned };
        }
        return item;
      })
    );
  }, []);

  const checkAll = useCallback((person?: PersonAssignment) => {
    setItems((prev) =>
      prev.map((item) => {
        if (!person || item.assignedTo === person) {
          return { ...item, completed: true };
        }
        return item;
      })
    );
  }, []);

  const uncheckAll = useCallback((person?: PersonAssignment) => {
    setItems((prev) =>
      prev.map((item) => {
        if (!person || item.assignedTo === person) {
          return { ...item, completed: false };
        }
        return item;
      })
    );
  }, []);

  const resetToDefaults = useCallback(() => {
    setItems(INITIAL_ITEMS);
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const completed = items.filter((i) => i.completed).length;
    const pending = total - completed;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Métricas do Leeo
    const leeoItems = items.filter((i) => i.assignedTo === 'leeo');
    const leeoCompleted = leeoItems.filter((i) => i.completed).length;
    const leeoPending = leeoItems.length - leeoCompleted;
    const leeoPercent = leeoItems.length > 0 ? Math.round((leeoCompleted / leeoItems.length) * 100) : 0;

    // Métricas da Marii
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

  const exportAsText = useCallback(() => {
    const lines: string[] = [];
    lines.push('CHECKLIST DE PRAIA - LEEO E MARII');
    lines.push(`Total: ${stats.completed}/${stats.total} itens prontos (${stats.progressPercent}%)`);
    lines.push('----------------------------------------');

    lines.push('');
    lines.push(`[ LEEO - ${stats.leeo.completed}/${stats.leeo.total} prontos (${stats.leeo.progressPercent}%) ]`);
    const leeoItems = items.filter((i) => i.assignedTo === 'leeo');
    leeoItems.forEach((item) => {
      const mark = item.completed ? '[X]' : '[ ]';
      const cat = CATEGORIES.find((c) => c.id === item.categoryId)?.label || '';
      lines.push(`${mark} ${item.name} (${cat})`);
    });

    lines.push('');
    lines.push(`[ MARII - ${stats.marii.completed}/${stats.marii.total} prontos (${stats.marii.progressPercent}%) ]`);
    const mariiItems = items.filter((i) => i.assignedTo === 'marii');
    mariiItems.forEach((item) => {
      const mark = item.completed ? '[X]' : '[ ]';
      const cat = CATEGORIES.find((c) => c.id === item.categoryId)?.label || '';
      lines.push(`${mark} ${item.name} (${cat})`);
    });

    lines.push('');
    lines.push('----------------------------------------');
    lines.push('Gerado pelo Checklist de Praia');

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
    resetToDefaults,
    exportAsText,
    stats,
    isCloudConfigured: isFirebaseConfigured,
    isCloudSyncing,
    cloudError,
    forceSyncToCloud,
  };
}
