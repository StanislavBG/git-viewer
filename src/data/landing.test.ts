import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLandingMode, normalizeLoginInput, exampleLogins } from './landing.js';

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
  assert.deepEqual([...exampleLogins], ['StanislavBG', 'torvalds', 'gaearon']);
});
