import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { ChecklistItem, PersonAssignment } from '../types/checklist';
import { CardDensity, ItemCard } from './ItemCard';
import { CardDragPayload } from '../motion/useSwipeAndDragCard';
import { triggerHaptic } from '../motion/haptics';

interface VirtualTaskListProps {
  person: PersonAssignment;
  items: ChecklistItem[];
  density: CardDensity;
  draggedItemId: string | null;
  dropInsertIndex: number | null;
  scrollContainerRef: (el: HTMLDivElement | null) => void;
  onAdd: (person: PersonAssignment) => void;
  onToggle: (id: string, x: number, y: number) => void;
  onCustomize: (item: ChecklistItem) => void;
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onDragStart: (payload: CardDragPayload) => void;
  onDragMove: (clientX: number, clientY: number, vx: number) => void;
  onDragEnd: (clientX: number, clientY: number) => void;
}

const VIRTUALIZATION_THRESHOLD = 28;
const OVERSCAN = 4;

function getEstimatedHeight(density: CardDensity): number {
  if (density === 'rail') return 72;
  if (density === 'expanded') return 148;
  return 88;
}

/**
 * Lista virtualizada de alta fluidez:
 * - Para <= 28 tarefas: fluxo nativo leve com contain: layout style e indicador de drop GPU
 * - Para > 28 tarefas: windowing real com RAF scroll throttle e posicionamento GPU translate3d
 */
