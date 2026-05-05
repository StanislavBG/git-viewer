import { useGitData } from '../data/loader';

export function Languages() {
  const { languages30: langs } = useGitData();
  const r = 56;
  const sw = 14;
  let acc = 0;
  const circ = 2 * Math.PI * r;
  return (
    <div className="card">
      <h3>Languages</h3>
      <div className="sub">By line-count delta · 30 days</div>
      <div className="langs">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={r} fill="none" stroke="var(--bg-deep)" strokeWidth={sw} />
          {langs.map((l, i) => {
            const len = (l.pct / 100) * circ;
            const off = -acc;
            acc += len;
            return (
              <circle
                key={i}
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke={l.color}
                strokeWidth={sw}
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={off}
                transform="rotate(-90 70 70)"
                strokeLinecap="butt"
              />
            );
          })}
          {langs[0] && (
            <>
              <text
                x="70"
                y="68"
                textAnchor="middle"
                style={{ fontFamily: 'Instrument Serif', fontSize: 24, fill: 'var(--ink)' }}
              >
                {langs[0].pct}%
              </text>
              <text
                x="70"
                y="84"
                textAnchor="middle"
                style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: 9,
                  fill: 'var(--ink-3)',
                  letterSpacing: '0.1em',
                }}
              >
                {langs[0].name.toUpperCase()}
              </text>
            </>
          )}
        </svg>
        <div className="lang-list">
          {langs.map((l, i) => (
            <div className="lang-row" key={i}>
              <div className="swatch" style={{ background: l.color }}></div>
              <div className="nm">{l.name}</div>
              <div className="pct">{l.pct}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
