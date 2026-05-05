import type { TopRepoEntry, TopRepos } from '../../src/types.js';
import type { RepoSummary } from '../sources/github.js';

// PRD-03. Three sorts × slice(0,3).
export function buildTopRepos(
  repos: RepoSummary[],
  recent30: Map<string, number>,
): TopRepos {
  const toEntry = (r: RepoSummary, value: number): TopRepoEntry => ({
    id: r.name,
    name: r.name,
    value,
    lang: r.language ?? 'Unknown',
    desc: (r.description ?? '').trim(),
  });

  const starred = [...repos]
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 3)
    .map((r) => toEntry(r, r.stars));

  const active30 = [...repos]
    .map((r) => ({ r, c: recent30.get(r.name) ?? 0 }))
    .filter((x) => x.c > 0)
    .sort((a, b) => b.c - a.c)
    .slice(0, 3)
    .map(({ r, c }) => toEntry(r, c));

  const forked = [...repos]
    .filter((r) => r.forks > 0)
    .sort((a, b) => b.forks - a.forks)
    .slice(0, 3)
    .map((r) => toEntry(r, r.forks));

  return { starred, active30, forked };
}
