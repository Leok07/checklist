import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChecklistItem, ChecklistStats, PersonAssignment } from '../types/checklist';
import {
  TaskFilterCriteria,
  buildExportText,
  computeTaskStats,
  filterAndPartitionTasks,
} from './taskProcessingCore';
import { TaskDeduction, deduceTaskCustomization } from './taskDeductor';
import type { WorkerOutboundMessage } from './taskProcessor.worker';

const WORKER_OFFLOAD_THRESHOLD = 80;

/**
 * Combina Optimistic UI instantaneo (<16ms) para listas normais com Web Worker real
 * para filtragem/estatisticas pesadas (>80 tarefas), exportacao e dedutor semantico silencioso.
 */
export function useTaskProcessor(items: ChecklistItem[], criteria: TaskFilterCriteria) {
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const processRequestIdRef = useRef(0);
  const exportResolversRef = useRef(new Map<number, (text: string) => void>());
  const deduceResolversRef = useRef(new Map<number, (deduction: TaskDeduction) => void>());

  const shouldUseWorker = items.length > WORKER_OFFLOAD_THRESHOLD;

  const syncResult = useMemo(() => {
    if (shouldUseWorker) return null;
    const stats = computeTaskStats(items);
    const { leeoItems, mariiItems } = filterAndPartitionTasks(items, criteria);
    return { leeoItems, mariiItems, stats };
  }, [items, criteria, shouldUseWorker]);

  const [workerResult, setWorkerResult] = useState<{
    leeoItems: ChecklistItem[];
    mariiItems: ChecklistItem[];
    stats: ChecklistStats;
  }>(() => ({
    leeoItems: [],
    mariiItems: [],
    stats: computeTaskStats([]),
  }));

  useEffect(() => {
    if (typeof Worker === 'undefined') return;

    try {
      const worker = new Worker(new URL('./taskProcessor.worker.ts', import.meta.url), {
        type: 'module',
      });

      worker.onmessage = (event: MessageEvent<WorkerOutboundMessage>) => {
        const msg = event.data;
        if (msg.type === 'processed' && msg.requestId === processRequestIdRef.current) {
          setWorkerResult({
            leeoItems: msg.leeoItems,
            mariiItems: msg.mariiItems,
            stats: msg.stats,
          });
        } else if (msg.type === 'exported') {
          const resolver = exportResolversRef.current.get(msg.requestId);
          if (resolver) {
            exportResolversRef.current.delete(msg.requestId);
            resolver(msg.text);
          }
        } else if (msg.type === 'deduced') {
          const resolver = deduceResolversRef.current.get(msg.requestId);
          if (resolver) {
            deduceResolversRef.current.delete(msg.requestId);
            resolver(msg.deduction);
          }
        }
      };

      workerRef.current = worker;

      return () => {
        worker.terminate();
        workerRef.current = null;
        exportResolversRef.current.clear();
        deduceResolversRef.current.clear();
      };
    } catch {
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (!shouldUseWorker) return;

    const worker = workerRef.current;
    if (!worker) {
      const stats = computeTaskStats(items);
      const { leeoItems, mariiItems } = filterAndPartitionTasks(items, criteria);
      setWorkerResult({ leeoItems, mariiItems, stats });
      return;
    }

    const reqId = ++requestIdRef.current;
    processRequestIdRef.current = reqId;
    worker.postMessage({
      type: 'process',
      requestId: reqId,
      items,
      criteria,
    });
  }, [items, criteria, shouldUseWorker]);

  const active = syncResult ?? workerResult;

  const generateExportAsync = useCallback(async (): Promise<string> => {
    const worker = workerRef.current;
    if (!worker) {
      return buildExportText(items, active.stats);
    }

    return new Promise<string>((resolve) => {
      const reqId = ++requestIdRef.current;
      exportResolversRef.current.set(reqId, resolve);
      worker.postMessage({
        type: 'export',
        requestId: reqId,
        items,
        stats: active.stats,
      });
    });
  }, [items, active.stats]);

  const deduceTaskAsync = useCallback(
    async (text: string, assignedTo: PersonAssignment): Promise<TaskDeduction> => {
      const worker = workerRef.current;
      if (!worker) {
        return deduceTaskCustomization(text, assignedTo);
      }

      return new Promise<TaskDeduction>((resolve) => {
        const reqId = ++requestIdRef.current;
        deduceResolversRef.current.set(reqId, resolve);
        worker.postMessage({
          type: 'deduce',
          requestId: reqId,
          text,
          assignedTo,
        });
      });
    },
    []
  );

  return {
    leeoItems: active.leeoItems,
    mariiItems: active.mariiItems,
    stats: active.stats,
    generateExportAsync,
    deduceTaskAsync,
  };
}
