import React, { useEffect, useRef } from 'react';
import {
  Check,
  SlidersHorizontal,
  Trash2,
  Flame,
  Star,
  Minus,
  Plus,
} from 'lucide-react';
import { ChecklistItem } from '../types/checklist';
import {
  BAG_LOCATION_MAP,
  TASK_ICON_MAP,
  resolveAccentOption,
} from '../data/customization';
import { CardDragPayload, useSwipeAndDragCard } from '../motion/useSwipeAndDragCard';
import { animateSpringScalePop, animateSpringScaleX } from '../motion/waapiSpring';
import { SPRING_BOUNCY } from '../motion/springEngine';
import { triggerHaptic } from '../motion/haptics';

export type CardDensity = 'compact' | 'expanded' | 'rail';

interface ItemCardProps {
  item: ChecklistItem;
  density: CardDensity;
  isBeingDragged?: boolean;
  justLanded?: boolean;
  onToggle: (id: string, x: number, y: number) => void;
  onCustomize: (item: ChecklistItem) => void;
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onDragStart?: (payload: CardDragPayload) => void;
  onDragMove?: (clientX: number, clientY: number, vx: number) => void;
  onDragEnd?: (clientX: number, clientY: number) => void;
}

export function getCardVisualStyles(item: ChecklistItem) {
  const accent = resolveAccentOption(item.accentColor, item.assignedTo);

  let background = 'var(--vice-surface)';
  let borderColor = 'var(--vice-border)';
  let boxShadow = '0 4px 14px rgba(15, 6, 22, 0.22)';

  if (item.cardStyle === 'neon') {
    background = 'var(--vice-surface-strong)';
    borderColor = accent.hex;
    boxShadow = accent.glow;
  } else if (item.cardStyle === 'gradient') {
    background = accent.gradient;
    borderColor = `${accent.hex}66`;
    boxShadow = '0 6px 18px rgba(15, 6, 22, 0.28)';
  } else if (item.cardStyle === 'solid') {
    background = 'var(--vice-surface-strong)';
    borderColor = 'var(--vice-border-strong)';
    boxShadow = '0 6px 16px rgba(15, 6, 22, 0.30)';
  }

  return { accent, background, borderColor, boxShadow };
}

