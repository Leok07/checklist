import { useRef, useEffect, useCallback } from 'react';
import { createSpringChannel, setSurgicalWillChange, SPRING_SNAPPY, SpringChannel } from './springEngine';
import { triggerHaptic } from './haptics';

interface UseSpringPressOptions {
  pressedScale?: number;
  haptic?: boolean;
}

/**
 * Feedback tatil otimista (<16ms) acelerado por GPU via scale3d.
 * Zero re-renders do React durante press/release.
 */
export function useSpringPress<T extends HTMLElement = HTMLButtonElement>(
  options: UseSpringPressOptions = {}
) {
  const { pressedScale = 0.94, haptic = true } = options;
  const elementRef = useRef<T | null>(null);
  const springRef = useRef<SpringChannel | null>(null);

  useEffect(() => {
    const spring = createSpringChannel(
      1,
      SPRING_SNAPPY,
      (scale) => {
        const el = elementRef.current;
        if (el) {
          el.style.transform = `scale3d(${scale.toFixed(4)}, ${scale.toFixed(4)}, 1)`;
        }
      },
      () => {
        const el = elementRef.current;
        if (el) {
          el.style.transform = '';
          setSurgicalWillChange(el, false);
        }
      }
    );
    springRef.current = spring;
    return () => {
      spring.stop();
      setSurgicalWillChange(elementRef.current, false);
    };
  }, []);

  const onPointerDown = useCallback(() => {
    setSurgicalWillChange(elementRef.current, true, 'transform');
    springRef.current?.setTarget(pressedScale);
    if (haptic) triggerHaptic('tap');
  }, [pressedScale, haptic]);

  const release = useCallback(() => {
    springRef.current?.setTarget(1);
  }, []);

  return {
    ref: elementRef,
    pressHandlers: {
      onPointerDown,
      onPointerUp: release,
      onPointerCancel: release,
      onPointerLeave: release,
    },
  };
}
