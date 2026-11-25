import { useState, useEffect, useCallback } from 'react';
import { AtmospherePreference, ViceAtmosphere } from '../types/checklist';

const ATMOSPHERE_KEY = 'task_viagem_atmosphere';

const THEME_META_COLORS: Record<ViceAtmosphere, string> = {
  day: '#FFF3E8',
  sunset: '#240E3B',
  night: '#080412',
};

export function resolveAtmosphereByClock(date: Date = new Date()): ViceAtmosphere {
  const hour = date.getHours();
  if (hour >= 6 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'sunset';
  return 'night';
}

export function getAtmosphereLabel(atmosphere: ViceAtmosphere): string {
  switch (atmosphere) {
    case 'day':
      return 'South Beach';
    case 'sunset':
      return 'Sunset';
    case 'night':
      return 'Vice Night';
  }
}

export function useViceTheme() {
  const [preference, setPreference] = useState<AtmospherePreference>(() => {
    try {
      const saved = localStorage.getItem(ATMOSPHERE_KEY);
      if (saved === 'auto' || saved === 'day' || saved === 'sunset' || saved === 'night') {
        return saved;
      }
    } catch {
      // Ignora erro de leitura
    }
    return 'auto';
  });

  const [clockAtmosphere, setClockAtmosphere] = useState<ViceAtmosphere>(() =>
    resolveAtmosphereByClock()
  );

  const atmosphere: ViceAtmosphere = preference === 'auto' ? clockAtmosphere : preference;

  // Atualiza a atmosfera pela hora real a cada 60s e ao voltar para a aba/desbloquear celular
  useEffect(() => {
    const syncClock = () => {
      const next = resolveAtmosphereByClock();
      setClockAtmosphere((prev) => (prev === next ? prev : next));
    };

    syncClock();
    const interval = window.setInterval(syncClock, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') syncClock();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Aplica o tema via atributo DOM e sincroniza theme-color mobile
  useEffect(() => {
    document.documentElement.setAttribute('data-vice-theme', atmosphere);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', THEME_META_COLORS[atmosphere]);
    }
    try {
      localStorage.setItem(ATMOSPHERE_KEY, preference);
    } catch {
      // Ignora
    }
  }, [atmosphere, preference]);

  const cycleAtmosphere = useCallback(() => {
    setPreference((prev) => {
      if (prev === 'auto') return 'day';
      if (prev === 'day') return 'sunset';
      if (prev === 'sunset') return 'night';
      return 'auto';
    });
  }, []);

  return {
    preference,
    atmosphere,
    cycleAtmosphere,
    setPreference,
  };
}
