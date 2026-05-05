import { useGitData } from '../data/loader';

export function ProjectGrid({ onProject }: { onProject: (id: string) => void }) {
  const { projects, last30 } = useGitData();
  const spark = last30.map((d) => Math.max(0, d.count));
  const max = Math.max(1, ...spark);

  return (
    <div className="proj-grid">
      {projects.map((p) => (
        <div className="proj-card" key={p.id} onClick={() => onProject(p.id)}>
          <div className="top">
            <div className="name">{p.name}</div>
            <div className={`status ${p.status}`}>{p.status}</div>
          </div>
          <div className="desc">{p.desc}</div>
          <div className="mini-spark">
            {spark.map((v, i) => (
              <div key={i} className="b" style={{ height: `${Math.max(8, (v / max) * 100)}%` }}></div>
            ))}
          </div>
          <div className="footer">
            <div className="lang">
              <div className="dot" style={{ background: `oklch(0.72 0.10 ${p.hue})` }}></div>
              <span>{p.lang}</span>
            </div>
            <div className="stars">★ {p.stars.toLocaleString()}</div>
            <div>+{p.recent} · 30d</div>
          </div>
        </div>
      ))}
    </div>
  );
}
