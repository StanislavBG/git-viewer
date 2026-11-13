import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CREATED_AT_STAMPED_MS,
  PACIFIC_TZ,
  attributeBurrow,
  buildRealVisitors,
  classifySession,
  flowSteps,
  matchBuildToProfile,
  pacificDay,
  pacificTime,
  portfolioUrl,
  rollupByDay,
  stripEmails,
  unmatchedBuilds,
  utmFromTimeline,
  type BurrowReply,
  type DayRow,
  type ProfileRow,
  type RealVisitor,
  type Section,
  type SessionClass,
  type TimelineItem,
  type UsageReport,
  type UsageSession,
  type Utm,
} from './aggregate.js';

const HOUR = 3_600_000;
const at = (isoString: string): number => Date.parse(isoString);
const iso = (ms: number): string => new Date(ms).toISOString();

function ev(flow: string, step: string, ts = 0, app = 'git-viewer'): TimelineItem {
  return { ts, kind: 'event', app, name: `${flow}.${step}`, props: { flow, step } };
}

function view(ts: number, path: string | null, referrer: string | null = null): TimelineItem {
  return { ts, kind: 'view', path, referrer };
}

function session(fields: Pick<UsageSession, 'sessionId' | 'startedAt'> & Partial<UsageSession>): UsageSession {
  return {
    endedAt: fields.startedAt + 60_000,
    mine: false,
    bot: false,
    country: 'US',
    device: 'desktop',
    referrerHost: null,
    sourceBucket: null,
    timeline: [],
    ...fields,
  };
}

function profile(login: string, fields: Partial<ProfileRow> = {}): ProfileRow {
  return { login, tier: 'free', claimed: false, showcase: false, builtBy: null, createdAt: null, updatedAt: null, ...fields };
}

function reply(postId: string, postedAt: number): BurrowReply {
  return { postId, postedAt, text: `reply ${postId}`, target: 'someone', mode: 'reply', lane: 'dev' };
}

function day(dayKey: string, counts: Partial<Omit<DayRow, 'day'>>): DayRow {
  return {
    day: dayKey,
    sessions: 0,
    mine: 0,
    bot: 0,
    real: 0,
    newPages: 0,
    realBuilds: 0,
    claims: 0,
    resumeDownloads: 0,
    checkouts: 0,
    ...counts,
  };
}

test('pacificDay buckets by America/Los_Angeles across the 2026-11-01 DST change', () => {
  assert.equal(PACIFIC_TZ, 'America/Los_Angeles');
  assert.equal(pacificDay(at('2026-11-01T06:30:00Z')), '2026-10-31');
  assert.equal(pacificDay(at('2026-11-01T07:00:00Z')), '2026-11-01');
  assert.equal(pacificDay(at('2026-11-08T07:30:00Z')), '2026-11-07');
  assert.equal(pacificDay(at('2026-11-08T08:00:00Z')), '2026-11-08');
});

test('pacificTime shows the Pacific wall clock with the PDT/PST abbreviation in force', () => {
  assert.equal(pacificTime(at('2026-11-01T06:30:00Z')), '2026-10-31 11:30 PM PDT');
  assert.equal(pacificTime(at('2026-11-01T08:30:00Z')), '2026-11-01 1:30 AM PDT');
  assert.equal(pacificTime(at('2026-11-01T09:30:00Z')), '2026-11-01 1:30 AM PST');
  assert.equal(pacificTime(at('2026-11-08T07:30:00Z')), '2026-11-07 11:30 PM PST');
  assert.equal(pacificTime(at('2026-11-08T08:05:00Z')), '2026-11-08 12:05 AM PST');
});

test('classifySession: the owner wins over the bot flag, everyone else is real', () => {
  const cases: [boolean, boolean, SessionClass][] = [
    [true, true, 'mine'],
    [true, false, 'mine'],
    [false, true, 'bot'],
    [false, false, 'real'],
  ];
  for (const [mine, bot, expected] of cases) assert.equal(classifySession({ mine, bot }), expected);
});

