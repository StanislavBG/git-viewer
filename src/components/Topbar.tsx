import { useGitData } from '../data/loader';

export function Topbar({ onHome }: { onHome: () => void }) {
  const { pipeline } = useGitData();
  const built = new Date(pipeline.emittedAt);
  const builtLabel = built.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return (
    <div className="topbar">
      <div className="brand" onClick={onHome} style={{ cursor: 'pointer' }}>
        <div className="dot"></div>
        gitoverview
      </div>
      <nav>
        <a className="on">Overview</a>
        <a>Projects</a>
        <a>Activity</a>
        <a>Writing</a>
      </nav>
      <div className="meta">
        <span>v0.1.0</span>
        <span>·</span>
        <span>built {builtLabel}</span>
      </div>
    </div>
  );
}
