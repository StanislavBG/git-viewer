import { useGitData } from '../data/loader';
import type { Tab } from '../state/route';

export function Topbar({
  tab,
  setTab,
  onHome,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  onHome: () => void;
}) {
  const { pipeline } = useGitData();
  const built = new Date(pipeline.emittedAt);
  const builtLabel = built.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const go = (t: Tab) => {
    setTab(t);
    onHome();
  };
  return (
    <div className="topbar">
      <div className="brand" onClick={() => go('overview')} style={{ cursor: 'pointer' }}>
        <div className="dot"></div>
        gitoverview
      </div>
      <nav>
        <a className={tab === 'overview' ? 'on' : ''} onClick={() => go('overview')}>Overview</a>
        <a className={tab === 'projects' ? 'on' : ''} onClick={() => go('projects')}>Projects</a>
        <a className={tab === 'activity' ? 'on' : ''} onClick={() => go('activity')}>Activity</a>
        <a className={tab === 'writing' ? 'on' : ''} onClick={() => go('writing')}>Writing</a>
      </nav>
      <div className="meta">
        <span>v0.2.0</span>
        <span>·</span>
        <span>built {builtLabel}</span>
      </div>
    </div>
  );
}
