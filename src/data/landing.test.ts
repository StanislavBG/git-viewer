import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isLandingMode,
  normalizeLoginInput,
  exampleLogins,
  communityPortfolios,
  avatarUrl,
  portfolioHref,
  formatBuiltOn,
} from './landing.js';
import { LOGIN_RE } from './tenant.js';

test('isLandingMode is false when a non-empty u param is present', () => {
  assert.equal(isLandingMode('bilko.run', '?u=octocat'), false);
  assert.equal(isLandingMode('bilko.run', '?u=x&landing=1'), false);
});

test('isLandingMode is true for landing=1', () => {
  assert.equal(isLandingMode('bilko.run', '?landing=1'), true);
  assert.equal(isLandingMode('localhost', '?landing=1'), true);
  assert.equal(isLandingMode('stanislavbg.github.io', '?landing=1'), true);
});

test('isLandingMode is false on canonical and local hosts', () => {
  assert.equal(isLandingMode('stanislavbg.github.io', ''), false);
  assert.equal(isLandingMode('localhost', ''), false);
  assert.equal(isLandingMode('127.0.0.1', ''), false);
});

test('isLandingMode is true on other hosts, and an empty u does not block it', () => {
  assert.equal(isLandingMode('bilko.run', ''), true);
  assert.equal(isLandingMode('bilko.run', '?u='), true);
});

test('normalizeLoginInput accepts plain, @, and github.com forms', () => {
  assert.equal(normalizeLoginInput('octocat'), 'octocat');
  assert.equal(normalizeLoginInput('  octocat  '), 'octocat');
  assert.equal(normalizeLoginInput('@octocat'), 'octocat');
  assert.equal(normalizeLoginInput('github.com/octocat'), 'octocat');
  assert.equal(normalizeLoginInput('https://github.com/octocat'), 'octocat');
  assert.equal(normalizeLoginInput('https://www.github.com/octocat/'), 'octocat');
  assert.equal(normalizeLoginInput('github.com/octocat/some-repo'), 'octocat');
});

test('normalizeLoginInput rejects invalid input', () => {
  assert.equal(normalizeLoginInput(''), null);
  assert.equal(normalizeLoginInput('   '), null);
  assert.equal(normalizeLoginInput('octo cat'), null);
  assert.equal(normalizeLoginInput('a--b'), null);
  assert.equal(normalizeLoginInput('a'.repeat(40)), null);
  assert.equal(normalizeLoginInput('https://gitlab.com/x'), null);
  assert.equal(normalizeLoginInput('github.com/'), null);
});

test('exampleLogins lists the featured profiles', () => {
  assert.deepEqual([...exampleLogins], ['BilkoBibitkov', 'torvalds', 'gaearon']);
});

test('avatarUrl points at avatars.githubusercontent.com with a size', () => {
  assert.equal(avatarUrl('bidyut10'), 'https://avatars.githubusercontent.com/bidyut10?s=96');
  assert.equal(avatarUrl('octocat', 48), 'https://avatars.githubusercontent.com/octocat?s=48');
});

test('portfolioHref links to the ?u= page', () => {
  assert.equal(portfolioHref('bidyut10'), '?u=bidyut10');
});

test('formatBuiltOn formats real dates and passes through anything else', () => {
  assert.equal(formatBuiltOn('2026-11-07'), 'Nov 7, 2026');
  assert.equal(formatBuiltOn('2026-01-01'), 'Jan 1, 2026');
  assert.equal(formatBuiltOn('2026-02-30'), '2026-02-30');
  assert.equal(formatBuiltOn('soon'), 'soon');
});

const isRealIsoDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s) && formatBuiltOn(s) !== s;

test('communityPortfolios entries are valid, unique, and not example logins', () => {
  const seen = new Set<string>();
  const examples = new Set(exampleLogins.map((l) => l.toLowerCase()));
  for (const p of communityPortfolios) {
    assert.ok(LOGIN_RE.test(p.login), `invalid login ${p.login}`);
    const key = p.login.toLowerCase();
    assert.ok(!seen.has(key), `duplicate login ${p.login}`);
    seen.add(key);
    assert.ok(!examples.has(key), `${p.login} is an example login`);
    assert.ok(isRealIsoDate(p.builtOn), `bad builtOn ${p.builtOn}`);
  }
});

test('communityPortfolios is ordered newest builtOn first', () => {
  for (let i = 1; i < communityPortfolios.length; i++) {
    assert.ok(communityPortfolios[i - 1].builtOn >= communityPortfolios[i].builtOn);
  }
});

test('communityPortfolios includes bidyut10', () => {
  const entry = communityPortfolios.find((p) => p.login === 'bidyut10');
  assert.deepEqual(entry, { login: 'bidyut10', name: 'Bidyut Kundu', builtOn: '2026-11-07' });
});
