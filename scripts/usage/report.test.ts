import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pacificDay } from './aggregate.js';
import { fetchTraffic, parseUsageArgs } from './report.js';

test('parseUsageArgs defaults to 30 days and a dated .cache path', () => {
  const args = parseUsageArgs([]);
  assert.equal(args.days, 30);
  assert.equal(args.out, `.cache/usage/${pacificDay(Date.now())}.json`);
});

test('parseUsageArgs reads --days', () => {
  assert.equal(parseUsageArgs(['--days', '7']).days, 7);
});

test('parseUsageArgs clamps --days to 1..30', () => {
  assert.equal(parseUsageArgs(['--days', '99']).days, 30);
  assert.equal(parseUsageArgs(['--days', '0']).days, 1);
});

test('parseUsageArgs falls back to 30 for a non-numeric --days', () => {
  assert.equal(parseUsageArgs(['--days', 'abc']).days, 30);
});

test('parseUsageArgs reads --out', () => {
  const args = parseUsageArgs(['--out', 'x.json']);
  assert.equal(args.out, 'x.json');
  assert.equal(args.days, 30);
});

test('report.ts never calls the portfolio-building endpoint', () => {
  const source = readFileSync(new URL('./report.ts', import.meta.url), 'utf8');
  assert.equal(source.includes('/api/git-viewer/u/'), false);
});

const liveTrafficBody = { totals: { hits: 84, visitors: 14, botHits: 17, notFound: 0, clicks: 1 }, quality: { botVisitors: 10, singleHitVisitors: 8, cookieVisitors: 79 }, visitors: [{ visitorId: 'v1', ip: '203.0.113.9', userEmail: 'someone@example.com', hits: 49 }], recent: [{ ts: 1794530101338, ip: '203.0.113.9', ua: 'x', userEmail: 'someone@example.com' }], byDay: [{ date: '2026-11-07', hits: 38, visitors: 6 }] };

test('fetchTraffic reads human totals and copies no per-visitor data', async () => {
  const traffic = await fetchTraffic(async () => liveTrafficBody, 7);
  assert.deepStrictEqual(traffic, { humanVisitors: 14, humanSingleHit: 8, byDayUtc: [{ date: '2026-11-07', hits: 38, visitors: 6 }] });
  const json = JSON.stringify(traffic);
  assert.equal(json.includes('203.0.113.9'), false);
  assert.equal(json.includes('@'), false);
});

test('fetchTraffic requests the git-viewer slug for the given days with mine=exclude', async () => {
  const paths: string[] = [];
  await fetchTraffic(async (path: string) => {
    paths.push(path);
    return {};
  }, 7);
  assert.equal(paths.length, 1);
  assert.ok(paths[0].includes('slug=git-viewer'));
  assert.ok(paths[0].includes('days=7'));
  assert.ok(paths[0].includes('mine=exclude'));
});

test('fetchTraffic gives 0 when totals and quality are missing', async () => {
  const traffic = await fetchTraffic(async () => ({ byDay: [] }), 7);
  assert.equal(traffic.humanVisitors, 0);
  assert.equal(traffic.humanSingleHit, 0);
});
