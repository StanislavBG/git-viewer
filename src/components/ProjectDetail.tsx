import { useGitData } from '../data/loader';
import { Heatmap, type HeatmapVariant } from './Heatmap';
import { Treemap } from './Treemap';

export function ProjectDetail({
  id,
  onBack,
  variant,
  setVariant,
}: {
  id: string;
  onBack: () => void;
  variant: HeatmapVariant;
  setVariant: (v: HeatmapVariant) => void;
}) {
  const { projects, projectDetails } = useGitData();
  const p = projects.find((x) => x.id === id);
  const det = projectDetails[id];

  if (!p || !det) {
    return (
      <div className="shell detail">
        <a className="back-link" onClick={onBack}>
          ← all projects
        </a>
        <p style={{ marginTop: 24 }}>Project not found.</p>
      </div>
    );
  }

  const total = det.heatmap.reduce((s, d) => s + Math.max(0, d.count), 0);
  const yearTotal = total;
  const last30 = det.heatmap.slice(-30);
  const commits30 = last30.reduce((s, d) => s + Math.max(0, d.count), 0);
  const activeDays30 = last30.filter((d) => d.count > 0).length;

  return (
    <div className="shell detail">
      <a className="back-link" onClick={onBack}>
        ← all projects
      </a>

      <div className="detail-hero">
        <div>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            {p.lang} · {p.status}
          </div>
          <h1>{p.name}</h1>
          <div className="desc">{p.desc}</div>
          <div
            style={{
              marginTop: 24,
              display: 'flex',
              gap: 14,
              alignItems: 'center',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--ink-3)',
            }}
          >
            <span>★ {p.stars.toLocaleString()}</span>
            <span>·</span>
            <span>
              {det.contributors} contributor{det.contributors === 1 ? '' : 's'}
            </span>
            <span>·</span>
            <span>{det.branches} branches</span>
            <span>·</span>
            <span>{det.openIssues} open issues</span>
            <span>·</span>
            <span>{det.license}</span>
          </div>
        </div>
        <div className="right">
          <div className="meta-grid">
            <div>
              <div className="lbl">Total commits</div>
              <div className="val">{total}</div>
            </div>
            <div>
              <div className="lbl">Last 30 days</div>
              <div className="val">{p.recent}</div>
            </div>
            <div>
              <div className="lbl">Primary language</div>
              <div className="val">{det.primaryLang}</div>
            </div>
            <div>
              <div className="lbl">Pull requests</div>
              <div className="val">{det.pullRequests}</div>
            </div>
          </div>
        </div>
      </div>

      <section className="block">
        <div className="section-head">
          <h2>Activity</h2>
          <span className="sub">{p.name} · 12 months</span>
        </div>
        <Heatmap
          data={det.heatmap}
          variant={variant}
          setVariant={setVariant}
          allowSwitch={true}
          totals={{ yearCommits: yearTotal, commits30, activeDays30 }}
        />
      </section>

      <section className="block">
        <div className="detail-grid">
          <div className="card">
            <h3>Recent commits</h3>
            <div className="sub">{p.name} · main</div>
            <div className="feed">
              {det.commits.map((c, i) => (
                <div className="feed-row" key={i}>
                  <div className="sha">{c.sha.slice(0, 7)}</div>
                  <div className="body">
                    <div className="msg">{c.msg}</div>
                    <div className="proj">
                      {p.name}
                      <span className="arr">›</span>main
                    </div>
                  </div>
                  <div className="when">{c.when} ago</div>
                  <div className="changes">
                    <span className="a">+{c.add}</span>
                    <span className="d">−{c.del}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {det.tree ? (
            <Treemap tree={det.tree} />
          ) : (
            <div className="readme">
              {det.readme}
              {`\n\n## Install\n\n    $ npm i ${p.name}\n\n## Why\n\nA quiet tool. Built to last.\n\n## Status\n\n${p.status}. Pull requests welcome.\n`}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