test('flowSteps counts flow.step pairs from git-viewer events only', () => {
  assert.deepEqual(
    flowSteps([
      ev('build-portfolio', 'success'),
      ev('build-portfolio', 'success'),
      ev('checkout', 'view-offer'),
      ev('claim', 'success', 0, 'other-app'),
      { ts: 0, kind: 'click', app: 'git-viewer', props: { flow: 'claim', step: 'click' } },
      { ts: 0, kind: 'event', app: 'git-viewer', name: 'claim.3', props: { flow: 'claim', step: 3 } },
      { ts: 0, kind: 'event', app: 'git-viewer', name: 'bare', props: null },
      view(0, '/projects/git-viewer/'),
    ]),
    { 'build-portfolio.success': 2, 'checkout.view-offer': 1 },
  );
});

test('utmFromTimeline reads utm_* from the earliest view whose path or referrer carries utm_source', () => {
  assert.deepEqual(
    utmFromTimeline([
      view(9, '/projects/git-viewer/?utm_source=later'),
      { ts: 1, kind: 'event', app: 'git-viewer', path: '/?utm_source=not-a-view' },
      view(2, '/projects/git-viewer/'),
      view(3, '/projects/git-viewer/?u=octocat&utm_source=burrow&utm_medium=x&utm_campaign=launch&utm_content=r1'),
    ]),
    { source: 'burrow', medium: 'x', campaign: 'launch', content: 'r1' },
  );
  assert.deepEqual(
    utmFromTimeline([view(1, '/projects/git-viewer/', 'https://bilko.run/?utm_source=newsletter')]),
    { source: 'newsletter' },
  );
  assert.equal(utmFromTimeline([view(1, '/projects/git-viewer/?utm_medium=x&utm_source=')]), null);
  assert.equal(utmFromTimeline([view(1, null, null)]), null);
  assert.equal(utmFromTimeline([]), null);
  assert.equal(utmFromTimeline([view(1, 'http://[::1', 'http://[oops?utm_source=x')]), null);
});

test('rollupByDay splits sessions per Pacific day and counts funnel steps once per real session', () => {
  const sessions = [
    session({
      sessionId: 'claimer',
      startedAt: at('2026-11-08T07:30:00Z'),
      timeline: [ev('claim', 'success'), ev('claim', 'success'), ev('download', 'click-download'), ev('download', 'download-started')],
    }),
    session({
      sessionId: 'new-page',
      startedAt: at('2026-11-01T06:30:00Z'),
      timeline: [ev('portfolio-load', 'generating'), ev('build-portfolio', 'success'), ev('build-portfolio', 'success'), ev('checkout', 'view-offer')],
    }),
    session({
      sessionId: 'owner',
      startedAt: at('2026-11-01T05:00:00Z'),
      mine: true,
      bot: true,
      timeline: [ev('portfolio-load', 'generating'), ev('build-portfolio', 'success'), ev('claim', 'success'), ev('download', 'click-download')],
    }),
    session({ sessionId: 'crawler', startedAt: at('2026-10-31T20:00:00Z'), bot: true, timeline: [ev('build-portfolio', 'success')] }),
    session({
      sessionId: 'browser',
      startedAt: at('2026-11-01T07:00:00Z'),
      timeline: [ev('download', 'download-started'), ev('build-portfolio', 'success', 0, 'other-app')],
    }),
  ];
  const checkouts = [at('2026-11-01T06:59:59Z'), at('2026-11-04T20:00:00Z')];
  assert.deepEqual(rollupByDay(sessions, checkouts), [
    day('2026-10-31', { sessions: 3, mine: 1, bot: 1, real: 1, newPages: 1, realBuilds: 1, checkouts: 1 }),
    day('2026-11-01', { sessions: 1, real: 1, resumeDownloads: 1 }),
    day('2026-11-04', { checkouts: 1 }),
    day('2026-11-07', { sessions: 1, real: 1, claims: 1, resumeDownloads: 1 }),
  ]);
  assert.deepEqual(rollupByDay([], []), []);
});

test('matchBuildToProfile returns the closest non-showcase profile built within the tolerance', () => {
  const T = at('2026-11-05T17:00:00Z');
  const demo = profile('demo', { showcase: true, createdAt: iso(T) });
  const profiles = [demo, profile('farther', { createdAt: iso(T - 90_000) }), profile('nearest', { createdAt: iso(T + 30_000) })];
  assert.equal(matchBuildToProfile(T, profiles)?.login, 'nearest');
  assert.equal(matchBuildToProfile(T, [demo]), null);
  assert.equal(matchBuildToProfile(T, []), null);
});

