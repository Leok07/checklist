export interface SpringConfig {
  mass: number;
  stiffness: number;
  damping: number;
  precision?: number;
}

export const SPRING_SNAPPY: SpringConfig = {
  mass: 1,
  stiffness: 440,
  damping: 32,
  precision: 0.005,
};

export const SPRING_BOUNCY: SpringConfig = {
  mass: 1,
  stiffness: 320,
  damping: 22,
  precision: 0.05,
};

export const SPRING_SHEET: SpringConfig = {
  mass: 1,
  stiffness: 360,
  damping: 34,
  precision: 0.05,
};

export const SPRING_GENTLE: SpringConfig = {
  mass: 1.15,
  stiffness: 230,
  damping: 26,
  precision: 0.05,
};

export interface SpringChannel {
  value: number;
  target: number;
  velocity: number;
  config: SpringConfig;
  active: boolean;
  setTarget: (nextTarget: number, velocityOverride?: number, nextConfig?: SpringConfig) => void;
  setImmediate: (nextValue: number, trackedVelocity?: number) => void;
  stop: () => void;
}

interface InternalSpring extends SpringChannel {
  onUpdate: (value: number, velocity: number) => void;
  onRest?: () => void;
}

const activeSprings = new Set<InternalSpring>();
let rafId: number | null = null;
let lastFrameTime = 0;

// Passo fixo de 4ms para estabilidade numerica em 60Hz, 90Hz e 120Hz (ProMotion)
const FIXED_STEP = 0.004;
const MAX_FRAME_DT = 0.048;

function tickAllSprings(now: number) {
  if (lastFrameTime === 0) {
    lastFrameTime = now;
  }

  let frameDt = (now - lastFrameTime) / 1000;
  lastFrameTime = now;
  if (frameDt > MAX_FRAME_DT) frameDt = MAX_FRAME_DT;
  if (frameDt <= 0) frameDt = 0.008;

  // Iteracao in-place sem alocar novos arrays ou closures
  activeSprings.forEach((spring) => {
    const { mass, stiffness, damping } = spring.config;
    const precision = spring.config.precision ?? 0.05;

    let x = spring.value;
    let v = spring.velocity;
    const target = spring.target;

    let remaining = frameDt;
    while (remaining > 0) {
      const dt = remaining > FIXED_STEP ? FIXED_STEP : remaining;
      const force = -stiffness * (x - target) - damping * v;
      const acc = force / mass;
      v += acc * dt;
      x += v * dt;
      remaining -= dt;
    }

    const isSettled =
      Math.abs(target - x) <= precision && Math.abs(v) <= precision * 10;

    if (isSettled) {
      spring.value = target;
      spring.velocity = 0;
      spring.active = false;
      activeSprings.delete(spring);
      spring.onUpdate(target, 0);
      if (spring.onRest) spring.onRest();
    } else {
      spring.value = x;
      spring.velocity = v;
      spring.onUpdate(x, v);
    }
  });

  if (activeSprings.size > 0) {
    rafId = window.requestAnimationFrame(tickAllSprings);
  } else {
    rafId = null;
    lastFrameTime = 0;
  }
}

function ensureLoopRunning() {
  if (rafId === null && activeSprings.size > 0) {
    lastFrameTime = 0;
    rafId = window.requestAnimationFrame(tickAllSprings);
  }
}

export function createSpringChannel(
  initialValue: number,
  config: SpringConfig,
  onUpdate: (value: number, velocity: number) => void,
  onRest?: () => void
): SpringChannel {
  const spring: InternalSpring = {
    value: initialValue,
    target: initialValue,
    velocity: 0,
    config,
    active: false,
    onUpdate,
    onRest,
    setTarget(nextTarget, velocityOverride, nextConfig) {
      if (nextConfig) spring.config = nextConfig;
      spring.target = nextTarget;
      if (typeof velocityOverride === 'number' && Number.isFinite(velocityOverride)) {
        spring.velocity = velocityOverride;
      }
      const precision = spring.config.precision ?? 0.05;
      if (
        Math.abs(spring.target - spring.value) <= precision &&
        Math.abs(spring.velocity) <= precision * 10
      ) {
        spring.value = nextTarget;
        spring.velocity = 0;
        spring.active = false;
        activeSprings.delete(spring);
        spring.onUpdate(nextTarget, 0);
        if (spring.onRest) spring.onRest();
        return;
      }
      spring.active = true;
      activeSprings.add(spring);
      ensureLoopRunning();
    },
    setImmediate(nextValue, trackedVelocity = 0) {
      spring.value = nextValue;
      spring.target = nextValue;
      spring.velocity = trackedVelocity;
      spring.active = false;
      activeSprings.delete(spring);
      spring.onUpdate(nextValue, trackedVelocity);
    },
    stop() {
      spring.active = false;
      activeSprings.delete(spring);
    },
  };

  return spring;
}

/**
 * Aplica will-change cirurgicamente durante gestos/animacoes ativas
 * e libera VRAM imediatamente quando o elemento entra em repouso.
 */
export function setSurgicalWillChange(el: HTMLElement | null, active: boolean, value = 'transform') {
  if (!el) return;
  el.style.willChange = active ? value : 'auto';
}
