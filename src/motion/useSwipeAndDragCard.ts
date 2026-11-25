import { useRef, useEffect, useCallback } from 'react';
import {
  createSpringChannel,
  setSurgicalWillChange,
  SPRING_BOUNCY,
  SPRING_SNAPPY,
  SpringChannel,
} from './springEngine';
import { triggerHaptic } from './haptics';

export interface CardDragPayload {
  id: string;
  clientX: number;
  clientY: number;
  vx: number;
  rect: DOMRect;
}

interface UseSwipeAndDragCardOptions {
  itemId: string;
  disabled?: boolean;
  onTapToggle: (id: string, x: number, y: number) => void;
  onSwipeComplete: (id: string, x: number, y: number) => void;
  onSwipeEdit: (id: string) => void;
  onSwipeDelete: (id: string) => void;
  onDragStart?: (payload: CardDragPayload) => void;
  onDragMove?: (clientX: number, clientY: number, vx: number) => void;
  onDragEnd?: (clientX: number, clientY: number) => void;
}

type GestureMode = 'idle' | 'pending' | 'swipe' | 'drag' | 'scroll';

const SWIPE_COMPLETE_THRESHOLD = 54;
const SWIPE_EDIT_THRESHOLD = -52;
const SWIPE_DELETE_THRESHOLD = -122;
const HOLD_DRAG_MS = 230;

function applyRubberBand(dx: number, limit: number): number {
  const abs = Math.abs(dx);
  if (abs <= limit) return dx;
  const excess = abs - limit;
  const damped = limit + excess * 0.28;
  return dx < 0 ? -damped : damped;
}

/**
 * Reconhecedor unificado de gestos 120fps com zero alocacoes no pointermove:
 * - Toque curto: conclui / desmarca com squish instantaneo
 * - Swipe direita: conclui com mola elastica
 * - Swipe esquerda (estagio 1): abre Estudio de Customizacao
 * - Swipe esquerda (estagio 2): exclui com feedback haptico
 * - Segurar 230ms + arrastar: drag-and-drop livre (cruzar divisor ou reordenar)
 */
