import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAN_LIMITS, selectRepos } from './select-repos.js';
import type { RepoSummary } from '../sources/github.js';

function repo(name: string, over: Partial<RepoSummary> = {}): RepoSummary {
  return {
    name,
    description: null,
    stars: 0,
    forks: 0,
    language: null,
    archived: false,
    fork: false,
    pushedAt: '2026-01-01T00:00:00Z',
    defaultBranch: 'main',
    openIssues: 0,
    license: null,
    topics: [],
    ...over,
  };
}

const names = (rs: RepoSummary[]) => rs.map((r) => r.name);

test('PLAN_LIMITS', () => {
  assert.deepEqual(PLAN_LIMITS, { free: 3, paid: 12 });
});

test('no opts selects everything, nothing locked', () => {
  const repos = [repo('a'), repo('b')];
  const out = selectRepos(repos, {});
  assert.equal(out.selected.length, 2);
  assert.equal(out.lockedCount, 0);
});

test('cap 3 ranks by stars then pushedAt', () => {
  const repos = [
    repo('low', { stars: 1 }),
    repo('old', { stars: 5, pushedAt: '2020-01-01T00:00:00Z' }),
    repo('new', { stars: 5, pushedAt: '2025-01-01T00:00:00Z' }),
    repo('top', { stars: 9 }),
  ];
  const out = selectRepos(repos, { maxProjects: 3 });
  assert.deepEqual(names(out.selected), ['top', 'new', 'old']);
  assert.equal(out.lockedCount, 1);
});

test('archived repos rank after non-archived regardless of stars', () => {
  const repos = [
    repo('arch', { stars: 100, archived: true }),
    repo('live', { stars: 1 }),
  ];
  const out = selectRepos(repos, { maxProjects: 1 });
  assert.deepEqual(names(out.selected), ['live']);
  assert.equal(out.lockedCount, 1);
});

test('allowlist keeps allowlist order and is case-insensitive', () => {
  const repos = [repo('Alpha', { stars: 9 }), repo('beta'), repo('Gamma')];
  const out = selectRepos(repos, { allowlist: ['GAMMA', 'alpha'] });
  assert.deepEqual(names(out.selected), ['Gamma', 'Alpha']);
  assert.equal(out.lockedCount, 1);
});

test('unknown allowlist names are ignored; cap applies after allowlist', () => {
  const repos = [repo('a'), repo('b'), repo('c')];
  const out = selectRepos(repos, { allowlist: ['nope', 'c', 'b', 'a'], maxProjects: 2 });
  assert.deepEqual(names(out.selected), ['c', 'b']);
  assert.equal(out.lockedCount, 1);
});

test('cap 0 selects nothing', () => {
  const repos = [repo('a'), repo('b')];
  const out = selectRepos(repos, { maxProjects: 0 });
  assert.deepEqual(out.selected, []);
  assert.equal(out.lockedCount, 2);
});

test('input array is not mutated', () => {
  const repos = [repo('a', { stars: 1 }), repo('b', { stars: 5 })];
  const copy = [...repos];
  selectRepos(repos, { maxProjects: 1 });
  selectRepos(repos, { allowlist: ['b', 'a'] });
  assert.deepEqual(repos, copy);
  assert.deepEqual(names(repos), ['a', 'b']);
});
