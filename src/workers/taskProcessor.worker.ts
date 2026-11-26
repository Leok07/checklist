import { ChecklistItem, ChecklistStats, PersonAssignment } from '../types/checklist';
import {
  TaskFilterCriteria,
  buildExportText,
  computeTaskStats,
  filterAndPartitionTasks,
} from './taskProcessingCore';
import { TaskDeduction, deduceTaskCustomization } from './taskDeductor';

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
    }
  | {
      type: 'deduce';
      requestId: number;
      text: string;
      assignedTo: PersonAssignment;
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
    }
  | {
      type: 'deduced';
      requestId: number;
      deduction: TaskDeduction;
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
    return;
  }

  if (msg.type === 'deduce') {
    const deduction = deduceTaskCustomization(msg.text, msg.assignedTo);
    const response: WorkerOutboundMessage = {
      type: 'deduced',
      requestId: msg.requestId,
      deduction,
    };
    self.postMessage(response);
  }
};
