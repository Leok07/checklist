import { useRef, useEffect, useCallback } from 'react';
import {
  createSpringChannel,
  setSurgicalWillChange,
  SPRING_BOUNCY,
  SPRING_SNAPPY,
  SpringChannel,
} from './springEngine';
import {
  animateSpringFlyOutX,
  animateSpringScalePop,
  animateSpringTranslateX,
  cancelWaapiSpring,
  readActiveSpringState,
} from './waapiSpring';
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
 * Reconhecedor unificado de gestos 120fps com animacoes assincronas WAAPI na soltura:
 * - Toque curto: conclui / desmarca com mola elastica no compositor
 * - Swipe direita: conclui com retorno elastico assincrono
 * - Swipe esquerda (estagio 1): abre Estudio de Customizacao + retorno com mola
 * - Swipe esquerda (estagio 2): fly-out com mola herdando velocidade antes de remover
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

  const springScaleRef = useRef<SpringChannel | null>(null);

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

  const resetReveals = useCallback(() => {
    if (rightRevealRef.current) rightRevealRef.current.style.opacity = '0';
    if (leftRevealRef.current) leftRevealRef.current.style.opacity = '0';
    if (deleteHintRef.current) deleteHintRef.current.style.opacity = '0';
  }, []);

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
    const springScale = createSpringChannel(
      1,
      SPRING_SNAPPY,
      (val) => {
        stateRef.current.currentScale = val;
        applyTransform();
      },
      () => {
        if (stateRef.current.mode === 'idle') {
          setSurgicalWillChange(surfaceRef.current, false);
        }
      }
    );

    springScaleRef.current = springScale;

    return () => {
      if (stateRef.current.holdTimer !== null) {
        window.clearTimeout(stateRef.current.holdTimer);
      }
      springScale.stop();
      cancelWaapiSpring(surfaceRef.current);
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
      const target = e.target as HTMLElement | null;
      if (target && target.closest('button, input, select, textarea, [data-no-gesture="true"]')) {
        return;
      }

      const s = stateRef.current;
      clearHoldTimer();

      // Interrupcao 100% suave de qualquer mola WAAPI em andamento no card
      const interruptedX = readActiveSpringState(surfaceRef.current, 'tx');
      if (interruptedX) {
        s.currentX = interruptedX.value;
      }
      cancelWaapiSpring(surfaceRef.current);

      s.mode = 'pending';
      s.pointerId = e.pointerId;
      s.startX = e.clientX - s.currentX;
      s.startY = e.clientY;
      s.lastX = e.clientX;
      s.lastTime = performance.now();
      s.vx = interruptedX ? interruptedX.velocity : 0;
      s.dx = s.currentX;
      s.crossedComplete = false;
      s.crossedDelete = false;
      s.pendingClientX = e.clientX;
      s.pendingClientY = e.clientY;

      setSurgicalWillChange(surfaceRef.current, true, 'transform');
      springScaleRef.current?.setTarget(0.96);

      if (callbacksRef.current.onDragStart) {
        const currentTargetEl = e.currentTarget;
        s.holdTimer = window.setTimeout(() => {
          if (stateRef.current.mode !== 'pending') return;
          stateRef.current.mode = 'drag';
          triggerHaptic('lift');
          springScaleRef.current?.setTarget(1);
          stateRef.current.currentX = 0;
          stateRef.current.dx = 0;
          applyTransform();
          resetReveals();
          try {
            currentTargetEl.setPointerCapture(stateRef.current.pointerId);
          } catch {
            // Ignora
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
    [applyTransform, disabled, itemId, resetReveals]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const s = stateRef.current;
      if (s.mode === 'idle' || s.mode === 'scroll' || e.pointerId !== s.pointerId) return;

      const now = performance.now();
      const dt = Math.max(0.004, (now - s.lastTime) / 1000);
      const rawVx = (e.clientX - s.lastX) / dt;
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
          if (Math.abs(s.currentX) > 0.5) {
            const fromX = s.currentX;
            s.currentX = 0;
            s.dx = 0;
            animateSpringTranslateX(surfaceRef.current, fromX, 0, 0, SPRING_BOUNCY, resetReveals);
          }
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
              stateRef.current.currentX = stateRef.current.dx;
              applyTransform();
            }
          });
        }
      }
    },
    [applyTransform, resetReveals]
  );

  const finishGesture = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
      const s = stateRef.current;
      if (s.mode === 'idle' || e.pointerId !== s.pointerId) return;

      clearHoldTimer();
      const prevMode = s.mode;
      const fromX = s.currentX;
      const vx = s.vx;
      s.mode = 'idle';
      s.pointerId = -1;
      s.currentX = 0;
      s.dx = 0;

      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignora
      }

      if (prevMode === 'drag') {
        springScaleRef.current?.setTarget(1);
        callbacksRef.current.onDragEnd?.(e.clientX, e.clientY);
        return;
      }

      if (prevMode === 'pending' && !cancelled) {
        springScaleRef.current?.stop();
        s.currentScale = 1;
        triggerHaptic('check');
        animateSpringScalePop(surfaceRef.current, 0.93, 3.6);
        callbacksRef.current.onTapToggle(itemId, e.clientX, e.clientY);
        return;
      }

      springScaleRef.current?.setTarget(1);

      if (prevMode === 'swipe' && !cancelled) {
        if (fromX >= SWIPE_COMPLETE_THRESHOLD) {
          triggerHaptic('check');
          callbacksRef.current.onSwipeComplete(itemId, e.clientX, e.clientY);
          animateSpringTranslateX(
            surfaceRef.current,
            fromX,
            0,
            Math.min(0, vx * 0.3),
            SPRING_BOUNCY,
            resetReveals
          );
          return;
        }

        if (fromX <= SWIPE_DELETE_THRESHOLD) {
          triggerHaptic('delete');
          animateSpringFlyOutX(surfaceRef.current, fromX, -380, vx, () => {
            resetReveals();
            callbacksRef.current.onSwipeDelete(itemId);
          });
          return;
        }

        if (fromX <= SWIPE_EDIT_THRESHOLD) {
          triggerHaptic('tap');
          callbacksRef.current.onSwipeEdit(itemId);
          animateSpringTranslateX(
            surfaceRef.current,
            fromX,
            0,
            Math.max(0, vx * 0.3),
            SPRING_BOUNCY,
            resetReveals
          );
          return;
        }
      }

      // Retorno elastico assincrono no compositor herdando velocidade real do dedo
      animateSpringTranslateX(
        surfaceRef.current,
        fromX,
        0,
        vx * 0.35,
        SPRING_BOUNCY,
        resetReveals
      );
    },
    [itemId, resetReveals]
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
