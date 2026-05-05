import { useGitData } from '../data/loader';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function level(n: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (n <= 0 || max <= 0) return 0;
  const r = n / max;
  if (r <= 0.25) return 1;
  if (r <= 0.5) return 2;
  if (r <= 0.75) return 3;
  return 4;
}

export function ProductiveTime() {
  const { productiveTime: p } = useGitData();
  const max = Math.max(1, ...p.matrix.flat());
  return (
    <div className="card">
      <h3>Productive time</h3>
      <div className="sub">7-day × 24-hour rhythm · {p.tz}</div>
      <div className="prod-time">
        <div className="prod-cols">
          <div className="prod-axis-x">
            <span>00</span>
            <span>06</span>
            <span>12</span>
            <span>18</span>
          </div>
          {p.matrix.map((row, dow) => (
            <div className="prod-row" key={dow}>
              <div className="prod-day">{DAYS[dow]}</div>
              <div className="prod-cells">
                {row.map((c, h) => (
                  <div
                    key={h}
                    className={`prod-cell l${level(c, max)}`}
                    title={`${DAYS[dow]} ${String(h).padStart(2, '0')}:00 — ${c} commit${c === 1 ? '' : 's'}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
