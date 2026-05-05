import { useGitData } from '../data/loader';

const fmt = (n: number | null): string =>
  n === null ? '—' : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

export function HeadlineStrip() {
  const { headline: h } = useGitData();
  return (
    <div className="headline-strip">
      <div className="cell">
        <div className="label">Commits · 12mo</div>
        <div className="value">{h.totalCommits.toLocaleString()}</div>
      </div>
      <div className="cell">
        <div className="label">Stars</div>
        <div className="value">{fmt(h.totalStars)}</div>
      </div>
      <div className="cell">
        <div className="label">Pull requests</div>
        <div className="value">{fmt(h.totalPRs)}</div>
      </div>
      <div className="cell">
        <div className="label">Issues</div>
        <div className="value">{fmt(h.totalIssues)}</div>
      </div>
      <div className="cell">
        <div className="label">Followers</div>
        <div className="value">{fmt(h.followers)}</div>
      </div>
      <div className="cell">
        <div className="label">Contributed to</div>
        <div className="value">{fmt(h.contributedTo)}</div>
      </div>
    </div>
  );
}
