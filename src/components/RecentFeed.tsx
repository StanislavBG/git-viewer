import { useGitData } from '../data/loader';

export function RecentFeed({ onProject }: { onProject: (id: string) => void }) {
  const { recentCommits } = useGitData();
  return (
    <div className="card">
      <h3>Recent activity</h3>
      <div className="sub">Cross-project · most recent</div>
      <div className="feed">
        {recentCommits.map((c, i) => (
          <div className="feed-row" key={i}>
            <div className="sha">{c.sha.slice(0, 7)}</div>
            <div className="body">
              <div className="msg">{c.msg}</div>
              <div className="proj">
                <a onClick={() => onProject(c.project)} style={{ cursor: 'pointer' }}>
                  {c.project}
                </a>
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
  );
}
