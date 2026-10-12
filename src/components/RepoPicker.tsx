import { useEffect, useState } from 'react';
import { MAX_ALLOWLIST } from '../data/claim';
import { parsePublicRepos, publicReposUrl, type PickerRepo } from '../data/repos';

type Load =
  | { state: 'loading' }
  | { state: 'ready'; repos: PickerRepo[] }
  | { state: 'error'; text: string };

export function RepoPicker({
  login,
  initial,
  onSave,
  onClose,
}: {
  login: string;
  initial: string[];
  onSave: (names: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [selected, setSelected] = useState<string[]>(() => initial.slice(0, MAX_ALLOWLIST));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(publicReposUrl(login));
        const res = parsePublicRepos(r.status, await r.json().catch(() => null));
        if (cancelled) return;
        if (res.status === 'ok') setLoad({ state: 'ready', repos: res.repos });
        else if (res.status === 'rate_limited') setLoad({ state: 'error', text: 'GitHub rate limit hit — try again in an hour.' });
        else setLoad({ state: 'error', text: res.message });
      } catch (e) {
        if (!cancelled) setLoad({ state: 'error', text: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [login]);

  const full = selected.length >= MAX_ALLOWLIST;
  const toggle = (name: string) =>
    setSelected((s) => (s.includes(name) ? s.filter((n) => n !== name) : s.length >= MAX_ALLOWLIST ? s : [...s, name]));

  const save = async () => {
    setSaving(true);
    try {
      await onSave(selected);
    } finally {
      setSaving(false);
    }
  };

  const row = (r: PickerRepo) => {
    const checked = selected.includes(r.name);
    return (
      <li key={r.name}>
        <label>
          <input type="checkbox" checked={checked} disabled={!checked && full} onChange={() => toggle(r.name)} />
          <span className="repo-picker-name">{r.name}</span>
          <span className="repo-picker-stars">★ {r.stars}</span>
          {r.description && <span className="repo-picker-desc">{r.description}</span>}
        </label>
      </li>
    );
  };

  const repos = load.state === 'ready' ? load.repos : [];
  return (
    <div className="repo-picker" role="dialog" aria-label="Choose projects">
      <div className="repo-picker-head">
        <strong>Choose projects</strong>
        <span className="repo-picker-count">{selected.length} / {MAX_ALLOWLIST} selected</span>
      </div>
      <div className="repo-picker-body">
        {load.state === 'loading' && <p>Loading repositories…</p>}
        {load.state === 'error' && <p className="repo-picker-err">{load.text}</p>}
        {load.state === 'ready' && (
          <>
            <ul>{repos.filter((r) => !r.fork).map(row)}</ul>
            {repos.some((r) => r.fork) && (
              <>
                <h4>Forks</h4>
                <ul>{repos.filter((r) => r.fork).map(row)}</ul>
              </>
            )}
          </>
        )}
      </div>
      <div className="repo-picker-actions">
        <button disabled={saving || load.state !== 'ready' || selected.length === 0} onClick={() => void save()}>
          Save
        </button>
        <button disabled={saving} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
