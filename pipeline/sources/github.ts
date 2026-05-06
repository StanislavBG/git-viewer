import { Octokit } from '@octokit/rest';

export interface RepoSummary {
  name: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  archived: boolean;
  fork: boolean;
  pushedAt: string;
  defaultBranch: string;
  openIssues: number;
  license: string | null;
  topics: string[];
}

export interface CommitSummary {
  sha: string;
  date: string;
  message: string;
  authorLogin: string | null;
  add?: number;
  del?: number;
}

export interface DeveloperRaw {
  login: string;
  name: string | null;
  bio: string | null;
  location: string | null;
  email: string | null;
  company: string | null;
  blog: string | null;
  avatarUrl: string;
  createdAt: string;
  followers: number;
  following: number;
  publicRepos: number;
}

export class GitHubSource {
  private kit: Octokit;
  constructor(token: string | undefined) {
    this.kit = new Octokit({
      auth: token,
      userAgent: 'git-viewer/0.1.0',
    });
  }

  async fetchUser(login: string): Promise<DeveloperRaw> {
    const { data } = await this.kit.users.getByUsername({ username: login });
    return {
      login: data.login,
      name: data.name,
      bio: data.bio,
      location: data.location,
      email: data.email,
      company: data.company,
      blog: data.blog,
      avatarUrl: data.avatar_url,
      createdAt: data.created_at,
      followers: data.followers ?? 0,
      following: data.following ?? 0,
      publicRepos: data.public_repos ?? 0,
    };
  }

  async fetchRepos(login: string): Promise<RepoSummary[]> {
    const repos = await this.kit.paginate(this.kit.repos.listForUser, {
      username: login,
      per_page: 100,
      type: 'owner',
      sort: 'updated',
    });
    return repos
      .filter((r) => !r.fork)
      .map((r) => ({
        name: r.name,
        description: r.description ?? null,
        stars: r.stargazers_count ?? 0,
        forks: r.forks_count ?? 0,
        language: r.language ?? null,
        archived: r.archived ?? false,
        fork: r.fork,
        pushedAt: r.pushed_at ?? '',
        defaultBranch: r.default_branch ?? 'main',
        openIssues: r.open_issues_count ?? 0,
        license: r.license?.spdx_id ?? null,
        topics: r.topics ?? [],
      }));
  }

  async fetchLanguages(owner: string, repo: string): Promise<Record<string, number>> {
    try {
      const { data } = await this.kit.repos.listLanguages({ owner, repo });
      return data;
    } catch {
      return {};
    }
  }

  async fetchCommits(
    owner: string,
    repo: string,
    sinceIso: string,
    authorLogin: string,
  ): Promise<CommitSummary[]> {
    try {
      const commits = await this.kit.paginate(this.kit.repos.listCommits, {
        owner,
        repo,
        author: authorLogin,
        since: sinceIso,
        per_page: 100,
      });
      return commits.map((c) => ({
        sha: c.sha,
        date: c.commit.author?.date ?? c.commit.committer?.date ?? '',
        message: c.commit.message,
        authorLogin: c.author?.login ?? null,
      }));
    } catch (err) {
      // Empty repo / 409 conflict on commits endpoint is common.
      if (err instanceof Error && /409|empty/i.test(err.message)) return [];
      throw err;
    }
  }

  async fetchCommitDetail(owner: string, repo: string, sha: string): Promise<CommitSummary | null> {
    try {
      const { data } = await this.kit.repos.getCommit({ owner, repo, ref: sha });
      return {
        sha: data.sha,
        date: data.commit.author?.date ?? data.commit.committer?.date ?? '',
        message: data.commit.message,
        authorLogin: data.author?.login ?? null,
        add: data.stats?.additions,
        del: data.stats?.deletions,
      };
    } catch {
      return null;
    }
  }

  async fetchReadme(owner: string, repo: string): Promise<string | null> {
    try {
      const { data } = await this.kit.repos.getReadme({
        owner,
        repo,
        mediaType: { format: 'raw' },
      });
      return data as unknown as string;
    } catch {
      return null;
    }
  }

  // PRD-06. Public events feed: 90-day retention, max 100 per request, no auth
  // required (works under 60/h unauthenticated; the runner token raises that).
  async fetchPublicEvents(login: string): Promise<EventRaw[]> {
    try {
      const { data } = await this.kit.activity.listPublicEventsForUser({
        username: login,
        per_page: 100,
      });
      return data as unknown as EventRaw[];
    } catch {
      return [];
    }
  }

  // PRD-05. Repo tree at HEAD of the default branch. Single recursive call;
  // GitHub truncates after ~7M entries, which we'll never hit.
  async fetchTree(
    owner: string,
    repo: string,
    branch: string,
  ): Promise<TreeEntry[]> {
    try {
      const { data } = await this.kit.git.getTree({
        owner,
        repo,
        tree_sha: branch,
        recursive: 'true',
      });
      return (data.tree ?? [])
        .filter((e): e is TreeEntry => !!e.path && !!e.type)
        .map((e) => ({
          path: e.path as string,
          type: e.type as 'blob' | 'tree',
          size: e.size ?? 0,
        }));
    } catch {
      return [];
    }
  }
}

export interface EventRaw {
  type: string | null;
  repo: { name: string };
  payload: Record<string, unknown>;
  created_at: string | null;
}

export interface TreeEntry {
  path: string;
  type: 'blob' | 'tree';
  size: number;
}
