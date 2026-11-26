import React from 'react';

/**
 * Fundo exclusivo extraido da imagem de referencia (Plum / Mulberry + silhuetas de palmeiras).
 * 100% estatico na GPU, zero emojis e zero cores fora da paleta.
 */
export const ViceAtmosphereBg: React.FC = React.memo(() => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{ background: 'var(--vice-bg-gradient)' }}
    >
      {/* Silhuetas discretas de palmeiras no canto inferior direito idênticas a imagem enviada */}
      <svg
        viewBox="0 0 430 220"
        preserveAspectRatio="xMaxYMax slice"
        className="absolute bottom-0 right-0 w-full h-52"
        style={{ opacity: 0.72 }}
      >
        <g stroke="#2A1335" strokeLinecap="round" fill="none">
          {/* Palmeira maior direita */}
          <path d="M350 220 Q344 160 330 118" strokeWidth="6" />
          <path d="M330 118 Q304 108 282 122" strokeWidth="3.5" />
          <path d="M330 118 Q308 92 292 86" strokeWidth="3.2" />
          <path d="M330 118 Q336 86 356 80" strokeWidth="3.2" />
          <path d="M330 118 Q356 102 380 112" strokeWidth="3.5" />
          <path d="M330 118 Q352 128 368 148" strokeWidth="3" />

          {/* Palmeira menor lateral */}
          <path d="M276 220 Q282 178 294 148" strokeWidth="4.5" />
          <path d="M294 148 Q272 138 256 150" strokeWidth="2.8" />
          <path d="M294 148 Q282 126 270 120" strokeWidth="2.6" />
          <path d="M294 148 Q304 124 322 122" strokeWidth="2.6" />
          <path d="M294 148 Q316 140 334 152" strokeWidth="2.8" />
        </g>
      </svg>
    </div>
  );
});

ViceAtmosphereBg.displayName = 'ViceAtmosphereBg';
