import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { ChecklistItem, PersonAssignment } from '../types/checklist';
import { CardDensity, ItemCard } from './ItemCard';
import { CardDragPayload } from '../motion/useSwipeAndDragCard';

interface VirtualTaskListProps {
  person: PersonAssignment;
  items: ChecklistItem[];
  density: CardDensity;
  draggedItemId: string | null;
  justLandedId: string | null;
  dropInsertIndex: number | null;
  scrollContainerRef: (el: HTMLDivElement | null) => void;
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
 * Lista virtualizada de alta fluidez sem botoes "+" no centro.
 */
export const VirtualTaskList: React.FC<VirtualTaskListProps> = React.memo(
  ({
    person,
    items,
    density,
    draggedItemId,
    justLandedId,
    dropInsertIndex,
    scrollContainerRef,
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
        totalHeight: items.length * stride + 96,
      };
    }, [isVirtualized, items.length, scrollState.scrollTop, scrollState.viewportHeight, stride]);

    const accentColor = person === 'leeo' ? '#E6DCE8' : '#E07AB0';

    if (items.length === 0) {
      return (
        <div
          ref={setRefs}
          className="flex-1 overflow-y-auto scrollbar-none px-2 pb-24 pt-4 flex flex-col items-center justify-center text-center"
        >
          <div className="rounded-2xl border border-dashed border-[var(--vice-border)] bg-[var(--vice-surface-subtle)] px-3 py-4 w-full max-w-[172px]">
            <p className="text-[11px] font-medium text-[#8E7498] leading-snug">
              {density === 'rail'
                ? 'Vazio'
                : person === 'leeo'
                ? 'Arraste o + para a esquerda para criar'
                : 'Arraste o + para a direita para criar'}
            </p>
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
                    justLanded={justLandedId === item.id}
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
              justLanded={justLandedId === item.id}
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
