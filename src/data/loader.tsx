import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { GitData } from '../types';
import { maskPersona, resolvePersona } from './persona';
import { parseLogin, parseTenantResponse, rawTenantParam, tenantApiUrl } from './tenant';

export type Tenant = {
  login: string;
  ownerLogin: string;
  tier: 'free' | 'paid';
  lockedCount: number;
  updatedAt: string;
};

type State =
  | { status: 'loading' }
  | { status: 'generating'; login: string }
  | { status: 'not_found'; login: string }
  | { status: 'error'; error: string }
  | { status: 'ready'; data: GitData; tenant: Tenant | null };

const MAX_TENANT_ATTEMPTS = 20;

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
    let timer: ReturnType<typeof setTimeout> | undefined;
    const fail = (err: unknown) => {
      if (!cancelled) {
        setState({
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    };

    const login = parseLogin(window.location.search);
    const rawLogin = rawTenantParam(window.location.search);
    if (login === null && rawLogin !== null) {
      setState({ status: 'not_found', login: rawLogin });
      return;
    }
    if (login === null) {
      fetch(dataUrl(), { cache: 'no-cache' })
        .then(async (r) => {
          if (!r.ok) throw new Error(`data.json HTTP ${r.status}`);
          return (await r.json()) as GitData;
        })
        .then((data) => {
          if (!cancelled) setState({ status: 'ready', data, tenant: null });
        })
        .catch(fail);
      return () => {
        cancelled = true;
      };
    }

    const persona = resolvePersona(login);
    if (persona && login !== persona.slug) {
      const url = new URL(window.location.href);
      url.searchParams.set('u', persona.slug);
      history.replaceState(history.state, '', url.toString());
    }
    const apiLogin = persona ? persona.githubLogin : login;

    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        const r = await fetch(tenantApiUrl(apiLogin, window.location.origin), { cache: 'no-cache' });
        let body: unknown;
        try {
          body = await r.json();
        } catch {
          throw new Error(`Hosted API returned a non-JSON body (HTTP ${r.status})`);
        }
        if (cancelled) return;
        const res = parseTenantResponse(r.status, body);
        if (res.status === 'ready') {
          setState({
            status: 'ready',
            data: persona ? maskPersona(res.data, persona) : res.data,
            tenant: {
              login: persona ? persona.slug : res.login,
              ownerLogin: persona ? persona.githubLogin : res.login,
              tier: res.tier,
              lockedCount: res.lockedCount,
              updatedAt: res.updatedAt,
            },
          });
        } else if (res.status === 'not_found') {
          setState({ status: 'not_found', login });
        } else {
          if (attempts >= MAX_TENANT_ATTEMPTS) {
            setState({ status: 'error', error: 'still generating — try again in a minute' });
            return;
          }
          setState({ status: 'generating', login });
          timer = setTimeout(() => void poll(), res.retryAfterSec * 1000);
        }
      } catch (err) {
        fail(err);
      }
    };
    void poll();

    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
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

export function useTenant(): Tenant | null {
  const s = useContext(Ctx);
  return s.status === 'ready' ? s.tenant : null;
}
