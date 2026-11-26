import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Check,
  Palette,
  Sliders,
  ListChecks,
  Flame,
  Star,
  Tag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  AccentColorId,
  BagLocation,
  CardStyle,
  CategoryId,
  ChecklistItem,
  PersonAssignment,
  SubTask,
  TaskDraft,
  TaskIconId,
  TaskPriority,
} from '../types/checklist';
import { CATEGORIES } from '../data/defaultItems';
import {
  ACCENT_COLORS,
  BAG_LOCATIONS,
  BAG_LOCATION_MAP,
  CARD_STYLES,
  PRESET_TAGS,
  PRIORITY_OPTIONS,
  TASK_ICONS,
  TASK_ICON_MAP,
  resolveAccentOption,
} from '../data/customization';
import { TaskDeduction } from '../workers/taskDeductor';
import { getCardVisualStyles } from './ItemCard';
import { SPRING_BOUNCY, SPRING_SHEET } from '../motion/springEngine';
import {
  animateSpringOpacity,
  animateSpringTranslateX,
  animateSpringTranslateY,
  cancelWaapiSpring,
  readActiveSpringState,
} from '../motion/waapiSpring';
import { triggerHaptic } from '../motion/haptics';

interface TaskStudioSheetProps {
  isOpen: boolean;
  editingItem: ChecklistItem | null;
  initialPerson: PersonAssignment;
  deduceTaskAsync: (text: string, assignedTo: PersonAssignment) => Promise<TaskDeduction>;
  onClose: () => void;
  onSaveNew: (draft: TaskDraft) => Promise<void>;
  onSaveEdit: (id: string, draft: TaskDraft) => Promise<void>;
  onDelete?: (id: string) => void;
}

type StudioTab = 'visual' | 'details' | 'checklist';

const TAB_INDEX: Record<StudioTab, number> = {
  visual: 0,
  details: 1,
  checklist: 2,
};

