import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, setDoc, Firestore } from 'firebase/firestore';
import { ChecklistItem } from '../types/checklist';

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

const DOCUMENT_ID = 'checklist_praia_itens';

/**
 * Escuta atualizações da lista em tempo real do Firebase Firestore
 */
export function subscribeToChecklist(
  onUpdate: (items: ChecklistItem[]) => void,
  onError?: (errorMessage: string) => void
) {
  if (!db) {
    if (onError) onError('Banco de dados Firebase não inicializado.');
    return () => {};
  }

  const docRef = doc(db, 'checklists', DOCUMENT_ID);

  const unsubscribe = onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (Array.isArray(data.items)) {
          onUpdate(data.items as ChecklistItem[]);
        }
      }
    },
    (error) => {
      console.error('Falha na sincronização do Firebase:', error);
      let msg = error.message;
      if (error.code === 'permission-denied') {
        msg = 'Permissão negada no Firebase. Habilite a leitura/escrita nas Regras (Rules) do Firestore.';
      } else if (error.code === 'not-found') {
        msg = 'Banco Firestore não encontrado. Clique em "Criar banco de dados" no console do Firebase.';
      }
      if (onError) onError(msg);
    }
  );

  return unsubscribe;
}

/**
 * Salva a lista de itens no Firebase Firestore
 */
export async function saveChecklistToCloud(items: ChecklistItem[]): Promise<{ success: boolean; error?: string }> {
  if (!db) {
    return { success: false, error: 'Firebase não está inicializado.' };
  }

  try {
    const docRef = doc(db, 'checklists', DOCUMENT_ID);
    await setDoc(docRef, {
      items,
      updatedAt: Date.now(),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao salvar no Firebase:', error);
    let msg = error?.message || 'Erro desconhecido ao salvar no Firebase';
    if (error?.code === 'permission-denied') {
      msg = 'Permissão negada: libere as regras em Firestore -> Rules no console do Firebase.';
    }
    return { success: false, error: msg };
  }
}
