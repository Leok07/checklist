import {
  SPRING_BOUNCY,
  SPRING_GENTLE,
  SPRING_SHEET,
  SPRING_SNAPPY,
  SpringConfig,
} from './springEngine';

export interface BakedSpringTrajectory {
  samples: number[];
  velocities: number[];
  durationMs: number;
}

interface ActiveWaapiSpring {
  animation: Animation;
  trajectory: BakedSpringTrajectory;
  finished: boolean;
}

const activeAnimations = new WeakMap<HTMLElement, Map<string, ActiveWaapiSpring>>();

const SUB_STEP_SEC = 0.004;
const MAX_DURATION_SEC = 1.45;
const SAMPLE_COUNT = 34;

/**
 * Pre-calcula a trajetoria exata da mola em <0.1ms para execucao 100% assincrona
 * na thread do Compositor GPU via Web Animations API (WAAPI).
 */
export function bakeSpringTrajectory(
  from: number,
  to: number,
  initialVelocity = 0,
  config: SpringConfig = SPRING_BOUNCY
): BakedSpringTrajectory {
  const { mass, stiffness, damping } = config;
  const precision = config.precision ?? 0.05;

  let x = from;
  let v = Number.isFinite(initialVelocity) ? initialVelocity : 0;
  let elapsed = 0;

  const rawX: number[] = [x];
  const rawV: number[] = [v];

  const maxSteps = Math.floor(MAX_DURATION_SEC / SUB_STEP_SEC);
  for (let i = 0; i < maxSteps; i++) {
    const force = -stiffness * (x - to) - damping * v;
    const acc = force / mass;
    v += acc * SUB_STEP_SEC;
    x += v * SUB_STEP_SEC;
    elapsed += SUB_STEP_SEC;

    rawX.push(x);
    rawV.push(v);

    if (
      elapsed > 0.08 &&
      Math.abs(to - x) <= precision &&
      Math.abs(v) <= precision * 10
    ) {
      break;
    }
  }

  rawX[rawX.length - 1] = to;
  rawV[rawV.length - 1] = 0;

  const samples: number[] = [];
  const velocities: number[] = [];
  const lastIdx = rawX.length - 1;

  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const idx = Math.round((i / (SAMPLE_COUNT - 1)) * lastIdx);
    samples.push(rawX[idx]);
    velocities.push(rawV[idx]);
  }

  return {
    samples,
    velocities,
    durationMs: Math.max(120, Math.round(elapsed * 1000)),
  };
}

function getElementMap(el: HTMLElement): Map<string, ActiveWaapiSpring> {
  let map = activeAnimations.get(el);
  if (!map) {
    map = new Map();
    activeAnimations.set(el, map);
  }
  return map;
}

/**
 * Le analiticamente posicao e velocidade no milissegundo exato da interrupcao,
 * sem chamar getComputedStyle e sem causar Layout Reflow.
 */
export function readActiveSpringState(
  el: HTMLElement | null,
  key: string
): { value: number; velocity: number } | null {
  if (!el) return null;
  const entry = activeAnimations.get(el)?.get(key);
  if (!entry || entry.finished) return null;

  const ct = typeof entry.animation.currentTime === 'number' ? entry.animation.currentTime : 0;
  const progress = Math.min(1, Math.max(0, ct / Math.max(1, entry.trajectory.durationMs)));
  const maxIdx = entry.trajectory.samples.length - 1;
  const exactIdx = progress * maxIdx;
  const i0 = Math.floor(exactIdx);
  const i1 = Math.min(maxIdx, i0 + 1);
  const frac = exactIdx - i0;

  const value =
    entry.trajectory.samples[i0] +
    (entry.trajectory.samples[i1] - entry.trajectory.samples[i0]) * frac;
  const velocity =
    entry.trajectory.velocities[i0] +
    (entry.trajectory.velocities[i1] - entry.trajectory.velocities[i0]) * frac;

  return { value, velocity };
}

export function cancelWaapiSpring(el: HTMLElement | null, key?: string): void {
  if (!el) return;
  const map = activeAnimations.get(el);
  if (!map) return;

  if (key) {
    const entry = map.get(key);
    if (entry) {
      entry.finished = true;
      try {
        entry.animation.cancel();
      } catch {
        // Ignora
      }
      map.delete(key);
    }
    return;
  }

  map.forEach((entry) => {
    entry.finished = true;
    try {
      entry.animation.cancel();
    } catch {
      // Ignora
    }
  });
  map.clear();
}

export function animateSpringTransform(
  el: HTMLElement | null,
  key: string,
  from: number,
  to: number,
  initialVelocity: number,
  config: SpringConfig,
  buildTransform: (val: number) => string,
  restTransform: string,
  onFinish?: () => void
): void {
  if (!el) {
    onFinish?.();
    return;
  }

  // Interrompe animacao anterior no compositor herdando velocidade atual se houver
  const interrupted = readActiveSpringState(el, key);
  const startFrom = interrupted ? interrupted.value : from;
  const startVel = interrupted && Math.abs(initialVelocity) < 1 ? interrupted.velocity : initialVelocity;
  cancelWaapiSpring(el, key);

  if (typeof el.animate !== 'function') {
    el.style.transform = restTransform;
    onFinish?.();
    return;
  }

  const trajectory = bakeSpringTrajectory(startFrom, to, startVel, config);
  const keyframes: Keyframe[] = trajectory.samples.map((val) => ({
    transform: buildTransform(val),
  }));

  el.style.willChange = 'transform';
  const animation = el.animate(keyframes, {
    duration: trajectory.durationMs,
    easing: 'linear',
    fill: 'forwards',
  });

  const record: ActiveWaapiSpring = {
    animation,
    trajectory,
    finished: false,
  };
  getElementMap(el).set(key, record);

  animation.onfinish = () => {
    if (record.finished) return;
    record.finished = true;
    activeAnimations.get(el)?.delete(key);
    // Compromete o estilo final inline e cancela a camada fill:forwards
    // para nunca travar o transform durante o proximo arraste com o dedo
    el.style.transform = restTransform;
    try {
      animation.cancel();
    } catch {
      // Ignora
    }
    if ((activeAnimations.get(el)?.size ?? 0) === 0) {
      el.style.willChange = 'auto';
    }
    onFinish?.();
  };
}

