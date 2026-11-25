import React from 'react';
import { Plus } from 'lucide-react';
import { PersonAssignment } from '../types/checklist';
import { useDraggableFab } from '../motion/useDraggableFab';

interface ViceFabProps {
  containerRef: React.RefObject<HTMLDivElement>;
  splitRatio: number;
  hoverTarget: PersonAssignment | null;
  onHoverTargetChange: (target: PersonAssignment | null) => void;
  onTap: () => void;
  onDropOnPerson: (person: PersonAssignment, x: number, y: number) => void;
}

/**
 * Botao "+" flutuante magnetico arrastavel (120fps translate3d + fisica de molas).
 * Arraste sobre Leeo ou Marii para criar direto naquela coluna, ou estacione nas bordas.
 */
export const ViceFab: React.FC<ViceFabProps> = ({
  containerRef,
  splitRatio,
  hoverTarget,
  onHoverTargetChange,
  onTap,
  onDropOnPerson,
}) => {
  const { fabRef, fabHandlers } = useDraggableFab({
    containerRef,
    splitRatio,
    onTap,
    onDropOnPerson,
    onHoverTargetChange,
  });

  const bgGradient =
    hoverTarget === 'leeo'
      ? 'linear-gradient(135deg, #00F0FF 0%, #0284C7 100%)'
      : hoverTarget === 'marii'
      ? 'linear-gradient(135deg, #FF2E93 0%, #9333EA 100%)'
      : 'linear-gradient(135deg, #00E5FF 0%, #FF2E93 58%, #FFB84D 100%)';

  return (
    <button
      ref={fabRef}
      type="button"
      aria-label="Adicionar nova task (arraste sobre Leeo ou Marii)"
      className="absolute top-0 left-0 z-40 w-[58px] h-[58px] rounded-full flex items-center justify-center text-white shadow-2xl border border-white/30 touch-none select-none cursor-grab active:cursor-grabbing"
      style={{
        background: bgGradient,
        boxShadow:
          hoverTarget === 'leeo'
            ? '0 10px 28px rgba(0, 240, 255, 0.55)'
            : hoverTarget === 'marii'
            ? '0 10px 28px rgba(255, 46, 147, 0.55)'
            : '0 10px 28px rgba(255, 46, 147, 0.42), 0 0 18px rgba(0, 229, 255, 0.35)',
      }}
      {...fabHandlers}
    >
      <div className="flex flex-col items-center justify-center leading-none pointer-events-none">
        <Plus className="w-6 h-6 stroke-[2.75]" />
        {hoverTarget && (
          <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">
            {hoverTarget === 'leeo' ? 'Leeo' : 'Marii'}
          </span>
        )}
      </div>
    </button>
  );
};
