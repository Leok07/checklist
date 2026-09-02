import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChecklistItem, CategoryId } from '../types/checklist';
import { INITIAL_ITEMS, CATEGORIES } from '../data/defaultItems';
import { isFirebaseConfigured, subscribeToChecklist, saveChecklistToCloud } from '../services/firebase';

const STORAGE_KEY = 'checklist_praia_itens_v1';

export function useChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Caso ocorra erro de parsing, usa a lista padrão
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
          setItems(cloudItems);
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

    // Se a alteração veio da nuvem, não reenviar
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

  const addItem = useCallback((name: string, categoryId: CategoryId = 'geral') => {
    const trimmed = name.trim();
    if (!trimmed) return false;

    const newItem: ChecklistItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      categoryId,
      completed: false,
      createdAt: Date.now(),
    };

    setItems((prev) => [newItem, ...prev]);
    return true;
  }, []);

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

  const editItem = useCallback((id: string, newName: string, newCategory?: CategoryId) => {
    const trimmed = newName.trim();
    if (!trimmed) return false;

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            name: trimmed,
            categoryId: newCategory || item.categoryId,
          };
        }
        return item;
      })
    );
    return true;
  }, []);

  const checkAll = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, completed: true })));
  }, []);

  const uncheckAll = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, completed: false })));
  }, []);

  const resetToDefaults = useCallback(() => {
    setItems(INITIAL_ITEMS);
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const completed = items.filter((i) => i.completed).length;
    const pending = total - completed;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      pending,
      progressPercent,
    };
  }, [items]);

  const exportAsText = useCallback(() => {
    const lines: string[] = [];
    lines.push('CHECKLIST DE VIAGEM - PRAIA');
    lines.push(`Progresso: ${stats.completed}/${stats.total} itens prontos (${stats.progressPercent}%)`);
    lines.push('----------------------------------------');

    for (const cat of CATEGORIES) {
      const catItems = items.filter((item) => item.categoryId === cat.id);
      if (catItems.length > 0) {
        lines.push('');
        lines.push(`[ ${cat.label.toUpperCase()} ]`);
        catItems.forEach((item) => {
          const mark = item.completed ? '[X]' : '[ ]';
          lines.push(`${mark} ${item.name}`);
        });
      }
    }

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
