import { useRef, useEffect, useCallback } from 'react';
import { PersonAssignment } from '../types/checklist';
import {
  createSpringChannel,
  setSurgicalWillChange,
  SPRING_BOUNCY,
  SPRING_SNAPPY,
  SpringChannel,
} from './springEngine';
import { triggerHaptic } from './haptics';

interface UseDraggableFabOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  splitRatio: number;
  onTap: () => void;
  onDropOnPerson: (person: PersonAssignment, x: number, y: number) => void;
  onHoverTargetChange: (target: PersonAssignment | null) => void;
}

const FAB_SIZE = 58;
const EDGE_MARGIN = 14;
const BOTTOM_DOCK_OFFSET = 22;

/**
 * Controla o botao "+" flutuante magnetico (120fps GPU translate3d):
 * - Toque curto: abre Nova Task
 * - Arrastar sobre a coluna do Leeo ou Marii e soltar: abre Nova Task ja direcionada
 * - Arrastar para qualquer borda: encaixe magnetico com fisica de mola + inercia
 */
export function useDraggableFab({
  containerRef,
  splitRatio,
  onTap,
  onDropOnPerson,
  onHoverTargetChange,
}: UseDraggableFabOptions) {
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const springXRef = useRef<SpringChannel | null>(null);
  const springYRef = useRef<SpringChannel | null>(null);
  const springScaleRef = useRef<SpringChannel | null>(null);

  const posRef = useRef({ x: 0, y: 0, scale: 1, initialized: false, dockedBottom: true });
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startClientX: 0,
    startClientY: 0,
    startPosX: 0,
    startPosY: 0,
    lastClientX: 0,
    lastClientY: 0,
    lastTime: 0,
    vx: 0,
    vy: 0,
    moved: false,
    hoverTarget: null as PersonAssignment | null,
    rafPending: false,
    pendingX: 0,
    pendingY: 0,
  });

  const latestRef = useRef({ splitRatio, onTap, onDropOnPerson, onHoverTargetChange });
  latestRef.current = { splitRatio, onTap, onDropOnPerson, onHoverTargetChange };

  const applyTransform = useCallback(() => {
    const el = fabRef.current;
    if (!el) return;
    const { x, y, scale } = posRef.current;
    el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale3d(${scale.toFixed(4)}, ${scale.toFixed(4)}, 1)`;
  }, []);

  const getBounds = useCallback(() => {
    const container = containerRef.current;
    const width = container ? container.clientWidth : window.innerWidth;
    const height = container ? container.clientHeight : window.innerHeight;
    return {
      width,
      height,
      minX: EDGE_MARGIN,
      maxX: Math.max(EDGE_MARGIN, width - FAB_SIZE - EDGE_MARGIN),
      minY: 76,
      maxY: Math.max(76, height - FAB_SIZE - BOTTOM_DOCK_OFFSET),
    };
  }, [containerRef]);

  const computeDefaultDock = useCallback(() => {
    const b = getBounds();
    return {
      x: (b.width - FAB_SIZE) / 2,
      y: b.maxY,
    };
  }, [getBounds]);

  useEffect(() => {
    const initial = computeDefaultDock();
    posRef.current.x = initial.x;
    posRef.current.y = initial.y;
    posRef.current.initialized = true;

    const sx = createSpringChannel(
      initial.x,
      SPRING_BOUNCY,
      (val) => {
        posRef.current.x = val;
        applyTransform();
      },
      () => {
        if (!dragRef.current.active && !springYRef.current?.active && !springScaleRef.current?.active) {
          setSurgicalWillChange(fabRef.current, false);
        }
      }
    );

    const sy = createSpringChannel(
      initial.y,
      SPRING_BOUNCY,
      (val) => {
        posRef.current.y = val;
        applyTransform();
      },
      () => {
        if (!dragRef.current.active && !springXRef.current?.active && !springScaleRef.current?.active) {
          setSurgicalWillChange(fabRef.current, false);
        }
      }
    );

    const ss = createSpringChannel(1, SPRING_SNAPPY, (val) => {
      posRef.current.scale = val;
      applyTransform();
    });

    springXRef.current = sx;
    springYRef.current = sy;
    springScaleRef.current = ss;
    applyTransform();

    const handleResize = () => {
      const b = getBounds();
      if (posRef.current.dockedBottom) {
        sx.setImmediate((b.width - FAB_SIZE) / 2);
        sy.setImmediate(b.maxY);
        return;
      }
      const clampedX = Math.min(b.maxX, Math.max(b.minX, posRef.current.x));
      const clampedY = Math.min(b.maxY, Math.max(b.minY, posRef.current.y));
      sx.setImmediate(clampedX);
      sy.setImmediate(clampedY);
    };

    const container = containerRef.current;
    let observer: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(handleResize);
      observer.observe(container);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', handleResize);
      sx.stop();
      sy.stop();
      ss.stop();
      setSurgicalWillChange(fabRef.current, false);
    };
  }, [applyTransform, computeDefaultDock, containerRef, getBounds]);

  const setHoverTarget = (next: PersonAssignment | null) => {
    if (dragRef.current.hoverTarget !== next) {
      dragRef.current.hoverTarget = next;
      if (next !== null) triggerHaptic('tap');
      latestRef.current.onHoverTargetChange(next);
    }
  };

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button > 0) return;
    e.stopPropagation();

    const d = dragRef.current;
    d.active = true;
    d.pointerId = e.pointerId;
    d.startClientX = e.clientX;
    d.startClientY = e.clientY;
    d.startPosX = posRef.current.x;
    d.startPosY = posRef.current.y;
    d.lastClientX = e.clientX;
    d.lastClientY = e.clientY;
    d.lastTime = performance.now();
    d.vx = 0;
    d.vy = 0;
    d.moved = false;

    setSurgicalWillChange(fabRef.current, true, 'transform');
    springXRef.current?.stop();
    springYRef.current?.stop();
    springScaleRef.current?.setTarget(0.92);
    triggerHaptic('tap');

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignora
    }
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = dragRef.current;
      if (!d.active || e.pointerId !== d.pointerId) return;

      const now = performance.now();
      const dt = Math.max(0.004, (now - d.lastTime) / 1000);
      d.vx = d.vx * 0.6 + ((e.clientX - d.lastClientX) / dt) * 0.4;
      d.vy = d.vy * 0.6 + ((e.clientY - d.lastClientY) / dt) * 0.4;
      d.lastClientX = e.clientX;
      d.lastClientY = e.clientY;
      d.lastTime = now;

      const dx = e.clientX - d.startClientX;
      const dy = e.clientY - d.startClientY;
      if (!d.moved && (Math.abs(dx) > 7 || Math.abs(dy) > 7)) {
        d.moved = true;
        springScaleRef.current?.setTarget(1.1);
      }

      if (!d.moved) return;

      const b = getBounds();
      d.pendingX = Math.min(b.maxX, Math.max(b.minX, d.startPosX + dx));
      d.pendingY = Math.min(b.maxY, Math.max(b.minY, d.startPosY + dy));

      // Detecta se a bolha esta sobre a area de tarefas do Leeo ou da Marii
      const centerX = d.pendingX + FAB_SIZE / 2;
      const centerY = d.pendingY + FAB_SIZE / 2;
      const inDropZone = centerY < b.height - 115 && centerY > 110;
      if (inDropZone) {
        const dividerX = b.width * latestRef.current.splitRatio;
        setHoverTarget(centerX < dividerX ? 'leeo' : 'marii');
      } else {
        setHoverTarget(null);
      }

      if (!d.rafPending) {
        d.rafPending = true;
        window.requestAnimationFrame(() => {
          dragRef.current.rafPending = false;
          if (dragRef.current.active) {
            springXRef.current?.setImmediate(dragRef.current.pendingX, dragRef.current.vx);
            springYRef.current?.setImmediate(dragRef.current.pendingY, dragRef.current.vy);
          }
        });
      }
    },
    [getBounds]
  );

  const finishDrag = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>, cancelled: boolean) => {
      const d = dragRef.current;
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

      const activeTarget = d.hoverTarget;
      setHoverTarget(null);
      springScaleRef.current?.setTarget(1);

      if (!d.moved && !cancelled) {
        latestRef.current.onTap();
        return;
      }

      const b = getBounds();

      // Se soltou sobre uma coluna ativa, abre criacao direta para aquela pessoa e retorna ao dock
      if (activeTarget && !cancelled) {
        triggerHaptic('snap');
        latestRef.current.onDropOnPerson(activeTarget, e.clientX, e.clientY);
        const dock = computeDefaultDock();
        posRef.current.dockedBottom = true;
        springXRef.current?.setTarget(dock.x, d.vx * 0.25);
        springYRef.current?.setTarget(dock.y, d.vy * 0.25);
        return;
      }

      // Encaixe magnetico na borda mais proxima com projecao de inercia
      const projectedX = posRef.current.x + d.vx * 0.12;
      const projectedY = posRef.current.y + d.vy * 0.12;
      const clampedY = Math.min(b.maxY, Math.max(b.minY + 30, projectedY));

      let snapX: number;
      const nearBottom = clampedY >= b.maxY - 36;
      const centerX = (b.width - FAB_SIZE) / 2;

      if (nearBottom && Math.abs(projectedX - centerX) < b.width * 0.22) {
        snapX = centerX;
        posRef.current.dockedBottom = true;
      } else {
        snapX = projectedX + FAB_SIZE / 2 < b.width / 2 ? b.minX : b.maxX;
        posRef.current.dockedBottom = false;
      }

      triggerHaptic('snap');
      springXRef.current?.setTarget(snapX, d.vx * 0.35);
      springYRef.current?.setTarget(clampedY, d.vy * 0.35);
    },
    [computeDefaultDock, getBounds]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => finishDrag(e, false),
    [finishDrag]
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => finishDrag(e, true),
    [finishDrag]
  );

  return {
    fabRef,
    fabHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  };
}
