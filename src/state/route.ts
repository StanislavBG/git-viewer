import { useEffect, useState } from 'react';

export type Tab = 'overview' | 'projects' | 'activity' | 'writing';
const TABS: ReadonlySet<Tab> = new Set(['overview', 'projects', 'activity', 'writing']);

function readHash(): Tab {
  if (typeof window === 'undefined') return 'overview';
  const seg = window.location.hash.replace(/^#\/?/, '').split('/')[0] ?? '';
  return TABS.has(seg as Tab) ? (seg as Tab) : 'overview';
}

export function useRoute(): [Tab, (t: Tab) => void] {
  const [tab, setTabState] = useState<Tab>(readHash);
  useEffect(() => {
    const onPop = () => setTabState(readHash());
    window.addEventListener('hashchange', onPop);
    return () => window.removeEventListener('hashchange', onPop);
  }, []);
  const setTab = (t: Tab) => {
    if (t === 'overview') {
      history.pushState(null, '', window.location.pathname + window.location.search);
    } else {
      window.location.hash = `#/${t}`;
    }
    setTabState(t);
  };
  return [tab, setTab];
}
