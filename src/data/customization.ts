import {
  Sparkles,
  Sun,
  Waves,
  Umbrella,
  Glasses,
  Shirt,
  Footprints,
  Luggage,
  Backpack,
  Briefcase,
  Car,
  Plane,
  Droplets,
  Pill,
  HeartPulse,
  Shield,
  CreditCard,
  Wallet,
  Smartphone,
  BatteryCharging,
  Camera,
  Headphones,
  Utensils,
  CupSoda,
  KeyRound,
  Bed,
  Wind,
  Flame,
  Star,
  Compass,
  MapPin,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import {
  AccentColorId,
  BagLocation,
  CardStyle,
  ChecklistItem,
  PersonAssignment,
  SubTask,
  TaskIconId,
  TaskPriority,
} from '../types/checklist';
import { isValidCategoryId } from './defaultItems';

export interface TaskIconOption {
  id: TaskIconId;
  label: string;
  Icon: LucideIcon;
}

export const TASK_ICONS: TaskIconOption[] = [
  { id: 'sparkles', label: 'Geral', Icon: Sparkles },
  { id: 'sun', label: 'Sol', Icon: Sun },
  { id: 'waves', label: 'Praia', Icon: Waves },
  { id: 'umbrella', label: 'Guarda-sol', Icon: Umbrella },
  { id: 'glasses', label: 'Oculos', Icon: Glasses },
  { id: 'shirt', label: 'Roupa', Icon: Shirt },
  { id: 'footprints', label: 'Calcado', Icon: Footprints },
  { id: 'luggage', label: 'Mala', Icon: Luggage },
  { id: 'backpack', label: 'Mochila', Icon: Backpack },
  { id: 'briefcase', label: 'Bolsa', Icon: Briefcase },
  { id: 'car', label: 'Carro', Icon: Car },
  { id: 'plane', label: 'Voo', Icon: Plane },
  { id: 'droplets', label: 'Higiene', Icon: Droplets },
  { id: 'pill', label: 'Remedio', Icon: Pill },
  { id: 'heart-pulse', label: 'Saude', Icon: HeartPulse },
  { id: 'shield', label: 'Protecao', Icon: Shield },
  { id: 'credit-card', label: 'Cartao', Icon: CreditCard },
  { id: 'wallet', label: 'Carteira', Icon: Wallet },
  { id: 'smartphone', label: 'Celular', Icon: Smartphone },
  { id: 'battery-charging', label: 'Energia', Icon: BatteryCharging },
  { id: 'camera', label: 'Camera', Icon: Camera },
  { id: 'headphones', label: 'Audio', Icon: Headphones },
  { id: 'utensils', label: 'Comida', Icon: Utensils },
  { id: 'cup-soda', label: 'Bebida', Icon: CupSoda },
  { id: 'key-round', label: 'Chaves', Icon: KeyRound },
  { id: 'bed', label: 'Cama', Icon: Bed },
  { id: 'wind', label: 'Clima', Icon: Wind },
  { id: 'flame', label: 'Urgente', Icon: Flame },
  { id: 'star', label: 'Favorito', Icon: Star },
  { id: 'compass', label: 'Rota', Icon: Compass },
  { id: 'map-pin', label: 'Local', Icon: MapPin },
  { id: 'tag', label: 'Tag', Icon: Tag },
];

export const TASK_ICON_MAP: Record<TaskIconId, LucideIcon> = TASK_ICONS.reduce(
  (acc, entry) => {
    acc[entry.id] = entry.Icon;
    return acc;
  },
  {} as Record<TaskIconId, LucideIcon>
);

export interface AccentOption {
  id: AccentColorId;
  label: string;
  hex: string;
  inkHex: string;
  glow: string;
  softBg: string;
  gradient: string;
}

export const ACCENT_COLORS: AccentOption[] = [
  {
    id: 'auto',
    label: 'Auto',
    hex: '#E6DCE8',
    inkHex: '#22122A',
    glow: '0 0 16px rgba(230, 220, 232, 0.28)',
    softBg: 'rgba(230, 220, 232, 0.16)',
    gradient: 'linear-gradient(135deg, rgba(236, 227, 238, 0.20), rgba(224, 122, 176, 0.18))',
  },
  {
    id: 'pearl',
    label: 'Pearl',
    hex: '#E6DCE8',
    inkHex: '#22122A',
    glow: '0 0 16px rgba(230, 220, 232, 0.30)',
    softBg: 'rgba(230, 220, 232, 0.18)',
    gradient: 'linear-gradient(135deg, rgba(236, 227, 238, 0.22), rgba(158, 138, 166, 0.18))',
  },
  {
    id: 'rose',
    label: 'Rose',
    hex: '#E07AB0',
    inkHex: '#22122A',
    glow: '0 0 16px rgba(224, 122, 176, 0.34)',
    softBg: 'rgba(224, 122, 176, 0.18)',
    gradient: 'linear-gradient(135deg, rgba(224, 122, 176, 0.26), rgba(91, 43, 92, 0.32))',
  },
  {
    id: 'blush',
    label: 'Blush',
    hex: '#F09AC6',
    inkHex: '#22122A',
    glow: '0 0 16px rgba(240, 154, 198, 0.32)',
    softBg: 'rgba(240, 154, 198, 0.18)',
    gradient: 'linear-gradient(135deg, rgba(240, 154, 198, 0.24), rgba(176, 107, 163, 0.20))',
  },
  {
    id: 'orchid',
    label: 'Orchid',
    hex: '#B06BA3',
    inkHex: '#F3ECF5',
    glow: '0 0 16px rgba(176, 107, 163, 0.32)',
    softBg: 'rgba(176, 107, 163, 0.22)',
    gradient: 'linear-gradient(135deg, rgba(176, 107, 163, 0.28), rgba(53, 31, 67, 0.36))',
  },
  {
    id: 'mauve',
    label: 'Mauve',
    hex: '#8F6A9A',
    inkHex: '#F3ECF5',
    glow: '0 0 14px rgba(143, 106, 154, 0.28)',
    softBg: 'rgba(143, 106, 154, 0.22)',
    gradient: 'linear-gradient(135deg, rgba(143, 106, 154, 0.26), rgba(43, 23, 56, 0.40))',
  },
];

export const ACCENT_COLOR_MAP: Record<AccentColorId, AccentOption> = ACCENT_COLORS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<AccentColorId, AccentOption>
);

