import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pacificTime, portfolioUrl, type UsageReport } from './aggregate.js';
import { renderMarkdown } from './render.js';

const at = (isoString: string): number => Date.parse(isoString);
const sessionStart = at('2026-11-05T18:30:00Z');
const replyAt = at('2026-11-05T16:00:00Z');
const replyText = `no portfolio page yet? ${'x'.repeat(200)}`;

function fullReport(): UsageReport {
  return {
    generatedAt: '2026-11-08T17:00:00.000Z',
    window: { days: 30, sinceMs: at('2026-10-09T17:00:00Z'), untilMs: at('2026-11-08T17:00:00Z') },
    portfolios: {
      ok: true,
      totals: { all: 3, free: 2, paid: 1, claimed: 2, byBuiltBy: { visitor: 1, owner: 2 } },
      subscriptions: { active: 1, total: 2 },
      rows: [
        { login: 'example-user', tier: 'free', claimed: true, showcase: false, builtBy: 'visitor', createdAt: '2026-11-05T18:32:00Z', updatedAt: null },
        { login: 'showcase-one', tier: 'free', claimed: false, showcase: true, builtBy: 'owner', createdAt: null, updatedAt: null },
      ],
    },
    sessions: { ok: true, total: 12, mine: 5, bot: 4, real: 3, timelinesCapped: false },
    flows: { ok: true, realSessions: 3, allSessions: 12, telemetryOnlyReal: 2 },
    days: [
      { day: '2026-11-05', sessions: 12, mine: 5, bot: 4, real: 3, newPages: 1, realBuilds: 1, claims: 1, resumeDownloads: 0, checkouts: 2 },
    ],
    realVisitors: [
      {
        sessionId: 's1',
        startedAt: sessionStart,
        country: 'DE',
        device: 'mobile',
        referrerHost: 't.co',
        utm: { source: 'burrow' },
        steps: { 'portfolio-load.generating': 1, 'portfolio-load.success': 1 },
        login: 'example-user',
        url: portfolioUrl('example-user'),
        burrow: { postId: 'p1', postedAt: replyAt, text: replyText, target: 'ExampleHandle', mode: 'one_detail', lane: 'established' },
      },
    ],
    unmatchedBuilds: [
      { login: 'drive-by', tier: 'free', claimed: false, showcase: false, builtBy: null, createdAt: '2026-11-06T10:00:00Z', updatedAt: null },
    ],
    burrow: { ok: true, replies: 4 },
    stripe: { ok: false, error: 'stripe CLI not logged in' },
    traffic: { ok: true, humanVisitors: 9, humanSingleHit: 4, byDayUtc: [{ date: '2026-11-05', hits: 40, visitors: 7 }] },
    health: { errors: 0, gitViewerOk: true, pagesRuns: [{ createdAt: '2026-11-08T09:00:00Z', conclusion: 'success' }], problems: [] },
  };
}

test('headline numbers', () => {
  const md = renderMarkdown(fullReport());
  assert.ok(md.startsWith('# Usage report — last 30 days'), md.split('\n')[0]);
  assert.ok(md.split('\n')[0].includes(pacificTime(at('2026-11-08T17:00:00.000Z'))));
  assert.match(md, /^- Real sessions: \*\*3\*\* \(telemetry-only real: 2\)$/m);
  assert.match(md, /^- New pages built by real visitors: \*\*1\*\*$/m);
  assert.match(md, /^- Claimed portfolios: \*\*2\*\*$/m);
  assert.match(md, /^- Paid subscriptions: \*\*1\*\* active \/ 2 total$/m);
  assert.match(md, /^- Owner or bot sessions: \*\*9\*\* \(you 5, bots 4\)$/m);
});

test('by-day table row', () => {
  const md = renderMarkdown(fullReport());
  assert.ok(md.includes('## By day (Pacific)'));
  assert.ok(md.includes('| Day | Sessions | You | Bots | Real | New pages | Builds | Claims | Résumé | Checkouts |'));
  assert.ok(md.includes('| 2026-11-05 Thu | 12 | 5 | 4 | 3 | 1 | 1 | 1 | 0 | 2 |'));
});

test('real visitor with portfolio url and burrow reply', () => {
  const md = renderMarkdown(fullReport());
  const url = 'https://bilko.run/projects/git-viewer/?u=example-user';
  assert.ok(md.includes(`portfolio: ${url}`));
  assert.ok(md.includes(`${pacificTime(sessionStart)} · DE · mobile · source burrow`));
  assert.ok(md.includes('portfolio-load.generating, portfolio-load.success'));
  const burrowLine = `  - burrow reply to @ExampleHandle at ${pacificTime(replyAt)} (one_detail/established): "${replyText.slice(0, 140)}"`;
  assert.ok(md.includes(burrowLine), md);
  assert.ok(!md.includes(replyText.slice(0, 141)));
});

test('portfolios section lists non-showcase rows and unmatched builds', () => {
  const md = renderMarkdown(fullReport());
  assert.ok(md.includes(`| example-user | free | yes | visitor |`));
  assert.ok(md.includes(portfolioUrl('example-user')));
  assert.ok(!md.includes('showcase-one'));
  assert.ok(md.includes(`drive-by`) && md.includes(portfolioUrl('drive-by')));
});

test('unavailable stripe section and closing note', () => {
  const md = renderMarkdown(fullReport());
  assert.match(md, /## Paid\n\n_unavailable: stripe CLI not logged in_/);
  assert.ok(md.includes('| 2026-11-05 | 40 | 7 |'));
  assert.ok(md.trimEnd().endsWith('checkout.view-offer counts impressions, not interest._'));
});

test('empty days render a no-sessions line', () => {
  const report = { ...fullReport(), days: [], realVisitors: [] };
  const md = renderMarkdown(report);
  assert.ok(md.includes('## By day (Pacific)\n\n_No sessions in this window._'));
  assert.ok(!md.includes('| Day | Sessions |'));
});

test('deterministic', () => {
  assert.equal(renderMarkdown(fullReport()), renderMarkdown(fullReport()));
});
