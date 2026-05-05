import { useGitData } from '../data/loader';

export function Hero() {
  const { developer, totalCommitsYear, projects, languages30 } = useGitData();
  const stars = projects.reduce((s, p) => s + p.stars, 0);
  const active = projects.filter((p) => p.status === 'active').length;
  const maintenance = projects.filter((p) => p.status === 'maintenance').length;
  const primary = languages30
    .filter((l) => l.name !== 'Other')
    .slice(0, 2)
    .map((l) => l.name)
    .join(', ');

  return (
    <div className="hero">
      <div>
        <div className="who">
          <div
            className="portrait"
            style={
              developer.avatarUrl
                ? { backgroundImage: `url(${developer.avatarUrl})`, backgroundSize: 'cover' }
                : undefined
            }
          ></div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              R&D log · est. {developer.joined}
            </div>
            <h1>
              {developer.name.split(' ')[0]}
              <br />
              <em>{developer.name.split(' ').slice(1).join(' ') || ''}</em>
            </h1>
            <div className="role">
              <div className="dot-live"></div>
              <span>{developer.role}</span>
              <span className="sep"></span>
              <span>{developer.location}</span>
            </div>
            <div className="bio">{developer.bio}</div>
          </div>
        </div>
      </div>
      <div className="hero-meta">
        <div className="stat">
          <div className="label">Commits · 12mo</div>
          <div className="value">{totalCommitsYear.toLocaleString()}</div>
          <div className="delta">
            <span className="up">↑ rolling</span> 12-month window
          </div>
        </div>
        <div className="stat">
          <div className="label">Public projects</div>
          <div className="value">{projects.length}</div>
          <div className="delta">
            {active} active · {maintenance} maintenance
          </div>
        </div>
        <div className="stat">
          <div className="label">Stars earned</div>
          <div className="value">{stars.toLocaleString()}</div>
          <div className="delta">across all repositories</div>
        </div>
        <div className="stat">
          <div className="label">Languages · 30d</div>
          <div className="value">{languages30.filter((l) => l.name !== 'Other').length}</div>
          <div className="delta">primary: {primary || '—'}</div>
        </div>
      </div>
    </div>
  );
}
