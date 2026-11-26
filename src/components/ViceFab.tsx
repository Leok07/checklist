import React from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { PersonAssignment } from '../types/checklist';
import { useDraggableFab } from '../motion/useDraggableFab';

interface ViceFabProps {
  containerRef: React.RefObject<HTMLDivElement>;
  splitRatio: number;
  hoverTarget: PersonAssignment | null;
  hintPulse: boolean;
  onHoverTargetChange: (target: PersonAssignment | null) => void;
  onTapHint: () => void;
  onDropOnPerson: (person: PersonAssignment, x: number, y: number) => void;
}

/**
 * Botao "+" inferior unico em um trilho tatil na paleta GTA 6 Settings.
 * So cria tarefas quando arrastado para a esquerda (Leeo) ou direita (Marii).
 */
export const ViceFab: React.FC<ViceFabProps> = ({
  containerRef,
  splitRatio,
  hoverTarget,
  hintPulse,
  onHoverTargetChange,
  onTapHint,
  onDropOnPerson,
}) => {
  const { fabRef, bottomOffset, fabHandlers } = useDraggableFab({
    containerRef,
    splitRatio,
    onTapHint,
    onDropOnPerson,
    onHoverTargetChange,
  });

  const isLeeoTarget = hoverTarget === 'leeo';
  const isMariiTarget = hoverTarget === 'marii';

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-40 flex items-center justify-center px-4"
      style={{ bottom: `max(${bottomOffset}px, env(safe-area-inset-bottom))` }}
    >
      {/* Trilho horizontal guia (Leeo <-> Marii) */}
      <div
        className="relative flex items-center justify-between w-[256px] h-[48px] px-3.5 rounded-full border bg-[#2B1738]/92 shadow-2xl"
        style={{
          borderColor: hintPulse ? '#F09AC6' : 'var(--vice-border-strong)',
        }}
      >
        <div
          className="flex items-center gap-1 text-[11px] font-bold tracking-wide uppercase"
          style={{
            color: isLeeoTarget ? '#22122A' : '#E6DCE8',
            background: isLeeoTarget ? 'linear-gradient(90deg, #ECE3EE, #D3C3D8)' : 'transparent',
            padding: isLeeoTarget ? '4px 8px' : '4px 2px',
            borderRadius: '999px',
            opacity: isMariiTarget ? 0.35 : isLeeoTarget || hintPulse ? 1 : 0.72,
          }}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Leeo</span>
        </div>

        <div
          className="flex items-center gap-1 text-[11px] font-bold tracking-wide uppercase"
          style={{
            color: isMariiTarget ? '#22122A' : '#E07AB0',
            background: isMariiTarget ? 'linear-gradient(90deg, #E07AB0, #F09AC6)' : 'transparent',
            padding: isMariiTarget ? '4px 8px' : '4px 2px',
            borderRadius: '999px',
            opacity: isLeeoTarget ? 0.35 : isMariiTarget || hintPulse ? 1 : 0.78,
          }}
        >
          <span>Marii</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>

        {/* Unico botao "+" arrastavel do app */}
        <button
          ref={fabRef}
          type="button"
          aria-label="Arraste para Leeo ou Marii para adicionar uma nova task"
          className="pointer-events-auto absolute left-1/2 -ml-[28px] -top-[5px] w-[56px] h-[56px] rounded-full flex items-center justify-center border border-[#F3ECF5]/40 shadow-2xl touch-none select-none cursor-grab active:cursor-grabbing"
          style={{
            background: isLeeoTarget
              ? 'linear-gradient(135deg, #ECE3EE 0%, #9E8AA6 100%)'
              : isMariiTarget
              ? 'linear-gradient(135deg, #F09AC6 0%, #E07AB0 100%)'
              : 'linear-gradient(135deg, #ECE3EE 0%, #E07AB0 68%, #B06BA3 100%)',
            color: '#22122A',
            boxShadow: isMariiTarget
              ? '0 10px 26px rgba(224, 122, 176, 0.5)'
              : '0 10px 26px rgba(20, 8, 28, 0.65)',
          }}
          {...fabHandlers}
        >
          <div className="flex flex-col items-center justify-center leading-none pointer-events-none">
            <Plus className="w-6 h-6 stroke-[2.75]" />
            {hoverTarget && (
              <span className="text-[8.5px] font-black uppercase tracking-wider mt-0.5">
                {hoverTarget === 'leeo' ? 'Leeo' : 'Marii'}
              </span>
            )}
          </div>
        </button>
      </div>
    </div>
  );
};
