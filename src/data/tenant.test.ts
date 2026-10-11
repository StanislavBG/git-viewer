import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLogin, rawTenantParam, tenantApiUrl, parseTenantResponse } from './tenant.js';

test('parseLogin accepts a valid login', () => {
  assert.equal(parseLogin('?u=StanislavBG'), 'StanislavBG');
  assert.equal(parseLogin('?x=1&u=a-b-c'), 'a-b-c');
  assert.equal(parseLogin('?u=' + 'a'.repeat(39)), 'a'.repeat(39));
});

test('parseLogin rejects missing or empty', () => {
  assert.equal(parseLogin(''), null);
  assert.equal(parseLogin('?u='), null);
  assert.equal(parseLogin('?other=1'), null);
});

test('parseLogin rejects leading hyphen, double hyphen, 40 chars, injection', () => {
  assert.equal(parseLogin('?u=-abc'), null);
  assert.equal(parseLogin('?u=abc-'), null);
  assert.equal(parseLogin('?u=a--b'), null);
  assert.equal(parseLogin('?u=' + 'a'.repeat(40)), null);
  assert.equal(parseLogin('?u=' + encodeURIComponent('<script>alert(1)</script>')), null);
  assert.equal(parseLogin('?u=a/../b'), null);
});

test('tenantApiUrl builds and encodes', () => {
  assert.equal(
    tenantApiUrl('octocat', 'https://bilko.run'),
    'https://bilko.run/api/git-viewer/u/octocat',
  );
  assert.equal(
    tenantApiUrl('a/b?c', 'https://x.test'),
    'https://x.test/api/git-viewer/u/a%2Fb%3Fc',
  );
});

test('parseTenantResponse 200 ready', () => {
  const data = { user: 'octocat' };
  const r = parseTenantResponse(200, {
    login: 'octocat',
    tier: 'free',
    lockedCount: 3,
    updatedAt: '2026-10-10T00:00:00Z',
    data,
  });
  assert.deepEqual(r, {
    status: 'ready',
    login: 'octocat',
    tier: 'free',
    lockedCount: 3,
    updatedAt: '2026-10-10T00:00:00Z',
    data,
  });
});

test('parseTenantResponse 202 generating', () => {
  assert.deepEqual(parseTenantResponse(202, { retryAfterSec: 7 }), {
    status: 'generating',
    retryAfterSec: 7,
  });
});

test('parseTenantResponse 404 not_found', () => {
  assert.deepEqual(parseTenantResponse(404, {}), { status: 'not_found' });
});

test('parseTenantResponse 429 rate_limited', () => {
  assert.deepEqual(parseTenantResponse(429, { retryAfterSec: 10 }), {
    status: 'rate_limited',
    retryAfterSec: 10,
  });
});

test('retryAfterSec is clamped to 2..15 and defaults to 5', () => {
  assert.deepEqual(parseTenantResponse(202, { retryAfterSec: 0 }), { status: 'generating', retryAfterSec: 2 });
  assert.deepEqual(parseTenantResponse(202, { retryAfterSec: 99 }), { status: 'generating', retryAfterSec: 15 });
  assert.deepEqual(parseTenantResponse(429, {}), { status: 'rate_limited', retryAfterSec: 5 });
  assert.deepEqual(parseTenantResponse(429, null), { status: 'rate_limited', retryAfterSec: 5 });
  assert.deepEqual(parseTenantResponse(202, { retryAfterSec: 'x' }), { status: 'generating', retryAfterSec: 5 });
});

test('unsupported status throws', () => {
  assert.throws(() => parseTenantResponse(500, {}), /500/);
});

test('200 without data throws', () => {
  assert.throws(() => parseTenantResponse(200, { login: 'octocat', tier: 'free' }), /data/);
  assert.throws(() => parseTenantResponse(200, null), Error);
  assert.throws(() => parseTenantResponse(200, 'nope'), Error);
});

test('rawTenantParam distinguishes absent from invalid', () => {
  assert.equal(rawTenantParam(''), null);
  assert.equal(rawTenantParam('?u='), null);
  assert.equal(rawTenantParam('?u=-bad'), '-bad');
  assert.equal(parseLogin('?u=-bad'), null);
});

test('parseTenantResponse 503 throws for unavailable and error', () => {
  assert.throws(() => parseTenantResponse(503, { status: 'unavailable' }), /temporarily unavailable/);
  assert.throws(() => parseTenantResponse(503, { status: 'error' }), /generation failed/);
  assert.throws(() => parseTenantResponse(503, null), /generation failed/);
});
