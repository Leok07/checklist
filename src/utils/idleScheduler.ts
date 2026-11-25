type IdleCancel = () => void;

/**
 * Agenda tarefas nao-criticas (como serializacao no localStorage) fora do frame de animacao.
 * Usa requestIdleCallback quando disponivel e fallback leve no Safari/iOS.
 */
export function scheduleIdleTask(callback: () => void, timeout = 350): IdleCancel {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(callback, { timeout });
    return () => {
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(id);
      }
    };
  }

  const timer = setTimeout(callback, 16);
  return () => {
    clearTimeout(timer);
  };
}
