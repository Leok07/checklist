import { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';

export interface NeonBurstHandle {
  burst: (clientX: number, clientY: number, primaryColor: string, secondaryColor?: string) => void;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  rotation: number;
  vRot: number;
}

const POOL_SIZE = 56;

/**
 * Canvas leve com pool pre-alocado de particulas geometricas na paleta da imagem.
 * Zero alocacao de objetos no loop RAF, 0% CPU quando inativo, zero emojis.
 */
export const NeonBurstCanvas = forwardRef<NeonBurstHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const poolRef = useRef<Particle[]>(
    Array.from({ length: POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 4,
      life: 0,
      maxLife: 0.45,
      color: '#E07AB0',
      rotation: 0,
      vRot: 0,
    }))
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      const w = parent ? parent.clientWidth : window.innerWidth;
      const h = parent ? parent.clientHeight : window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const tick = (now: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      rafRef.current = null;
      return;
    }

    if (lastTimeRef.current === 0) lastTimeRef.current = now;
    const dt = Math.min(0.032, Math.max(0.004, (now - lastTimeRef.current) / 1000));
    lastTimeRef.current = now;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    ctx.clearRect(0, 0, width, height);

    let anyActive = false;
    const pool = poolRef.current;

    for (let i = 0; i < POOL_SIZE; i++) {
      const p = pool[i];
      if (!p.active) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }

      anyActive = true;
      p.vx *= 0.94;
      p.vy = p.vy * 0.94 + 260 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.vRot * dt;

      const progress = p.life / p.maxLife;
      const alpha = 1 - progress * progress;
      const s = p.size * (1 - progress * 0.45);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.65, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.65, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    if (anyActive) {
      rafRef.current = window.requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, width, height);
      rafRef.current = null;
      lastTimeRef.current = 0;
    }
  };

  useImperativeHandle(ref, () => ({
    burst(clientX, clientY, primaryColor, secondaryColor = '#E6DCE8') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const pool = poolRef.current;
      let spawned = 0;
      const count = 14;

      for (let i = 0; i < POOL_SIZE && spawned < count; i++) {
        const p = pool[i];
        if (p.active) continue;

        const angle = (Math.PI * 2 * spawned) / count + (Math.random() - 0.5) * 0.35;
        const speed = 110 + Math.random() * 170;

        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed - 65;
        p.size = 3.5 + Math.random() * 3.5;
        p.life = 0;
        p.maxLife = 0.36 + Math.random() * 0.16;
        p.color = spawned % 3 === 0 ? secondaryColor : primaryColor;
        p.rotation = Math.random() * Math.PI;
        p.vRot = (Math.random() - 0.5) * 10;
        spawned++;
      }

      if (rafRef.current === null) {
        lastTimeRef.current = 0;
        rafRef.current = window.requestAnimationFrame(tick);
      }
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-40"
    />
  );
});

NeonBurstCanvas.displayName = 'NeonBurstCanvas';
