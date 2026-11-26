import { useRef, useEffect, useCallback } from 'react';
import { PersonAssignment } from '../types/checklist';
import {
  createSpringChannel,
  setSurgicalWillChange,
  SPRING_BOUNCY,
  SPRING_SNAPPY,
  SpringChannel,
} from './springEngine';
import {
  animateSpringTransform,
  animateSpringWiggleX,
  cancelWaapiSpring,
} from './waapiSpring';
import { triggerHaptic } from './haptics';

interface UseDraggableFabOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  splitRatio: number;
  onTapHint: () => void;
  onDropOnPerson: (person: PersonAssignment, x: number, y: number) => void;
  onHoverTargetChange: (target: PersonAssignment | null) => void;
}

const FAB_SIZE = 56;
const BOTTOM_DOCK_OFFSET = 18;
const HORIZONTAL_DRAG_THRESHOLD = 42;

/**
 * Controla o botao "+" inferior unico ativado EXCLUSIVAMENTE por arraste:
 * - Toque simples sem arrastar: NAO abre a gaveta; dispara wiggle elastico com mola + aviso visual
 * - Arrastar para esquerda (Leeo) ou direita (Marii): ilumina a coluna alvo e abre a gaveta ao soltar
 * - Ao soltar: retorna ao centro com mola assincrona WAAPI herdando a velocidade do gesto
 */
export function useDraggableFab({
  containerRef,
  splitRatio,
  onTapHint,
  onDropOnPerson,
  onHoverTargetChange,
}: UseDraggableFabOptions) {
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const springScaleRef = useRef<SpringChannel | null>(null);

  const posRef = useRef({ dx: 0, dy: 0, scale: 1 });
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startClientX: 0,
    startClientY: 0,
    lastClientX: 0,
    lastClientY: 0,
    lastTime: 0,
    vx: 0,
    vy: 0,
    moved: false,
    hoverTarget: null as PersonAssignment | null,
    rafPending: false,
    pendingDx: 0,
    pendingDy: 0,
  });

  const latestRef = useRef({ splitRatio, onTapHint, onDropOnPerson, onHoverTargetChange });
  latestRef.current = { splitRatio, onTapHint, onDropOnPerson, onHoverTargetChange };

  const applyTransform = useCallback(() => {
    const el = fabRef.current;
    if (!el) return;
    const { dx, dy, scale } = posRef.current;
    if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05 && Math.abs(scale - 1) < 0.002) {
      el.style.transform = '';
      return;
    }
    el.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale3d(${scale.toFixed(4)}, ${scale.toFixed(4)}, 1)`;
  }, []);

  useEffect(() => {
    const ss = createSpringChannel(
      1,
      SPRING_SNAPPY,
      (val) => {
        posRef.current.scale = val;
        applyTransform();
      },
      () => {
        if (!dragRef.current.active) {
          setSurgicalWillChange(fabRef.current, false);
        }
      }
    );

    springScaleRef.current = ss;
    return () => {
      ss.stop();
      cancelWaapiSpring(fabRef.current);
      setSurgicalWillChange(fabRef.current, false);
    };
  }, [applyTransform]);

  const setHoverTarget = (next: PersonAssignment | null) => {
    if (dragRef.current.hoverTarget !== next) {
      dragRef.current.hoverTarget = next;
      if (next !== null) triggerHaptic('snap');
      latestRef.current.onHoverTargetChange(next);
    }
  };

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button > 0) return;
    e.stopPropagation();

    cancelWaapiSpring(fabRef.current);
    const d = dragRef.current;
    d.active = true;
    d.pointerId = e.pointerId;
    d.startClientX = e.clientX;
    d.startClientY = e.clientY;
    d.lastClientX = e.clientX;
    d.lastClientY = e.clientY;
    d.lastTime = performance.now();
    d.vx = 0;
    d.vy = 0;
    d.moved = false;
    posRef.current.dx = 0;
    posRef.current.dy = 0;

    setSurgicalWillChange(fabRef.current, true, 'transform');
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

      const rawDx = e.clientX - d.startClientX;
      const rawDy = e.clientY - d.startClientY;

      if (!d.moved && (Math.abs(rawDx) > 7 || Math.abs(rawDy) > 7)) {
        d.moved = true;
        springScaleRef.current?.setTarget(1.08);
      }

      if (!d.moved) return;

      const container = containerRef.current;
      const width = container ? container.clientWidth : window.innerWidth;
      const maxLateral = Math.max(88, width * 0.5 - FAB_SIZE * 0.65);

      // Movimento livre lateral + resistencia elastica suave vertical
      const clampedDx = Math.max(-maxLateral, Math.min(maxLateral, rawDx));
      const clampedDy = Math.max(-220, Math.min(18, rawDy * 0.45));

      d.pendingDx = clampedDx;
      d.pendingDy = clampedDy;

      // Detecta coluna alvo (esquerda = Leeo, direita = Marii)
      if (clampedDx <= -HORIZONTAL_DRAG_THRESHOLD) {
        setHoverTarget('leeo');
      } else if (clampedDx >= HORIZONTAL_DRAG_THRESHOLD) {
        setHoverTarget('marii');
      } else if (rawDy < -72 && container) {
        const rect = container.getBoundingClientRect();
        const dividerX = rect.left + rect.width * latestRef.current.splitRatio;
        setHoverTarget(e.clientX < dividerX ? 'leeo' : 'marii');
      } else {
        setHoverTarget(null);
      }

      if (!d.rafPending) {
        d.rafPending = true;
        window.requestAnimationFrame(() => {
          dragRef.current.rafPending = false;
          if (dragRef.current.active) {
            posRef.current.dx = dragRef.current.pendingDx;
            posRef.current.dy = dragRef.current.pendingDy;
            applyTransform();
          }
        });
      }
    },
    [applyTransform, containerRef]
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
      const fromDx = posRef.current.dx;
      const fromDy = posRef.current.dy;
      posRef.current.dx = 0;
      posRef.current.dy = 0;
      posRef.current.scale = 1;
      springScaleRef.current?.stop();

      setHoverTarget(null);

      // TOQUE SIMPLES: nao abre gaveta; faz wiggle elastico com mola + orienta usuario
      if (!d.moved && !cancelled) {
        triggerHaptic('tap');
        animateSpringWiggleX(fabRef.current);
        latestRef.current.onTapHint();
        return;
      }

      // Retorno ao centro por mola assincrona WAAPI herdando velocidade em X e Y
      const distance = Math.hypot(fromDx, fromDy);
      if (distance > 1) {
        const startRatio = 1;
        const unitX = fromDx / distance;
        const unitY = fromDy / distance;
        const projVel = d.vx * unitX + d.vy * unitY;
        animateSpringTransform(
          fabRef.current,
          'fab-return',
          startRatio,
          0,
          projVel / Math.max(1, distance),
          SPRING_BOUNCY,
          (t) =>
            `translate3d(${(fromDx * t).toFixed(2)}px, ${(fromDy * t).toFixed(2)}px, 0)`,
          ''
        );
      } else if (fabRef.current) {
        fabRef.current.style.transform = '';
      }

      if (activeTarget && !cancelled) {
        triggerHaptic('snap');
        latestRef.current.onDropOnPerson(activeTarget, e.clientX, e.clientY);
      }
    },
    []
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
    bottomOffset: BOTTOM_DOCK_OFFSET,
    fabHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  };
}