test('matchBuildToProfile prefers createdAt and reads updatedAt only when createdAt is null', () => {
  const T = at('2026-11-05T17:00:00Z');
  const rebuilt = profile('rebuilt', { createdAt: iso(T - 24 * HOUR), updatedAt: iso(T + 1_000) });
  const fresh = profile('fresh', { createdAt: iso(T + 100_000), updatedAt: iso(T + 500_000) });
  const legacy = profile('legacy', { updatedAt: iso(T + 60_000) });
  assert.equal(matchBuildToProfile(T, [rebuilt]), null);
  assert.equal(matchBuildToProfile(T, [rebuilt, fresh])?.login, 'fresh');
  assert.equal(matchBuildToProfile(T, [rebuilt, legacy])?.login, 'legacy');
  assert.equal(matchBuildToProfile(T, [profile('undated'), profile('garbled', { createdAt: 'not a date' })]), null);
});

test('matchBuildToProfile tolerance defaults to 120000 ms inclusive and can be overridden', () => {
  const T = at('2026-11-05T17:00:00Z');
  const edge = profile('edge', { createdAt: iso(T - 120_000) });
  const beyond = profile('beyond', { createdAt: iso(T + 120_001) });
  assert.equal(matchBuildToProfile(T, [edge])?.login, 'edge');
  assert.equal(matchBuildToProfile(T, [beyond]), null);
  assert.equal(matchBuildToProfile(T, [edge], 60_000), null);
  assert.equal(matchBuildToProfile(T, [beyond], 180_000)?.login, 'beyond');
});

test('attributeBurrow picks the latest reply posted at or before the session start within 48 h', () => {
  const start = at('2026-11-06T18:00:00Z');
  const replies = [reply('older', start - 47 * HOUR), reply('latest', start - 2 * HOUR), reply('after', start + 60_000)];
  assert.equal(attributeBurrow(start, replies)?.postId, 'latest');
  assert.equal(attributeBurrow(start, [reply('same-instant', start)])?.postId, 'same-instant');
  assert.equal(attributeBurrow(start, [reply('edge', start - 48 * HOUR)])?.postId, 'edge');
  assert.equal(attributeBurrow(start, [reply('stale', start - 48 * HOUR - 1), reply('after', start + 1)]), null);
  assert.equal(attributeBurrow(start, [reply('recent', start - 2 * HOUR)], HOUR), null);
  assert.equal(attributeBurrow(start, []), null);
});

test('portfolioUrl points at the hosted page with the login encoded', () => {
  assert.equal(portfolioUrl('octocat'), 'https://bilko.run/projects/git-viewer/?u=octocat');
  assert.equal(portfolioUrl('a b&c'), 'https://bilko.run/projects/git-viewer/?u=a%20b%26c');
});

test('stripEmails deep-copies, drops /email/i keys at any depth and masks addresses inside strings', () => {
  const input = {
    email: 'top@example.com',
    note: 'mail jane.doe+gv@mail.example.co.uk or a@b.c today',
    count: 3,
    ok: true,
    missing: null,
    nested: { userEmail: 'x@y.io', BILLING_EMAIL: 'z@y.io', keep: { emails: ['q@y.io'], deep: 'ping dev@bilko.run' } },
    list: [{ customer_email: 'c@d.com', name: 'Jane' }, 'raw x@y.io', 7],
  };
  const out = stripEmails(input);
  assert.deepEqual(out, {
    note: 'mail [email] or [email] today',
    count: 3,
    ok: true,
    missing: null,
    nested: { keep: { deep: 'ping [email]' } },
    list: [{ name: 'Jane' }, 'raw [email]', 7],
  });
  assert.equal(input.email, 'top@example.com');
  assert.deepEqual(input.nested.keep.emails, ['q@y.io']);
  assert.notEqual(out.nested.keep, input.nested.keep);
  assert.notEqual(out.list[0], input.list[0]);
  assert.equal(stripEmails('solo@example.org'), '[email]');
  assert.equal(stripEmails('no address here, just @handles'), 'no address here, just @handles');
  assert.deepEqual(stripEmails([{ Email: 'a@b.co', id: 1 }]), [{ id: 1 }]);
  assert.equal(stripEmails(42), 42);
  assert.equal(stripEmails(null), null);
});

