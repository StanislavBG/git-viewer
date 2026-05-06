import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { GitData } from '../types';

type State =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; data: GitData };

const Ctx = createContext<State>({ status: 'loading' });

const CANONICAL_DATA_URL = 'https://stanislavbg.github.io/git-viewer/data.json';

// On the canonical host (and during local dev) we read the bundle's own
// data.json. Other hosts (bilko.run mirror, forks served elsewhere) fetch
// from the canonical URL so the daily GH-Pages cron is the single source
// of truth and mirrors never go stale.
function dataUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isCanonical = host === 'stanislavbg.github.io' || host === 'localhost' || host === '127.0.0.1';
    if (!isCanonical) return CANONICAL_DATA_URL;
  }
  const base = import.meta.env.BASE_URL || './';
  return base.endsWith('/') ? `${base}data.json` : `${base}/data.json`;
}

export function GitDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetch(dataUrl(), { cache: 'no-cache' })
      .then(async (r) => {
        if (!r.ok) throw new Error(`data.json HTTP ${r.status}`);
        return (await r.json()) as GitData;
      })
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            error: err instanceof Error ? err.message : String(err),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useGitData(): GitData {
  const s = useContext(Ctx);
  if (s.status !== 'ready') {
    throw new Error('useGitData called before data ready — wrap in <DataGate>');
  }
  return s.data;
}

export function useGitDataState(): State {
  return useContext(Ctx);
}
