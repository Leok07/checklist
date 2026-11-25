import React, { useRef, useState, useCallback, useEffect } from 'react';
import { GripVertical, Flame, Plus, ArrowLeftRight } from 'lucide-react';
import {
  ChecklistItem,
  ChecklistStats,
  PersonAssignment,
  SplitSnapMode,
} from '../types/checklist';
import { TASK_ICON_MAP, resolveAccentOption } from '../data/customization';
import { CardDensity, getCardVisualStyles } from './ItemCard';
import { VirtualTaskList } from './VirtualTaskList';
import { CardDragPayload } from '../motion/useSwipeAndDragCard';
import {
  createSpringChannel,
  setSurgicalWillChange,
  SPRING_BOUNCY,
  SpringChannel,
} from '../motion/springEngine';
import { triggerHaptic } from '../motion/haptics';

interface SplitStageProps {
  leeoItems: ChecklistItem[];
  mariiItems: ChecklistItem[];
  stats: ChecklistStats;
  snapMode: SplitSnapMode;
  onSnapModeChange: (mode: SplitSnapMode) => void;
  fabHoverTarget: PersonAssignment | null;
  onAdd: (person: PersonAssignment) => void;
  onToggle: (id: string, x: number, y: number) => void;
  onCustomize: (item: ChecklistItem) => void;
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onMoveOrReorder: (
    id: string,
    targetPerson: PersonAssignment,
    targetIndex: number,
    dropX: number,
    dropY: number
  ) => void;
}

export function getSplitRatioFromSnap(snapMode: SplitSnapMode): number {
  if (snapMode === 'leeo') return 0.76;
  if (snapMode === 'marii') return 0.24;
  return 0.5;
}

