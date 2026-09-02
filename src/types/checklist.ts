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

export type PersonAssignment = 'leeo' | 'marii';

export interface ChecklistItem {
  id: string;
  name: string;
  categoryId: CategoryId;
  assignedTo: PersonAssignment;
  completed: boolean;
  createdAt: number;
}

export type FilterStatus = 'all' | 'pending' | 'completed';
