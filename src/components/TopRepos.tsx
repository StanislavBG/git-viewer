import { useGitData } from '../data/loader';
import type { TopRepoEntry } from '../types';

function Column({
  title,
  unit,
  rows,
  onProject,
}: {
  title: string;
  unit: string;
  rows: TopRepoEntry[];
  onProject: (id: string) => void;
}) {
  return (
    <div className="card top-col">
      <h3>{title}</h3>
      <div className="sub">{unit}</div>
      <div className="podium">
        {rows.length === 0 && <div className="empty">—</div>}
        {rows.map((r, i) => (
          <div className="row" key={r.id} onClick={() => onProject(r.id)}>
            <div className="rank">{i + 1}</div>
            <div className="body">
              <div className="name">{r.name}</div>
              <div className="lang">{r.lang}</div>
            </div>
            <div className="value">{r.value.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TopRepos({ onProject }: { onProject: (id: string) => void }) {
  const { topRepos } = useGitData();
  return (
    <div className="top-grid">
      <Column title="Most starred" unit="all-time stars" rows={topRepos.starred} onProject={onProject} />
      <Column title="Most active" unit="commits last 30d" rows={topRepos.active30} onProject={onProject} />
      <Column title="Most forked" unit="all-time forks" rows={topRepos.forked} onProject={onProject} />
    </div>
  );
}