export function resolveAccentOption(
  accentColor: AccentColorId,
  assignedTo: PersonAssignment
): AccentOption {
  if (accentColor === 'auto') {
    return assignedTo === 'marii' ? ACCENT_COLOR_MAP.rose : ACCENT_COLOR_MAP.pearl;
  }
  return ACCENT_COLOR_MAP[accentColor] ?? ACCENT_COLOR_MAP.pearl;
}

export const CARD_STYLES: { id: CardStyle; label: string; hint: string }[] = [
  { id: 'glass', label: 'Glass', hint: 'Fosco' },
  { id: 'neon', label: 'Contorno', hint: 'Borda' },
  { id: 'gradient', label: 'Plum', hint: 'Degrade' },
  { id: 'solid', label: 'Solido', hint: 'Menu' },
];

export const BAG_LOCATIONS: { id: BagLocation; label: string; Icon: LucideIcon }[] = [
  { id: 'mala', label: 'Mala', Icon: Luggage },
  { id: 'mochila', label: 'Mochila', Icon: Backpack },
  { id: 'mao', label: 'Mao', Icon: Briefcase },
  { id: 'carro', label: 'Carro', Icon: Car },
  { id: 'necessaire', label: 'Necessaire', Icon: Droplets },
];

export const BAG_LOCATION_MAP: Record<BagLocation, { label: string; Icon: LucideIcon }> =
  BAG_LOCATIONS.reduce((acc, b) => {
    acc[b.id] = { label: b.label, Icon: b.Icon };
    return acc;
  }, {} as Record<BagLocation, { label: string; Icon: LucideIcon }>);

