import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  Firestore,
} from 'firebase/firestore';
import {
  ChecklistItem,
  PersonAssignment,
  SubTask,
  TaskDraft,
} from '../types/checklist';
import { withTaskDefaults } from '../data/customization';
import { sortTasksDeterministic } from '../workers/taskProcessingCore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey.length > 10
);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
  } catch (error) {
    console.error('Erro ao inicializar Firebase:', error);
  }
}

const COLLECTION_NAME = 'viagem_tasks';
const FIRESTORE_BATCH_LIMIT = 450;

export interface CloudOpResult {
  success: boolean;
  error?: string;
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const code = 'code' in error ? String((error as { code?: unknown }).code) : '';
    if (code === 'permission-denied') {
      return 'Permissão negada no Firebase. Verifique as regras da coleção viagem_tasks no Firestore.';
    }
    if (code === 'not-found') {
      return 'Documento ou banco Firestore não encontrado.';
    }
    if ('message' in error && typeof (error as { message?: unknown }).message === 'string') {
      return (error as { message: string }).message;
    }
  }
  return fallback;
}

function serializeTaskDocument(item: ChecklistItem) {
  return {
    name: item.name,
    categoryId: item.categoryId,
    assignedTo: item.assignedTo,
    completed: item.completed,
    createdAt: item.createdAt,
    order: item.order,
    icon: item.icon,
    accentColor: item.accentColor,
    cardStyle: item.cardStyle,
    quantity: item.quantity,
    bag: item.bag,
    priority: item.priority,
    note: item.note,
    tags: item.tags,
    subtasks: item.subtasks,
    updatedAt: Date.now(),
  };
}

/**
 * Escuta atualizações da coleção de tarefas em tempo real.
 * Cada tarefa é um documento independente com retrocompatibilidade total.
 */
export function subscribeToTasks(
  onUpdate: (items: ChecklistItem[]) => void,
  onError?: (errorMessage: string) => void
) {
  if (!db) {
    if (onError) onError('Banco de dados Firebase não inicializado.');
    return () => {};
  }

  const tasksCollection = collection(db, COLLECTION_NAME);

  const unsubscribe = onSnapshot(
    tasksCollection,
    (snapshot) => {
      const items: ChecklistItem[] = [];
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        if (data && typeof data.name === 'string' && data.name.trim()) {
          items.push(withTaskDefaults(data as Record<string, unknown>, docSnapshot.id));
        }
      });

      onUpdate(sortTasksDeterministic(items));
    },
    (error) => {
      console.error('Falha na sincronização do Firebase:', error);
      if (onError) {
        onError(extractErrorMessage(error, 'Falha na sincronização em tempo real.'));
      }
    }
  );

  return unsubscribe;
}

export async function addTaskAtomic(item: ChecklistItem): Promise<CloudOpResult> {
  if (!db) return { success: false, error: 'Firebase não está inicializado.' };

  try {
    const docRef = doc(db, COLLECTION_NAME, item.id);
    await setDoc(docRef, serializeTaskDocument(item));
    return { success: true };
  } catch (error: unknown) {
    console.error('Erro ao adicionar tarefa:', error);
    return { success: false, error: extractErrorMessage(error, 'Falha ao adicionar na nuvem.') };
  }
}

export async function updateTaskCompletionAtomic(
  id: string,
  completed: boolean
): Promise<CloudOpResult> {
  if (!db) return { success: false, error: 'Firebase não está inicializado.' };

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      completed,
      updatedAt: Date.now(),
    });
    return { success: true };
  } catch (error: unknown) {
    console.error('Erro ao atualizar status:', error);
    return { success: false, error: extractErrorMessage(error, 'Falha ao atualizar na nuvem.') };
  }
}

