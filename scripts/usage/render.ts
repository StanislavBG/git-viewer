import {
  pacificTime,
  portfolioUrl,
  type BurrowReply,
  type DayRow,
  type ProfileRow,
  type RealVisitor,
  type UsageReport,
} from './aggregate.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const BURROW_TEXT_LIMIT = 140;

// The day string is already a Pacific date, so its weekday is calendar math, not a timezone lookup.
function dayLabel(day: string): string {
  const ms = Date.parse(`${day}T12:00:00Z`);
  return Number.isNaN(ms) ? day : `${day} ${WEEKDAYS[new Date(ms).getUTCDay()]}`;
}

function cell(value: string | number | null): string {
  return value === null ? '—' : String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function table(headers: string[], rows: (string | number | null)[][]): string[] {
  return [
    `| ${headers.join(' | ')} |`,
    `|${headers.map(() => '---').join('|')}|`,
    ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`),
  ];
}

function unavailable(error: string): string {
  return `_unavailable: ${error}_`;
}

function headline(r: UsageReport): string[] {
  const { sessions, flows, portfolios } = r;
  const realLine = sessions.ok
    ? `- Real sessions: **${sessions.real}** (telemetry-only real: ${flows.ok ? flows.telemetryOnlyReal : 'n/a'})`
    : `- Real sessions: ${unavailable(sessions.error)}`;
  const newPages = r.days.reduce((sum, d) => sum + d.newPages, 0);
  const lines = [realLine, `- New pages built by real visitors: **${newPages}**`];
  if (portfolios.ok) {
    lines.push(`- Claimed portfolios: **${portfolios.totals.claimed}**`);
    lines.push(`- Paid subscriptions: **${portfolios.subscriptions.active}** active / ${portfolios.subscriptions.total} total`);
  } else {
    lines.push(`- Claimed portfolios: ${unavailable(portfolios.error)}`);
    lines.push(`- Paid subscriptions: ${unavailable(portfolios.error)}`);
  }
  lines.push(
    sessions.ok
      ? `- Owner or bot sessions: **${sessions.mine + sessions.bot}** (you ${sessions.mine}, bots ${sessions.bot})`
      : `- Owner or bot sessions: ${unavailable(sessions.error)}`,
  );
  if (sessions.ok && sessions.timelinesCapped) lines.push('- _Session timelines were capped; per-day flow counts may be low._');
  return lines;
}

function byDay(days: DayRow[]): string[] {
  if (days.length === 0) return ['_No sessions in this window._'];
  return table(
    ['Day', 'Sessions', 'You', 'Bots', 'Real', 'New pages', 'Builds', 'Claims', 'Résumé', 'Checkouts'],
    days.map((d) => [dayLabel(d.day), d.sessions, d.mine, d.bot, d.real, d.newPages, d.realBuilds, d.claims, d.resumeDownloads, d.checkouts]),
  );
}

function source(v: RealVisitor): string {
  return v.utm?.source ?? v.referrerHost ?? 'direct';
}

function burrowLine(b: BurrowReply): string {
  const target = b.target === null ? 'unknown target' : `@${b.target}`;
  const text = b.text.replace(/\s+/g, ' ').slice(0, BURROW_TEXT_LIMIT);
  return `  - burrow reply to ${target} at ${pacificTime(b.postedAt)} (${b.mode ?? '?'}/${b.lane ?? '?'}): "${text}"`;
}

function realVisitors(visitors: RealVisitor[]): string[] {
  if (visitors.length === 0) return ['_No real visitors in this window._'];
  const lines: string[] = [];
  for (const v of visitors) {
    lines.push(`- ${pacificTime(v.startedAt)} · ${v.country ?? '??'} · ${v.device ?? 'unknown device'} · source ${source(v)}`);
    const steps = Object.keys(v.steps).sort();
    lines.push(`  - steps: ${steps.length === 0 ? 'none' : steps.join(', ')}`);
    if (v.url !== null) lines.push(`  - portfolio: ${v.url}`);
    if (v.burrow !== null) lines.push(burrowLine(v.burrow));
  }
  return lines;
}

function profileTable(rows: ProfileRow[]): string[] {
  return table(
    ['Login', 'Tier', 'Claimed', 'Built by', 'Created', 'URL'],
    rows.map((p) => [p.login, p.tier, p.claimed ? 'yes' : 'no', p.builtBy, p.createdAt, portfolioUrl(p.login)]),
  );
}

function portfolios(r: UsageReport): string[] {
  const p = r.portfolios;
  const lines: string[] = [];
  if (!p.ok) {
    lines.push(unavailable(p.error));
  } else {
    const builtBy = Object.entries(p.totals.byBuiltBy)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, n]) => `${k} ${n}`)
      .join(', ');
    lines.push(
      `Total ${p.totals.all} (free ${p.totals.free}, paid ${p.totals.paid}, claimed ${p.totals.claimed})${builtBy ? `; built by: ${builtBy}` : ''}.`,
      '',
    );
    const rows = p.rows.filter((row) => !row.showcase);
    lines.push(...(rows.length === 0 ? ['_No non-showcase portfolios._'] : profileTable(rows)));
  }
  lines.push('', '### Builds not tied to a listed session', '');
  lines.push(...(r.unmatchedBuilds.length === 0 ? ['_None._'] : profileTable(r.unmatchedBuilds)));
  return lines;
}

function paid(r: UsageReport): string[] {
  const s = r.stripe;
  if (!s.ok) return [unavailable(s.error)];
  const statuses = Object.entries(s.subscriptionsByStatus)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, n]) => `${k} ${n}`)
    .join(', ');
  const lines = [`Subscriptions by status: ${statuses || 'none'}.`, ''];
  if (s.checkouts.length === 0) {
    lines.push('_No checkout sessions in this window._');
  } else {
    const checkouts = [...s.checkouts].sort((a, b) => a.createdMs - b.createdMs);
    lines.push(
      ...table(
        ['Created', 'Status', 'Payment', 'Plan', 'Portfolio'],
        checkouts.map((c) => [pacificTime(c.createdMs), c.status, c.paymentStatus, c.plan, c.u]),
      ),
    );
  }
  return lines;
}

function traffic(r: UsageReport): string[] {
  const t = r.traffic;
  if (!t.ok) return [unavailable(t.error)];
  const lines = [`Human visitors: ${t.humanVisitors} (single-hit: ${t.humanSingleHit}).`, ''];
  if (t.byDayUtc.length === 0) return [...lines, '_No server hits in this window._'];
  return [...lines, ...table(['Day (UTC)', 'Hits', 'Visitors'], t.byDayUtc.map((d) => [d.date, d.hits, d.visitors]))];
}

function health(r: UsageReport): string[] {
  const h = r.health;
  const ok = h.gitViewerOk === null ? 'unknown' : h.gitViewerOk ? 'yes' : 'no';
  const lines = [`- Errors in window: ${h.errors ?? 'unknown'}`, `- git-viewer health check ok: ${ok}`];
  if (h.pagesRuns === null) {
    lines.push('- Pages workflow runs: unknown');
  } else if (h.pagesRuns.length === 0) {
    lines.push('- Pages workflow runs: none');
  } else {
    lines.push('- Pages workflow runs:');
    for (const run of h.pagesRuns) lines.push(`  - ${pacificTime(Date.parse(run.createdAt))}: ${run.conclusion ?? 'in progress'}`);
  }
  lines.push(h.problems.length === 0 ? '- Problems: none' : '- Problems:');
  for (const p of h.problems) lines.push(`  - ${p}`);
  return lines;
}

export function renderMarkdown(report: UsageReport): string {
  const generated = Date.parse(report.generatedAt);
  const when = Number.isNaN(generated) ? report.generatedAt : pacificTime(generated);
  const out: string[] = [
    `# Usage report — last ${report.window.days} days (generated ${when})`,
    '',
    ...headline(report),
    '',
    '## By day (Pacific)',
    '',
    ...byDay(report.days),
    '',
    '## Real visitors',
    '',
    ...realVisitors(report.realVisitors),
    '',
    '## Portfolios',
    '',
    ...portfolios(report),
    '',
    '## Paid',
    '',
    ...paid(report),
    '',
    '## Traffic (server, UTC days)',
    '',
    ...traffic(report),
    '',
    '## Health',
    '',
    ...health(report),
    '',
    '---',
    '',
    '_Note: checkout.view-offer counts impressions, not interest._',
  ];
  return `${out.join('\n')}\n`;
}
