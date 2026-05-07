import { useMemo, useState } from 'react';
import { useGitData } from '../data/loader';
import type { ProjectStatus } from '../types';

const STATUS_OPTIONS: (ProjectStatus | 'all')[] = ['all', 'active', 'maintenance', 'experimental'];

export function ProjectsTab({ onProject }: { onProject: (id: string) => void }) {
  const { projects, aiSummaries } = useGitData();
  const [status, setStatus] = useState<ProjectStatus | 'all'>('all');
  const [lang, setLang] = useState<string>('all');

  const langs = useMemo(() => {
    const set = new Set<string>();
    for (const p of projects) if (p.lang) set.add(p.lang);
    return ['all', ...Array.from(set).sort()];
  }, [projects]);

  const filtered = useMemo(
    () => projects.filter((p) => (status === 'all' || p.status === status) && (lang === 'all' || p.lang === lang)),
    [projects, status, lang],
  );

  return (
    <div className="shell">
      <div className="section-head" style={{ paddingTop: 36 }}>
        <h2>Projects</h2>
        <span className="sub">{projects.length} repositories · pre-analyzed offline</span>
      </div>

      <div className="projects-toolbar">
        <div className="filter-group">
          {STATUS_OPTIONS.map((s) => (
            <span key={s} className={`chip ${status === s ? 'on' : ''}`} onClick={() => setStatus(s)}>{s}</span>
          ))}
        </div>
        <div className="filter-group">
          {langs.map((l) => (
            <span key={l} className={`chip ${lang === l ? 'on' : ''}`} onClick={() => setLang(l)}>{l}</span>
          ))}
        </div>
        <div className="grow" />
        <div className="count">{filtered.length} shown</div>
      </div>

      <div className="projects-magazine">
        {filtered.map((p) => {
          const ai = aiSummaries[p.id];
          if (!ai) return null;
          return (
            <div className="proj-mag" key={p.id} onClick={() => onProject(p.id)}>
              <div className="header">
                <div>
                  <div className="ai-tag"><span className="dot" />AI summary · v1</div>
                  <div className="name" style={{ marginTop: 10 }}>{p.name}</div>
                </div>
                <div className="header-meta">
                  <div>★ {p.stars.toLocaleString()}</div>
                  <div>{p.lang}</div>
                  <div>+{p.recent} · 30d</div>
                  <div style={{ color: 'var(--accent)' }}>{p.status}</div>
                </div>
              </div>

              <div className="tldr">{ai.tldr}</div>
              <div className="vibe">{ai.vibe}</div>

              <div className="grades">
                {Object.entries(ai.grades).map(([k, v]) => (
                  <div className="grade" key={k}>
                    <div className="lbl">{k}</div>
                    <div className="val">{v}</div>
                    <div className="gbar"><div style={{ width: `${v}%` }} /></div>
                  </div>
                ))}
              </div>

              <div className="splits">
                <div className="split">
                  <h4>Use cases</h4>
                  <ul>{ai.useCases.map((u, i) => <li key={i}>{u}</li>)}</ul>
                </div>
                <div className="split">
                  <h4>Strengths · Risks</h4>
                  <ul>
                    {ai.strengths.slice(0, 2).map((s, i) => <li key={`s${i}`} style={{ color: 'oklch(0.78 0.10 145)' }}>{s}</li>)}
                    {ai.risks.slice(0, 2).map((r, i) => <li key={`r${i}`} style={{ color: 'oklch(0.72 0.12 30)' }}>{r}</li>)}
                  </ul>
                </div>
              </div>

              <div className="footer-meta">
                <span>{ai.contributorsNote}</span>
                {ai.similar.length > 0 && <span>similar: {ai.similar.join(' · ')}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
