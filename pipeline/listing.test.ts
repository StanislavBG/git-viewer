import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLAN_LIMITS } from './aggregate/select-repos.js';

const { listing } = JSON.parse(
  readFileSync(new URL('../bilko.listing.json', import.meta.url), 'utf8'),
) as { listing: { metric: string; detail: string; talkingPoints: string[] } };

const STALE = /top 3|3 projects/i;

test('listing metric matches PLAN_LIMITS', () => {
  assert.ok(listing.metric.startsWith(`${PLAN_LIMITS.free} free`), listing.metric);
  assert.ok(listing.metric.includes(`${PLAN_LIMITS.paid} paid`), listing.metric);
});

test('listing detail has no stale free-tier count', () => {
  assert.doesNotMatch(listing.detail, STALE);
});

test('listing talkingPoints have no stale free-tier count', () => {
  for (const point of listing.talkingPoints) assert.doesNotMatch(point, STALE);
});
