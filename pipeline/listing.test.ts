import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLAN_LIMITS } from './aggregate/select-repos.js';

const { listing } = JSON.parse(
  readFileSync(new URL('../bilko.listing.json', import.meta.url), 'utf8'),
) as {
  listing: {
    metric: string;
    metricLabel: string;
    detail: string;
    talkingPoints: string[];
    avoidClaims: string[];
  };
};

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

test('listing states public repos only', () => {
  assert.ok(listing.detail.includes('public repos only'), listing.detail);
  assert.ok(listing.detail.includes('Private repos are never read or shown'), listing.detail);
  assert.ok(listing.talkingPoints.some((p) => p.startsWith('Public data only')));
  assert.ok(listing.avoidClaims.includes('Shows, reads or includes private repositories'));
});

test('listing respects registry limits', () => {
  assert.ok(listing.talkingPoints.length <= 5);
  assert.ok(listing.avoidClaims.length <= 5);
  assert.ok(listing.metricLabel.length <= 24, listing.metricLabel);
});

test('listing prices are yearly, never monthly', () => {
  const strings = [
    listing.metric,
    listing.metricLabel,
    listing.detail,
    ...listing.talkingPoints,
    ...listing.avoidClaims,
  ];
  for (const s of strings) {
    assert.ok(!s.includes('/mo'), s);
    assert.ok(!/per month/i.test(s), s);
  }
  assert.ok(listing.detail.includes('$5/yr'), listing.detail);
});

test('UI price copy has no $5/mo', () => {
  for (const f of ['../src/components/Landing.tsx', '../src/components/HostedActions.tsx']) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.ok(!src.includes('$5/mo'), f);
    assert.ok(!src.includes('per month'), f);
  }
});
