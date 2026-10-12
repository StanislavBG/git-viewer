import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicReposUrl, parsePublicRepos } from './repos.js';

test('publicReposUrl encodes the login', () => {
  assert.equal(
    publicReposUrl('octo cat'),
    'https://api.github.com/users/octo%20cat/repos?per_page=100&type=owner&sort=pushed',
  );
});

test('parsePublicRepos filters and sorts', () => {
  const r = parsePublicRepos(200, [
    { name: 'old', pushed_at: '2020-01-01T00:00:00Z', stargazers_count: 1, description: 'd' },
    { name: 'new', pushed_at: '2024-01-01T00:00:00Z', stargazers_count: 2, description: 'd' },
    { name: 'fork', pushed_at: '2025-01-01T00:00:00Z', fork: true },
    { name: 'arch', archived: true, pushed_at: '2025-01-01T00:00:00Z' },
    { name: 'priv', private: true, pushed_at: '2025-01-01T00:00:00Z' },
    { description: 'no name' },
    null,
  ]);
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.deepEqual(r.repos.map((x) => x.name), ['new', 'old', 'fork']);
  assert.equal(r.repos[2].fork, true);
  assert.equal(r.repos[0].stars, 2);
});

test('parsePublicRepos defaults null description and missing stars', () => {
  const r = parsePublicRepos(200, [{ name: 'a', description: null, pushed_at: '2024-01-01T00:00:00Z' }]);
  assert.equal(r.status, 'ok');
  if (r.status !== 'ok') return;
  assert.equal(r.repos[0].description, '');
  assert.equal(r.repos[0].stars, 0);
  assert.equal(r.repos[0].fork, false);
});

test('parsePublicRepos maps 403 and 429 to rate_limited', () => {
  assert.deepEqual(parsePublicRepos(403, {}), { status: 'rate_limited' });
  assert.deepEqual(parsePublicRepos(429, null), { status: 'rate_limited' });
});

test('parsePublicRepos errors on other codes and malformed bodies', () => {
  assert.equal(parsePublicRepos(200, { message: 'x' }).status, 'error');
  assert.equal(parsePublicRepos(404, []).status, 'error');
  assert.equal(parsePublicRepos(500, null).status, 'error');
});
