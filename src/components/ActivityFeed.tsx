import { useGitData } from '../data/loader';
import type { ActivityEvent, ActivityType } from '../types';

const GLYPH: Record<ActivityType, string> = {
  pr_opened: 'PR↗',
  pr_merged: 'PR●',
  issue_opened: 'I○',
  issue_closed: 'I●',
  release: '🏷',
  starred: '★',
  forked: 'Y',
  created_repo: '+',
};

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function Row({ ev }: { ev: ActivityEvent }) {
  return (
    <div className="feed-row">
      <div className="sha" style={{ textAlign: 'center' }}>{GLYPH[ev.type]}</div>
      <div className="body">
        <div className="msg">
          {ev.url ? (
            <a href={ev.url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
              {ev.title}
            </a>
          ) : (
            ev.title
          )}
        </div>
        <div className="proj">{ev.repo}</div>
      </div>
      <div className="when">{relTime(ev.ts)} ago</div>
      <div className="changes" />
    </div>
  );
}

export function ActivityFeed() {
  const { activity } = useGitData();
  if (!activity || activity.length === 0) return null;
  return (
    <div className="card">
      <h3>Cross-repo activity</h3>
      <div className="sub">PRs · issues · releases · stars · 90-day window</div>
      <div className="feed">
        {activity.map((ev, i) => (
          <Row key={`${ev.ts}-${i}`} ev={ev} />
        ))}
      </div>
    </div>
  );
}