interface LivePreviewProps {
  name: string;
  assignedTo: PersonAssignment;
  categoryId: CategoryId;
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

const LiveCardPreview: React.FC<LivePreviewProps> = React.memo(
  ({
    name,
    assignedTo,
    categoryId,
    icon,
    accentColor,
    cardStyle,
    quantity,
    bag,
    priority,
    note,
    tags,
    subtasks,
  }) => {
    const previewItem: ChecklistItem = {
      id: 'preview',
      name: name.trim() || 'Digite sua task de viagem...',
      categoryId,
      assignedTo,
      completed: false,
      createdAt: 0,
      order: 0,
      icon,
      accentColor,
      cardStyle,
      quantity,
      bag,
      priority,
      note: note.trim(),
      tags,
      subtasks,
    };

    const previewStyles = getCardVisualStyles(previewItem);
    const PreviewIcon = TASK_ICON_MAP[icon] ?? TASK_ICON_MAP.sparkles;
    const resolvedAccent = resolveAccentOption(accentColor, assignedTo);
    const bagMeta = BAG_LOCATION_MAP[bag];

    return (
      <div
        className="relative rounded-xl border p-2.5 overflow-hidden"
        style={{
          background: previewStyles.background,
          borderColor: previewStyles.borderColor,
          boxShadow: previewStyles.boxShadow,
        }}
      >
        {priority === 'urgent' && (
          <span
            aria-hidden="true"
            className="vice-urgent-aura pointer-events-none absolute inset-0 rounded-xl border-[1.5px] border-[#F09AC6]"
          />
        )}
        <span
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
          style={{ backgroundColor: resolvedAccent.hex }}
        />
        <div className="flex items-center gap-2.5 pl-1.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: resolvedAccent.softBg, color: resolvedAccent.hex }}
          >
            <PreviewIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#F3ECF5] truncate">{previewItem.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span
                className="text-[10px] font-black uppercase"
                style={{ color: assignedTo === 'leeo' ? '#E6DCE8' : '#E07AB0' }}
              >
                {assignedTo === 'leeo' ? 'Leeo' : 'Marii'}
              </span>
              {quantity > 1 && (
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-black"
                  style={{ backgroundColor: resolvedAccent.softBg, color: resolvedAccent.hex }}
                >
                  x{quantity}
                </span>
              )}
              {priority === 'urgent' && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-[#F09AC6]">
                  <Flame className="w-2.5 h-2.5" />
                  Urgente
                </span>
              )}
              {priority === 'essential' && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[#E6DCE8]">
                  <Star className="w-2.5 h-2.5" />
                  Essencial
                </span>
              )}
              <span className="text-[9px] font-semibold text-[#C7B4CE]">
                {bagMeta?.label}
              </span>
              {subtasks.length > 0 && (
                <span className="text-[9px] font-semibold text-[#8E7498]">
                  {subtasks.filter((s) => s.done).length}/{subtasks.length} sub
                </span>
              )}
              {tags.slice(0, 2).map((t) => (
                <span key={t} className="text-[9px] font-semibold text-[#8E7498]">
                  #{t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
LiveCardPreview.displayName = 'LiveCardPreview';

interface IconGridPanelProps {
  selectedIcon: TaskIconId;
  accentHex: string;
  accentSoftBg: string;
  accentGlow: string;
  onSelectIcon: (id: TaskIconId) => void;
}

const IconGridPanel: React.FC<IconGridPanelProps> = React.memo(
  ({ selectedIcon, accentHex, accentSoftBg, accentGlow, onSelectIcon }) => (
    <div>
      <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8E7498] mb-2">
        Ícone Vetorial (32 opções)
      </span>
      <div className="grid grid-cols-8 gap-1.5">
        {TASK_ICONS.map(({ id, label, Icon }) => {
          const selected = selectedIcon === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                onSelectIcon(id);
              }}
              title={label}
              aria-label={label}
              className="aspect-square rounded-lg border flex items-center justify-center active:scale-90"
              style={
                selected
                  ? {
                      backgroundColor: accentSoftBg,
                      borderColor: accentHex,
                      color: accentHex,
                      boxShadow: accentGlow,
                    }
                  : {
                      backgroundColor: 'var(--vice-surface-subtle)',
                      borderColor: 'var(--vice-border)',
                      color: '#C7B4CE',
                    }
              }
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>
    </div>
  )
);
IconGridPanel.displayName = 'IconGridPanel';

export const TaskStudioSheet: React.FC<TaskStudioSheetProps> = ({
  isOpen,
  editingItem,
  initialPerson,
  deduceTaskAsync,
  onClose,
  onSaveNew,
  onSaveEdit,
  onDelete,
}) => {
  const [mounted, setMounted] = useState(isOpen);
  const [name, setName] = useState('');
  const [assignedTo, setAssignedTo] = useState<PersonAssignment>(initialPerson);
  const [categoryId, setCategoryId] = useState<CategoryId>('geral');
  const [icon, setIcon] = useState<TaskIconId>('sparkles');
  const [accentColor, setAccentColor] = useState<AccentColorId>('auto');
  const [cardStyle, setCardStyle] = useState<CardStyle>('glass');
  const [quantity, setQuantity] = useState(1);
  const [bag, setBag] = useState<BagLocation>('mala');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [activeTab, setActiveTab] = useState<StudioTab>('visual');
  const [showCustomizer, setShowCustomizer] = useState(false);

  const manualLocksRef = useRef<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const tabIndicatorRef = useRef<HTMLDivElement | null>(null);
  const tabTrackRef = useRef<HTMLDivElement | null>(null);
  const customizerBodyRef = useRef<HTMLDivElement | null>(null);
  const prevTabRef = useRef<StudioTab>('visual');

  const dragSheetRef = useRef({
    active: false,
    pointerId: -1,
    startY: 0,
    lastY: 0,
    lastTime: 0,
    vy: 0,
    currentY: 0,
  });

  // Gerencia montagem + animacao assincrona WAAPI de abertura e fechamento
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      manualLocksRef.current.clear();

      if (editingItem) {
        setName(editingItem.name);
        setAssignedTo(editingItem.assignedTo);
        setCategoryId(editingItem.categoryId);
        setIcon(editingItem.icon);
        setAccentColor(editingItem.accentColor);
        setCardStyle(editingItem.cardStyle);
        setQuantity(editingItem.quantity);
        setBag(editingItem.bag);
        setPriority(editingItem.priority);
        setNote(editingItem.note);
        setTags(editingItem.tags);
        setSubtasks(editingItem.subtasks);
        setShowCustomizer(true);
      } else {
        setName('');
        setAssignedTo(initialPerson);
        setCategoryId('geral');
        setIcon('sparkles');
        setAccentColor('auto');
        setCardStyle('glass');
        setQuantity(1);
        setBag('mala');
        setPriority('normal');
        setNote('');
        setTags([]);
        setSubtasks([]);
        setShowCustomizer(false);
      }
      setTagInput('');
      setSubtaskInput('');
      setActiveTab('visual');
      prevTabRef.current = 'visual';
      return;
    }

    if (!mounted) return;
    // Animacao de fechamento 100% assincrona antes de desmontar
    animateSpringOpacity(overlayRef.current, 1, 0, 210);
    animateSpringTranslateY(
      sheetRef.current,
      dragSheetRef.current.currentY,
      540,
      dragSheetRef.current.vy,
      SPRING_SHEET,
      () => {
        dragSheetRef.current.currentY = 0;
        setMounted(false);
      }
    );
  }, [isOpen, editingItem, initialPerson, mounted]);

  // Entrada WAAPI quando monta + foco diferido para nao brigar com teclado mobile
  useEffect(() => {
    if (!mounted || !isOpen) return;

    animateSpringOpacity(overlayRef.current, 0, 1, 180);
    animateSpringTranslateY(sheetRef.current, 460, 0, 0, SPRING_SHEET);

    const focusTimer = window.setTimeout(() => {
      if (!editingItem) inputRef.current?.focus();
    }, 240);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKey);
    };
  }, [mounted, isOpen, editingItem, onClose]);

  // Dedutor Semantico Silencioso em tempo real (off-main-thread via Web Worker)
  useEffect(() => {
    if (!isOpen || editingItem) return;
    const trimmed = name.trim();
    if (!trimmed) {
      if (!manualLocksRef.current.has('icon')) setIcon('sparkles');
      if (!manualLocksRef.current.has('categoryId')) setCategoryId('geral');
      if (!manualLocksRef.current.has('bag')) setBag('mala');
      if (!manualLocksRef.current.has('priority')) setPriority('normal');
      if (!manualLocksRef.current.has('cardStyle')) setCardStyle('glass');
      if (!manualLocksRef.current.has('accentColor')) setAccentColor('auto');
      if (!manualLocksRef.current.has('quantity')) setQuantity(1);
      if (!manualLocksRef.current.has('tags')) setTags([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const result = await deduceTaskAsync(trimmed, assignedTo);
      if (cancelled) return;

      const locks = manualLocksRef.current;
      if (!locks.has('icon')) setIcon(result.icon);
      if (!locks.has('categoryId')) setCategoryId(result.categoryId);
      if (!locks.has('bag')) setBag(result.bag);
      if (!locks.has('priority')) setPriority(result.priority);
      if (!locks.has('cardStyle')) setCardStyle(result.cardStyle);
      if (!locks.has('accentColor')) setAccentColor(result.accentColor);
      if (!locks.has('quantity')) setQuantity(result.quantity);
      if (!locks.has('tags')) setTags(result.tags);
    }, 130);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [name, assignedTo, isOpen, editingItem, deduceTaskAsync]);

  // Mola deslizante do indicador de abas no Estudio
  useEffect(() => {
    if (!showCustomizer) return;
    const track = tabTrackRef.current;
    const indicator = tabIndicatorRef.current;
    if (!track || !indicator) return;

    const slotWidth = (track.clientWidth - 8) / 3;
    const fromX = TAB_INDEX[prevTabRef.current] * slotWidth;
    const toX = TAB_INDEX[activeTab] * slotWidth;
    prevTabRef.current = activeTab;

    indicator.style.width = `${slotWidth.toFixed(1)}px`;
    animateSpringTranslateX(indicator, fromX, toX, 0, SPRING_BOUNCY);
  }, [activeTab, showCustomizer]);

  // Mola de entrada ao expandir customizacao manual
  useEffect(() => {
    if (!showCustomizer || editingItem) return;
    animateSpringTranslateY(customizerBodyRef.current, 18, 0, 0, SPRING_BOUNCY);
    animateSpringOpacity(customizerBodyRef.current, 0, 1, 200);
  }, [showCustomizer, editingItem]);

  const handleSheetHandleDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest('button')) return;
    const d = dragSheetRef.current;
    const interrupted = readActiveSpringState(sheetRef.current, 'ty');
    if (interrupted) d.currentY = interrupted.value;
    cancelWaapiSpring(sheetRef.current);

    d.active = true;
    d.pointerId = e.pointerId;
    d.startY = e.clientY - d.currentY;
    d.lastY = e.clientY;
    d.lastTime = performance.now();
    d.vy = interrupted ? interrupted.velocity : 0;

    if (sheetRef.current) sheetRef.current.style.willChange = 'transform';
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignora
    }
  }, []);

