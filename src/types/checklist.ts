export type CategoryId = 
  | 'praia'
  | 'vestuario'
  | 'higiene'
  | 'saude_docs'
  | 'praticidade'
  | 'geral';

export interface CategoryInfo {
  id: CategoryId;
  label: string;
  description: string;
}

export interface ChecklistItem {
  id: string;
  name: string;
  categoryId: CategoryId;
  completed: boolean;
  createdAt: number;
}

export type FilterStatus = 'all' | 'pending' | 'completed';
