import { useGitData } from '../data/loader';

export function WritingTab() {
  const { essays, essaysFeatured: f, now } = useGitData();

  if (!f && essays.length === 0) {
    return (
      <div className="shell">
        <div className="section-head" style={{ paddingTop: 36 }}>
          <h2>Writing</h2>
          <span className="sub">no essays yet</span>
        </div>
        <div className="card" style={{ marginTop: 24 }}>
          <h3>Coming soon</h3>
          <div className="sub" style={{ marginTop: 8 }}>
            Drop a markdown file in <code>content/writing/</code> with YAML frontmatter (title, deck, date, read, words, tag) to populate this tab.
          </div>
        </div>
      </div>
    );
  }

  const byYear: Record<number, typeof essays> = {};
  for (const e of essays) {
    if (!byYear[e.year]) byYear[e.year] = [];
    byYear[e.year]!.push(e);
  }
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);
  const totalWords = essays.reduce((s, e) => s + e.words, 0);

  return (
    <div className="shell">
      {f && (
        <>
          <div className="writing-hero">
            <div>
              <div className="featured-eyebrow">
                ★ Featured essay <span className="pub">· {f.publishedAt}</span>
              </div>
              <h1>
                {f.title.split(' ').slice(0, -1).join(' ')}<br />
                <em>{f.title.split(' ').slice(-1)[0]}</em>
              </h1>
              <div className="deck">{f.deck}</div>
              <div className="meta-row">
                <span className="read">{f.read} min read</span>
                <span>·</span>
                <span>{f.words.toLocaleString()} words</span>
                {f.tags.length > 0 && (
                  <>
                    <span>·</span>
                    <span>{f.tags.join(' / ')}</span>
                  </>
                )}
              </div>
            </div>
            <div className="featured-excerpt">
              {f.excerpt.split('\n\n').map((p, i) => (
                <p key={i}>{p}</p>
              ))}
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 24 }}>
                ↓ continue reading
              </div>
            </div>
          </div>

          {f.pulls.length > 0 && (
            <div className="pull-quotes">
              {f.pulls.map((q, i) => <div className="pull" key={i}>{q}</div>)}
            </div>
          )}
        </>
      )}

      <section className="block">
        <div className="section-head">
          <h2>Archive</h2>
          <span className="sub">{essays.length} essays · {totalWords.toLocaleString()} words</span>
        </div>
        {years.map((y) => (
          <div key={y}>
            <div className="year-divider">{y}</div>
            <div className="essays-list">
              {byYear[y]!.map((e) => (
                <div className="essay-row" key={e.id}>
                  <div className="num">№ {String(essays.indexOf(e) + 1).padStart(2, '0')}</div>
                  <div className="title-block">
                    <div className="ttl">{e.title}</div>
                    <div className="deck">{e.deck}</div>
                  </div>
                  <div className="tag">{e.tag}</div>
                  <div className="read">{e.read} min · {e.date}</div>
                  <div className="arrow">→</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {now && (
        <div className="now-panel">
          <div className="now-card">
            <div className="lbl">Now reading</div>
            {now.reading.map((r, i) => (
              <div
                key={i}
                style={{
                  paddingTop: i === 0 ? 0 : 14,
                  borderTop: i === 0 ? 'none' : '1px solid var(--line-soft)',
                  marginTop: i === 0 ? 0 : 12,
                }}
              >
                <h4>{r.title}</h4>
                <div className="sub">{r.author} · {r.since}</div>
              </div>
            ))}
          </div>
          {now.writing && (
            <div className="now-card">
              <div className="lbl">Now writing</div>
              <h4>{now.writing.title}</h4>
              <div className="sub">{now.writing.words.toLocaleString()} / {now.writing.target.toLocaleString()} words</div>
              <div className="progress"><div style={{ width: `${now.writing.progress * 100}%` }} /></div>
            </div>
          )}
          {now.thinking.length > 0 && (
            <div className="now-card">
              <div className="lbl">Now thinking about</div>
              <ul className="ulist">
                {now.thinking.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
