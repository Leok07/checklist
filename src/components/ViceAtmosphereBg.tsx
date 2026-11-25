import React from 'react';
import { ViceAtmosphere } from '../types/checklist';

interface ViceAtmosphereBgProps {
  atmosphere: ViceAtmosphere;
}

/**
 * Fundo atmosferico estilo GTA 6 / Vice City (100% estatico na GPU, 0 custo por frame).
 * Sem emojis — apenas gradientes atmosfericos e arte vetorial SVG minimalista.
 */
export const ViceAtmosphereBg: React.FC<ViceAtmosphereBgProps> = React.memo(({ atmosphere }) => {
  const isDay = atmosphere === 'day';
  const isSunset = atmosphere === 'sunset';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{ background: 'var(--vice-bg-gradient)' }}
    >
      {/* Disco solar estilizado de Leonida (mais intenso no Sunset, suave no Day/Night) */}
      <svg
        viewBox="0 0 430 260"
        preserveAspectRatio="xMidYMax slice"
        className="absolute bottom-0 left-0 w-full h-56"
        style={{ opacity: isSunset ? 0.34 : isDay ? 0.2 : 0.16 }}
      >
        <defs>
          <linearGradient id="viceSunGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isDay ? '#FF8A5B' : '#FFD166'} />
            <stop offset="55%" stopColor="#FF4DA6" />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="viceGridGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isDay ? '#0099C2' : '#00F0FF'} stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FF2E93" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Sol retro-sunset com recortes horizontais */}
        <circle cx="215" cy="210" r="88" fill="url(#viceSunGrad)" />
        <rect x="115" y="198" width="200" height="4" fill="var(--vice-bg-base)" opacity="0.6" />
        <rect x="115" y="212" width="200" height="6" fill="var(--vice-bg-base)" opacity="0.7" />
        <rect x="115" y="228" width="200" height="8" fill="var(--vice-bg-base)" opacity="0.85" />

        {/* Silhueta minimalista de palmeira esquerda */}
        <path
          d="M28 260 Q42 205 64 176 M64 176 Q40 166 22 178 M64 176 Q46 154 34 150 M64 176 Q76 152 94 154 M64 176 Q88 168 104 182"
          stroke={isDay ? '#1E1034' : '#0A0416'}
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.55"
        />

        {/* Silhueta minimalista de palmeira direita */}
        <path
          d="M402 260 Q388 210 368 182 M368 182 Q390 172 410 184 M368 182 Q382 160 398 156 M368 182 Q352 158 334 162 M368 182 Q346 175 330 190"
          stroke={isDay ? '#1E1034' : '#0A0416'}
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.55"
        />

        {/* Linhas sutis de horizonte Ocean Drive */}
        <line x1="0" y1="242" x2="430" y2="242" stroke="url(#viceGridGrad)" strokeWidth="1" />
        <line x1="0" y1="252" x2="430" y2="252" stroke="url(#viceGridGrad)" strokeWidth="1" opacity="0.6" />
      </svg>
    </div>
  );
});

ViceAtmosphereBg.displayName = 'ViceAtmosphereBg';
