import { ChecklistItem, ChecklistStats } from '../types/checklist';
import {
  TaskFilterCriteria,
  buildExportText,
  computeTaskStats,
  filterAndPartitionTasks,
} from './taskProcessingCore';

export type WorkerInboundMessage =
  | {
      type: 'process';
      requestId: number;
      items: ChecklistItem[];
      criteria: TaskFilterCriteria;
    }
  | {
      type: 'export';
      requestId: number;
      items: ChecklistItem[];
      stats: ChecklistStats;
    };

export type WorkerOutboundMessage =
  | {
      type: 'processed';
      requestId: number;
      leeoItems: ChecklistItem[];
      mariiItems: ChecklistItem[];
      stats: ChecklistStats;
    }
  | {
      type: 'exported';
      requestId: number;
      text: string;
    };

self.onmessage = (event: MessageEvent<WorkerInboundMessage>) => {
  const msg = event.data;

  if (msg.type === 'process') {
    const stats = computeTaskStats(msg.items);
    const { leeoItems, mariiItems } = filterAndPartitionTasks(msg.items, msg.criteria);
    const response: WorkerOutboundMessage = {
      type: 'processed',
      requestId: msg.requestId,
      leeoItems,
      mariiItems,
      stats,
    };
    self.postMessage(response);
    return;
  }

  if (msg.type === 'export') {
    const text = buildExportText(msg.items, msg.stats);
    const response: WorkerOutboundMessage = {
      type: 'exported',
      requestId: msg.requestId,
      text,
    };
    self.postMessage(response);
  }
};
