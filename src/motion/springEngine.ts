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
  damping: 20,
  precision: 0.05,
};

export const SPRING_SHEET: SpringConfig = {
  mass: 1,
  stiffness: 340,
  damping: 28,
  precision: 0.05,
};

export const SPRING_GENTLE: SpringConfig = {
  mass: 1.1,
  stiffness: 240,
  damping: 24,
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
// Dilatacao temporal deterministica: limita o avanco maximo por frame a 16.67ms.
// Se o sistema cair de FPS sob carga, a animacao acompanha em camera lenta suave
// em vez de pular frames ou finalizar instantaneamente.
const MAX_SIM_STEP = 1 / 60;
let adaptiveTimeScale = 1;

function tickAllSprings(now: number) {
  if (lastFrameTime === 0) {
    lastFrameTime = now;
  }

  let rawDt = (now - lastFrameTime) / 1000;
  lastFrameTime = now;
  if (rawDt <= 0) rawDt = 0.008;

  if (rawDt > 0.024) {
    // Sistema sob carga: reduz gradualmente a escala temporal para camera lenta fluida
    const pressure = Math.min(1, (rawDt - 0.024) / 0.08);
    const targetScale = 1 - pressure * 0.55;
    adaptiveTimeScale = adaptiveTimeScale * 0.7 + targetScale * 0.3;
  } else {
    // Recupera suavemente para 1.0x quando a taxa de quadros normaliza
    adaptiveTimeScale = adaptiveTimeScale * 0.85 + 0.15;
  }

  const simDt = Math.min(MAX_SIM_STEP, rawDt * adaptiveTimeScale);

  // Iteracao in-place sem alocar novos arrays ou closures
  activeSprings.forEach((spring) => {
    const { mass, stiffness, damping } = spring.config;
    const precision = spring.config.precision ?? 0.05;

    let x = spring.value;
    let v = spring.velocity;
    const target = spring.target;

    let remaining = simDt;
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
    adaptiveTimeScale = 1;
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
