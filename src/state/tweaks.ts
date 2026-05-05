import { useCallback, useEffect, useState } from 'react';

export interface Tweaks {
  heatmapVariant: 'classic' | 'extrude' | 'radial';
  accentHue: number;
  density: 'cozy' | 'compact';
  showPipeline: boolean;
}

export const TWEAK_DEFAULTS: Tweaks = {
  heatmapVariant: 'classic',
  accentHue: 65,
  density: 'cozy',
  showPipeline: true,
};

const STORAGE_KEY = 'git-viewer.tweaks.v1';

function load(): Tweaks {
  if (typeof window === 'undefined') return TWEAK_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return TWEAK_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Tweaks>;
    return { ...TWEAK_DEFAULTS, ...parsed };
  } catch {
    return TWEAK_DEFAULTS;
  }
}

export type SetTweak = <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void;

export function useTweaks(): [Tweaks, SetTweak] {
  const [values, setValues] = useState<Tweaks>(load);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch {
      // localStorage may be unavailable (private mode / quota); silently no-op.
    }
  }, [values]);

  const setTweak = useCallback<SetTweak>((key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  return [values, setTweak];
}