  const handleSheetHandleMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragSheetRef.current;
    if (!d.active || e.pointerId !== d.pointerId) return;
    const now = performance.now();
    const dt = Math.max(0.004, (now - d.lastTime) / 1000);
    d.vy = d.vy * 0.6 + ((e.clientY - d.lastY) / dt) * 0.4;
    d.lastY = e.clientY;
    d.lastTime = now;

    const dy = Math.max(0, e.clientY - d.startY);
    d.currentY = dy;
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translate3d(0, ${dy.toFixed(2)}px, 0)`;
    }
  }, []);

  const handleSheetHandleUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragSheetRef.current;
      if (!d.active || e.pointerId !== d.pointerId) return;
      d.active = false;
      d.pointerId = -1;
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignora
      }

      if (d.currentY > 110 || d.vy > 640) {
        triggerHaptic('tap');
        onClose();
      } else {
        const fromY = d.currentY;
        d.currentY = 0;
        animateSpringTranslateY(sheetRef.current, fromY, 0, d.vy * 0.3, SPRING_SHEET);
      }
    },
    [onClose]
  );

  const handleSelectIcon = useCallback((id: TaskIconId) => {
    manualLocksRef.current.add('icon');
    setIcon(id);
  }, []);

  if (!mounted) return null;

  const resolvedAccent = resolveAccentOption(accentColor, assignedTo);

  const addTag = (raw: string) => {
    const clean = raw.trim().toLowerCase().replace(/^#+/, '').slice(0, 18);
    if (!clean || tags.includes(clean) || tags.length >= 6) return;
    triggerHaptic('tap');
    manualLocksRef.current.add('tags');
    setTags((prev) => [...prev, clean]);
    setTagInput('');
  };

  const addSubtask = () => {
    const clean = subtaskInput.trim().slice(0, 70);
    if (!clean || subtasks.length >= 15) return;
    triggerHaptic('tap');
    setSubtasks((prev) => [
      ...prev,
      { id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, text: clean, done: false },
    ]);
    setSubtaskInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    triggerHaptic('check');
    const draft: TaskDraft = {
      name: name.trim(),
      categoryId,
      assignedTo,
      icon,
      accentColor,
      cardStyle,
      quantity,
      bag,
      priority,
      note: note.trim(),
      tags,
      subtasks,
    };

    if (editingItem) {
      await onSaveEdit(editingItem.id, draft);
    } else {
      await onSaveNew(draft);
    }
    onClose();
  };

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-sheet-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#16091F]/75"
    >
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[430px] max-h-[90dvh] rounded-t-3xl border-t border-x border-[var(--vice-border-strong)] bg-[var(--vice-sheet-bg)] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Pegador arrastavel para fechar com flick */}
        <div
          onPointerDown={handleSheetHandleDown}
          onPointerMove={handleSheetHandleMove}
          onPointerUp={handleSheetHandleUp}
          onPointerCancel={handleSheetHandleUp}
          className="pt-2.5 pb-2 px-4 flex flex-col items-center cursor-grab active:cursor-grabbing touch-none shrink-0"
        >
          <div className="w-11 h-1.5 rounded-full bg-[var(--vice-border-strong)] mb-2" />
          <div className="w-full flex items-center justify-between">
            <h3
              id="studio-sheet-title"
              className="font-display text-base font-black tracking-wide uppercase vice-title-text"
            >
              {editingItem ? 'Personalizar Task' : 'Nova Task'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar estúdio"
              className="w-9 h-9 rounded-xl bg-[var(--vice-surface-subtle)] text-[#C7B4CE] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preview Ao Vivo */}
        <div className="px-4 pb-3 shrink-0">
          <LiveCardPreview
            name={name}
            assignedTo={assignedTo}
            categoryId={categoryId}
            icon={icon}
            accentColor={accentColor}
            cardStyle={cardStyle}
            quantity={quantity}
            bag={bag}
            priority={priority}
            note={note}
            tags={tags}
            subtasks={subtasks}
          />
        </div>

        {/* Corpo Rolavel */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto scrollbar-none px-4 pb-4 space-y-3.5">
            {/* Nome + Seletor Leeo/Marii (sem presets!) */}
            <div className="space-y-2.5">
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Digite qualquer coisa para levar..."
                aria-label="Nome da task"
                className="w-full px-3.5 py-3 text-base sm:text-sm rounded-xl border border-[var(--vice-border-strong)] bg-[var(--vice-surface)] text-[#F3ECF5] placeholder:text-[#8E7498] focus:outline-none focus:border-[#E07AB0]"
              />

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    setAssignedTo('leeo');
                  }}
                  className="py-2.5 rounded-xl font-display font-black text-sm border active:scale-95"
                  style={
                    assignedTo === 'leeo'
                      ? {
                          background: 'linear-gradient(90deg, #ECE3EE 0%, #D3C3D8 65%, #9E8AA6 100%)',
                          borderColor: '#ECE3EE',
                          color: '#22122A',
                        }
                      : {
                          backgroundColor: 'var(--vice-surface-subtle)',
                          borderColor: 'var(--vice-border)',
                          color: '#C7B4CE',
                        }
                  }
                >
                  Leeo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    setAssignedTo('marii');
                  }}
                  className="py-2.5 rounded-xl font-display font-black text-sm border active:scale-95"
                  style={
                    assignedTo === 'marii'
                      ? {
                          background: 'linear-gradient(90deg, #E07AB0 0%, #F09AC6 100%)',
                          borderColor: '#F09AC6',
                          color: '#22122A',
                        }
                      : {
                          backgroundColor: 'var(--vice-surface-subtle)',
                          borderColor: 'var(--vice-border)',
                          color: '#C7B4CE',
                        }
                  }
                >
                  Marii
                </button>
              </div>
            </div>

            {/* Botao de expansao sob demanda para abertura 120fps sem lag */}
            {!editingItem && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  setShowCustomizer((prev) => !prev);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-[var(--vice-border)] bg-[var(--vice-surface-subtle)] text-xs font-semibold text-[#C7B4CE] active:scale-[0.98]"
              >
                <span className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-[#E07AB0]" />
                  <span>Personalizar manualmente</span>
                </span>
                {showCustomizer ? (
                  <ChevronUp className="w-4 h-4 text-[#8E7498]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#8E7498]" />
                )}
              </button>
            )}

            {/* Estudio de Customizacao (montado sob demanda ou na edicao) */}
            {showCustomizer && (
              <div ref={customizerBodyRef} className="space-y-4">
                {/* Abas com indicador deslizante por mola WAAPI */}
                <div
                  ref={tabTrackRef}
                  className="relative grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--vice-surface-subtle)] border border-[var(--vice-border)]"
                >
                  <div
                    ref={tabIndicatorRef}
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-lg pearl-highlight-bar shadow"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setActiveTab('visual');
                    }}
                    className={`relative z-10 py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 ${
                      activeTab === 'visual' ? 'text-[#22122A]' : 'text-[#C7B4CE]'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>Visual</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setActiveTab('details');
                    }}
                    className={`relative z-10 py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 ${
                      activeTab === 'details' ? 'text-[#22122A]' : 'text-[#C7B4CE]'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Detalhes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('tap');
                      setActiveTab('checklist');
                    }}
                    className={`relative z-10 py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 ${
                      activeTab === 'checklist' ? 'text-[#22122A]' : 'text-[#C7B4CE]'
                    }`}
                  >
                    <ListChecks className="w-3.5 h-3.5" />
                    <span>Sub & Tags</span>
                  </button>
                </div>

                {/* ABA 1: VISUAL */}
                {activeTab === 'visual' && (
                  <div className="space-y-4">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8E7498] mb-2">
                        Estilo do Card
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {CARD_STYLES.map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => {
                              triggerHaptic('tap');
                              manualLocksRef.current.add('cardStyle');
                              setCardStyle(st.id);
                            }}
                            className={`py-2 px-1.5 rounded-xl border text-center active:scale-95 ${
                              cardStyle === st.id
                                ? 'border-[#E07AB0] bg-[#E07AB0]/20 text-[#F3ECF5]'
                                : 'border-[var(--vice-border)] bg-[var(--vice-surface-subtle)] text-[#C7B4CE]'
                            }`}
                          >
                            <span className="block text-xs font-bold">{st.label}</span>
                            <span className="block text-[9px] text-[#8E7498] truncate">
                              {st.hint}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8E7498] mb-2">
                        Tom do Card
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {ACCENT_COLORS.map((col) => {
                          const active = accentColor === col.id;
                          const swatchBg =
                            col.id === 'auto'
                              ? 'linear-gradient(135deg, #E6DCE8, #E07AB0)'
                              : col.hex;
                          return (
                            <button
                              key={col.id}
                              type="button"
                              onClick={() => {
                                triggerHaptic('tap');
                                manualLocksRef.current.add('accentColor');
                                setAccentColor(col.id);
                              }}
                              className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border active:scale-95 ${
                                active
                                  ? 'border-[#ECE3EE]/70 bg-[var(--vice-surface-strong)]'
                                  : 'border-[var(--vice-border)] bg-[var(--vice-surface-subtle)]'
                              }`}
                            >
                              <span
                                className="w-4 h-4 rounded-full shrink-0 border border-white/25"
                                style={{ background: swatchBg }}
                              />
                              <span className="text-[11px] font-semibold text-[#F3ECF5]">
                                {col.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <IconGridPanel
                      selectedIcon={icon}
                      accentHex={resolvedAccent.hex}
                      accentSoftBg={resolvedAccent.softBg}
                      accentGlow={resolvedAccent.glow}
                      onSelectIcon={handleSelectIcon}
                    />
                  </div>
                )}

                {/* ABA 2: DETALHES */}
                {activeTab === 'details' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8E7498] mb-1.5">
                          Quantidade
                        </span>
                        <div className="flex items-center justify-between p-1 rounded-xl border border-[var(--vice-border)] bg-[var(--vice-surface-subtle)]">
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('tap');
                              manualLocksRef.current.add('quantity');
                              setQuantity((q) => Math.max(1, q - 1));
                            }}
                            aria-label="Diminuir"
                            className="w-9 h-9 rounded-lg bg-[var(--vice-surface)] flex items-center justify-center text-[#F3ECF5] active:scale-90"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span
                            className="font-display text-lg font-black"
                            style={{ color: resolvedAccent.hex }}
                          >
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('tap');
                              manualLocksRef.current.add('quantity');
                              setQuantity((q) => Math.min(99, q + 1));
                            }}
                            aria-label="Aumentar"
                            className="w-9 h-9 rounded-lg bg-[var(--vice-surface)] flex items-center justify-center text-[#F3ECF5] active:scale-90"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8E7498] mb-1.5">
                          Categoria
                        </span>
                        <select
                          value={categoryId}
                          onChange={(e) => {
                            manualLocksRef.current.add('categoryId');
                            setCategoryId(e.target.value as CategoryId);
                          }}
                          className="w-full h-[46px] px-2.5 rounded-xl border border-[var(--vice-border)] bg-[var(--vice-surface)] text-base sm:text-xs font-semibold text-[#F3ECF5]"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8E7498] mb-1.5">
                        Prioridade
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {PRIORITY_OPTIONS.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              triggerHaptic('tap');
                              manualLocksRef.current.add('priority');
                              setPriority(p.id);
                            }}
                            className="py-2.5 rounded-xl border text-xs font-bold active:scale-95"
                            style={
                              priority === p.id
                                ? {
                                    borderColor: p.color,
                                    backgroundColor: `${p.color}24`,
                                    color: p.color,
                                  }
                                : {
                                    borderColor: 'var(--vice-border)',
                                    backgroundColor: 'var(--vice-surface-subtle)',
                                    color: '#C7B4CE',
                                  }
                            }
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8E7498] mb-1.5">
                        Onde vai guardar?
                      </span>
                      <div className="grid grid-cols-5 gap-1.5">
                        {BAG_LOCATIONS.map(({ id, label, Icon }) => {
                          const active = bag === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => {
                                triggerHaptic('tap');
                                manualLocksRef.current.add('bag');
                                setBag(id);
                              }}
                              className="py-2 px-1 rounded-xl border flex flex-col items-center gap-1 active:scale-95"
                              style={
                                active
                                  ? {
                                      borderColor: resolvedAccent.hex,
                                      backgroundColor: resolvedAccent.softBg,
                                      color: resolvedAccent.hex,
                                    }
                                  : {
                                      borderColor: 'var(--vice-border)',
                                      backgroundColor: 'var(--vice-surface-subtle)',
                                      color: '#C7B4CE',
                                    }
                              }
                            >
                              <Icon className="w-4 h-4" />
                              <span className="text-[9px] font-bold truncate w-full text-center">
                                {label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="task-note-field"
                        className="block text-[10px] font-bold uppercase tracking-wider text-[#8E7498] mb-1.5"
                      >
                        Nota rápida
                      </label>
                      <textarea
                        id="task-note-field"
                        rows={2}
                        maxLength={180}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Ex: versão FPS 50, no bolso frontal..."
                        className="w-full px-3 py-2 text-base sm:text-xs rounded-xl border border-[var(--vice-border)] bg-[var(--vice-surface)] text-[#F3ECF5] placeholder:text-[#8E7498] resize-none focus:outline-none focus:border-[#E07AB0]"
                      />
                    </div>
                  </div>
                )}

                {/* ABA 3: SUB-CHECKLIST & TAGS */}
                {activeTab === 'checklist' && (
                  <div className="space-y-4">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8E7498] mb-1.5">
                        Sub-checklist interno
                      </span>
                      <div className="flex gap-1.5 mb-2">
                        <input
                          type="text"
                          value={subtaskInput}
                          onChange={(e) => setSubtaskInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addSubtask();
                            }
                          }}
                          placeholder="Ex: Cabo USB-C, adaptador..."
                          className="flex-1 px-3 py-2 text-base sm:text-xs rounded-xl border border-[var(--vice-border)] bg-[var(--vice-surface)] text-[#F3ECF5] placeholder:text-[#8E7498]"
                        />
                        <button
                          type="button"
                          onClick={addSubtask}
                          aria-label="Adicionar sub-tarefa"
                          className="px-3.5 rounded-xl font-bold text-xs text-[#22122A] active:scale-95"
                          style={{ backgroundColor: resolvedAccent.hex }}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {subtasks.length > 0 && (
                        <div className="space-y-1.5">
                          {subtasks.map((sub) => (
                            <div
                              key={sub.id}
                              className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-[var(--vice-surface-subtle)] border border-[var(--vice-border)]"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setSubtasks((prev) =>
                                    prev.map((s) =>
                                      s.id === sub.id ? { ...s, done: !s.done } : s
                                    )
                                  )
                                }
                                className="flex items-center gap-2 min-w-0 flex-1 text-left"
                              >
                                <span
                                  className="w-4 h-4 rounded flex items-center justify-center border shrink-0"
                                  style={{
                                    borderColor: sub.done
                                      ? resolvedAccent.hex
                                      : 'var(--vice-border-strong)',
                                    backgroundColor: sub.done ? resolvedAccent.hex : 'transparent',
                                    color: '#22122A',
                                  }}
                                >
                                  {sub.done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </span>
                                <span
                                  className={`text-xs truncate ${
                                    sub.done ? 'line-through text-[#8E7498]' : 'text-[#F3ECF5]'
                                  }`}
                                >
                                  {sub.text}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setSubtasks((prev) => prev.filter((s) => s.id !== sub.id))
                                }
                                aria-label="Remover sub-tarefa"
                                className="p-1 text-[#8E7498] hover:text-[#F09AC6]"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8E7498] mb-1.5">
                        Etiquetas personalizadas (até 6)
                      </span>
                      <div className="flex gap-1.5 mb-2">
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addTag(tagInput);
                            }
                          }}
                          placeholder="Criar etiqueta (ex: jantar)"
                          className="flex-1 px-3 py-2 text-base sm:text-xs rounded-xl border border-[var(--vice-border)] bg-[var(--vice-surface)] text-[#F3ECF5] placeholder:text-[#8E7498]"
                        />
                        <button
                          type="button"
                          onClick={() => addTag(tagInput)}
                          aria-label="Adicionar etiqueta"
                          className="px-3.5 rounded-xl font-bold text-xs bg-[var(--vice-surface-strong)] border border-[var(--vice-border-strong)] text-[#F3ECF5] active:scale-95"
                        >
                          <Tag className="w-4 h-4" />
                        </button>
                      </div>

                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                          {tags.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                manualLocksRef.current.add('tags');
                                setTags((prev) => prev.filter((x) => x !== t));
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                              style={{
                                backgroundColor: resolvedAccent.softBg,
                                color: resolvedAccent.hex,
                              }}
                            >
                              <span>#{t}</span>
                              <X className="w-3 h-3" />
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_TAGS.filter((t) => !tags.includes(t)).map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => addTag(preset)}
                            className="px-2.5 py-1 rounded-full text-[10px] font-semibold border border-[var(--vice-border)] bg-[var(--vice-surface-subtle)] text-[#C7B4CE] active:scale-95"
                          >
                            + #{preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Barra Fixa de Salvar / Excluir */}
          <div className="shrink-0 px-4 pt-3 pb-safe border-t border-[var(--vice-border)] bg-[var(--vice-sheet-bg)] flex items-center gap-2">
            {editingItem && onDelete && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('delete');
                  onDelete(editingItem.id);
                  onClose();
                }}
                aria-label="Excluir tarefa"
                className="w-12 h-12 rounded-xl border border-[#F09AC6]/40 bg-[#E07AB0]/15 text-[#F09AC6] flex items-center justify-center active:scale-90 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 h-12 rounded-xl font-display font-black text-sm tracking-wide text-[#22122A] disabled:opacity-40 active:scale-[0.98] shadow-lg"
              style={{
                background: 'linear-gradient(90deg, #ECE3EE 0%, #F09AC6 58%, #E07AB0 100%)',
              }}
            >
              {editingItem ? 'SALVAR ALTERAÇÕES' : 'ADICIONAR TASK'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
