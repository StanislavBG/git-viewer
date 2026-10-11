import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Octokit } from '@octokit/rest';

import { GitHubSource, MAX_COMMIT_PAGES } from './github.js';

const PAGE_SIZE = 100;

function commit(n: number) {
  return {
    sha: `sha${n}`,
    commit: { author: { date: '2026-01-01T00:00:00Z' }, committer: null, message: `m${n}` },
    author: { login: 'me' },
  };
}

function fakeKit(totalPages: number, fail?: Error) {
  const state = { requests: 0 };
  const kit = {
    repos: { listCommits: () => {} },
    paginate: async (
      _route: unknown,
      _params: unknown,
      mapFn: (res: { data: unknown[] }, done: () => void) => unknown[],
    ) => {
      if (fail) throw fail;
      const out: unknown[] = [];
      let stopped = false;
      const done = () => {
        stopped = true;
      };
      for (let p = 0; p < totalPages && !stopped; p++) {
        state.requests++;
        const data = Array.from({ length: PAGE_SIZE }, (_, i) => commit(p * PAGE_SIZE + i));
        out.push(...mapFn({ data }, done));
      }
      return out;
    },
  };
  return { kit: kit as unknown as Octokit, state };
}

test('MAX_COMMIT_PAGES is 5', () => {
  assert.equal(MAX_COMMIT_PAGES, 5);
});

test('fetchCommits stops after MAX_COMMIT_PAGES pages', async () => {
  const { kit, state } = fakeKit(12);
  const src = new GitHubSource(undefined, kit);
  const commits = await src.fetchCommits('o', 'r', '2025-01-01T00:00:00Z', 'me');
  assert.equal(state.requests, 5);
  assert.equal(commits.length, 500);
});

test('fetchCommits honours an explicit maxPages', async () => {
  const { kit, state } = fakeKit(12);
  const src = new GitHubSource(undefined, kit);
  const commits = await src.fetchCommits('o', 'r', '2025-01-01T00:00:00Z', 'me', 2);
  assert.equal(state.requests, 2);
  assert.equal(commits.length, 200);
});

test('fetchCommits returns [] on empty-repo 409', async () => {
  const { kit } = fakeKit(1, new Error('Git Repository is empty. 409'));
  const src = new GitHubSource(undefined, kit);
  assert.deepEqual(await src.fetchCommits('o', 'r', '2025-01-01T00:00:00Z', 'me'), []);
});

test('fetchCommits rethrows other errors', async () => {
  const { kit } = fakeKit(1, new Error('boom'));
  const src = new GitHubSource(undefined, kit);
  await assert.rejects(src.fetchCommits('o', 'r', '2025-01-01T00:00:00Z', 'me'), /boom/);
});
