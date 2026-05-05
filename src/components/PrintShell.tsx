import { useGitData } from '../data/loader';
import { Heatmap } from './Heatmap';
import { HeadlineStrip } from './HeadlineStrip';
import { Streaks } from './Streaks';
import { TopRepos } from './TopRepos';
import { Languages } from './Languages';

// PRD-08. Single-column linearized layout for ?print=1 / Cmd-P.
// Reuses the dashboard's components but skips the tweaks panel and topbar,
// and the @media print rules in styles.css invert the palette to white.
export function PrintShell() {
  const data = useGitData();
  return (
    <div className="shell print-shell">
      <header className="print-hero">
        <div
          className="portrait"
          style={
            data.developer.avatarUrl
              ? { backgroundImage: `url(${data.developer.avatarUrl})`, backgroundSize: 'cover' }
              : undefined
          }
        />
        <div>
          <div className="eyebrow">R&D log · est. {data.developer.joined}</div>
          <h1>{data.developer.name}</h1>
          <div className="role">
            {data.developer.role} · {data.developer.location || data.developer.handle}
          </div>
          <p className="bio">{data.developer.bio}</p>
        </div>
      </header>

      <HeadlineStrip />

      <section className="block">
        <div className="section-head">
          <h2>Activity</h2>
          <span className="sub">{data.developer.handle} · 12 months</span>
        </div>
        <Heatmap
          data={data.heatmap}
          variant="classic"
          setVariant={() => {}}
          allowSwitch={false}
          totals={{
            yearCommits: data.totalCommitsYear,
            commits30: data.commits30,
            activeDays30: data.activeDays30,
          }}
        />
      </section>

      <section className="block print-row-2">
        <Streaks />
        <Languages />
      </section>

      <section className="block">
        <div className="section-head">
          <h2>Highlights</h2>
          <span className="sub">most starred · most active · most forked</span>
        </div>
        <TopRepos onProject={() => {}} />
      </section>

      <section className="block">
        <div className="section-head">
          <h2>Projects</h2>
          <span className="sub">{data.projects.length} repositories</span>
        </div>
        <ul className="print-projects">
          {data.projects.map((p) => (
            <li key={p.id}>
              <span className="name">{p.name}</span>
              <span className="lang">{p.lang}</span>
              <span className="desc">{p.desc}</span>
              <span className="stars">★ {p.stars.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="print-footer">
        github.com/{data.developer.handle} · products at bilko.run/projects · generated{' '}
        {new Date(data.pipeline.emittedAt).toLocaleDateString()}
      </footer>
    </div>
  );
}
