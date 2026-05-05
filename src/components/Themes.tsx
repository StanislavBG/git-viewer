import { useGitData } from '../data/loader';

export function Themes() {
  const { themes30 } = useGitData();
  const total = themes30.reduce((s, t) => s + t.count, 0);
  return (
    <div className="card">
      <h3>Commit themes</h3>
      <div className="sub">
        Parsed from messages · 30 days · {total} commits
      </div>
      <div className="themes">
        {themes30.map((t, i) => (
          <div className="theme-tile" key={i}>
            <div className="l">{t.label}</div>
            <div className="v">{t.count}</div>
            <div className="h">{t.hint}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
