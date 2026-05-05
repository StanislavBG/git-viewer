import type { Headline } from '../../src/types.js';
import type { DeveloperRaw, RepoSummary } from '../sources/github.js';

// PRD-01. PR/issue/contributedTo counts come from a single GraphQL request
// (requires PAT). Without a token we degrade to nulls for those three; the UI
// renders "—" in their place.

interface ViewerStats {
  pullRequests: number | null;
  issues: number | null;
  contributedTo: number | null;
  privateRepos: number | null;
}

export async function fetchViewerStats(
  user: string,
  token: string | undefined,
): Promise<ViewerStats> {
  if (!token) {
    return { pullRequests: null, issues: null, contributedTo: null, privateRepos: null };
  }
  const query = `query($login: String!) {
    user(login: $login) {
      pullRequests(states: [OPEN, CLOSED, MERGED]) { totalCount }
      issues(states: [OPEN, CLOSED]) { totalCount }
      repositoriesContributedTo(first: 1, includeUserRepositories: false) { totalCount }
      repositories(privacy: PRIVATE) { totalCount }
    }
  }`;
  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'user-agent': 'git-viewer/0.1.0',
      },
      body: JSON.stringify({ query, variables: { login: user } }),
    });
    if (!res.ok) throw new Error(`graphql HTTP ${res.status}`);
    const json = (await res.json()) as {
      data?: {
        user?: {
          pullRequests: { totalCount: number };
          issues: { totalCount: number };
          repositoriesContributedTo: { totalCount: number };
          repositories: { totalCount: number };
        };
      };
    };
    const u = json.data?.user;
    if (!u) throw new Error('no user');
    return {
      pullRequests: u.pullRequests.totalCount,
      issues: u.issues.totalCount,
      contributedTo: u.repositoriesContributedTo.totalCount,
      privateRepos: u.repositories.totalCount,
    };
  } catch {
    return { pullRequests: null, issues: null, contributedTo: null, privateRepos: null };
  }
}

interface UserCounts {
  followers: number;
  following: number;
  publicRepos: number;
}

// public_repos / followers / following are not on the typed DeveloperRaw, so
// the caller passes them in from the original Octokit response.
export function buildHeadline(
  raw: DeveloperRaw & UserCounts,
  repos: RepoSummary[],
  totalCommitsYear: number,
  viewerStats: ViewerStats,
): Headline {
  return {
    totalCommits: totalCommitsYear,
    totalStars: repos.reduce((s, r) => s + r.stars, 0),
    totalPRs: viewerStats.pullRequests,
    totalIssues: viewerStats.issues,
    followers: raw.followers,
    following: raw.following,
    contributedTo: viewerStats.contributedTo,
    publicRepos: raw.publicRepos,
    privateRepos: viewerStats.privateRepos,
  };
}
