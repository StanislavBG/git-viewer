import { useGitData } from '../data/loader';

export function HoursChart() {
  const { hours30 } = useGitData();
  const max = Math.max(1, ...hours30);
  const peakHour = hours30.indexOf(max);
  return (
    <div className="card">
      <h3>Time of day</h3>
      <div className="sub">When commits land · last 30 days</div>
      <div className="hours">
        {hours30.map((h, i) => (
          <div
            key={i}
            className={`bar ${h === max ? 'peak' : ''}`}
            style={{
              height: `${(h / max) * 100}%`,
              opacity: h === 0 ? 0.15 : 0.4 + 0.6 * (h / max),
            }}
            title={`${i}:00 — ${h}`}
          ></div>
        ))}
      </div>
      <div className="hours-axis">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
      <div
        style={{
          marginTop: 14,
          fontSize: 12,
          color: 'var(--ink-2)',
          fontFamily: 'var(--serif)',
          fontStyle: 'italic',
        }}
      >
        Peak at {String(peakHour).padStart(2, '0')}:00.
      </div>
    </div>
  );
}
