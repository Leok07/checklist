import React, { useRef, useState, useCallback, useEffect } from 'react';
import { GripVertical, Flame, ArrowLeftRight } from 'lucide-react';
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
  setSurgicalWillChange,
  SPRING_BOUNCY,
} from '../motion/springEngine';
import {
  animateSpringScaleX,
  animateSpringTransform,
  animateSpringTranslateX,
  cancelWaapiSpring,
  readActiveSpringState,
} from '../motion/waapiSpring';
import { triggerHaptic } from '../motion/haptics';

interface SplitStageProps {
  leeoItems: ChecklistItem[];
  mariiItems: ChecklistItem[];
  stats: ChecklistStats;
  snapMode: SplitSnapMode;
  onSnapModeChange: (mode: SplitSnapMode) => void;
  fabHoverTarget: PersonAssignment | null;
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
  ) => Promise<boolean>;
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
  const leeoBarRef = useRef<HTMLDivElement | null>(null);
  const mariiBarRef = useRef<HTMLDivElement | null>(null);
  const leeoScrollRef = useRef<HTMLDivElement | null>(null);
  const mariiScrollRef = useRef<HTMLDivElement | null>(null);
  const dragGhostRef = useRef<HTMLDivElement | null>(null);

  const prevLeeoRatioRef = useRef(stats.leeo.progressPercent / 100);
  const prevMariiRatioRef = useRef(stats.marii.progressPercent / 100);
  const prevSnapRatioRef = useRef(getSplitRatioFromSnap(snapMode));

  const dividerStateRef = useRef({
    active: false,
    pointerId: -1,
    startClientX: 0,
    lastClientX: 0,
    lastTime: 0,
    vx: 0,
    offsetX: 0,
    lastTapTime: 0,
    previewSnap: snapMode as SplitSnapMode,
    rafPending: false,
    pendingDx: 0,
  });

  const [isDraggingDivider, setIsDraggingDivider] = useState(false);
  const [dividerPreviewSnap, setDividerPreviewSnap] = useState<SplitSnapMode | null>(null);
  const [justLandedId, setJustLandedId] = useState<string | null>(null);

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

  // Barras de progresso 100% assincronas com fisica de mola WAAPI (scaleX GPU)
  useEffect(() => {
    const next = stats.leeo.progressPercent / 100;
    const bar = leeoBarRef.current;
    if (!bar) return;
    if (Math.abs(prevLeeoRatioRef.current - next) > 0.001) {
      animateSpringScaleX(bar, prevLeeoRatioRef.current, next, SPRING_BOUNCY);
      prevLeeoRatioRef.current = next;
    } else {
      bar.style.transform = `scaleX(${next.toFixed(4)})`;
    }
  }, [stats.leeo.progressPercent]);

  useEffect(() => {
    const next = stats.marii.progressPercent / 100;
    const bar = mariiBarRef.current;
    if (!bar) return;
    if (Math.abs(prevMariiRatioRef.current - next) > 0.001) {
      animateSpringScaleX(bar, prevMariiRatioRef.current, next, SPRING_BOUNCY);
      prevMariiRatioRef.current = next;
    } else {
      bar.style.transform = `scaleX(${next.toFixed(4)})`;
    }
  }, [stats.marii.progressPercent]);

  // Efeito mola WAAPI no feixe divisor e nas colunas sempre que snapMode muda (toque no nome ou arraste)
  useEffect(() => {
    const nextRatio = getSplitRatioFromSnap(snapMode);
    const prevRatio = prevSnapRatioRef.current;
    if (Math.abs(nextRatio - prevRatio) < 0.001) return;
    prevSnapRatioRef.current = nextRatio;

    const stageWidth = stageRef.current?.clientWidth || 390;
    const deltaPx = (prevRatio - nextRatio) * stageWidth;
    const leftoverOffset = dividerStateRef.current.offsetX;
    dividerStateRef.current.offsetX = 0;

    // Continua suavemente da posicao atual do dedo sem salto algum!
    const fromX = deltaPx + leftoverOffset;
    const vx = dividerStateRef.current.vx;
    dividerStateRef.current.vx = 0;

    if (leeoColRef.current && mariiColRef.current) {
      leeoColRef.current.style.transform = '';
      leeoColRef.current.style.opacity = '';
      mariiColRef.current.style.transform = '';
      mariiColRef.current.style.opacity = '';
    }

    animateSpringTranslateX(dividerBeamRef.current, fromX, 0, vx * 0.35, SPRING_BOUNCY);

    const focusedEl = snapMode === 'leeo' ? leeoColRef.current : mariiColRef.current;
    const startScale = snapMode === 'even' ? 0.985 : 0.965;
    animateSpringTransform(
      focusedEl,
      'col-snap',
      startScale,
      1,
      1.6,
      SPRING_BOUNCY,
      (s) => `scale3d(${s.toFixed(4)}, 1, 1)`,
      ''
    );
  }, [snapMode]);

  const computeSnapFromX = useCallback((clientX: number): SplitSnapMode => {
    const stage = stageRef.current;
    if (!stage) return 'even';
    const rect = stage.getBoundingClientRect();
    const rel = (clientX - rect.left) / Math.max(1, rect.width);
    if (rel >= 0.62) return 'leeo';
    if (rel <= 0.38) return 'marii';
    return 'even';
  }, []);

  const applyLiveDividerOffset = useCallback((offsetX: number) => {
    dividerStateRef.current.offsetX = offsetX;
    const beam = dividerBeamRef.current;
    if (beam) {
      beam.style.transform =
        Math.abs(offsetX) < 0.1 ? '' : `translate3d(${offsetX.toFixed(2)}px, 0, 0)`;
    }

    const stageWidth = stageRef.current?.clientWidth || 390;
    const norm = Math.max(-1, Math.min(1, offsetX / (stageWidth * 0.28)));
    if (leeoColRef.current && mariiColRef.current) {
      if (Math.abs(norm) < 0.01) {
        leeoColRef.current.style.transform = '';
        leeoColRef.current.style.opacity = '';
        mariiColRef.current.style.transform = '';
        mariiColRef.current.style.opacity = '';
      } else {
        const leeoScale = 1 + norm * 0.024;
        const mariiScale = 1 - norm * 0.024;
        leeoColRef.current.style.transform = `scale3d(${leeoScale.toFixed(4)}, ${leeoScale.toFixed(4)}, 1)`;
        mariiColRef.current.style.transform = `scale3d(${mariiScale.toFixed(4)}, ${mariiScale.toFixed(4)}, 1)`;
        leeoColRef.current.style.opacity = norm < 0 ? String(Math.max(0.68, 1 + norm * 0.28)) : '1';
        mariiColRef.current.style.opacity = norm > 0 ? String(Math.max(0.68, 1 - norm * 0.28)) : '1';
      }
    }
  }, []);

  const onDividerPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button > 0) return;
      e.stopPropagation();

      const now = performance.now();
      const s = dividerStateRef.current;
      if (now - s.lastTapTime < 280) {
        s.lastTapTime = 0;
        triggerHaptic('snap');
        if (snapMode === 'even') {
          animateSpringTranslateX(dividerBeamRef.current, s.offsetX, 0, 0, SPRING_BOUNCY);
        } else {
          onSnapModeChange('even');
        }
        return;
      }
      s.lastTapTime = now;

      const interrupted = readActiveSpringState(dividerBeamRef.current, 'tx');
      if (interrupted) {
        s.offsetX = interrupted.value;
      }
      cancelWaapiSpring(dividerBeamRef.current);

      s.active = true;
      s.pointerId = e.pointerId;
      s.startClientX = e.clientX - s.offsetX;
      s.lastClientX = e.clientX;
      s.lastTime = now;
      s.vx = interrupted ? interrupted.velocity : 0;
      s.previewSnap = snapMode;

      setIsDraggingDivider(true);
      setDividerPreviewSnap(snapMode);
      setSurgicalWillChange(dividerBeamRef.current, true, 'transform');
      setSurgicalWillChange(leeoColRef.current, true, 'transform, opacity');
      setSurgicalWillChange(mariiColRef.current, true, 'transform, opacity');
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

      const now = performance.now();
      const dt = Math.max(0.004, (now - s.lastTime) / 1000);
      s.vx = s.vx * 0.6 + ((e.clientX - s.lastClientX) / dt) * 0.4;
      s.lastClientX = e.clientX;
      s.lastTime = now;

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
            applyLiveDividerOffset(dividerStateRef.current.pendingDx);
          }
        });
      }
    },
    [applyLiveDividerOffset, computeSnapFromX, splitRatio]
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
      } else {
        const fromOffset = s.offsetX;
        const vx = s.vx;
        s.offsetX = 0;
        s.vx = 0;

        if (leeoColRef.current && mariiColRef.current) {
          leeoColRef.current.style.transform = '';
          leeoColRef.current.style.opacity = '';
          mariiColRef.current.style.transform = '';
          mariiColRef.current.style.opacity = '';
          setSurgicalWillChange(leeoColRef.current, false);
          setSurgicalWillChange(mariiColRef.current, false);
        }

        animateSpringTranslateX(dividerBeamRef.current, fromOffset, 0, vx * 0.35, SPRING_BOUNCY);
      }
    },
    [onSnapModeChange, snapMode]
  );

  // --- DRAG AND DROP DE CARDS ---
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
    async (clientX: number, clientY: number) => {
      const info = cardDragRef.current;
      const item = info.item;
      cardDragRef.current.item = null;
      setDraggedItem(null);
      setCardHoverTarget(null);

      if (!item) return;
      const moved = await onMoveOrReorder(item.id, info.targetPerson, info.targetIndex, clientX, clientY);
      if (moved) {
        setJustLandedId(item.id);
        window.setTimeout(() => {
          setJustLandedId((curr) => (curr === item.id ? null : curr));
        }, 480);
      }
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
      {/* COLUNA ESQUERDA: LEEO (Pearl-Lavender) */}
      <div
        ref={leeoColRef}
        className="relative h-full flex flex-col min-w-0"
        style={{ flexBasis: `${splitRatio * 100}%`, flexShrink: 0 }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-1.5 rounded-2xl border-2 border-[#ECE3EE] z-20 transition-opacity duration-150"
          style={{
            opacity: activeDropPerson === 'leeo' ? 0.85 : 0,
            boxShadow: 'inset 0 0 24px rgba(236, 227, 238, 0.18)',
          }}
        />

        {/* Cabecalho Limpo: Apenas "Leeo" (sem botao "+") */}
        <div className="shrink-0 px-2.5 pt-2.5 pb-2 border-b border-[var(--vice-border)]">
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('snap');
                onSnapModeChange(snapMode === 'leeo' ? 'even' : 'leeo');
              }}
              className="flex items-center gap-1.5 min-w-0 text-left active:scale-95"
              title="Toque para expandir ou centralizar Leeo"
            >
              <h2
                className="font-display font-black tracking-tight leading-none truncate"
                style={{
                  fontSize: leeoDensity === 'rail' ? '15px' : '20px',
                  color: '#E6DCE8',
                }}
              >
                Leeo
              </h2>
              {leeoDensity !== 'rail' && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E6DCE8]/15 text-[#E6DCE8] shrink-0">
                  {stats.leeo.completed}/{stats.leeo.total}
                </span>
              )}
              {leeoDensity !== 'rail' && stats.leeo.urgentPending > 0 && (
                <span
                  title={`${stats.leeo.urgentPending} urgente(s)`}
                  className="inline-flex items-center text-[#F09AC6] shrink-0"
                >
                  <Flame className="w-3 h-3" />
                </span>
              )}
            </button>
          </div>

          {/* Barra de progresso GPU-only com mola WAAPI */}
          <div className="mt-2 flex items-center gap-1.5">
            <div className="flex-1 h-1.5 rounded-full bg-[#6A416C] overflow-hidden">
              <div
                ref={leeoBarRef}
                className="h-full w-full rounded-full origin-left"
                style={{
                  background: 'var(--vice-leeo-bar)',
                  transform: `scaleX(${(stats.leeo.progressPercent / 100).toFixed(4)})`,
                }}
              />
            </div>
            {leeoDensity !== 'rail' && (
              <span className="text-[10px] font-black tabular-nums text-[#E6DCE8] shrink-0">
                {stats.leeo.progressPercent}%
              </span>
            )}
          </div>
        </div>

        <VirtualTaskList
          person="leeo"
          items={leeoItems}
          density={leeoDensity}
          draggedItemId={draggedItem?.id ?? null}
          justLandedId={justLandedId}
          dropInsertIndex={
            draggedItem && cardHoverTarget?.person === 'leeo' ? cardHoverTarget.index : null
          }
          scrollContainerRef={(el) => {
            leeoScrollRef.current = el;
          }}
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

      {/* DIVISOR CENTRAL ARRASTAVEL COM MOLA ASSINCRONA */}
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
        <div
          className="h-full"
          style={{
            width: isDraggingDivider || isCrossTransfer ? '3px' : '2px',
            background: 'var(--vice-divider)',
            boxShadow:
              isDraggingDivider || isCrossTransfer
                ? '0 0 16px rgba(224, 122, 176, 0.75)'
                : 'none',
          }}
        />

        <div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-11 rounded-full border border-[var(--vice-border-strong)] bg-[var(--vice-surface-strong)] flex items-center justify-center shadow-lg"
          style={{
            boxShadow: isDraggingDivider
              ? '0 0 16px rgba(224, 122, 176, 0.65)'
              : '0 4px 12px rgba(15, 6, 22, 0.45)',
          }}
        >
          <GripVertical className="w-3 h-3 text-[#C7B4CE]" />
        </div>

        {isDraggingDivider && dividerPreviewSnap && (
          <div className="absolute top-12 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#2B1738] text-[#F3ECF5] border border-[var(--vice-border-strong)] whitespace-nowrap shadow-xl pointer-events-none">
            {dividerPreviewSnap === 'leeo'
              ? 'Foco Leeo'
              : dividerPreviewSnap === 'marii'
              ? 'Foco Marii'
              : '50 / 50'}
          </div>
        )}

        {isCrossTransfer && cardHoverTarget && (
          <div className="absolute top-14 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider pearl-highlight-bar flex items-center gap-1 whitespace-nowrap shadow-xl pointer-events-none">
            <ArrowLeftRight className="w-3 h-3" />
            <span>{cardHoverTarget.person === 'leeo' ? 'Leeo' : 'Marii'}</span>
          </div>
        )}
      </div>

      {/* COLUNA DIREITA: MARII (Rose-Pink) */}
      <div
        ref={mariiColRef}
        className="relative h-full flex flex-col min-w-0"
        style={{ flexBasis: `${(1 - splitRatio) * 100}%`, flexShrink: 0 }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-1.5 rounded-2xl border-2 border-[#E07AB0] z-20 transition-opacity duration-150"
          style={{
            opacity: activeDropPerson === 'marii' ? 0.85 : 0,
            boxShadow: 'inset 0 0 24px rgba(224, 122, 176, 0.22)',
          }}
        />

        {/* Cabecalho Limpo: Apenas "Marii" (sem botao "+") */}
        <div className="shrink-0 px-2.5 pt-2.5 pb-2 border-b border-[var(--vice-border)]">
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('snap');
                onSnapModeChange(snapMode === 'marii' ? 'even' : 'marii');
              }}
              className="flex items-center gap-1.5 min-w-0 text-left active:scale-95"
              title="Toque para expandir ou centralizar Marii"
            >
              <h2
                className="font-display font-black tracking-tight leading-none truncate"
                style={{
                  fontSize: mariiDensity === 'rail' ? '15px' : '20px',
                  color: '#E07AB0',
                }}
              >
                Marii
              </h2>
              {mariiDensity !== 'rail' && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E07AB0]/18 text-[#F09AC6] shrink-0">
                  {stats.marii.completed}/{stats.marii.total}
                </span>
              )}
              {mariiDensity !== 'rail' && stats.marii.urgentPending > 0 && (
                <span
                  title={`${stats.marii.urgentPending} urgente(s)`}
                  className="inline-flex items-center text-[#F09AC6] shrink-0"
                >
                  <Flame className="w-3 h-3" />
                </span>
              )}
            </button>
          </div>

          {/* Barra de progresso GPU-only com mola WAAPI */}
          <div className="mt-2 flex items-center gap-1.5">
            <div className="flex-1 h-1.5 rounded-full bg-[#6A416C] overflow-hidden">
              <div
                ref={mariiBarRef}
                className="h-full w-full rounded-full origin-left"
                style={{
                  background: 'var(--vice-marii-bar)',
                  transform: `scaleX(${(stats.marii.progressPercent / 100).toFixed(4)})`,
                }}
              />
            </div>
            {mariiDensity !== 'rail' && (
              <span className="text-[10px] font-black tabular-nums text-[#F09AC6] shrink-0">
                {stats.marii.progressPercent}%
              </span>
            )}
          </div>
        </div>

        <VirtualTaskList
          person="marii"
          items={mariiItems}
          density={mariiDensity}
          draggedItemId={draggedItem?.id ?? null}
          justLandedId={justLandedId}
          dropInsertIndex={
            draggedItem && cardHoverTarget?.person === 'marii' ? cardHoverTarget.index : null
          }
          scrollContainerRef={(el) => {
            mariiScrollRef.current = el;
          }}
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
              boxShadow: `0 18px 40px rgba(15, 6, 22, 0.55), ${accent.glow}`,
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
              <span className="text-xs font-bold text-[#F3ECF5] truncate">
                {draggedItem.name}
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
