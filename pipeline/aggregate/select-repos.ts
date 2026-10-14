import type { RepoSummary } from '../sources/github.js';

export const PLAN_LIMITS = { free: 1, paid: 12 } as const;

export interface SelectReposOpts {
  maxProjects?: number;
  allowlist?: string[];
}

export function selectRepos(
  repos: RepoSummary[],
  opts: SelectReposOpts,
): { selected: RepoSummary[]; lockedCount: number } {
  const { maxProjects, allowlist } = opts;

  let ordered: RepoSummary[];
  if (allowlist) {
    const byName = new Map<string, RepoSummary>();
    for (const r of repos) {
      const key = r.name.toLowerCase();
      if (!byName.has(key)) byName.set(key, r);
    }
    const seen = new Set<string>();
    ordered = [];
    for (const entry of allowlist) {
      const key = entry.toLowerCase();
      const r = byName.get(key);
      if (!r || seen.has(key)) continue;
      seen.add(key);
      ordered.push(r);
    }
  } else {
    ordered = [...repos].sort(
      (a, b) =>
        Number(a.archived) - Number(b.archived) ||
        b.stars - a.stars ||
        Date.parse(b.pushedAt) - Date.parse(a.pushedAt),
    );
  }

  const selected =
    maxProjects === undefined ? ordered : ordered.slice(0, Math.max(0, maxProjects));
  return { selected, lockedCount: repos.length - selected.length };
}