test('stripEmails scrubs a whole UsageReport without changing its shape', () => {
  const since = at('2026-11-01T07:00:00Z');
  const burrow: Section<{ replies: number }> = { ok: false, error: 'burrow 401 for ops@bilko.run' };
  const report: UsageReport = {
    generatedAt: '2026-11-08T17:00:00.000Z',
    window: { days: 7, sinceMs: since, untilMs: since + 7 * 24 * HOUR },
    portfolios: {
      ok: true,
      totals: { all: 1, free: 0, paid: 1, claimed: 1, byBuiltBy: { landing: 1 } },
      subscriptions: { active: 1, total: 1 },
      rows: [profile('octocat', { tier: 'paid', claimed: true, builtBy: 'landing', createdAt: iso(since) })],
    },
    sessions: { ok: true, total: 1, mine: 0, bot: 0, real: 1, timelinesCapped: false },
    flows: { ok: true, realSessions: 1, allSessions: 1, telemetryOnlyReal: 0 },
    days: [day('2026-11-01', { sessions: 1, real: 1, checkouts: 1 })],
    realVisitors: [],
    unmatchedBuilds: [],
    burrow,
    stripe: {
      ok: true,
      subscriptionsByStatus: { active: 1 },
      checkouts: [{ id: 'cs_1', createdMs: since, status: 'complete', paymentStatus: 'paid', plan: 'yearly', u: 'octocat' }],
    },
    traffic: { ok: true, humanVisitors: 3, humanSingleHit: 1, byDayUtc: [{ date: '2026-11-01', hits: 4, visitors: 3 }] },
    health: {
      errors: 0,
      gitViewerOk: true,
      pagesRuns: [{ createdAt: iso(since), conclusion: 'success' }],
      problems: ['receipt bounced for buyer@example.com'],
    },
  };
  const leaky = { ...report, stripe: { ...report.stripe, customerEmail: 'buyer@example.com' } };
  assert.deepEqual(stripEmails(leaky), {
    ...report,
    burrow: { ok: false, error: 'burrow 401 for [email]' },
    health: { ...report.health, problems: ['receipt bounced for [email]'] },
  });
});

