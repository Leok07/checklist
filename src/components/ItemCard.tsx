import React from 'react';
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
import { triggerHaptic } from '../motion/haptics';

export type CardDensity = 'compact' | 'expanded' | 'rail';

interface ItemCardProps {
  item: ChecklistItem;
  density: CardDensity;
  isBeingDragged?: boolean;
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
  let boxShadow = '0 4px 14px rgba(0, 0, 0, 0.14)';

  if (item.cardStyle === 'neon') {
    background = 'var(--vice-surface-strong)';
    borderColor = accent.hex;
    boxShadow = accent.glow;
  } else if (item.cardStyle === 'gradient') {
    background = accent.gradient;
    borderColor = `${accent.hex}66`;
    boxShadow = '0 6px 18px rgba(0, 0, 0, 0.18)';
  } else if (item.cardStyle === 'solid') {
    background = 'var(--vice-surface-strong)';
    borderColor = 'var(--vice-border-strong)';
    boxShadow = '0 6px 16px rgba(0, 0, 0, 0.22)';
  }

  return { accent, background, borderColor, boxShadow };
}

export const ItemCard: React.FC<ItemCardProps> = React.memo(
  ({
    item,
    density,
    isBeingDragged = false,
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
                className="vice-urgent-aura pointer-events-none absolute inset-0 rounded-2xl border-2 border-[#FF3B5C]"
              />
            )}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center relative"
              style={{
                backgroundColor: item.completed ? accent.hex : accent.softBg,
                color: item.completed ? '#080412' : accent.hex,
              }}
            >
              {item.completed ? (
                <Check className="w-4 h-4 stroke-[3]" />
              ) : (
                <IconComp className="w-4 h-4" />
              )}
              {item.quantity > 1 && (
                <span className="absolute -top-1.5 -right-1.5 px-1 rounded-full text-[9px] font-black bg-[#080412] text-white border border-white/25">
                  {item.quantity}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] font-semibold text-center leading-tight line-clamp-1 w-full ${
                item.completed
                  ? 'line-through text-[var(--vice-text-muted)]'
                  : 'text-[var(--vice-text-primary)]'
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
        {/* Camada de acao Swipe Direita (Concluir) - GPU opacity-only */}
        <div
          ref={rightRevealRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl flex items-center justify-start pl-3.5"
          style={{
            opacity: 0,
            background: 'linear-gradient(90deg, rgba(16, 245, 168, 0.32), rgba(0, 229, 255, 0.14))',
          }}
        >
          <div className="flex items-center gap-1.5 text-[#10F5A8] text-[11px] font-bold">
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
            background: 'linear-gradient(270deg, rgba(255, 46, 147, 0.34), rgba(168, 85, 247, 0.14))',
          }}
        >
          <div className="flex items-center gap-1 text-[#FF4DA6] text-[11px] font-bold">
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
            background: 'linear-gradient(270deg, rgba(255, 59, 92, 0.85), rgba(255, 46, 147, 0.35))',
          }}
        >
          <div className="flex items-center gap-1 text-white text-[11px] font-black">
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
          {/* Aura pulsante GPU-only para prioridade urgente */}
          {item.priority === 'urgent' && !item.completed && (
            <span
              aria-hidden="true"
              className="vice-urgent-aura pointer-events-none absolute inset-0 rounded-2xl border-[1.5px] border-[#FF3B5C]"
              style={{ boxShadow: 'inset 0 0 14px rgba(255, 59, 92, 0.25)' }}
            />
          )}

          {/* Faixa lateral neon de identificacao */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full"
            style={{
              backgroundColor: accent.hex,
              opacity: item.completed ? 0.35 : 0.95,
            }}
          />

          {/* Linha Principal: Icone + Titulo + Botao Personalizar */}
          <div className="flex items-start gap-2 pl-1">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-transform"
              style={{
                backgroundColor: item.completed ? accent.hex : accent.softBg,
                color: item.completed ? '#080412' : accent.hex,
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
                  } ${
                    item.completed
                      ? 'line-through text-[var(--vice-text-muted)]'
                      : 'text-[var(--vice-text-primary)]'
                  }`}
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
                  className="-mr-1 -mt-1 w-7 h-7 rounded-lg flex items-center justify-center text-[var(--vice-text-muted)] hover:text-[var(--vice-text-primary)] active:scale-90 transition-transform shrink-0"
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
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-[#FF3B5C]/20 text-[#FF3B5C]">
                    <Flame className="w-2.5 h-2.5" />
                    {isExpanded ? 'Urgente' : '!'}
                  </span>
                )}

                {item.priority === 'essential' && !item.completed && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[#FFB84D]/20 text-[#FFB84D]">
                    <Star className="w-2.5 h-2.5" />
                    {isExpanded ? 'Essencial' : ''}
                  </span>
                )}

                {BagIcon && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-[var(--vice-surface-subtle)] text-[var(--vice-text-secondary)]">
                    <BagIcon className="w-2.5 h-2.5" />
                    {isExpanded && <span>{bagMeta.label}</span>}
                  </span>
                )}

                {totalSubtasks > 0 && !isExpanded && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[var(--vice-surface-subtle)] text-[var(--vice-text-secondary)]">
                    {completedSubtasks}/{totalSubtasks}
                  </span>
                )}

                {!isExpanded && item.tags[0] && (
                  <span className="text-[9px] font-semibold text-[var(--vice-text-muted)] truncate max-w-[68px]">
                    #{item.tags[0]}
                  </span>
                )}
              </div>

              {/* Mini barra de sub-tasks (GPU scaleX) no modo 50/50 */}
              {!isExpanded && totalSubtasks > 0 && (
                <div className="mt-1.5 h-1 w-full rounded-full bg-[var(--vice-surface-subtle)] overflow-hidden">
                  <div
                    className="h-full w-full rounded-full origin-left transition-transform duration-200"
                    style={{
                      backgroundColor: accent.hex,
                      transform: `scaleX(${subtaskRatio})`,
                    }}
                  />
                </div>
              )}

              {/* Detalhes Ricos no Modo Expandido (76%) */}
              {isExpanded && (
                <div className="mt-2 space-y-2">
                  {item.note && (
                    <p className="text-[11px] leading-snug text-[var(--vice-text-secondary)] bg-[var(--vice-surface-subtle)] px-2.5 py-1.5 rounded-xl">
                      {item.note}
                    </p>
                  )}

                  {/* Tags Customizadas */}
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

                  {/* Sub-checklist Interativo */}
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
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[var(--vice-surface-subtle)] text-left active:scale-[0.98] transition-transform"
                        >
                          <span
                            className="w-4 h-4 rounded flex items-center justify-center shrink-0 border"
                            style={{
                              borderColor: sub.done ? accent.hex : 'var(--vice-border-strong)',
                              backgroundColor: sub.done ? accent.hex : 'transparent',
                              color: '#080412',
                            }}
                          >
                            {sub.done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </span>
                          <span
                            className={`text-[11px] font-medium truncate ${
                              sub.done
                                ? 'line-through text-[var(--vice-text-muted)]'
                                : 'text-[var(--vice-text-primary)]'
                            }`}
                          >
                            {sub.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Stepper de Quantidade Rapido */}
                  <div className="flex items-center justify-between pt-1 border-t border-[var(--vice-border)]">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--vice-text-muted)]">
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
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--vice-text-primary)] active:scale-90 transition-transform"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="min-w-[24px] text-center text-xs font-black" style={{ color: accent.hex }}>
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
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--vice-text-primary)] active:scale-90 transition-transform"
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
