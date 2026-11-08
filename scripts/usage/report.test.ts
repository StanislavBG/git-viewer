import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pacificDay } from './aggregate.js';
import { parseUsageArgs } from './report.js';

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