export const PRIORITY_OPTIONS: {
  id: TaskPriority;
  label: string;
  color: string;
}[] = [
  { id: 'normal', label: 'Normal', color: '#8E7498' },
  { id: 'essential', label: 'Essencial', color: '#E6DCE8' },
  { id: 'urgent', label: 'Urgente', color: '#F09AC6' },
];

export const PRESET_TAGS = ['praia', 'noite', 'casamento', 'estrada', 'clima', 'tech', 'vip'];

const VALID_ICONS = new Set<string>(TASK_ICONS.map((i) => i.id));
const VALID_ACCENTS = new Set<string>(ACCENT_COLORS.map((c) => c.id));
const VALID_STYLES = new Set<string>(CARD_STYLES.map((s) => s.id));
const VALID_BAGS = new Set<string>(BAG_LOCATIONS.map((b) => b.id));
const VALID_PRIORITIES = new Set<string>(PRIORITY_OPTIONS.map((p) => p.id));

const LEGACY_ACCENT_MAP: Record<string, AccentColorId> = {
  cyan: 'pearl',
  gold: 'pearl',
  mint: 'pearl',
  magenta: 'rose',
  crimson: 'rose',
  sunset: 'blush',
  violet: 'orchid',
};

function sanitizeAccentColor(raw: unknown): AccentColorId {
  if (typeof raw !== 'string') return 'auto';
  if (VALID_ACCENTS.has(raw)) return raw as AccentColorId;
  return LEGACY_ACCENT_MAP[raw] ?? 'auto';
}

function sanitizeSubtasks(raw: unknown): SubTask[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
    .map((entry, idx) => ({
      id: typeof entry.id === 'string' && entry.id ? entry.id : `sub-${idx}`,
      text: typeof entry.text === 'string' ? entry.text.trim() : '',
      done: Boolean(entry.done),
    }))
    .filter((sub) => sub.text.length > 0)
    .slice(0, 20);
}

function sanitizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const clean = item.trim().toLowerCase().replace(/^#+/, '').slice(0, 18);
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      result.push(clean);
    }
    if (result.length >= 6) break;
  }
  return result;
}

/**
 * Normaliza qualquer documento vindo do Firestore ou localStorage,
 * mantendo retrocompatibilidade total com tarefas antigas.
 */
export function withTaskDefaults(raw: Record<string, unknown>, idOverride?: string): ChecklistItem {
  const createdAt = Number(raw.createdAt) || Date.now();
  const order = typeof raw.order === 'number' && Number.isFinite(raw.order) ? raw.order : -createdAt;
  const rawQty = Number(raw.quantity);
  const quantity = Number.isFinite(rawQty) ? Math.min(99, Math.max(1, Math.round(rawQty))) : 1;

  return {
    id: idOverride || (typeof raw.id === 'string' ? raw.id : `task-${createdAt}`),
    name: typeof raw.name === 'string' ? raw.name.trim() : '',
    categoryId: isValidCategoryId(raw.categoryId) ? raw.categoryId : 'geral',
    assignedTo: raw.assignedTo === 'marii' ? 'marii' : 'leeo',
    completed: Boolean(raw.completed),
    createdAt,
    order,
    icon: typeof raw.icon === 'string' && VALID_ICONS.has(raw.icon) ? (raw.icon as TaskIconId) : 'sparkles',
    accentColor: sanitizeAccentColor(raw.accentColor),
    cardStyle:
      typeof raw.cardStyle === 'string' && VALID_STYLES.has(raw.cardStyle)
        ? (raw.cardStyle as CardStyle)
        : 'glass',
    quantity,
    bag: typeof raw.bag === 'string' && VALID_BAGS.has(raw.bag) ? (raw.bag as BagLocation) : 'mala',
    priority:
      typeof raw.priority === 'string' && VALID_PRIORITIES.has(raw.priority)
        ? (raw.priority as TaskPriority)
        : 'normal',
    note: typeof raw.note === 'string' ? raw.note.trim().slice(0, 180) : '',
    tags: sanitizeTags(raw.tags),
    subtasks: sanitizeSubtasks(raw.subtasks),
  };
}