export function animateSpringTranslateX(
  el: HTMLElement | null,
  fromX: number,
  toX: number,
  velocity = 0,
  config: SpringConfig = SPRING_BOUNCY,
  onFinish?: () => void
): void {
  const rest = Math.abs(toX) < 0.05 ? '' : `translate3d(${toX.toFixed(2)}px, 0, 0)`;
  animateSpringTransform(
    el,
    'tx',
    fromX,
    toX,
    velocity,
    config,
    (x) => `translate3d(${x.toFixed(2)}px, 0, 0)`,
    rest,
    onFinish
  );
}

export function animateSpringTranslateY(
  el: HTMLElement | null,
  fromY: number,
  toY: number,
  velocity = 0,
  config: SpringConfig = SPRING_SHEET,
  onFinish?: () => void
): void {
  const rest = Math.abs(toY) < 0.05 ? '' : `translate3d(0, ${toY.toFixed(2)}px, 0)`;
  animateSpringTransform(
    el,
    'ty',
    fromY,
    toY,
    velocity,
    config,
    (y) => `translate3d(0, ${y.toFixed(2)}px, 0)`,
    rest,
    onFinish
  );
}

export function animateSpringScalePop(
  el: HTMLElement | null,
  fromScale = 0.91,
  initialVelocity = 3.2,
  onFinish?: () => void
): void {
  animateSpringTransform(
    el,
    'scale',
    fromScale,
    1,
    initialVelocity,
    { ...SPRING_BOUNCY, stiffness: 380, damping: 18, precision: 0.002 },
    (s) => `scale3d(${s.toFixed(4)}, ${s.toFixed(4)}, 1)`,
    '',
    onFinish
  );
}

export function animateSpringScaleX(
  el: HTMLElement | null,
  fromScaleX: number,
  toScaleX: number,
  config: SpringConfig = SPRING_GENTLE
): void {
  const clampedFrom = Math.max(0, Math.min(1, fromScaleX));
  const clampedTo = Math.max(0, Math.min(1, toScaleX));
  animateSpringTransform(
    el,
    'sx',
    clampedFrom,
    clampedTo,
    0,
    { ...config, precision: 0.002 },
    (sx) => `scaleX(${Math.max(0, sx).toFixed(4)})`,
    `scaleX(${clampedTo.toFixed(4)})`
  );
}

export function animateSpringWiggleX(el: HTMLElement | null): void {
  if (!el) return;
  // Impulso lateral elastico indicando que o + funciona por arraste esquerda/direita
  animateSpringTransform(
    el,
    'wiggle',
    0,
    0,
    460,
    { mass: 0.9, stiffness: 460, damping: 14, precision: 0.25 },
    (x) => `translate3d(${x.toFixed(2)}px, 0, 0)`,
    ''
  );
}

export function animateSpringFlyOutX(
  el: HTMLElement | null,
  fromX: number,
  toX: number,
  velocity: number,
  onFinish: () => void
): void {
  if (!el || typeof el.animate !== 'function') {
    onFinish();
    return;
  }

  cancelWaapiSpring(el);
  const trajectory = bakeSpringTrajectory(fromX, toX, Math.min(-450, velocity), SPRING_SNAPPY);
  const duration = Math.min(260, trajectory.durationMs);
  const keyframes: Keyframe[] = trajectory.samples.map((x, idx) => {
    const t = idx / (trajectory.samples.length - 1);
    return {
      transform: `translate3d(${x.toFixed(2)}px, 0, 0)`,
      opacity: Number((1 - t * 0.85).toFixed(3)),
    };
  });

  el.style.willChange = 'transform, opacity';
  const anim = el.animate(keyframes, {
    duration,
    easing: 'linear',
    fill: 'forwards',
  });

  anim.onfinish = () => {
    el.style.willChange = 'auto';
    onFinish();
  };
}

export function animateSpringOpacity(
  el: HTMLElement | null,
  from: number,
  to: number,
  durationMs = 220,
  onFinish?: () => void
): void {
  if (!el || typeof el.animate !== 'function') {
    if (el) el.style.opacity = String(to);
    onFinish?.();
    return;
  }

  cancelWaapiSpring(el, 'opacity');
  el.style.willChange = 'opacity';
  const anim = el.animate([{ opacity: from }, { opacity: to }], {
    duration: durationMs,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    fill: 'forwards',
  });

  getElementMap(el).set('opacity', {
    animation: anim,
    trajectory: { samples: [from, to], velocities: [0, 0], durationMs },
    finished: false,
  });

  anim.onfinish = () => {
    activeAnimations.get(el)?.delete('opacity');
    el.style.opacity = String(to);
    try {
      anim.cancel();
    } catch {
      // Ignora
    }
    el.style.willChange = 'auto';
    onFinish?.();
  };
}
