import React, { useEffect, useRef } from 'react';
import { CheckCircle2, Info, RotateCcw } from 'lucide-react';
import { SPRING_BOUNCY } from '../motion/springEngine';
import { animateSpringOpacity, animateSpringTranslateY } from '../motion/waapiSpring';

interface ToastProps {
  message: string | null;
  type?: 'success' | 'info';
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  actionLabel,
  onAction,
  durationMs = 3600,
  onClose,
}) => {
  const toastRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!message) return;
    animateSpringTranslateY(toastRef.current, 26, 0, 0, SPRING_BOUNCY);
    animateSpringOpacity(toastRef.current, 0, 1, 180);

    const timer = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, durationMs, onClose]);

  if (!message) return null;

  return (
    <div
      ref={toastRef}
      role="status"
      aria-live="polite"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-28px)] max-w-[396px] flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-2xl border border-[var(--vice-border-strong)] bg-[var(--vice-surface-strong)] text-[#F3ECF5] shadow-2xl"
    >
      <div className="flex items-center gap-2 min-w-0">
        {type === 'success' ? (
          <CheckCircle2 className="w-4 h-4 text-[#E6DCE8] shrink-0" />
        ) : (
          <Info className="w-4 h-4 text-[#E07AB0] shrink-0" />
        )}
        <span className="text-xs font-semibold truncate">{message}</span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={() => {
              onAction();
              onClose();
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#E07AB0] text-[#22122A] active:scale-95"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{actionLabel}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--vice-surface-subtle)] text-[#C7B4CE]"
        >
          OK
        </button>
      </div>
    </div>
  );
};
