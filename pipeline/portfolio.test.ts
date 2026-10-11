import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPortfolio, type PortfolioSource } from './portfolio.js';
import type { RepoSummary } from './sources/github.js';

function repo(name: string, stars: number): RepoSummary {
  return {
    name,
    description: null,
    stars,
    forks: 0,
    language: null,
    archived: false,
    fork: false,
    pushedAt: '2026-01-01T00:00:00Z',
    defaultBranch: 'main',
    openIssues: 0,
    license: null,
    topics: [],
  };
}

test('buildPortfolio fetches per-repo data only for selected repos', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (() => Promise.reject(new Error('network disabled'))) as typeof fetch;
  try {
    const commitCalls: string[] = [];
    const source: PortfolioSource = {
      fetchUser: async (login) => ({
        login,
        name: null,
        bio: null,
        company: null,
        location: null,
        email: null,
        createdAt: '2020-01-01T00:00:00Z',
        avatarUrl: '',
        followers: 0,
        following: 0,
        publicRepos: 3,
      }) as Awaited<ReturnType<PortfolioSource['fetchUser']>>,
      fetchRepos: async () => [repo('a', 1), repo('b', 5), repo('c', 3)],
      fetchCommits: async (_o, name) => {
        commitCalls.push(name);
        return [];
      },
      fetchLanguages: async () => ({}),
      fetchCommitDetail: async () => null,
      fetchReadme: async () => null,
      fetchTree: async () => [] as Awaited<ReturnType<PortfolioSource['fetchTree']>>,
      fetchPublicEvents: async () => [],
      fetchMarkdownDir: async () => [],
    };

    const { data, lockedCount } = await buildPortfolio({ user: 'u', maxProjects: 1, source });
    assert.deepEqual(commitCalls, ['b']);
    assert.equal(lockedCount, 2);
    assert.equal(data.projects.length, 1);
    assert.deepEqual(data.essays, []);
    assert.equal(data.now, null);
  } finally {
    globalThis.fetch = realFetch;
  }
});

function fakeSource(
  files: { name: string; content: string }[],
  calls: unknown[][] = [],
): PortfolioSource {
  return {
    fetchUser: async (login) => ({
      login,
      name: null,
      bio: null,
      company: null,
      location: null,
      email: null,
      createdAt: '2020-01-01T00:00:00Z',
      avatarUrl: '',
      followers: 0,
      following: 0,
      publicRepos: 0,
    }) as Awaited<ReturnType<PortfolioSource['fetchUser']>>,
    fetchRepos: async () => [],
    fetchCommits: async () => [],
    fetchLanguages: async () => ({}),
    fetchCommitDetail: async () => null,
    fetchReadme: async () => null,
    fetchTree: async () => [] as Awaited<ReturnType<PortfolioSource['fetchTree']>>,
    fetchPublicEvents: async () => [],
    fetchMarkdownDir: async (...args) => {
      calls.push(args);
      return files;
    },
  };
}

async function withNoNetwork<T>(fn: () => Promise<T>): Promise<T> {
  const realFetch = globalThis.fetch;
  // Plenty of rate budget so the pipeline is not in skinny mode; every other call fails.
  globalThis.fetch = ((url: string) =>
    String(url).endsWith('/rate_limit')
      ? Promise.resolve(Response.json({ resources: { core: { remaining: 5000 } } }))
      : Promise.reject(new Error('network disabled'))) as typeof fetch;
  try {
    return await fn();
  } finally {
    globalThis.fetch = realFetch;
  }
}

test("writing: 'profile-repo' builds essays from the fetched markdown files", async () => {
  const md = (t: string) => `---\ntitle: ${t}\ndate: 2026-03-04\n---\n\nBody of ${t}.`;
  const calls: unknown[][] = [];
  const source = fakeSource(
    [
      { name: 'one.md', content: md('One') },
      { name: 'two.md', content: md('Two') },
    ],
    calls,
  );
  const { data } = await withNoNetwork(() =>
    buildPortfolio({ user: 'u', writing: 'profile-repo', source }),
  );
  assert.equal(data.essays.length, 2);
  assert.deepEqual(calls, [['u', 'u', 'writing']]);
});

test("writing: 'profile-repo' with no files yields zero essays", async () => {
  const { data } = await withNoNetwork(() =>
    buildPortfolio({ user: 'u', writing: 'profile-repo', source: fakeSource([]) }),
  );
  assert.deepEqual(data.essays, []);
});
