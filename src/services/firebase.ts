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
        if (data && data.name) {
          items.push({
            id: docSnapshot.id,
            name: String(data.name),
            categoryId: (data.categoryId as CategoryId) || 'geral',
            assignedTo: data.assignedTo === 'marii' ? 'marii' : 'leeo',
            completed: Boolean(data.completed),
            createdAt: Number(data.createdAt) || 0,
          });
        }
      });

      // Ordena pelas mais recentes
      items.sort((a, b) => b.createdAt - a.createdAt);
      onUpdate(items);
    },
    (error) => {
      console.error('Falha na sincronização do Firebase:', error);
      let msg = error.message;
      if (error.code === 'permission-denied') {
        msg = 'Permissão negada no Firebase. Habilite leitura e escrita nas Regras (Rules) do Firestore.';
      } else if (error.code === 'not-found') {
        msg = 'Banco Firestore não encontrado. Clique em "Criar banco de dados" no console do Firebase.';
      }
      if (onError) onError(msg);
    }
  );

  return unsubscribe;
}

/**
 * Adiciona uma nova tarefa de forma atômica no Firestore
 */
export async function addTaskAtomic(item: ChecklistItem): Promise<{ success: boolean; error?: string }> {
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
  } catch (error: any) {
    console.error('Erro ao adicionar tarefa:', error);
    return { success: false, error: error?.message || 'Falha ao adicionar na nuvem' };
  }
}

/**
 * Atualiza o status de conclusão de uma tarefa de forma atômica (não toca nos itens do outro)
 */
export async function updateTaskCompletionAtomic(
  id: string,
  completed: boolean
): Promise<{ success: boolean; error?: string }> {
  if (!db) return { success: false, error: 'Firebase não está inicializado.' };

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      completed,
      updatedAt: Date.now(),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao atualizar status:', error);
    return { success: false, error: error?.message || 'Falha ao atualizar na nuvem' };
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
): Promise<{ success: boolean; error?: string }> {
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
  } catch (error: any) {
    console.error('Erro ao atualizar tarefa:', error);
    return { success: false, error: error?.message || 'Falha ao atualizar na nuvem' };
  }
}

/**
 * Transfere a tarefa para a outra pessoa de forma atômica
 */
export async function reassignTaskAtomic(
  id: string,
  assignedTo: PersonAssignment
): Promise<{ success: boolean; error?: string }> {
  if (!db) return { success: false, error: 'Firebase não está inicializado.' };

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      assignedTo,
      updatedAt: Date.now(),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao transferir tarefa:', error);
    return { success: false, error: error?.message || 'Falha ao transferir na nuvem' };
  }
}

/**
 * Remove uma tarefa de forma atômica
 */
export async function deleteTaskAtomic(id: string): Promise<{ success: boolean; error?: string }> {
  if (!db) return { success: false, error: 'Firebase não está inicializado.' };

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao remover tarefa:', error);
    return { success: false, error: error?.message || 'Falha ao remover na nuvem' };
  }
}

/**
 * Limpa todas as tarefas utilizando batch write
 */
export async function clearAllTasksAtomic(ids: string[]): Promise<{ success: boolean; error?: string }> {
  if (!db || ids.length === 0) return { success: true };

  try {
    const batch = writeBatch(db);
    ids.forEach((id) => {
      const docRef = doc(db, COLLECTION_NAME, id);
      batch.delete(docRef);
    });
    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao limpar tarefas:', error);
    return { success: false, error: error?.message || 'Falha ao limpar tarefas na nuvem' };
  }
}