export function useSwipeAndDragCard({
  itemId,
  disabled = false,
  onTapToggle,
  onSwipeComplete,
  onSwipeEdit,
  onSwipeDelete,
  onDragStart,
  onDragMove,
  onDragEnd,
}: UseSwipeAndDragCardOptions) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const rightRevealRef = useRef<HTMLDivElement | null>(null);
  const leftRevealRef = useRef<HTMLDivElement | null>(null);
  const deleteHintRef = useRef<HTMLDivElement | null>(null);

  const springXRef = useRef<SpringChannel | null>(null);
  const springScaleRef = useRef<SpringChannel | null>(null);

  // Estado mutavel pre-alocado para evitar GC pauses durante gestos continuos
  const stateRef = useRef({
    mode: 'idle' as GestureMode,
    pointerId: -1,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastTime: 0,
    vx: 0,
    dx: 0,
    currentX: 0,
    currentScale: 1,
    crossedDelete: false,
    crossedComplete: false,
    holdTimer: null as number | null,
    rafPending: false,
    pendingClientX: 0,
    pendingClientY: 0,
  });

  const callbacksRef = useRef({
    onTapToggle,
    onSwipeComplete,
    onSwipeEdit,
    onSwipeDelete,
    onDragStart,
    onDragMove,
    onDragEnd,
  });
  callbacksRef.current = {
    onTapToggle,
    onSwipeComplete,
    onSwipeEdit,
    onSwipeDelete,
    onDragStart,
    onDragMove,
    onDragEnd,
  };

  const applyTransform = useCallback(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const s = stateRef.current;
    const x = s.currentX;
    const sc = s.currentScale;

    if (Math.abs(x) < 0.05 && Math.abs(sc - 1) < 0.002) {
      el.style.transform = '';
    } else {
      el.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0) scale3d(${sc.toFixed(4)}, ${sc.toFixed(4)}, 1)`;
    }

    // Atualiza camadas de acao via opacity GPU-only
    const rightEl = rightRevealRef.current;
    if (rightEl) {
      const ratio = x > 4 ? Math.min(1, x / SWIPE_COMPLETE_THRESHOLD) : 0;
      rightEl.style.opacity = ratio.toFixed(3);
    }

    const leftEl = leftRevealRef.current;
    if (leftEl) {
      const ratio = x < -4 ? Math.min(1, Math.abs(x) / Math.abs(SWIPE_EDIT_THRESHOLD)) : 0;
      leftEl.style.opacity = ratio.toFixed(3);
    }

    const delEl = deleteHintRef.current;
    if (delEl) {
      const isDel = x < SWIPE_DELETE_THRESHOLD * 0.85;
      delEl.style.opacity = isDel ? '1' : '0';
    }
  }, []);

  useEffect(() => {
    const springX = createSpringChannel(
      0,
      SPRING_BOUNCY,
      (val) => {
        stateRef.current.currentX = val;
        applyTransform();
      },
      () => {
        if (stateRef.current.mode === 'idle' && !springScaleRef.current?.active) {
          setSurgicalWillChange(surfaceRef.current, false);
        }
      }
    );

    const springScale = createSpringChannel(
      1,
      SPRING_SNAPPY,
      (val) => {
        stateRef.current.currentScale = val;
        applyTransform();
      },
      () => {
        if (stateRef.current.mode === 'idle' && !springXRef.current?.active) {
          setSurgicalWillChange(surfaceRef.current, false);
        }
      }
    );

    springXRef.current = springX;
    springScaleRef.current = springScale;

    return () => {
      if (stateRef.current.holdTimer !== null) {
        window.clearTimeout(stateRef.current.holdTimer);
      }
      springX.stop();
      springScale.stop();
      setSurgicalWillChange(surfaceRef.current, false);
    };
  }, [applyTransform]);

  const clearHoldTimer = () => {
    const s = stateRef.current;
    if (s.holdTimer !== null) {
      window.clearTimeout(s.holdTimer);
      s.holdTimer = null;
    }
  };

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled || e.button > 0) return;
      // Nao intercepta botoes internos (ex.: stepper, sub-task, editar)
      const target = e.target as HTMLElement | null;
      if (target && target.closest('button, input, select, textarea, [data-no-gesture="true"]')) {
        return;
      }

      const s = stateRef.current;
      clearHoldTimer();

      // 100% interrompivel: captura posicao atual se a mola ainda estiver em movimento
      s.mode = 'pending';
      s.pointerId = e.pointerId;
      s.startX = e.clientX - s.currentX;
      s.startY = e.clientY;
      s.lastX = e.clientX;
      s.lastTime = performance.now();
      s.vx = 0;
      s.dx = s.currentX;
      s.crossedComplete = false;
      s.crossedDelete = false;
      s.pendingClientX = e.clientX;
      s.pendingClientY = e.clientY;

      setSurgicalWillChange(surfaceRef.current, true, 'transform');
      springXRef.current?.stop();
      springScaleRef.current?.setTarget(0.97);

      if (callbacksRef.current.onDragStart) {
        const currentTargetEl = e.currentTarget;
        s.holdTimer = window.setTimeout(() => {
          if (stateRef.current.mode !== 'pending') return;
          stateRef.current.mode = 'drag';
          triggerHaptic('lift');
          springScaleRef.current?.setTarget(1);
          springXRef.current?.setImmediate(0);
          try {
            currentTargetEl.setPointerCapture(stateRef.current.pointerId);
          } catch {
            // Ignora se o ponteiro nao estiver ativo
          }
          const rect = currentTargetEl.getBoundingClientRect();
          callbacksRef.current.onDragStart?.({
            id: itemId,
            clientX: stateRef.current.pendingClientX,
            clientY: stateRef.current.pendingClientY,
            vx: 0,
            rect,
          });
        }, HOLD_DRAG_MS);
      }
    },
    [disabled, itemId]
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const s = stateRef.current;
    if (s.mode === 'idle' || s.mode === 'scroll' || e.pointerId !== s.pointerId) return;

    const now = performance.now();
    const dt = Math.max(0.004, (now - s.lastTime) / 1000);
    const rawVx = (e.clientX - s.lastX) / dt;
    // Suavizacao exponencial leve para velocidade limpa na soltura
    s.vx = s.vx * 0.65 + rawVx * 0.35;
    s.lastX = e.clientX;
    s.lastTime = now;
    s.pendingClientX = e.clientX;
    s.pendingClientY = e.clientY;

    const rawDx = e.clientX - s.startX;
    const rawDy = e.clientY - s.startY;

    if (s.mode === 'pending') {
      if (Math.abs(rawDx) < 8 && Math.abs(rawDy) < 8) return;
      clearHoldTimer();

      if (Math.abs(rawDy) > Math.abs(rawDx) * 1.15) {
        s.mode = 'scroll';
        springScaleRef.current?.setTarget(1);
        springXRef.current?.setTarget(0);
        return;
      }

      s.mode = 'swipe';
      springScaleRef.current?.setTarget(1);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignora
      }
    }

    if (s.mode === 'drag') {
      if (!s.rafPending) {
        s.rafPending = true;
        window.requestAnimationFrame(() => {
          stateRef.current.rafPending = false;
          if (stateRef.current.mode === 'drag') {
            callbacksRef.current.onDragMove?.(
              stateRef.current.pendingClientX,
              stateRef.current.pendingClientY,
              stateRef.current.vx
            );
          }
        });
      }
      return;
    }

    if (s.mode === 'swipe') {
      const damped = applyRubberBand(rawDx, 138);
      s.dx = damped;

      if (damped >= SWIPE_COMPLETE_THRESHOLD && !s.crossedComplete) {
        s.crossedComplete = true;
        triggerHaptic('tap');
      } else if (damped < SWIPE_COMPLETE_THRESHOLD) {
        s.crossedComplete = false;
      }

      if (damped <= SWIPE_DELETE_THRESHOLD && !s.crossedDelete) {
        s.crossedDelete = true;
        triggerHaptic('snap');
      } else if (damped > SWIPE_DELETE_THRESHOLD) {
        s.crossedDelete = false;
      }

      if (!s.rafPending) {
        s.rafPending = true;
        window.requestAnimationFrame(() => {
          stateRef.current.rafPending = false;
          if (stateRef.current.mode === 'swipe') {
            springXRef.current?.setImmediate(stateRef.current.dx, stateRef.current.vx);
          }
        });
      }
    }
  }, []);

  const finishGesture = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
      const s = stateRef.current;
      if (s.mode === 'idle' || e.pointerId !== s.pointerId) return;

      clearHoldTimer();
      const prevMode = s.mode;
      s.mode = 'idle';
      s.pointerId = -1;

      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignora
      }

      springScaleRef.current?.setTarget(1);

      if (prevMode === 'drag') {
        callbacksRef.current.onDragEnd?.(e.clientX, e.clientY);
        return;
      }

      if (prevMode === 'pending' && !cancelled) {
        triggerHaptic('check');
        callbacksRef.current.onTapToggle(itemId, e.clientX, e.clientY);
        return;
      }

      if (prevMode === 'swipe' && !cancelled) {
        const dx = s.dx;
        if (dx >= SWIPE_COMPLETE_THRESHOLD) {
          triggerHaptic('check');
          callbacksRef.current.onSwipeComplete(itemId, e.clientX, e.clientY);
          springXRef.current?.setTarget(0, Math.min(0, s.vx * 0.25));
          return;
        }
        if (dx <= SWIPE_DELETE_THRESHOLD) {
          triggerHaptic('delete');
          callbacksRef.current.onSwipeDelete(itemId);
          return;
        }
        if (dx <= SWIPE_EDIT_THRESHOLD) {
          triggerHaptic('tap');
          callbacksRef.current.onSwipeEdit(itemId);
          springXRef.current?.setTarget(0, Math.max(0, s.vx * 0.25));
          return;
        }
      }

      // Retorno elastico herdando velocidade real do dedo
      springXRef.current?.setTarget(0, s.vx * 0.35);
    },
    [itemId]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => finishGesture(e, false),
    [finishGesture]
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => finishGesture(e, true),
    [finishGesture]
  );

  return {
    surfaceRef,
    rightRevealRef,
    leftRevealRef,
    deleteHintRef,
    gestureHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  };
}