export const VirtualTaskList: React.FC<VirtualTaskListProps> = React.memo(
  ({
    person,
    items,
    density,
    draggedItemId,
    dropInsertIndex,
    scrollContainerRef,
    onAdd,
    onToggle,
    onCustomize,
    onRemove,
    onUpdateQuantity,
    onToggleSubtask,
    onDragStart,
    onDragMove,
    onDragEnd,
  }) => {
    const localScrollRef = useRef<HTMLDivElement | null>(null);
    const rafScrollRef = useRef<boolean>(false);
    const [scrollState, setScrollState] = useState({ scrollTop: 0, viewportHeight: 600 });

    const setRefs = useCallback(
      (el: HTMLDivElement | null) => {
        localScrollRef.current = el;
        scrollContainerRef(el);
      },
      [scrollContainerRef]
    );

    const isVirtualized = items.length > VIRTUALIZATION_THRESHOLD;
    const slotHeight = getEstimatedHeight(density);
    const slotGap = density === 'rail' ? 6 : 8;
    const stride = slotHeight + slotGap;

    useEffect(() => {
      const el = localScrollRef.current;
      if (!el || !isVirtualized) return;

      const updateViewport = () => {
        setScrollState((prev) => ({
          scrollTop: el.scrollTop,
          viewportHeight: el.clientHeight || prev.viewportHeight,
        }));
      };

      updateViewport();
      const onScroll = () => {
        if (rafScrollRef.current) return;
        rafScrollRef.current = true;
        window.requestAnimationFrame(() => {
          rafScrollRef.current = false;
          if (!localScrollRef.current) return;
          setScrollState((prev) => ({
            ...prev,
            scrollTop: localScrollRef.current!.scrollTop,
          }));
        });
      };

      el.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', updateViewport);
      return () => {
        el.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', updateViewport);
      };
    }, [isVirtualized]);

    const { visibleStart, visibleEnd, totalHeight } = useMemo(() => {
      if (!isVirtualized) {
        return { visibleStart: 0, visibleEnd: items.length, totalHeight: 0 };
      }
      const start = Math.max(0, Math.floor(scrollState.scrollTop / stride) - OVERSCAN);
      const visibleCount = Math.ceil(scrollState.viewportHeight / stride) + OVERSCAN * 2;
      const end = Math.min(items.length, start + visibleCount);
      return {
        visibleStart: start,
        visibleEnd: end,
        totalHeight: items.length * stride + 92,
      };
    }, [isVirtualized, items.length, scrollState.scrollTop, scrollState.viewportHeight, stride]);

    const accentColor = person === 'leeo' ? 'var(--vice-leeo)' : 'var(--vice-marii)';

    if (items.length === 0) {
      return (
        <div
          ref={setRefs}
          className="flex-1 overflow-y-auto scrollbar-none px-2 pb-24 pt-4 flex flex-col items-center justify-center text-center"
        >
          <div className="rounded-2xl border border-dashed border-[var(--vice-border-strong)] bg-[var(--vice-surface-subtle)] p-3.5 w-full max-w-[180px] space-y-2.5">
            <p className="text-[11px] font-medium text-[var(--vice-text-muted)] leading-snug">
              {density === 'rail'
                ? 'Vazio'
                : person === 'leeo'
                ? 'Nenhuma task para Leeo'
                : 'Nenhuma task para Marii'}
            </p>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('tap');
                onAdd(person);
              }}
              className="w-full inline-flex items-center justify-center gap-1 py-2 px-2.5 rounded-xl text-[11px] font-bold text-[#080412] active:scale-95 transition-transform"
              style={{ backgroundColor: accentColor }}
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.75]" />
              {density !== 'rail' && <span>Criar</span>}
            </button>
          </div>
        </div>
      );
    }

    if (isVirtualized) {
      const slice = items.slice(visibleStart, visibleEnd);
      return (
        <div
          ref={setRefs}
          className="flex-1 overflow-y-auto scrollbar-none px-2 pt-2 pb-24"
        >
          <div className="relative w-full" style={{ height: `${totalHeight}px` }}>
            {slice.map((item, idx) => {
              const realIndex = visibleStart + idx;
              const y = realIndex * stride;
              return (
                <div
                  key={item.id}
                  data-task-slot={realIndex}
                  className="absolute top-0 left-0 right-0"
                  style={{
                    transform: `translate3d(0, ${y}px, 0)`,
                  }}
                >
                  {dropInsertIndex === realIndex && (
                    <div
                      className="h-1 rounded-full mb-1.5"
                      style={{
                        backgroundColor: accentColor,
                        boxShadow: `0 0 10px ${accentColor}`,
                      }}
                    />
                  )}
                  <ItemCard
                    item={item}
                    density={density}
                    isBeingDragged={draggedItemId === item.id}
                    onToggle={onToggle}
                    onCustomize={onCustomize}
                    onRemove={onRemove}
                    onUpdateQuantity={onUpdateQuantity}
                    onToggleSubtask={onToggleSubtask}
                    onDragStart={onDragStart}
                    onDragMove={onDragMove}
                    onDragEnd={onDragEnd}
                  />
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div
        ref={setRefs}
        className="flex-1 overflow-y-auto scrollbar-none px-2 pt-2 pb-24 space-y-2"
      >
        {items.map((item, index) => (
          <div key={item.id} data-task-slot={index}>
            {dropInsertIndex === index && (
              <div
                className="h-1 rounded-full mb-2"
                style={{
                  backgroundColor: accentColor,
                  boxShadow: `0 0 12px ${accentColor}`,
                }}
              />
            )}
            <ItemCard
              item={item}
              density={density}
              isBeingDragged={draggedItemId === item.id}
              onToggle={onToggle}
              onCustomize={onCustomize}
              onRemove={onRemove}
              onUpdateQuantity={onUpdateQuantity}
              onToggleSubtask={onToggleSubtask}
              onDragStart={onDragStart}
              onDragMove={onDragMove}
              onDragEnd={onDragEnd}
            />
          </div>
        ))}

        {dropInsertIndex !== null && dropInsertIndex >= items.length && (
          <div
            className="h-1 rounded-full mt-1"
            style={{
              backgroundColor: accentColor,
              boxShadow: `0 0 12px ${accentColor}`,
            }}
          />
        )}
      </div>
    );
  }
);

VirtualTaskList.displayName = 'VirtualTaskList';
