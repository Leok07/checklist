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
import { ChecklistItem, CategoryId, PersonAssignment } from '../types/checklist';
import { isValidCategoryId } from '../data/defaultItems';

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

interface CloudOpResult {
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

/**
 * Escuta atualizações da coleção de tarefas em tempo real.
 * Cada tarefa é um documento independente, evitando concorrência e sobrescrita mútua.
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
          items.push({
            id: docSnapshot.id,
            name: data.name.trim(),
            categoryId: isValidCategoryId(data.categoryId) ? data.categoryId : 'geral',
            assignedTo: data.assignedTo === 'marii' ? 'marii' : 'leeo',
            completed: Boolean(data.completed),
            createdAt: Number(data.createdAt) || 0,
          });
        }
      });

      // Ordenação determinística: mais recentes primeiro, com desempate por ID
      items.sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
      onUpdate(items);
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

/**
 * Adiciona uma nova tarefa de forma atômica no Firestore
 */
export async function addTaskAtomic(item: ChecklistItem): Promise<CloudOpResult> {
  if (!db) return { success: false, error: 'Firebase não está inicializado.' };

  try {
    const docRef = doc(db, COLLECTION_NAME, item.id);
    await setDoc(docRef, {
      name: item.name,
      categoryId: item.categoryId,
      assignedTo: item.assignedTo,
      completed: item.completed,
      createdAt: item.createdAt,
      updatedAt: Date.now(),
    });
    return { success: true };
  } catch (error: unknown) {
    console.error('Erro ao adicionar tarefa:', error);
    return { success: false, error: extractErrorMessage(error, 'Falha ao adicionar na nuvem.') };
  }
}

/**
 * Atualiza o status de conclusão de uma tarefa de forma atômica (não toca nos itens do outro)
 */
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

/**
 * Atualiza o status de conclusão de múltiplas tarefas em lote (chunks <= 450 docs)
 */
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

/**
 * Atualiza os detalhes de uma tarefa de forma atômica
 */
export async function updateTaskDetailsAtomic(
  id: string,
  name: string,
  categoryId: CategoryId,
  assignedTo: PersonAssignment
): Promise<CloudOpResult> {
  if (!db) return { success: false, error: 'Firebase não está inicializado.' };

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      name,
      categoryId,
      assignedTo,
      updatedAt: Date.now(),
    });
    return { success: true };
  } catch (error: unknown) {
    console.error('Erro ao atualizar tarefa:', error);
    return { success: false, error: extractErrorMessage(error, 'Falha ao atualizar na nuvem.') };
  }
}

/**
 * Transfere a tarefa para a outra pessoa de forma atômica
 */
export async function reassignTaskAtomic(
  id: string,
  assignedTo: PersonAssignment
): Promise<CloudOpResult> {
  if (!db) return { success: false, error: 'Firebase não está inicializado.' };

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      assignedTo,
      updatedAt: Date.now(),
    });
    return { success: true };
  } catch (error: unknown) {
    console.error('Erro ao transferir tarefa:', error);
    return { success: false, error: extractErrorMessage(error, 'Falha ao transferir na nuvem.') };
  }
}

/**
 * Remove uma tarefa de forma atômica
 */
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

/**
 * Limpa todas as tarefas utilizando batch write fatiado (limite seguro <= 450 docs/batch)
 */
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
