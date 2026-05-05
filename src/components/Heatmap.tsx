import { useState } from 'react';
import type { HeatmapDay } from '../types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOWS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

export type HeatmapVariant = 'classic' | 'extrude' | 'radial';

export interface HeatmapTotals {
  yearCommits: number;
  commits30: number;
  activeDays30: number;
}

interface Props {
  data: HeatmapDay[];
  variant: HeatmapVariant;
  setVariant: (v: HeatmapVariant) => void;
  allowSwitch: boolean;
  totals: HeatmapTotals;
}

interface DayBucket {
  raw: HeatmapDay;
  date: Date;
  count: number;
  future: boolean;
}

function bucketize(data: HeatmapDay[]): DayBucket[] {
  return data.map((d) => ({
    raw: d,
    date: new Date(d.date),
    count: d.count,
    future: d.count < 0,
  }));
}

function levelOf(c: number): 0 | 1 | 2 | 3 | 4 {
  if (c <= 0) return 0;
  if (c <= 3) return 1;
  if (c <= 7) return 2;
  if (c <= 12) return 3;
  return 4;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

interface HoverState {
  day: DayBucket;
  x: number;
  y: number;
}

interface VariantProps {
  buckets: DayBucket[];
  onHover: (day: DayBucket, x: number, y: number) => void;
  onLeave: () => void;
}

function HeatmapClassic({ buckets, onHover, onLeave }: VariantProps) {
  const weeks: DayBucket[][] = [];
  for (let i = 0; i < buckets.length; i += 7) weeks.push(buckets.slice(i, i + 7));

  const monthMarks: { m: number; wi: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((w, wi) => {
    const m = w[0].date.getMonth();
    if (m !== lastMonth) {
      monthMarks.push({ m, wi });
      lastMonth = m;
    }
  });

  return (
    <div className="hm-grid">
      <div></div>
      <div className="hm-months">
        {monthMarks.map((mm, i) => (
          <span key={i} style={{ left: `calc(${mm.wi} * (100% / ${weeks.length}))` }}>
            {MONTHS[mm.m]}
          </span>
        ))}
      </div>
      <div className="hm-dow">
        {DOWS.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="hm-cells" style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }}>
        {weeks.map((w, wi) =>
          w.map((day, di) => {
            const lv = day.future ? 0 : levelOf(day.count);
            return (
              <div
                key={`${wi}-${di}`}
                className={`hm-cell l${lv} ${day.future ? 'future' : ''}`}
                onMouseEnter={(e) => !day.future && onHover(day, e.clientX, e.clientY)}
                onMouseMove={(e) => !day.future && onHover(day, e.clientX, e.clientY)}
                onMouseLeave={onLeave}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}

function Heatmap3D({ buckets, onHover, onLeave }: VariantProps) {
  const weeks: DayBucket[][] = [];
  for (let i = 0; i < buckets.length; i += 7) weeks.push(buckets.slice(i, i + 7));

  return (
    <div className="hm-3d">
      <div className="hm-3d-inner" style={{ gridTemplateColumns: `repeat(${weeks.length}, 14px)` }}>
        {weeks.map((w, wi) =>
          w.map((day, di) => {
            const lv = day.future ? 0 : levelOf(day.count);
            const height = day.future ? 1 : Math.max(1, day.count * 1.6);
            const heatColor = `var(--heat-${lv})`;
            return (
              <div
                key={`${wi}-${di}`}
                className={`hm-cell l${lv}`}
                style={{
                  background: heatColor,
                  transform: `translateZ(${height}px)`,
                  boxShadow:
                    lv > 0
                      ? `0 ${height / 2}px 0 0 color-mix(in oklab, ${heatColor} 60%, black)`
                      : 'none',
                }}
                onMouseEnter={(e) => !day.future && onHover(day, e.clientX, e.clientY)}
                onMouseMove={(e) => !day.future && onHover(day, e.clientX, e.clientY)}
                onMouseLeave={onLeave}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}

interface RadialProps extends VariantProps {
  centerLabel: string;
}

function HeatmapRadial({ buckets, onHover, onLeave, centerLabel }: RadialProps) {
  const size = 560;
  const cx = size / 2;
  const cy = size / 2;
  const innerR = 90;
  const outerR = 250;
  const bandSize = (outerR - innerR) / 7;

  const weeks: DayBucket[][] = [];
  for (let i = 0; i < buckets.length; i += 7) weeks.push(buckets.slice(i, i + 7));
  const anglePerWeek = (Math.PI * 2) / weeks.length;

  type Cell = { d: string; lv: number; future: boolean; day: DayBucket; key: string };
  const cells: Cell[] = [];
  weeks.forEach((w, wi) => {
    const a0 = wi * anglePerWeek - Math.PI / 2;
    const a1 = (wi + 1) * anglePerWeek - Math.PI / 2;
    w.forEach((day, di) => {
      const lv = day.future ? 0 : levelOf(day.count);
      const r0 = innerR + di * bandSize;
      const r1 = innerR + (di + 1) * bandSize;
      const x0 = cx + Math.cos(a0) * r0;
      const y0 = cy + Math.sin(a0) * r0;
      const x1 = cx + Math.cos(a1) * r0;
      const y1 = cy + Math.sin(a1) * r0;
      const x2 = cx + Math.cos(a1) * r1;
      const y2 = cy + Math.sin(a1) * r1;
      const x3 = cx + Math.cos(a0) * r1;
      const y3 = cy + Math.sin(a0) * r1;
      cells.push({
        d: `M${x0},${y0} L${x1},${y1} L${x2},${y2} L${x3},${y3} Z`,
        lv,
        future: day.future,
        day,
        key: `${wi}-${di}`,
      });
    });
  });

  const monthTicks: { x: number; y: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((w, wi) => {
    const m = w[0].date.getMonth();
    if (m !== lastMonth) {
      const a = wi * anglePerWeek - Math.PI / 2;
      const r = outerR + 18;
      monthTicks.push({
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r,
        label: MONTHS[m],
      });
      lastMonth = m;
    }
  });

  return (
    <div className="hm-radial">
      <svg
        className="polar-svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {cells.map((c) => (
          <path
            key={c.key}
            d={c.d}
            fill={c.future ? 'transparent' : `var(--heat-${c.lv})`}
            stroke="var(--bg-card)"
            strokeWidth="0.6"
            style={{ cursor: c.future ? 'default' : 'pointer' }}
            onMouseEnter={(e) => !c.future && onHover(c.day, e.clientX, e.clientY)}
            onMouseMove={(e) => !c.future && onHover(c.day, e.clientX, e.clientY)}
            onMouseLeave={onLeave}
          />
        ))}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          className="ring-month"
          style={{ fontFamily: 'Instrument Serif, serif', fontSize: 36, fill: 'var(--ink)' }}
        >
          {centerLabel}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          style={{ fontSize: 9, fill: 'var(--ink-3)', letterSpacing: '0.2em' }}
        >
          COMMITS · 12 MO
        </text>
        {monthTicks.map((t, i) => (
          <text
            key={i}
            x={t.x}
            y={t.y}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontSize: 10,
              fill: 'var(--ink-3)',
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '0.1em',
            }}
          >
            {t.label.toUpperCase()}
          </text>
        ))}
      </svg>
    </div>
  );
}

function Tooltip({ hover }: { hover: HoverState | null }) {
  if (!hover) return null;
  const { day, x, y } = hover;
  const style: React.CSSProperties = {
    left: Math.min(x + 12, window.innerWidth - 240),
    top: y + 12,
  };
  return (
    <div className="hm-tooltip" style={style}>
      <div className="when">{fmtDate(day.date)}</div>
      <div className="what">
        {day.count > 0 ? day.count : 'No'} commit{day.count === 1 ? '' : 's'}
      </div>
      {day.raw.projects.length > 0 && (
        <div className="breakdown">
          {day.raw.projects.slice(0, 4).map((p, i) => (
            <div className="row" key={i}>
              <span className="nm">{p.name}</span>
              <span className="ct">+{p.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Heatmap({ data, variant, setVariant, allowSwitch, totals }: Props) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const buckets = bucketize(data);

  const onHover = (day: DayBucket, x: number, y: number) => setHover({ day, x, y });
  const onLeave = () => setHover(null);

  return (
    <div className="heatmap-card">
      <div className="heatmap-meta">
        <div>
          <div className="figure">{totals.yearCommits.toLocaleString()}</div>
          <div className="figure-label">Commits, last 12 months</div>
        </div>
        <div>
          <div className="figure">{totals.commits30}</div>
          <div className="figure-label">Last 30 days</div>
        </div>
        <div>
          <div className="figure">
            {totals.activeDays30}
            <span style={{ fontSize: 18, color: 'var(--ink-3)' }}>/30</span>
          </div>
          <div className="figure-label">Active days · 30d</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          {allowSwitch && (
            <div className="variant-tabs">
              {(
                [
                  { id: 'classic', label: 'Grid' },
                  { id: 'extrude', label: 'Extruded' },
                  { id: 'radial', label: 'Radial' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  className={variant === t.id ? 'on' : ''}
                  onClick={() => setVariant(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {variant === 'classic' && (
        <HeatmapClassic buckets={buckets} onHover={onHover} onLeave={onLeave} />
      )}
      {variant === 'extrude' && (
        <Heatmap3D buckets={buckets} onHover={onHover} onLeave={onLeave} />
      )}
      {variant === 'radial' && (
        <HeatmapRadial
          buckets={buckets}
          onHover={onHover}
          onLeave={onLeave}
          centerLabel={totals.yearCommits.toLocaleString()}
        />
      )}

      {variant !== 'radial' && (
        <div className="hm-legend">
          <span>Less</span>
          <div className="swatches">
            <div className="sw" style={{ background: 'var(--heat-0)' }}></div>
            <div className="sw" style={{ background: 'var(--heat-1)' }}></div>
            <div className="sw" style={{ background: 'var(--heat-2)' }}></div>
            <div className="sw" style={{ background: 'var(--heat-3)' }}></div>
            <div className="sw" style={{ background: 'var(--heat-4)' }}></div>
          </div>
          <span>More</span>
        </div>
      )}

      <Tooltip hover={hover} />
    </div>
  );
}
