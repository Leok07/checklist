import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Check,
  Sparkles,
  Palette,
  Sliders,
  ListChecks,
  Flame,
  Star,
  Tag,
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
  CARD_STYLES,
  PRESET_TAGS,
  PRIORITY_OPTIONS,
  QUICK_TASK_SUGGESTIONS,
  TASK_ICONS,
  TASK_ICON_MAP,
  resolveAccentOption,
} from '../data/customization';
import { getCardVisualStyles } from './ItemCard';
import {
  createSpringChannel,
  setSurgicalWillChange,
  SPRING_SHEET,
  SpringChannel,
} from '../motion/springEngine';
import { triggerHaptic } from '../motion/haptics';

interface TaskStudioSheetProps {
  isOpen: boolean;
  editingItem: ChecklistItem | null;
  initialPerson: PersonAssignment;
  onClose: () => void;
  onSaveNew: (draft: TaskDraft) => Promise<void>;
  onSaveEdit: (id: string, draft: TaskDraft) => Promise<void>;
  onDelete?: (id: string) => void;
}

type StudioTab = 'visual' | 'details' | 'checklist';

export const TaskStudioSheet: React.FC<TaskStudioSheetProps> = ({
  isOpen,
  editingItem,
  initialPerson,
  onClose,
  onSaveNew,
  onSaveEdit,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [assignedTo, setAssignedTo] = useState<PersonAssignment>(initialPerson);
  const [categoryId, setCategoryId] = useState<CategoryId>('praia');
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

  const inputRef = useRef<HTMLInputElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const springYRef = useRef<SpringChannel | null>(null);
  const dragSheetRef = useRef({
    active: false,
    pointerId: -1,
    startY: 0,
    lastY: 0,
    lastTime: 0,
    vy: 0,
    currentY: 0,
  });

  // Inicializa rascunho ao abrir
  useEffect(() => {
    if (!isOpen) return;

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
    } else {
      setName('');
      setAssignedTo(initialPerson);
      setCategoryId('praia');
      setIcon('sparkles');
      setAccentColor('auto');
      setCardStyle('glass');
      setQuantity(1);
      setBag('mala');
      setPriority('normal');
      setNote('');
      setTags([]);
      setSubtasks([]);
    }
    setTagInput('');
    setSubtaskInput('');
    setActiveTab('visual');

    // Entrada com fisica de mola GPU-only
    const sheet = sheetRef.current;
    if (sheet) {
      setSurgicalWillChange(sheet, true, 'transform');
    }
    const spring = createSpringChannel(
      340,
      SPRING_SHEET,
      (y) => {
        dragSheetRef.current.currentY = y;
        if (sheetRef.current) {
          sheetRef.current.style.transform =
            Math.abs(y) < 0.2 ? '' : `translate3d(0, ${y.toFixed(2)}px, 0)`;
        }
      },
      () => {
        if (!dragSheetRef.current.active) {
          setSurgicalWillChange(sheetRef.current, false);
        }
      }
    );
    springYRef.current = spring;
    spring.setTarget(0);

    const focusTimer = window.setTimeout(() => {
      if (!editingItem) inputRef.current?.focus();
    }, 140);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKey);
      spring.stop();
      setSurgicalWillChange(sheetRef.current, false);
    };
  }, [isOpen, editingItem, initialPerson, onClose]);

  const handleSheetHandleDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragSheetRef.current;
    d.active = true;
    d.pointerId = e.pointerId;
    d.startY = e.clientY - d.currentY;
    d.lastY = e.clientY;
    d.lastTime = performance.now();
    d.vy = 0;
    setSurgicalWillChange(sheetRef.current, true, 'transform');
    springYRef.current?.stop();
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
    springYRef.current?.setImmediate(dy, d.vy);
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

      if (d.currentY > 110 || d.vy > 680) {
        triggerHaptic('tap');
        onClose();
      } else {
        springYRef.current?.setTarget(0, d.vy * 0.3);
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  const previewItem: ChecklistItem = {
    id: editingItem?.id ?? 'preview',
    name: name.trim() || 'Sua nova task de viagem',
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

  const addTag = (raw: string) => {
    const clean = raw.trim().toLowerCase().replace(/^#+/, '').slice(0, 18);
    if (!clean || tags.includes(clean) || tags.length >= 6) return;
    triggerHaptic('tap');
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
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-sheet-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-sm"
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
              className="font-display text-base font-black italic tracking-tight vice-title-text"
            >
              {editingItem ? 'PERSONALIZAR TASK' : 'NOVA TASK'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar estúdio"
              className="w-9 h-9 rounded-xl bg-[var(--vice-surface-subtle)] text-[var(--vice-text-secondary)] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preview Ao Vivo do Card */}
        <div className="px-4 pb-3 shrink-0">
          <div
            className="relative rounded-2xl border p-2.5 overflow-hidden"
            style={{
              background: previewStyles.background,
              borderColor: previewStyles.borderColor,
              boxShadow: previewStyles.boxShadow,
            }}
          >
            {priority === 'urgent' && (
              <span
                aria-hidden="true"
                className="vice-urgent-aura pointer-events-none absolute inset-0 rounded-2xl border-[1.5px] border-[#FF3B5C]"
              />
            )}
            <span
              className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
              style={{ backgroundColor: resolvedAccent.hex }}
            />
            <div className="flex items-center gap-2.5 pl-1.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: resolvedAccent.softBg, color: resolvedAccent.hex }}
              >
                <PreviewIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[var(--vice-text-primary)] truncate">
                  {previewItem.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span
                    className="text-[10px] font-black uppercase"
                    style={{ color: assignedTo === 'leeo' ? 'var(--vice-leeo)' : 'var(--vice-marii)' }}
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
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-[#FF3B5C]">
                      <Flame className="w-2.5 h-2.5" />
                      Urgente
                    </span>
                  )}
                  {priority === 'essential' && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[#FFB84D]">
                      <Star className="w-2.5 h-2.5" />
                      Essencial
                    </span>
                  )}
                  {subtasks.length > 0 && (
                    <span className="text-[9px] font-semibold text-[var(--vice-text-muted)]">
                      {subtasks.filter((s) => s.done).length}/{subtasks.length} sub
                    </span>
                  )}
                  {tags.slice(0, 2).map((t) => (
                    <span key={t} className="text-[9px] font-semibold text-[var(--vice-text-muted)]">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Corpo Rolavel do Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto scrollbar-none px-4 pb-4 space-y-4">
            {/* Nome + Seletor Leeo/Marii (fluxo rapido de 2 segundos) */}
            <div className="space-y-2.5">
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="O que vai levar na viagem?"
                aria-label="Nome da task"
                className="w-full px-3.5 py-3 text-base sm:text-sm rounded-2xl border border-[var(--vice-border-strong)] bg-[var(--vice-surface)] text-[var(--vice-text-primary)] placeholder:text-[var(--vice-text-muted)] focus:outline-none focus:border-[#00E5FF]"
              />

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('tap');
                    setAssignedTo('leeo');
                  }}
                  className="py-2.5 rounded-xl font-display font-black text-sm border transition-transform active:scale-95"
                  style={
                    assignedTo === 'leeo'
                      ? {
                          backgroundColor: 'var(--vice-leeo)',
                          borderColor: 'var(--vice-leeo)',
                          color: '#080412',
                          boxShadow: '0 0 18px rgba(0, 240, 255, 0.38)',
                        }
                      : {
                          backgroundColor: 'var(--vice-surface-subtle)',
                          borderColor: 'var(--vice-border)',
                          color: 'var(--vice-text-secondary)',
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
                  className="py-2.5 rounded-xl font-display font-black text-sm border transition-transform active:scale-95"
                  style={
                    assignedTo === 'marii'
                      ? {
                          backgroundColor: 'var(--vice-marii)',
                          borderColor: 'var(--vice-marii)',
                          color: '#FFFFFF',
                          boxShadow: '0 0 18px rgba(255, 46, 147, 0.42)',
                        }
                      : {
                          backgroundColor: 'var(--vice-surface-subtle)',
                          borderColor: 'var(--vice-border)',
                          color: 'var(--vice-text-secondary)',
                        }
                  }
                >
                  Marii
                </button>
              </div>

              {/* Sugestoes rapidas (apenas ao criar — nunca sobrescrevem o responsavel escolhido!) */}
              {!editingItem && (
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFB84D] shrink-0" />
                  {QUICK_TASK_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug.name}
                      type="button"
                      onClick={() => {
                        triggerHaptic('tap');
                        setName(sug.name);
                        setCategoryId(sug.categoryId);
                        setIcon(sug.icon);
                        setBag(sug.bag);
                      }}
                      className="px-2.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap border border-[var(--vice-border)] bg-[var(--vice-surface-subtle)] text-[var(--vice-text-secondary)] active:scale-95 transition-transform"
                    >
                      + {sug.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Abas do Estudio de Customizacao */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-[var(--vice-surface-subtle)] border border-[var(--vice-border)]">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  setActiveTab('visual');
                }}
                className={`py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 ${
                  activeTab === 'visual'
                    ? 'bg-[var(--vice-surface-strong)] text-[var(--vice-text-primary)] shadow'
                    : 'text-[var(--vice-text-muted)]'
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
                className={`py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 ${
                  activeTab === 'details'
                    ? 'bg-[var(--vice-surface-strong)] text-[var(--vice-text-primary)] shadow'
                    : 'text-[var(--vice-text-muted)]'
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
                className={`py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 ${
                  activeTab === 'checklist'
                    ? 'bg-[var(--vice-surface-strong)] text-[var(--vice-text-primary)] shadow'
                    : 'text-[var(--vice-text-muted)]'
                }`}
              >
                <ListChecks className="w-3.5 h-3.5" />
                <span>Sub & Tags</span>
              </button>
            </div>

            {/* ABA 1: VISUAL (ESTILO, COR NEON, 32 ICONES) */}
            {activeTab === 'visual' && (
              <div className="space-y-4">
                {/* Estilo do Card */}
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--vice-text-muted)] mb-2">
                    Estilo do Card
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {CARD_STYLES.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic('tap');
                          setCardStyle(st.id);
                        }}
                        className={`py-2 px-1.5 rounded-xl border text-center active:scale-95 transition-transform ${
                          cardStyle === st.id
                            ? 'border-[#00E5FF] bg-[#00E5FF]/15 text-[var(--vice-text-primary)]'
                            : 'border-[var(--vice-border)] bg-[var(--vice-surface-subtle)] text-[var(--vice-text-secondary)]'
                        }`}
                      >
                        <span className="block text-xs font-bold">{st.label}</span>
                        <span className="block text-[9px] text-[var(--vice-text-muted)] truncate">
                          {st.hint}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cor Neon Individual */}
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--vice-text-muted)] mb-2">
                    Cor Neon Vice
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {ACCENT_COLORS.map((col) => {
                      const active = accentColor === col.id;
                      const swatchBg =
                        col.id === 'auto'
                          ? 'linear-gradient(135deg, #00F0FF, #FF2E93)'
                          : col.hex;
                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => {
                            triggerHaptic('tap');
                            setAccentColor(col.id);
                          }}
                          className={`flex items-center gap-1.5 px-2 py-2 rounded-xl border active:scale-95 transition-transform ${
                            active
                              ? 'border-white/70 bg-[var(--vice-surface-strong)]'
                              : 'border-[var(--vice-border)] bg-[var(--vice-surface-subtle)]'
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full shrink-0 border border-white/30"
                            style={{ background: swatchBg }}
                          />
                          <span className="text-[10px] font-semibold text-[var(--vice-text-primary)] truncate">
                            {col.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 32 Icones Vetoriais Lucide (Zero Emojis) */}
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--vice-text-muted)] mb-2">
                    Ícone Vetorial (32 opções)
                  </span>
                  <div className="grid grid-cols-8 gap-1.5">
                    {TASK_ICONS.map(({ id, label, Icon }) => {
                      const selected = icon === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            triggerHaptic('tap');
                            setIcon(id);
                          }}
                          title={label}
                          aria-label={label}
                          className="aspect-square rounded-xl border flex items-center justify-center active:scale-90 transition-transform"
                          style={
                            selected
                              ? {
                                  backgroundColor: resolvedAccent.softBg,
                                  borderColor: resolvedAccent.hex,
                                  color: resolvedAccent.hex,
                                  boxShadow: resolvedAccent.glow,
                                }
                              : {
                                  backgroundColor: 'var(--vice-surface-subtle)',
                                  borderColor: 'var(--vice-border)',
                                  color: 'var(--vice-text-secondary)',
                                }
                          }
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ABA 2: DETALHES (QUANTIDADE, PRIORIDADE, BAGAGEM, CATEGORIA, NOTA) */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                {/* Quantidade + Prioridade */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--vice-text-muted)] mb-1.5">
                      Quantidade
                    </span>
                    <div className="flex items-center justify-between p-1 rounded-xl border border-[var(--vice-border)] bg-[var(--vice-surface-subtle)]">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('tap');
                          setQuantity((q) => Math.max(1, q - 1));
                        }}
                        aria-label="Diminuir"
                        className="w-9 h-9 rounded-lg bg-[var(--vice-surface)] flex items-center justify-center text-[var(--vice-text-primary)] active:scale-90"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-display text-lg font-black" style={{ color: resolvedAccent.hex }}>
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('tap');
                          setQuantity((q) => Math.min(99, q + 1));
                        }}
                        aria-label="Aumentar"
                        className="w-9 h-9 rounded-lg bg-[var(--vice-surface)] flex items-center justify-center text-[var(--vice-text-primary)] active:scale-90"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--vice-text-muted)] mb-1.5">
                      Categoria
                    </span>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value as CategoryId)}
                      className="w-full h-[46px] px-2.5 rounded-xl border border-[var(--vice-border)] bg-[var(--vice-surface)] text-base sm:text-xs font-semibold text-[var(--vice-text-primary)]"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Prioridade com Aura */}
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--vice-text-muted)] mb-1.5">
                    Prioridade
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {PRIORITY_OPTIONS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic('tap');
                          setPriority(p.id);
                        }}
                        className="py-2.5 rounded-xl border text-xs font-bold active:scale-95 transition-transform"
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
                                color: 'var(--vice-text-secondary)',
                              }
                        }
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Local na Bagagem */}
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--vice-text-muted)] mb-1.5">
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
                            setBag(id);
                          }}
                          className="py-2 px-1 rounded-xl border flex flex-col items-center gap-1 active:scale-95 transition-transform"
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
                                  color: 'var(--vice-text-secondary)',
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

                {/* Nota Rapida */}
                <div>
                  <label
                    htmlFor="task-note-field"
                    className="block text-[10px] font-bold uppercase tracking-wider text-[var(--vice-text-muted)] mb-1.5"
                  >
                    Nota rápida
                  </label>
                  <textarea
                    id="task-note-field"
                    rows={2}
                    maxLength={180}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ex: levar versão FPS 50, cor preta, no bolso frontal..."
                    className="w-full px-3 py-2 text-base sm:text-xs rounded-xl border border-[var(--vice-border)] bg-[var(--vice-surface)] text-[var(--vice-text-primary)] placeholder:text-[var(--vice-text-muted)] resize-none focus:outline-none focus:border-[#00E5FF]"
                  />
                </div>
              </div>
            )}

            {/* ABA 3: SUB-CHECKLIST & ETIQUETAS CUSTOMIZADAS */}
            {activeTab === 'checklist' && (
              <div className="space-y-4">
                {/* Sub-tasks */}
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--vice-text-muted)] mb-1.5">
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
                      className="flex-1 px-3 py-2 text-base sm:text-xs rounded-xl border border-[var(--vice-border)] bg-[var(--vice-surface)] text-[var(--vice-text-primary)] placeholder:text-[var(--vice-text-muted)]"
                    />
                    <button
                      type="button"
                      onClick={addSubtask}
                      aria-label="Adicionar sub-tarefa"
                      className="px-3.5 rounded-xl font-bold text-xs text-[#080412] active:scale-95 transition-transform"
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
                                prev.map((s) => (s.id === sub.id ? { ...s, done: !s.done } : s))
                              )
                            }
                            className="flex items-center gap-2 min-w-0 flex-1 text-left"
                          >
                            <span
                              className="w-4 h-4 rounded flex items-center justify-center border shrink-0"
                              style={{
                                borderColor: sub.done ? resolvedAccent.hex : 'var(--vice-border-strong)',
                                backgroundColor: sub.done ? resolvedAccent.hex : 'transparent',
                                color: '#080412',
                              }}
                            >
                              {sub.done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </span>
                            <span
                              className={`text-xs truncate ${
                                sub.done
                                  ? 'line-through text-[var(--vice-text-muted)]'
                                  : 'text-[var(--vice-text-primary)]'
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
                            className="p-1 text-[var(--vice-text-muted)] hover:text-[#FF3B5C]"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Etiquetas Personalizadas */}
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--vice-text-muted)] mb-1.5">
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
                      className="flex-1 px-3 py-2 text-base sm:text-xs rounded-xl border border-[var(--vice-border)] bg-[var(--vice-surface)] text-[var(--vice-text-primary)] placeholder:text-[var(--vice-text-muted)]"
                    />
                    <button
                      type="button"
                      onClick={() => addTag(tagInput)}
                      aria-label="Adicionar etiqueta"
                      className="px-3.5 rounded-xl font-bold text-xs bg-[var(--vice-surface-strong)] border border-[var(--vice-border-strong)] text-[var(--vice-text-primary)] active:scale-95"
                    >
                      <Tag className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Tags ativas */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {tags.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                          style={{ backgroundColor: resolvedAccent.softBg, color: resolvedAccent.hex }}
                        >
                          <span>#{t}</span>
                          <X className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Sugestoes rapidas de tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_TAGS.filter((t) => !tags.includes(t)).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => addTag(preset)}
                        className="px-2.5 py-1 rounded-full text-[10px] font-semibold border border-[var(--vice-border)] bg-[var(--vice-surface-subtle)] text-[var(--vice-text-secondary)] active:scale-95"
                      >
                        + #{preset}
                      </button>
                    ))}
                  </div>
                </div>
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
                className="w-12 h-12 rounded-2xl border border-[#FF3B5C]/40 bg-[#FF3B5C]/15 text-[#FF3B5C] flex items-center justify-center active:scale-90 transition-transform shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 h-12 rounded-2xl font-display font-black text-sm tracking-wide text-white disabled:opacity-40 active:scale-[0.98] transition-transform shadow-lg"
              style={{
                background: 'linear-gradient(95deg, #00C6FF 0%, #FF2E93 65%, #FFB84D 100%)',
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