export const ItemCard: React.FC<ItemCardProps> = React.memo(
  ({
    item,
    density,
    isBeingDragged = false,
    justLanded = false,
    onToggle,
    onCustomize,
    onRemove,
    onUpdateQuantity,
    onToggleSubtask,
    onDragStart,
    onDragMove,
    onDragEnd,
  }) => {
    const { accent, background, borderColor, boxShadow } = getCardVisualStyles(item);
    const IconComp = TASK_ICON_MAP[item.icon] ?? TASK_ICON_MAP.sparkles;
    const bagMeta = BAG_LOCATION_MAP[item.bag];
    const BagIcon = bagMeta?.Icon;

    const { surfaceRef, rightRevealRef, leftRevealRef, deleteHintRef, gestureHandlers } =
      useSwipeAndDragCard({
        itemId: item.id,
        disabled: isBeingDragged,
        onTapToggle: onToggle,
        onSwipeComplete: onToggle,
        onSwipeEdit: () => onCustomize(item),
        onSwipeDelete: onRemove,
        onDragStart,
        onDragMove,
        onDragEnd,
      });

    const completedSubtasks = item.subtasks.filter((s) => s.done).length;
    const totalSubtasks = item.subtasks.length;
    const subtaskRatio = totalSubtasks > 0 ? completedSubtasks / totalSubtasks : 0;

    const subBarRef = useRef<HTMLDivElement | null>(null);
    const prevSubRatioRef = useRef(subtaskRatio);

    useEffect(() => {
      if (justLanded) {
        animateSpringScalePop(surfaceRef.current, 1.07, -1.8);
      }
    }, [justLanded, surfaceRef]);

    useEffect(() => {
      const bar = subBarRef.current;
      if (!bar) return;
      if (Math.abs(prevSubRatioRef.current - subtaskRatio) > 0.001) {
        animateSpringScaleX(bar, prevSubRatioRef.current, subtaskRatio, SPRING_BOUNCY);
        prevSubRatioRef.current = subtaskRatio;
      } else {
        bar.style.transform = `scaleX(${subtaskRatio.toFixed(4)})`;
      }
    }, [subtaskRatio]);

    // MODO RAIL (Coluna reduzida a 24% quando o divisor e arrastado)
    if (density === 'rail') {
      return (
        <div
          className="relative rounded-2xl overflow-hidden gpu-card-contain"
          style={{ opacity: isBeingDragged ? 0.25 : 1 }}
        >
          <div
            ref={surfaceRef}
            {...gestureHandlers}
            className="relative rounded-2xl p-2 border flex flex-col items-center justify-center gap-1 select-none touch-pan-y cursor-pointer"
            style={{
              background,
              borderColor: item.completed ? 'var(--vice-border)' : borderColor,
              opacity: item.completed ? 0.55 : 1,
            }}
          >
            {item.priority === 'urgent' && !item.completed && (
              <span
                aria-hidden="true"
                className="vice-urgent-aura pointer-events-none absolute inset-0 rounded-2xl border-2 border-[#F09AC6]"
              />
            )}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center relative"
              style={{
                backgroundColor: item.completed ? accent.hex : accent.softBg,
                color: item.completed ? accent.inkHex : accent.hex,
              }}
            >
              {item.completed ? (
                <Check className="w-4 h-4 stroke-[3]" />
              ) : (
                <IconComp className="w-4 h-4" />
              )}
              {item.quantity > 1 && (
                <span className="absolute -top-1.5 -right-1.5 px-1 rounded-full text-[9px] font-black bg-[#2B1738] text-[#F3ECF5] border border-[#E6DCE8]/30">
                  {item.quantity}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] font-semibold text-center leading-tight line-clamp-1 w-full ${
                item.completed ? 'line-through text-[#8E7498]' : 'text-[#F3ECF5]'
              }`}
            >
              {item.name}
            </span>
          </div>
        </div>
      );
    }

    const isExpanded = density === 'expanded';

    return (
      <div
        className="relative rounded-2xl overflow-hidden gpu-card-contain"
        style={{ opacity: isBeingDragged ? 0.22 : 1 }}
      >
        {/* Camada de acao Swipe Direita (Concluir) */}
        <div
          ref={rightRevealRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl flex items-center justify-start pl-3.5"
          style={{
            opacity: 0,
            background: 'linear-gradient(90deg, rgba(236, 227, 238, 0.28), rgba(224, 122, 176, 0.12))',
          }}
        >
          <div className="flex items-center gap-1.5 text-[#ECE3EE] text-[11px] font-bold">
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{item.completed ? 'Reabrir' : 'Pronto'}</span>
          </div>
        </div>

        {/* Camada de acao Swipe Esquerda Estagio 1 (Personalizar) */}
        <div
          ref={leftRevealRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl flex items-center justify-end pr-3.5"
          style={{
            opacity: 0,
            background: 'linear-gradient(270deg, rgba(224, 122, 176, 0.34), rgba(176, 107, 163, 0.14))',
          }}
        >
          <div className="flex items-center gap-1 text-[#F09AC6] text-[11px] font-bold">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Estilo</span>
          </div>
        </div>

        {/* Camada de acao Swipe Esquerda Estagio 2 (Excluir) */}
        <div
          ref={deleteHintRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl flex items-center justify-end pr-3.5"
          style={{
            opacity: 0,
            background: 'linear-gradient(270deg, rgba(224, 122, 176, 0.85), rgba(91, 43, 92, 0.45))',
          }}
        >
          <div className="flex items-center gap-1 text-[#22122A] text-[11px] font-black">
            <Trash2 className="w-4 h-4" />
            <span>Solte p/ apagar</span>
          </div>
        </div>

        {/* Superficie GPU Arrastavel do Card */}
        <div
          ref={surfaceRef}
          {...gestureHandlers}
          className={`relative rounded-2xl border select-none touch-pan-y cursor-pointer ${
            isExpanded ? 'p-3' : 'p-2.5'
          }`}
          style={{
            background,
            borderColor: item.completed ? 'var(--vice-border)' : borderColor,
            boxShadow: item.completed ? 'none' : boxShadow,
          }}
        >
          {item.priority === 'urgent' && !item.completed && (
            <span
              aria-hidden="true"
              className="vice-urgent-aura pointer-events-none absolute inset-0 rounded-2xl border-[1.5px] border-[#F09AC6]"
              style={{ boxShadow: 'inset 0 0 14px rgba(240, 154, 198, 0.22)' }}
            />
          )}

          {/* Faixa lateral de identificacao */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full"
            style={{
              backgroundColor: accent.hex,
              opacity: item.completed ? 0.35 : 0.95,
            }}
          />

          <div className="flex items-start gap-2 pl-1">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{
                backgroundColor: item.completed ? accent.hex : accent.softBg,
                color: item.completed ? accent.inkHex : accent.hex,
              }}
            >
              {item.completed ? (
                <Check className="w-4 h-4 stroke-[3]" />
              ) : (
                <IconComp className="w-3.5 h-3.5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-1">
                <p
                  className={`font-semibold leading-snug break-words ${
                    isExpanded ? 'text-sm' : 'text-[12.5px] line-clamp-2'
                  } ${item.completed ? 'line-through text-[#8E7498]' : 'text-[#F3ECF5]'}`}
                >
                  {item.name}
                </p>

                <button
                  type="button"
                  data-no-gesture="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic('tap');
                    onCustomize(item);
                  }}
                  aria-label={`Personalizar ${item.name}`}
                  className="-mr-1 -mt-1 w-7 h-7 rounded-lg flex items-center justify-center text-[#8E7498] hover:text-[#F3ECF5] active:scale-90 shrink-0"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Meta Chips Compactos */}
              <div className="mt-1.5 flex items-center flex-wrap gap-1">
                {item.quantity > 1 && !isExpanded && (
                  <span
                    className="px-1.5 py-0.5 rounded-md text-[10px] font-black leading-none"
                    style={{ backgroundColor: accent.softBg, color: accent.hex }}
                  >
                    x{item.quantity}
                  </span>
                )}

                {item.priority === 'urgent' && !item.completed && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-[#E07AB0]/20 text-[#F09AC6]">
                    <Flame className="w-2.5 h-2.5" />
                    {isExpanded ? 'Urgente' : '!'}
                  </span>
                )}

                {item.priority === 'essential' && !item.completed && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[#E6DCE8]/18 text-[#E6DCE8]">
                    <Star className="w-2.5 h-2.5" />
                    {isExpanded ? 'Essencial' : ''}
                  </span>
                )}

                {BagIcon && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-[var(--vice-surface-subtle)] text-[#C7B4CE]">
                    <BagIcon className="w-2.5 h-2.5" />
                    {isExpanded && <span>{bagMeta.label}</span>}
                  </span>
                )}

                {totalSubtasks > 0 && !isExpanded && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[var(--vice-surface-subtle)] text-[#C7B4CE]">
                    {completedSubtasks}/{totalSubtasks}
                  </span>
                )}

                {!isExpanded && item.tags[0] && (
                  <span className="text-[9px] font-semibold text-[#8E7498] truncate max-w-[68px]">
                    #{item.tags[0]}
                  </span>
                )}
              </div>

              {/* Mini barra de sub-tasks (GPU scaleX com mola WAAPI) no modo 50/50 */}
              {!isExpanded && totalSubtasks > 0 && (
                <div className="mt-1.5 h-1 w-full rounded-full bg-[#6A416C] overflow-hidden">
                  <div
                    ref={subBarRef}
                    className="h-full w-full rounded-full origin-left"
                    style={{
                      backgroundColor: accent.hex,
                      transform: `scaleX(${subtaskRatio.toFixed(4)})`,
                    }}
                  />
                </div>
              )}

              {/* Detalhes Ricos no Modo Expandido (76%) */}
              {isExpanded && (
                <div className="mt-2 space-y-2">
                  {item.note && (
                    <p className="text-[11px] leading-snug text-[#C7B4CE] bg-[var(--vice-surface-subtle)] px-2.5 py-1.5 rounded-xl">
                      {item.note}
                    </p>
                  )}

                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ backgroundColor: accent.softBg, color: accent.hex }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {totalSubtasks > 0 && (
                    <div className="space-y-1 pt-0.5">
                      {item.subtasks.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          data-no-gesture="true"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic('tap');
                            onToggleSubtask(item.id, sub.id);
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[var(--vice-surface-subtle)] text-left active:scale-[0.98]"
                        >
                          <span
                            className="w-4 h-4 rounded flex items-center justify-center shrink-0 border"
                            style={{
                              borderColor: sub.done ? accent.hex : 'var(--vice-border-strong)',
                              backgroundColor: sub.done ? accent.hex : 'transparent',
                              color: accent.inkHex,
                            }}
                          >
                            {sub.done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </span>
                          <span
                            className={`text-[11px] font-medium truncate ${
                              sub.done ? 'line-through text-[#8E7498]' : 'text-[#F3ECF5]'
                            }`}
                          >
                            {sub.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-[var(--vice-border)]">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8E7498]">
                      Quantidade
                    </span>
                    <div className="inline-flex items-center gap-1 bg-[var(--vice-surface-subtle)] rounded-xl p-0.5 border border-[var(--vice-border)]">
                      <button
                        type="button"
                        data-no-gesture="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('tap');
                          onUpdateQuantity(item.id, -1);
                        }}
                        aria-label="Diminuir quantidade"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#F3ECF5] active:scale-90"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span
                        className="min-w-[24px] text-center text-xs font-black"
                        style={{ color: accent.hex }}
                      >
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        data-no-gesture="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('tap');
                          onUpdateQuantity(item.id, 1);
                        }}
                        aria-label="Aumentar quantidade"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#F3ECF5] active:scale-90"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ItemCard.displayName = 'ItemCard';