export const SplitStage: React.FC<SplitStageProps> = ({
  leeoItems,
  mariiItems,
  stats,
  snapMode,
  onSnapModeChange,
  fabHoverTarget,
  onAdd,
  onToggle,
  onCustomize,
  onRemove,
  onUpdateQuantity,
  onToggleSubtask,
  onMoveOrReorder,
}) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dividerBeamRef = useRef<HTMLDivElement | null>(null);
  const leeoColRef = useRef<HTMLDivElement | null>(null);
  const mariiColRef = useRef<HTMLDivElement | null>(null);
  const leeoScrollRef = useRef<HTMLDivElement | null>(null);
  const mariiScrollRef = useRef<HTMLDivElement | null>(null);
  const dragGhostRef = useRef<HTMLDivElement | null>(null);

  const dividerSpringRef = useRef<SpringChannel | null>(null);
  const dividerStateRef = useRef({
    active: false,
    pointerId: -1,
    startClientX: 0,
    offsetX: 0,
    lastTapTime: 0,
    previewSnap: snapMode as SplitSnapMode,
    rafPending: false,
    pendingDx: 0,
  });

  const [isDraggingDivider, setIsDraggingDivider] = useState(false);
  const [dividerPreviewSnap, setDividerPreviewSnap] = useState<SplitSnapMode | null>(null);

  // Estado do Drag-and-Drop de Cards (Ghost 120fps via DOM ref)
  const [draggedItem, setDraggedItem] = useState<ChecklistItem | null>(null);
  const [cardHoverTarget, setCardHoverTarget] = useState<{
    person: PersonAssignment;
    index: number;
  } | null>(null);

  const cardDragRef = useRef<{
    item: ChecklistItem | null;
    offsetX: number;
    offsetY: number;
    width: number;
    targetPerson: PersonAssignment;
    targetIndex: number;
  }>({
    item: null,
    offsetX: 0,
    offsetY: 0,
    width: 170,
    targetPerson: 'leeo',
    targetIndex: 0,
  });

  const splitRatio = getSplitRatioFromSnap(snapMode);

  // Mola GPU-first do feixe do divisor central (0 layout reflow durante o arraste!)
  useEffect(() => {
    const spring = createSpringChannel(
      0,
      SPRING_BOUNCY,
      (offsetX) => {
        dividerStateRef.current.offsetX = offsetX;
        const beam = dividerBeamRef.current;
        if (beam) {
          beam.style.transform =
            Math.abs(offsetX) < 0.1 ? '' : `translate3d(${offsetX.toFixed(2)}px, 0, 0)`;
        }

        // Feedback visual 100% GPU nas colunas (escala + opacidade) sem disparar reflow
        const stageWidth = stageRef.current?.clientWidth || 390;
        const norm = Math.max(-1, Math.min(1, offsetX / (stageWidth * 0.28)));
        if (leeoColRef.current && mariiColRef.current) {
          if (Math.abs(norm) < 0.01) {
            leeoColRef.current.style.transform = '';
            leeoColRef.current.style.opacity = '';
            mariiColRef.current.style.transform = '';
            mariiColRef.current.style.opacity = '';
          } else {
            const leeoScale = 1 + norm * 0.025;
            const mariiScale = 1 - norm * 0.025;
            leeoColRef.current.style.transform = `scale3d(${leeoScale.toFixed(4)}, ${leeoScale.toFixed(4)}, 1)`;
            mariiColRef.current.style.transform = `scale3d(${mariiScale.toFixed(4)}, ${mariiScale.toFixed(4)}, 1)`;
            leeoColRef.current.style.opacity = norm < 0 ? String(Math.max(0.68, 1 + norm * 0.28)) : '1';
            mariiColRef.current.style.opacity = norm > 0 ? String(Math.max(0.68, 1 - norm * 0.28)) : '1';
          }
        }
      },
      () => {
        setSurgicalWillChange(dividerBeamRef.current, false);
        setSurgicalWillChange(leeoColRef.current, false);
        setSurgicalWillChange(mariiColRef.current, false);
      }
    );

    dividerSpringRef.current = spring;
    return () => {
      spring.stop();
      setSurgicalWillChange(dividerBeamRef.current, false);
      setSurgicalWillChange(leeoColRef.current, false);
      setSurgicalWillChange(mariiColRef.current, false);
    };
  }, []);

  const computeSnapFromX = useCallback((clientX: number): SplitSnapMode => {
    const stage = stageRef.current;
    if (!stage) return 'even';
    const rect = stage.getBoundingClientRect();
    const rel = (clientX - rect.left) / Math.max(1, rect.width);
    if (rel >= 0.62) return 'leeo';
    if (rel <= 0.38) return 'marii';
    return 'even';
  }, []);

  const onDividerPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button > 0) return;
      e.stopPropagation();

      const now = performance.now();
      const s = dividerStateRef.current;
      // Toque duplo no divisor centraliza 50/50 imediatamente
      if (now - s.lastTapTime < 280) {
        s.lastTapTime = 0;
        triggerHaptic('snap');
        onSnapModeChange('even');
        dividerSpringRef.current?.setTarget(0);
        return;
      }
      s.lastTapTime = now;

      s.active = true;
      s.pointerId = e.pointerId;
      s.startClientX = e.clientX;
      s.previewSnap = snapMode;

      setIsDraggingDivider(true);
      setDividerPreviewSnap(snapMode);
      setSurgicalWillChange(dividerBeamRef.current, true, 'transform');
      setSurgicalWillChange(leeoColRef.current, true, 'transform, opacity');
      setSurgicalWillChange(mariiColRef.current, true, 'transform, opacity');
      dividerSpringRef.current?.stop();
      triggerHaptic('tap');

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignora
      }
    },
    [onSnapModeChange, snapMode]
  );

  const onDividerPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const s = dividerStateRef.current;
      if (!s.active || e.pointerId !== s.pointerId) return;

      const stage = stageRef.current;
      const stageWidth = stage ? stage.clientWidth : 390;
      const currentDividerPx = stageWidth * splitRatio;
      const minDx = stageWidth * 0.2 - currentDividerPx;
      const maxDx = stageWidth * 0.8 - currentDividerPx;

      s.pendingDx = Math.max(minDx, Math.min(maxDx, e.clientX - s.startClientX));

      const nextSnap = computeSnapFromX(e.clientX);
      if (nextSnap !== s.previewSnap) {
        s.previewSnap = nextSnap;
        triggerHaptic('tap');
        setDividerPreviewSnap(nextSnap);
      }

      if (!s.rafPending) {
        s.rafPending = true;
        window.requestAnimationFrame(() => {
          dividerStateRef.current.rafPending = false;
          if (dividerStateRef.current.active) {
            dividerSpringRef.current?.setImmediate(dividerStateRef.current.pendingDx);
          }
        });
      }
    },
    [computeSnapFromX, splitRatio]
  );

  const finishDividerDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
      const s = dividerStateRef.current;
      if (!s.active || e.pointerId !== s.pointerId) return;

      s.active = false;
      s.pointerId = -1;
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignora
      }

      const chosen = s.previewSnap;
      setIsDraggingDivider(false);
      setDividerPreviewSnap(null);

      if (!cancelled && chosen !== snapMode) {
        triggerHaptic('snap');
        onSnapModeChange(chosen);
        dividerSpringRef.current?.setImmediate(0);
      } else {
        dividerSpringRef.current?.setTarget(0);
      }
    },
    [onSnapModeChange, snapMode]
  );

  // --- DRAG AND DROP DE CARDS (CRUZAR DIVISOR + REORDENAR) ---
  const computeDropSlot = useCallback(
    (clientX: number, clientY: number): { person: PersonAssignment; index: number } => {
      const stage = stageRef.current;
      if (!stage) return { person: 'leeo', index: 0 };

      const rect = stage.getBoundingClientRect();
      const dividerX = rect.left + rect.width * splitRatio;
      const person: PersonAssignment = clientX < dividerX ? 'leeo' : 'marii';

      const scrollEl = person === 'leeo' ? leeoScrollRef.current : mariiScrollRef.current;
      const list = person === 'leeo' ? leeoItems : mariiItems;
      if (!scrollEl || list.length === 0) {
        return { person, index: 0 };
      }

      const slotEls = scrollEl.querySelectorAll<HTMLElement>('[data-task-slot]');
      let targetIndex = list.length;

      for (let i = 0; i < slotEls.length; i++) {
        const slotRect = slotEls[i].getBoundingClientRect();
        const midY = slotRect.top + slotRect.height / 2;
        if (clientY < midY) {
          targetIndex = Number(slotEls[i].dataset.taskSlot) || i;
          break;
        }
      }

      return { person, index: targetIndex };
    },
    [leeoItems, mariiItems, splitRatio]
  );

  const handleCardDragStart = useCallback(
    (payload: CardDragPayload) => {
      const found =
        leeoItems.find((i) => i.id === payload.id) ||
        mariiItems.find((i) => i.id === payload.id);
      if (!found) return;

      const offsetX = payload.clientX - payload.rect.left;
      const offsetY = payload.clientY - payload.rect.top;

      cardDragRef.current = {
        item: found,
        offsetX,
        offsetY,
        width: Math.min(240, Math.max(150, payload.rect.width)),
        targetPerson: found.assignedTo,
        targetIndex: 0,
      };

      setDraggedItem(found);
      const slot = computeDropSlot(payload.clientX, payload.clientY);
      cardDragRef.current.targetPerson = slot.person;
      cardDragRef.current.targetIndex = slot.index;
      setCardHoverTarget(slot);

      window.requestAnimationFrame(() => {
        const ghost = dragGhostRef.current;
        if (ghost) {
          const x = payload.clientX - offsetX;
          const y = payload.clientY - offsetY;
          ghost.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale3d(1.05, 1.05, 1)`;
        }
      });
    },
    [computeDropSlot, leeoItems, mariiItems]
  );

  const handleCardDragMove = useCallback(
    (clientX: number, clientY: number, vx: number) => {
      const info = cardDragRef.current;
      if (!info.item) return;

      const ghost = dragGhostRef.current;
      if (ghost) {
        const x = clientX - info.offsetX;
        const y = clientY - info.offsetY;
        const tilt = Math.max(-6, Math.min(6, vx * 0.008));
        ghost.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale3d(1.05, 1.05, 1) rotateZ(${tilt.toFixed(2)}deg)`;
      }

      const nextSlot = computeDropSlot(clientX, clientY);
      if (
        nextSlot.person !== info.targetPerson ||
        nextSlot.index !== info.targetIndex
      ) {
        if (nextSlot.person !== info.targetPerson) {
          triggerHaptic('snap');
        }
        info.targetPerson = nextSlot.person;
        info.targetIndex = nextSlot.index;
        setCardHoverTarget(nextSlot);
      }
    },
    [computeDropSlot]
  );

  const handleCardDragEnd = useCallback(
    (clientX: number, clientY: number) => {
      const info = cardDragRef.current;
      const item = info.item;
      cardDragRef.current.item = null;
      setDraggedItem(null);
      setCardHoverTarget(null);

      if (!item) return;
      onMoveOrReorder(item.id, info.targetPerson, info.targetIndex, clientX, clientY);
    },
    [onMoveOrReorder]
  );

  const leeoDensity: CardDensity =
    snapMode === 'leeo' ? 'expanded' : snapMode === 'marii' ? 'rail' : 'compact';
  const mariiDensity: CardDensity =
    snapMode === 'marii' ? 'expanded' : snapMode === 'leeo' ? 'rail' : 'compact';

  const activeDropPerson =
    fabHoverTarget ?? (draggedItem && cardHoverTarget ? cardHoverTarget.person : null);
  const isCrossTransfer = Boolean(
    draggedItem && cardHoverTarget && draggedItem.assignedTo !== cardHoverTarget.person
  );

  return (
    <div ref={stageRef} className="relative flex-1 min-h-0 flex overflow-hidden">
      {/* COLUNA ESQUERDA: LEEO */}
      <div
        ref={leeoColRef}
        className="relative h-full flex flex-col min-w-0"
        style={{ flexBasis: `${splitRatio * 100}%`, flexShrink: 0 }}
      >
        {/* Highlight de zona de drop (FAB ou Card arrastado) - GPU opacity-only */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-1.5 rounded-2xl border-2 border-[#00F0FF] z-20 transition-opacity duration-150"
          style={{
            opacity: activeDropPerson === 'leeo' ? 0.9 : 0,
            boxShadow: 'inset 0 0 28px rgba(0, 240, 255, 0.22)',
          }}
        />

        {/* Cabecalho Limpo: Apenas "Leeo" (sem "Lado") */}
        <div className="shrink-0 px-2.5 pt-2.5 pb-2 border-b border-[var(--vice-border)]">
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('snap');
                onSnapModeChange(snapMode === 'leeo' ? 'even' : 'leeo');
              }}
              className="flex items-center gap-1.5 min-w-0 text-left active:scale-95 transition-transform"
              title="Toque para expandir ou centralizar Leeo"
            >
              <h2
                className="font-display font-black tracking-tight leading-none truncate"
                style={{
                  fontSize: leeoDensity === 'rail' ? '15px' : '20px',
                  color: 'var(--vice-leeo)',
                }}
              >
                Leeo
              </h2>
              {leeoDensity !== 'rail' && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--vice-leeo-soft)] text-[var(--vice-leeo)] shrink-0">
                  {stats.leeo.completed}/{stats.leeo.total}
                </span>
              )}
              {leeoDensity !== 'rail' && stats.leeo.urgentPending > 0 && (
                <span
                  title={`${stats.leeo.urgentPending} urgente(s)`}
                  className="inline-flex items-center text-[#FF3B5C] shrink-0"
                >
                  <Flame className="w-3 h-3" />
                </span>
              )}
            </button>

            {leeoDensity !== 'rail' && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  onAdd('leeo');
                }}
                aria-label="Adicionar tarefa para Leeo"
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--vice-leeo-soft)] text-[var(--vice-leeo)] active:scale-90 transition-transform shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.75]" />
              </button>
            )}
          </div>

          {/* Barra de progresso GPU-only (scaleX) */}
          <div className="mt-2 flex items-center gap-1.5">
            <div className="flex-1 h-1.5 rounded-full bg-[var(--vice-surface-subtle)] overflow-hidden">
              <div
                className="h-full w-full rounded-full origin-left transition-transform duration-300"
                style={{
                  background: 'linear-gradient(90deg, #00F0FF, #38BDF8)',
                  transform: `scaleX(${stats.leeo.progressPercent / 100})`,
                }}
              />
            </div>
            {leeoDensity !== 'rail' && (
              <span className="text-[10px] font-black tabular-nums text-[var(--vice-leeo)] shrink-0">
                {stats.leeo.progressPercent}%
              </span>
            )}
          </div>
        </div>

        {/* Lista Virtualizada do Leeo */}
        <VirtualTaskList
          person="leeo"
          items={leeoItems}
          density={leeoDensity}
          draggedItemId={draggedItem?.id ?? null}
          dropInsertIndex={
            draggedItem && cardHoverTarget?.person === 'leeo' ? cardHoverTarget.index : null
          }
          scrollContainerRef={(el) => {
            leeoScrollRef.current = el;
          }}
          onAdd={onAdd}
          onToggle={onToggle}
          onCustomize={onCustomize}
          onRemove={onRemove}
          onUpdateQuantity={onUpdateQuantity}
          onToggleSubtask={onToggleSubtask}
          onDragStart={handleCardDragStart}
          onDragMove={handleCardDragMove}
          onDragEnd={handleCardDragEnd}
        />
      </div>

      {/* DIVISOR CENTRAL NEON ARRASTAVEL (GPU translate3d durante arraste) */}
      <div
        ref={dividerBeamRef}
        onPointerDown={onDividerPointerDown}
        onPointerMove={onDividerPointerMove}
        onPointerUp={(e) => finishDividerDrag(e, false)}
        onPointerCancel={(e) => finishDividerDrag(e, true)}
        role="separator"
        aria-orientation="vertical"
        aria-label="Arraste para redimensionar Leeo e Marii ou toque duas vezes para 50/50"
        className="absolute top-0 bottom-0 z-30 w-6 -ml-3 flex items-center justify-center touch-none select-none cursor-col-resize"
        style={{ left: `${splitRatio * 100}%` }}
      >
        {/* Feixe luminoso vertical */}
        <div
          className="h-full transition-transform duration-150"
          style={{
            width: isDraggingDivider || isCrossTransfer ? '3px' : '2px',
            background: 'var(--vice-divider)',
            boxShadow:
              isDraggingDivider || isCrossTransfer
                ? '0 0 18px rgba(255, 46, 147, 0.85), 0 0 12px rgba(0, 240, 255, 0.85)'
                : '0 0 8px rgba(168, 85, 247, 0.35)',
          }}
        />

        {/* Pegador tatil central */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-11 rounded-full border border-[var(--vice-border-strong)] bg-[var(--vice-surface-strong)] flex items-center justify-center shadow-lg"
          style={{
            boxShadow: isDraggingDivider
              ? '0 0 16px rgba(0, 240, 255, 0.65), 0 0 16px rgba(255, 46, 147, 0.65)'
              : '0 4px 12px rgba(0, 0, 0, 0.35)',
          }}
        >
          <GripVertical className="w-3 h-3 text-[var(--vice-text-secondary)]" />
        </div>

        {/* Etiqueta flutuante de snap enquanto arrasta o divisor */}
        {isDraggingDivider && dividerPreviewSnap && (
          <div className="absolute top-12 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#080412]/90 text-white border border-white/25 whitespace-nowrap shadow-xl pointer-events-none">
            {dividerPreviewSnap === 'leeo'
              ? 'Foco Leeo'
              : dividerPreviewSnap === 'marii'
              ? 'Foco Marii'
              : '50 / 50'}
          </div>
        )}

        {/* Portal indicador ao cruzar card entre Leeo e Marii */}
        {isCrossTransfer && cardHoverTarget && (
          <div className="absolute top-14 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-[#00E5FF] to-[#FF2E93] text-[#080412] flex items-center gap-1 whitespace-nowrap shadow-xl pointer-events-none">
            <ArrowLeftRight className="w-3 h-3" />
            <span>{cardHoverTarget.person === 'leeo' ? 'Leeo' : 'Marii'}</span>
          </div>
        )}
      </div>

      {/* COLUNA DIREITA: MARII */}
      <div
        ref={mariiColRef}
        className="relative h-full flex flex-col min-w-0"
        style={{ flexBasis: `${(1 - splitRatio) * 100}%`, flexShrink: 0 }}
      >
        {/* Highlight de zona de drop (FAB ou Card arrastado) - GPU opacity-only */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-1.5 rounded-2xl border-2 border-[#FF2E93] z-20 transition-opacity duration-150"
          style={{
            opacity: activeDropPerson === 'marii' ? 0.9 : 0,
            boxShadow: 'inset 0 0 28px rgba(255, 46, 147, 0.24)',
          }}
        />

        {/* Cabecalho Limpo: Apenas "Marii" (sem "Lado") */}
        <div className="shrink-0 px-2.5 pt-2.5 pb-2 border-b border-[var(--vice-border)]">
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('snap');
                onSnapModeChange(snapMode === 'marii' ? 'even' : 'marii');
              }}
              className="flex items-center gap-1.5 min-w-0 text-left active:scale-95 transition-transform"
              title="Toque para expandir ou centralizar Marii"
            >
              <h2
                className="font-display font-black tracking-tight leading-none truncate"
                style={{
                  fontSize: mariiDensity === 'rail' ? '15px' : '20px',
                  color: 'var(--vice-marii)',
                }}
              >
                Marii
              </h2>
              {mariiDensity !== 'rail' && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--vice-marii-soft)] text-[var(--vice-marii)] shrink-0">
                  {stats.marii.completed}/{stats.marii.total}
                </span>
              )}
              {mariiDensity !== 'rail' && stats.marii.urgentPending > 0 && (
                <span
                  title={`${stats.marii.urgentPending} urgente(s)`}
                  className="inline-flex items-center text-[#FF3B5C] shrink-0"
                >
                  <Flame className="w-3 h-3" />
                </span>
              )}
            </button>

            {mariiDensity !== 'rail' && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('tap');
                  onAdd('marii');
                }}
                aria-label="Adicionar tarefa para Marii"
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--vice-marii-soft)] text-[var(--vice-marii)] active:scale-90 transition-transform shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.75]" />
              </button>
            )}
          </div>

          {/* Barra de progresso GPU-only (scaleX) */}
          <div className="mt-2 flex items-center gap-1.5">
            <div className="flex-1 h-1.5 rounded-full bg-[var(--vice-surface-subtle)] overflow-hidden">
              <div
                className="h-full w-full rounded-full origin-left transition-transform duration-300"
                style={{
                  background: 'linear-gradient(90deg, #FF2E93, #FFB84D)',
                  transform: `scaleX(${stats.marii.progressPercent / 100})`,
                }}
              />
            </div>
            {mariiDensity !== 'rail' && (
              <span className="text-[10px] font-black tabular-nums text-[var(--vice-marii)] shrink-0">
                {stats.marii.progressPercent}%
              </span>
            )}
          </div>
        </div>

        {/* Lista Virtualizada da Marii */}
        <VirtualTaskList
          person="marii"
          items={mariiItems}
          density={mariiDensity}
          draggedItemId={draggedItem?.id ?? null}
          dropInsertIndex={
            draggedItem && cardHoverTarget?.person === 'marii' ? cardHoverTarget.index : null
          }
          scrollContainerRef={(el) => {
            mariiScrollRef.current = el;
          }}
          onAdd={onAdd}
          onToggle={onToggle}
          onCustomize={onCustomize}
          onRemove={onRemove}
          onUpdateQuantity={onUpdateQuantity}
          onToggleSubtask={onToggleSubtask}
          onDragStart={handleCardDragStart}
          onDragMove={handleCardDragMove}
          onDragEnd={handleCardDragEnd}
        />
      </div>

      {/* DRAG GHOST FLUTUANTE GPU 120FPS */}
      {draggedItem && (() => {
        const { background, borderColor } = getCardVisualStyles(draggedItem);
        const accent = resolveAccentOption(
          draggedItem.accentColor,
          cardHoverTarget?.person ?? draggedItem.assignedTo
        );
        const GhostIcon = TASK_ICON_MAP[draggedItem.icon] ?? TASK_ICON_MAP.sparkles;
        return (
          <div
            ref={dragGhostRef}
            aria-hidden="true"
            className="pointer-events-none fixed top-0 left-0 z-50 rounded-2xl border-2 p-2.5 shadow-2xl"
            style={{
              width: `${cardDragRef.current.width}px`,
              background,
              borderColor: accent.hex || borderColor,
              boxShadow: `0 18px 40px rgba(0, 0, 0, 0.45), ${accent.glow}`,
              willChange: 'transform',
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: accent.softBg, color: accent.hex }}
              >
                <GhostIcon className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-[var(--vice-text-primary)] truncate">
                {draggedItem.name}
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