export async function updateTaskFullAtomic(
  id: string,
  draft: TaskDraft
): Promise<CloudOpResult> {
  if (!db) return { success: false, error: 'Firebase não está inicializado.' };

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      name: draft.name,
      categoryId: draft.categoryId,
      assignedTo: draft.assignedTo,
      icon: draft.icon,
      accentColor: draft.accentColor,
      cardStyle: draft.cardStyle,
      quantity: draft.quantity,
      bag: draft.bag,
      priority: draft.priority,
      note: draft.note,
      tags: draft.tags,
      subtasks: draft.subtasks,
      updatedAt: Date.now(),
    });
    return { success: true };
  } catch (error: unknown) {
    console.error('Erro ao atualizar tarefa:', error);
    return { success: false, error: extractErrorMessage(error, 'Falha ao salvar alterações na nuvem.') };
  }
}

export async function updateTaskOrderAndAssigneeAtomic(
  id: string,
  assignedTo: PersonAssignment,
  order: number
): Promise<CloudOpResult> {
  if (!db) return { success: false, error: 'Firebase não está inicializado.' };

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      assignedTo,
      order,
      updatedAt: Date.now(),
    });
    return { success: true };
  } catch (error: unknown) {
    console.error('Erro ao mover tarefa:', error);
    return { success: false, error: extractErrorMessage(error, 'Falha ao mover tarefa na nuvem.') };
  }
}

export async function updateTaskQuantityAtomic(
  id: string,
  quantity: number
): Promise<CloudOpResult> {
  if (!db) return { success: false, error: 'Firebase não está inicializado.' };

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      quantity,
      updatedAt: Date.now(),
    });
    return { success: true };
  } catch (error: unknown) {
    console.error('Erro ao atualizar quantidade:', error);
    return { success: false, error: extractErrorMessage(error, 'Falha ao atualizar quantidade.') };
  }
}

export async function updateTaskSubtasksAtomic(
  id: string,
  subtasks: SubTask[]
): Promise<CloudOpResult> {
  if (!db) return { success: false, error: 'Firebase não está inicializado.' };

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      subtasks,
      updatedAt: Date.now(),
    });
    return { success: true };
  } catch (error: unknown) {
    console.error('Erro ao atualizar sub-tarefas:', error);
    return { success: false, error: extractErrorMessage(error, 'Falha ao atualizar sub-tarefas.') };
  }
}

export async function deleteTaskAtomic(id: string): Promise<CloudOpResult> {
  if (!db) return { success: false, error: 'Firebase não está inicializado.' };

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error: unknown) {
    console.error('Erro ao remover tarefa:', error);
    return { success: false, error: extractErrorMessage(error, 'Falha ao remover na nuvem.') };
  }
}

export async function batchUpdateCompletionAtomic(
  ids: string[],
  completed: boolean
): Promise<CloudOpResult> {
  if (!db) return { success: false, error: 'Firebase não está inicializado.' };
  if (ids.length === 0) return { success: true };

  try {
    const now = Date.now();
    for (let i = 0; i < ids.length; i += FIRESTORE_BATCH_LIMIT) {
      const chunk = ids.slice(i, i + FIRESTORE_BATCH_LIMIT);
      const batch = writeBatch(db);
      chunk.forEach((id) => {
        const docRef = doc(db!, COLLECTION_NAME, id);
        batch.update(docRef, { completed, updatedAt: now });
      });
      await batch.commit();
    }
    return { success: true };
  } catch (error: unknown) {
    console.error('Erro ao atualizar tarefas em lote:', error);
    return { success: false, error: extractErrorMessage(error, 'Falha ao atualizar tarefas em lote.') };
  }
}

export async function clearAllTasksAtomic(ids: string[]): Promise<CloudOpResult> {
  if (!db) return { success: false, error: 'Firebase não está inicializado.' };
  if (ids.length === 0) return { success: true };

  try {
    for (let i = 0; i < ids.length; i += FIRESTORE_BATCH_LIMIT) {
      const chunk = ids.slice(i, i + FIRESTORE_BATCH_LIMIT);
      const batch = writeBatch(db);
      chunk.forEach((id) => {
        const docRef = doc(db!, COLLECTION_NAME, id);
        batch.delete(docRef);
      });
      await batch.commit();
    }
    return { success: true };
  } catch (error: unknown) {
    console.error('Erro ao limpar tarefas:', error);
    return { success: false, error: extractErrorMessage(error, 'Falha ao limpar tarefas na nuvem.') };
  }
}
