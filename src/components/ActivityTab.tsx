import { useState } from 'react';
import { useGitData } from '../data/loader';
import type { ActivityStats } from '../types';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function HourDOWHeatmap({ matrix }: { matrix: number[][] }) {
  const [hov, setHov] = useState<string | null>(null);
  const max = Math.max(1, ...matrix.flat());
  return (
    <div className="hdow">
      <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400 }}>When the work happens</h3>
      <div className="sub" style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginTop: 4 }}>
        Day of week × hour of day · 12 months
      </div>
      <div className="hdow-grid">
        <div />
        {Array.from({ length: 24 }).map((_, h) => (
          <div key={h} className="col-label">{h % 6 === 0 ? h : ''}</div>
        ))}
        {matrix.map((row, di) => (
          <div key={di} style={{ display: 'contents' }}>
            <div className="label">{DOW[di]}</div>
            {row.map((v, hi) => {
              const lv = v === 0 ? 0 : v < max * 0.25 ? 1 : v < max * 0.5 ? 2 : v < max * 0.75 ? 3 : 4;
              return (
                <div
                  key={hi}
                  className="hdow-cell"
                  style={{ background: `var(--heat-${lv})` }}
                  onMouseEnter={() => setHov(`${DOW[di]} · ${String(hi).padStart(2, '0')}:00 — ${v} commits`)}
                  onMouseLeave={() => setHov(null)}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', height: 14 }}>{hov || ''}</div>
    </div>
  );
}

function WordCloud({ words }: { words: ActivityStats['commitWords'] }) {
  if (words.length === 0) return null;
  const max = Math.max(...words.map((w) => w.n));
  return (
    <div className="wordcloud">
      <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400 }}>What you commit about</h3>
      <div className="sub" style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginTop: 4 }}>
        20 most-used words across all commit messages
      </div>
      <div className="wordcloud-canvas">
        {words.map((w, i) => {
          const size = 14 + (w.n / max) * 56;
          const op = 0.45 + (w.n / max) * 0.55;
          return (
            <span
              key={w.word}
              className="w"
              title={w.hint || `${w.n} times`}
              style={{ fontSize: size, opacity: op, color: i % 4 === 0 ? 'var(--accent)' : 'var(--ink)' }}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function VelocityChart({ velocity }: { velocity: number[] }) {
  if (velocity.length === 0) return null;
  const max = Math.max(1, ...velocity);
  const w = 1000;
  const h = 200;
  const pts = velocity.map((x, i) => `${(i / (velocity.length - 1)) * w},${h - (x / max) * h * 0.85}`).join(' ');
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <div className="velocity">
      <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400 }}>Velocity</h3>
      <div className="sub" style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginTop: 4, marginBottom: 18 }}>
        Commits per week · last 52 weeks
      </div>
      <svg viewBox={`0 0 ${w} ${h + 20}`} preserveAspectRatio="none" style={{ height: 200 }}>
        <defs>
          <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#vg)" />
        <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
        {velocity.map((x, i) =>
          i % 4 === 0 ? (
            <circle key={i} cx={(i / (velocity.length - 1)) * w} cy={h - (x / max) * h * 0.85} r="2" fill="var(--accent)" />
          ) : null,
        )}
      </svg>
    </div>
  );
}

function Treemap({ exts }: { exts: ActivityStats['fileExts'] }) {
  if (exts.length === 0) return null;
  const layouts = [
    'span 7 / span 5', 'span 5 / span 3', 'span 5 / span 4',
    'span 4 / span 3', 'span 3 / span 3', 'span 3 / span 2',
    'span 2 / span 2', 'span 2 / span 2', 'span 2 / span 2', 'span 2 / span 2',
  ];
  return (
    <div className="treemap">
      <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400 }}>What you write, by extension</h3>
      <div className="sub" style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginTop: 4, marginBottom: 18 }}>
        Bytes across indexed repos
      </div>
      <div className="treemap-canvas" style={{ gridTemplateColumns: 'repeat(12, 1fr)', gridTemplateRows: 'repeat(8, 1fr)' }}>
        {exts.map((e, i) => {
          const layout = layouts[i] || 'span 1 / span 1';
          const [r, c] = layout.split(' / ');
          return (
            <div key={e.ext} className="tm-cell" style={{ background: e.color, gridRow: r, gridColumn: c }}>
              <div className="ext">{e.ext}</div>
              <div className="nb">{Math.round(e.bytes / 1024)}KB · {e.files} files</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HotFiles({ files }: { files: ActivityStats['hotFiles'] }) {
  if (files.length === 0) return null;
  return (
    <div className="hot-files">
      <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400 }}>Largest tracked files</h3>
      <div className="sub" style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-3)', marginTop: 4, marginBottom: 14 }}>
        Across treemap-eligible repos
      </div>
      {files.map((f, i) => (
        <div className="hot-row" key={i}>
          <div className="rank">{i + 1}</div>
          <div>
            <div className="path">{f.path}</div>
            <div className="proj">{f.project}</div>
          </div>
          <div className="touches">{f.touches}</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>KB</div>
        </div>
      ))}
    </div>
  );
}

export function ActivityTab() {
  const { activityStats } = useGitData();
  const a = activityStats;
  return (
    <div className="shell">
      <div className="section-head" style={{ paddingTop: 36 }}>
        <h2>Activity</h2>
        <span className="sub">Curiosities, patterns, and a few things you didn't ask to know</span>
      </div>

      <section className="block" style={{ paddingTop: 0, borderBottom: 'none' }}>
        <div className="curio-grid">
          {a.curiosities.map((c, i) => (
            <div className="curio" key={i}>
              <div className="lbl">{c.label}</div>
              <div className="stat">{c.stat}</div>
              <div className="det">{c.detail}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="block">
        <HourDOWHeatmap matrix={a.hourDOW} />
      </section>

      <section className="block">
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 18 }}>
          <WordCloud words={a.commitWords} />
          <Treemap exts={a.fileExts} />
        </div>
      </section>

      <section className="block">
        <VelocityChart velocity={a.velocity} />
      </section>

      <section className="block">
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18 }}>
          <HotFiles files={a.hotFiles} />
          <div>
            <div className="section-head" style={{ marginBottom: 14 }}>
              <h2 style={{ fontSize: 24 }}>Honors</h2>
            </div>
            <div className="awards" style={{ gridTemplateColumns: '1fr' }}>
              {a.awards.map((w, i) => (
                <div className="award" key={i}>
                  <div className="icon">{w.icon}</div>
                  <div className="body">
                    <div className="title">{w.title}</div>
                    <div className="detail">{w.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
