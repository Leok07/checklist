export type HapticPattern = 'tap' | 'check' | 'snap' | 'transfer' | 'delete' | 'lift';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 10,
  check: [12, 24, 16],
  snap: 14,
  lift: 18,
  transfer: [14, 28, 22],
  delete: [24, 30, 36],
};

export function triggerHaptic(pattern: HapticPattern): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(PATTERNS[pattern]);
    }
  } catch {
    // Dispositivos iOS ou ambientes sem suporte ignoram silenciosamente
  }
}
