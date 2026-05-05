import { useGitData } from '../data/loader';

function fmtRange(range: [string, string] | null): string {
  if (!range) return '—';
  const [a, b] = range.map((d) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  );
  return `${a} → ${b}`;
}

export function Streaks() {
  const { streaks } = useGitData();
  return (
    <div className="card streaks-card">
      <h3>Streaks</h3>
      <div className="sub">Daily contribution rhythm</div>
      <div className="streaks-row">
        <div>
          <div className="lbl">Current</div>
          <div className="val">{streaks.current}</div>
          <div className="hint">day{streaks.current === 1 ? '' : 's'}</div>
        </div>
        <div>
          <div className="lbl">Longest</div>
          <div className="val">{streaks.longest}</div>
          <div className="hint">{fmtRange(streaks.longestRange)}</div>
        </div>
        <div>
          <div className="lbl">Active days</div>
          <div className="val">{streaks.totalActiveDays}</div>
          <div className="hint">of last 365</div>
        </div>
      </div>
    </div>
  );
}