test('buildRealVisitors lists real sessions in time order with login, page URL and burrow attribution', () => {
  const tReturning = at('2026-11-03T16:00:00Z');
  const tNew = at('2026-11-04T16:00:00Z');
  const tSearch = at('2026-11-05T16:00:00Z');
  const fromReturning = reply('r-returning', tReturning - 3 * HOUR);
  const fromNew = reply('r-new', tNew - HOUR);
  const profiles = [
    profile('existing', { createdAt: iso(tReturning + 10_000) }),
    profile('early', { createdAt: iso(tNew + 40_000) }),
    profile('newbie', { createdAt: iso(tNew + 305_000) }),
    profile('searcher', { createdAt: iso(tSearch + 30_000) }),
  ];
  const sessions = [
    session({
      sessionId: 's-search',
      startedAt: tSearch,
      referrerHost: 'www.google.com',
      timeline: [ev('portfolio-load', 'generating', tSearch + 20_000)],
    }),
    session({
      sessionId: 's-new',
      startedAt: tNew,
      country: 'DE',
      device: 'mobile',
      timeline: [
        view(tNew, '/projects/git-viewer/?utm_source=burrow&utm_campaign=launch'),
        ev('portfolio-load', 'generating', tNew + 5_000),
        ev('portfolio-load', 'success', tNew + 40_000),
        ev('build-portfolio', 'success', tNew + 40_000),
        ev('portfolio-load', 'success', tNew + 300_000),
      ],
    }),
    session({
      sessionId: 's-owner',
      startedAt: tNew,
      mine: true,
      referrerHost: 't.co',
      timeline: [ev('portfolio-load', 'generating', tNew), ev('portfolio-load', 'success', tNew + 40_000)],
    }),
    session({ sessionId: 's-bot', startedAt: tNew, bot: true }),
    session({
      sessionId: 's-returning',
      startedAt: tReturning,
      referrerHost: 't.co',
      timeline: [ev('portfolio-load', 'success', tReturning + 10_000)],
    }),
  ];
  const launchUtm: Utm = { source: 'burrow', campaign: 'launch' };
  const expected: RealVisitor[] = [
    {
      sessionId: 's-returning',
      startedAt: tReturning,
      country: 'US',
      device: 'desktop',
      referrerHost: 't.co',
      utm: null,
      steps: { 'portfolio-load.success': 1 },
      login: null,
      url: null,
      burrow: fromReturning,
    },
    {
      sessionId: 's-new',
      startedAt: tNew,
      country: 'DE',
      device: 'mobile',
      referrerHost: null,
      utm: launchUtm,
      steps: { 'portfolio-load.generating': 1, 'portfolio-load.success': 2, 'build-portfolio.success': 1 },
      login: 'newbie',
      url: 'https://bilko.run/projects/git-viewer/?u=newbie',
      burrow: fromNew,
    },
    {
      sessionId: 's-search',
      startedAt: tSearch,
      country: 'US',
      device: 'desktop',
      referrerHost: 'www.google.com',
      utm: null,
      steps: { 'portfolio-load.generating': 1 },
      login: null,
      url: null,
      burrow: null,
    },
  ];
  assert.deepEqual(buildRealVisitors(sessions, profiles, [fromReturning, fromNew, reply('r-later', tSearch - HOUR)]), expected);
});

test('unmatchedBuilds lists recent non-showcase builds that no real visitor accounts for', () => {
  const since = at('2026-11-01T07:00:00Z');
  const visitor = (sessionId: string, login: string | null): RealVisitor => ({
    sessionId,
    startedAt: since,
    country: null,
    device: null,
    referrerHost: null,
    utm: null,
    steps: {},
    login,
    url: login === null ? null : portfolioUrl(login),
    burrow: null,
  });
  const profiles = [
    profile('newbie', { createdAt: iso(since + 1_000) }),
    profile('stranger', { createdAt: iso(since + 5_000) }),
    profile('demo', { showcase: true, createdAt: iso(since + 5_000) }),
    profile('veteran', { createdAt: iso(since - 1), updatedAt: iso(since + 10_000) }),
    profile('legacy', { updatedAt: iso(since) }),
    profile('undated'),
  ];
  assert.deepEqual(
    unmatchedBuilds(profiles, [visitor('s1', 'newbie'), visitor('s2', null)], since).map((p) => p.login),
    ['stranger', 'legacy'],
  );
});

test('a createdAt-null row updated at or after the created_at stamping deploy is a refresh, not a build', () => {
  const since = at('2026-11-01T00:00:00Z');
  const refreshedAt = '2026-11-13T00:00:00Z';
  const refreshed = profile('bidyut10', { updatedAt: refreshedAt });
  const atCutoff = profile('torvalds', { updatedAt: iso(CREATED_AT_STAMPED_MS) });
  const legacy = profile('legacy', { updatedAt: '2026-11-07T18:21:30Z' });
  const fresh = profile('fresh', { createdAt: '2026-11-10T12:00:00Z', updatedAt: refreshedAt });
  assert.equal(CREATED_AT_STAMPED_MS, Date.parse('2026-11-08T08:07:00Z'));
  assert.deepEqual(
    unmatchedBuilds([refreshed, atCutoff, legacy, fresh], [], since).map((p) => p.login),
    ['legacy', 'fresh'],
  );
  assert.equal(matchBuildToProfile(at(refreshedAt), [refreshed]), null);
  assert.equal(matchBuildToProfile(CREATED_AT_STAMPED_MS, [atCutoff]), null);
  assert.equal(matchBuildToProfile(at('2026-11-07T18:21:30Z'), [refreshed, legacy])?.login, 'legacy');
  assert.equal(matchBuildToProfile(at('2026-11-10T12:00:00Z'), [refreshed, fresh])?.login, 'fresh');
});
