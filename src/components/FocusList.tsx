import { useGitData } from '../data/loader';

export function FocusList() {
  const { focus30 } = useGitData();
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <h3>Focus areas</h3>
      <div className="sub">Last 30 days · weighted by commit volume</div>
      <div>
        {focus30.map((f, i) => (
          <div key={i} className="focus-row">
            <div className="name">{f.label}</div>
            <div className="bar">
              <div
                style={{
                  width: `${Math.min(100, f.weight * 2.4)}%`,
                  background:
                    i === 0 ? 'var(--accent)' : i === 1 ? 'var(--accent-2)' : 'var(--accent-3)',
                }}
              ></div>
            </div>
            <div className="pct">{f.weight}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
