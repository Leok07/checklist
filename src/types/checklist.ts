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

export type TaskPriority = 'normal' | 'essential' | 'urgent';

export type BagLocation = 'mala' | 'mochila' | 'mao' | 'carro' | 'necessaire';

export type CardStyle = 'glass' | 'neon' | 'gradient' | 'solid';

export type AccentColorId =
  | 'auto'
  | 'pearl'
  | 'rose'
  | 'blush'
  | 'orchid'
  | 'mauve';

export type TaskIconId =
  | 'sparkles'
  | 'sun'
  | 'waves'
  | 'umbrella'
  | 'glasses'
  | 'shirt'
  | 'footprints'
  | 'luggage'
  | 'backpack'
  | 'briefcase'
  | 'car'
  | 'plane'
  | 'droplets'
  | 'pill'
  | 'heart-pulse'
  | 'shield'
  | 'credit-card'
  | 'wallet'
  | 'smartphone'
  | 'battery-charging'
  | 'camera'
  | 'headphones'
  | 'utensils'
  | 'cup-soda'
  | 'key-round'
  | 'bed'
  | 'wind'
  | 'flame'
  | 'star'
  | 'compass'
  | 'map-pin'
  | 'tag';

export interface SubTask {
  id: string;
  text: string;
  done: boolean;
}

export interface ChecklistItem {
  id: string;
  name: string;
  categoryId: CategoryId;
  assignedTo: PersonAssignment;
  completed: boolean;
  createdAt: number;
  order: number;
  icon: TaskIconId;
  accentColor: AccentColorId;
  cardStyle: CardStyle;
  quantity: number;
  bag: BagLocation;
  priority: TaskPriority;
  note: string;
  tags: string[];
  subtasks: SubTask[];
}

export type TaskDraft = Omit<ChecklistItem, 'id' | 'completed' | 'createdAt' | 'order'>;

export type FilterStatus = 'all' | 'pending' | 'completed';

export type SplitSnapMode = 'leeo' | 'even' | 'marii';

export interface PersonStats {
  total: number;
  completed: number;
  pending: number;
  progressPercent: number;
  totalUnits: number;
  urgentPending: number;
}

export interface ChecklistStats {
  total: number;
  completed: number;
  pending: number;
  progressPercent: number;
  totalUnits: number;
  leeo: PersonStats;
  marii: PersonStats;
}
