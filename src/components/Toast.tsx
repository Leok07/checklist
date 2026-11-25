import React, { useEffect } from 'react';
import { CheckCircle2, Info, RotateCcw } from 'lucide-react';

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
  durationMs = 3800,
  onClose,
}) => {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, durationMs, onClose]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-28px)] max-w-[396px] flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-2xl border border-[var(--vice-border-strong)] bg-[var(--vice-surface-strong)] text-[var(--vice-text-primary)] shadow-2xl backdrop-blur-md"
    >
      <div className="flex items-center gap-2 min-w-0">
        {type === 'success' ? (
          <CheckCircle2 className="w-4 h-4 text-[#10F5A8] shrink-0" />
        ) : (
          <Info className="w-4 h-4 text-[#00E5FF] shrink-0" />
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
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#FF2E93] text-white active:scale-95 transition-transform"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{actionLabel}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--vice-surface-subtle)] text-[var(--vice-text-secondary)]"
        >
          OK
        </button>
      </div>
    </div>
  );
};
