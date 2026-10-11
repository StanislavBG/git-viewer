import pLimit from 'p-limit';

import { GitHubSource, MAX_COMMIT_PAGES, type CommitSummary, type RepoSummary } from './sources/github.js';
import { fetchContributionCalendar, fetchAchievementCounters } from './sources/github-graphql.js';
import { buildHeatmap } from './aggregate/heatmap.js';
import { aggregateLanguages } from './aggregate/languages.js';
import { buildHoursHistogram } from './aggregate/hours.js';
import { buildThemes } from './aggregate/themes.js';
import { buildFocus } from './aggregate/focus.js';
import { buildDeveloper } from './aggregate/developer.js';
import { buildStreaks } from './aggregate/streaks.js';
import { buildTopRepos } from './aggregate/top-repos.js';
import { buildProductiveTime } from './aggregate/productive-time.js';
import { buildHeadline, fetchViewerStats } from './aggregate/headline.js';
import { buildActivity } from './aggregate/activity.js';
import { buildAchievements } from './aggregate/achievements.js';
import { buildTreemap } from './aggregate/treemap.js';
import { buildAISummaries } from './aggregate/ai-summaries.js';
import { buildActivityStats } from './aggregate/activity-stats.js';
import { selectRepos } from './aggregate/select-repos.js';
import { buildWritingFromFiles, type WritingOutput } from './aggregate/writing.js';
import { hueForLanguage, relativeWhen, formatDuration } from './util.js';
import { isAIProject, projectSort } from '../src/util/classify.js';
import type {
  FileNode,
  GitData,
  Project,
  ProjectDetail,
  ProjectStatus,
  RecentCommit,
} from '../src/types.js';


export type PortfolioSource = Pick<
  GitHubSource,
  | 'fetchUser'
  | 'fetchRepos'
  | 'fetchCommits'
  | 'fetchLanguages'
  | 'fetchCommitDetail'
  | 'fetchReadme'
  | 'fetchTree'
  | 'fetchPublicEvents'
  | 'fetchMarkdownDir'
>;

export interface PortfolioOptions {
  user: string;
  token?: string;
  displayName?: string;
  displayRole?: string;
  maxProjects?: number;
  maxCommitPagesPerRepo?: number;
  allowlist?: string[];
  writing?: WritingOutput | 'none' | 'profile-repo';
  log?: (msg: string) => void;
  source?: PortfolioSource;
}

const SCAN_DAYS = 372;
const RECENT_FEED_SIZE = 10;

function classifyStatus(repo: RepoSummary, recent30: number): ProjectStatus {
  if (repo.archived) return 'archived';
  if (recent30 >= 5) return 'active';
  if (recent30 >= 1) return 'maintenance';
  // No recent commits but also not archived: treat low-star as experimental,
  // higher-star as maintenance.
  return repo.stars >= 50 ? 'maintenance' : 'experimental';
}

function projectFromRepo(repo: RepoSummary, recent30: number): Project {
  return {
    id: repo.name,
    name: repo.name,
    lang: repo.language ?? 'Unknown',
    desc: (repo.description ?? '').trim(),
    stars: repo.stars,
    hue: hueForLanguage(repo.language),
    recent: recent30,
    status: classifyStatus(repo, recent30),
    isAI: isAIProject(repo.name, repo.description ?? '', repo.topics),
    pushedAt: repo.pushedAt,
  };
}

interface RepoBundle {
  repo: RepoSummary;
  commits: CommitSummary[];
  languages: Record<string, number>;
}

async function fetchRepoBundle(
  src: PortfolioSource,
  owner: string,
  repo: RepoSummary,
  sinceIso: string,
  maxPages: number,
): Promise<RepoBundle> {
  const [commits, languages] = await Promise.all([
    src.fetchCommits(owner, repo.name, sinceIso, owner, maxPages),
    src.fetchLanguages(owner, repo.name),
  ]);
  return { repo, commits, languages };
}

function topRepoIdsByRecent(
  bundles: RepoBundle[],
  recent30Counts: Map<string, number>,
  n: number,
): Set<string> {
  const ranked = [...bundles]
    .map((b) => ({ id: b.repo.name, score: recent30Counts.get(b.repo.name) ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .filter((x) => x.score > 0)
    .slice(0, n)
    .map((x) => x.id);
  return new Set(ranked);
}


export async function buildPortfolio(
  opts: PortfolioOptions,
): Promise<{ data: GitData; lockedCount: number }> {
  const t0 = Date.now();
  const cfg = { user: opts.user, token: opts.token, displayName: opts.displayName, displayRole: opts.displayRole };
  const log = opts.log ?? (() => {});
  log(`syncing GitHub portfolio for ${cfg.user}…`);

  const src = opts.source ?? new GitHubSource(cfg.token);

  // Cheap probe: how much rate-budget do we have? Without a PAT GitHub gives
  // 60/hr — for a 50-repo portfolio that's tight. We fall back to "skinny mode"
  // (no per-commit diff stats, no per-repo READMEs) below 200 remaining.
  let rateBudget = 0;
  try {
    const rateRes = await fetch(
      'https://api.github.com/rate_limit',
      cfg.token ? { headers: { Authorization: `Bearer ${cfg.token}` } } : undefined,
    );
    if (rateRes.ok) {
      rateBudget = ((await rateRes.json()) as { resources: { core: { remaining: number } } })
        .resources.core.remaining;
    }
  } catch {
    rateBudget = 0;
  }
  const skinny = rateBudget < 200;
  if (!cfg.token) {
    log(
      `  (no GITHUB_TOKEN — running unauthenticated, ${rateBudget} req/h remaining; set a PAT to lift the cap)`,
    );
  }
  if (skinny) {
    log(`  (skinny mode: skipping per-commit diffs and READMEs to fit in ${rateBudget} reqs)`);
  }
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - SCAN_DAYS);
  const sinceIso = since.toISOString();

  const [rawUser, allRepos] = await Promise.all([
    src.fetchUser(cfg.user),
    src.fetchRepos(cfg.user),
  ]);
  log(`  ${allRepos.length} non-fork repos`);
  const { selected: repos, lockedCount } = selectRepos(allRepos, {
    maxProjects: opts.maxProjects,
    allowlist: opts.allowlist,
  });

  const limit = pLimit(5);
  const bundles = await Promise.all(
    repos.map((r) => limit(() => fetchRepoBundle(src, cfg.user, r, sinceIso, opts.maxCommitPagesPerRepo ?? MAX_COMMIT_PAGES))),
  );

  // Aggregate all 12-month commits into a flat array for cross-cutting summaries.
  const yearAgo = new Date();
  yearAgo.setUTCDate(yearAgo.getUTCDate() - 371);
  const last30Cutoff = new Date();
  last30Cutoff.setUTCDate(last30Cutoff.getUTCDate() - 30);

  const allCommits: { batch: RepoBundle; commit: CommitSummary }[] = [];
  for (const b of bundles) {
    for (const c of b.commits) {
      if (!c.date) continue;
      const d = new Date(c.date);
      if (d >= yearAgo) allCommits.push({ batch: b, commit: c });
    }
  }
  log(`  ${allCommits.length} commits in last 12 months`);

  // Last-30 commits only.
  const last30Commits = allCommits.filter(
    (x) => new Date(x.commit.date) >= last30Cutoff,
  );

  // Per-repo recent-30 count.
  const recent30Counts = new Map<string, number>();
  for (const x of last30Commits) {
    recent30Counts.set(x.batch.repo.name, (recent30Counts.get(x.batch.repo.name) ?? 0) + 1);
  }

  // Build Project[]: non-AI first, then most-recently-pushed.
  const projects: Project[] = bundles
    .map((b) => projectFromRepo(b.repo, recent30Counts.get(b.repo.name) ?? 0))
    .sort(projectSort);

  // Heatmap (cross-project).
  const heatmap = buildHeatmap(
    bundles.map((b) => ({
      repoId: b.repo.name,
      repoName: b.repo.name,
      hue: hueForLanguage(b.repo.language),
      commits: b.commits,
    })),
  );

  // GraphQL enrichment: when authenticated, override per-day totals with the
  // numbers GitHub's own profile shows. REST /commits sees only the commits we
  // authored to repos we own; GraphQL contributionsCollection also counts
  // private contribs, PR reviews, and issues. The per-project breakdown comes
  // from REST and may sum to less than the GraphQL total for that day — that's
  // expected and accurate.
  const nowDate = new Date();
  const calFrom = new Date(nowDate);
  calFrom.setUTCDate(calFrom.getUTCDate() - 371);
  const calendar = await fetchContributionCalendar(
    cfg.user,
    cfg.token,
    calFrom.toISOString(),
    nowDate.toISOString(),
  );
  if (calendar) {
    const calMap = new Map(calendar.days.map((d) => [d.date, d.contributionCount]));
    for (const day of heatmap) {
      if (day.count < 0) continue;
      const cal = calMap.get(day.date);
      if (cal != null && cal > day.count) day.count = cal;
    }
    log(`  graphql: ${calendar.totalContributions} total contribs from contributionsCollection`);
  }

  const totalCommitsYear = heatmap.reduce((s, d) => s + Math.max(0, d.count), 0);
  const last30 = heatmap.slice(-30);
  const commits30 = last30.reduce((s, d) => s + Math.max(0, d.count), 0);
  const activeDays30 = last30.filter((d) => d.count > 0).length;

  // Languages, hours, themes — use the broader 12-month window.
  const repoBytes = new Map<string, Map<string, number>>();
  for (const b of bundles) repoBytes.set(b.repo.name, new Map(Object.entries(b.languages)));
  const languages30 = aggregateLanguages(repoBytes);
  const hours30 = buildHoursHistogram(last30Commits.map((x) => x.commit));
  const themes30 = buildThemes(last30Commits.map((x) => x.commit));

  // Focus: top repos by 30-day volume.
  const focus30 = buildFocus(
    bundles.map((b) => ({
      id: b.repo.name,
      description: b.repo.description,
      topics: b.repo.topics,
      recent30: recent30Counts.get(b.repo.name) ?? 0,
    })),
  );

  // Recent commits feed: 10 newest across all repos, with +/- diffs.
  const sortedRecent = [...allCommits].sort(
    (a, b) => new Date(b.commit.date).getTime() - new Date(a.commit.date).getTime(),
  );
  const top10 = sortedRecent.slice(0, RECENT_FEED_SIZE);
  const now = new Date();
  const recentCommits: RecentCommit[] = await Promise.all(
    top10.map((x) =>
      limit(async () => {
        const det = skinny
          ? null
          : await src.fetchCommitDetail(cfg.user, x.batch.repo.name, x.commit.sha);
        return {
          sha: x.commit.sha,
          project: x.batch.repo.name,
          msg: x.commit.message.split('\n', 1)[0] ?? x.commit.sha,
          when: relativeWhen(new Date(x.commit.date), now),
          add: det?.add ?? 0,
          del: det?.del ?? 0,
        };
      }),
    ),
  );

  // PRD-05: fetch repo trees only for the top-N most-active repos to bound
  // the API budget — one call per repo. Skinny mode skips entirely.
  const treemapTargets = skinny
    ? new Set<string>()
    : topRepoIdsByRecent(bundles, recent30Counts, 12);

  // Project details — per-project heatmap + 5 most recent commits.
  const projectDetails: Record<string, ProjectDetail> = {};
  await Promise.all(
    bundles.map((b) =>
      limit(async () => {
        const phMap = buildHeatmap([
          {
            repoId: b.repo.name,
            repoName: b.repo.name,
            hue: hueForLanguage(b.repo.language),
            commits: b.commits,
          },
        ]);
        const recent5 = [...b.commits]
          .sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime())
          .slice(0, 5);
        const readme = skinny ? '' : (await src.fetchReadme(cfg.user, b.repo.name)) ?? '';
        const tree = treemapTargets.has(b.repo.name)
          ? buildTreemap(
              b.repo.name,
              await src.fetchTree(cfg.user, b.repo.name, b.repo.defaultBranch),
            )
          : undefined;
        projectDetails[b.repo.name] = {
          heatmap: phMap,
          contributors: 1,
          branches: 1,
          openIssues: b.repo.openIssues,
          pullRequests: 0,
          primaryLang: b.repo.language ?? 'Unknown',
          secondary: Object.keys(b.languages).slice(1, 4),
          license: b.repo.license ?? '—',
          readme: readme.slice(0, 1200),
          commits: recent5.map((c) => ({
            sha: c.sha,
            project: b.repo.name,
            msg: c.message.split('\n', 1)[0] ?? c.sha,
            when: relativeWhen(new Date(c.date), now),
            add: 0,
            del: 0,
          })),
          ...(tree ? { tree } : {}),
        };
      }),
    ),
  );

  const developer = buildDeveloper(rawUser, cfg.displayName, cfg.displayRole);

  // PRD-02 streaks (from heatmap)
  const streaks = buildStreaks(heatmap);
  // PRD-03 top repos
  const topRepos = buildTopRepos(repos, recent30Counts);
  // PRD-07 productive-time (12-month, runner-local TZ)
  const productiveTime = buildProductiveTime(allCommits.map((x) => x.commit));
  // PRD-01 headline stats (one extra GraphQL call when authed)
  const viewerStats = await fetchViewerStats(cfg.user, cfg.token);
  const headline = buildHeadline(rawUser, repos, totalCommitsYear, viewerStats);

  // PRD-04 achievements (one GraphQL call when authed; REST-derivable parts always run)
  const counters = await fetchAchievementCounters(cfg.user, cfg.token);
  const achievements = buildAchievements({
    repos,
    commits: allCommits.map((x) => x.commit),
    counters,
  });
  // PRD-06 cross-repo activity feed (public events, no auth required)
  const activity = buildActivity(await src.fetchPublicEvents(cfg.user));

  // v3.2 — Projects / Activity / Writing tabs
  const commitsByRepo = new Map(bundles.map((b) => [b.repo.name, b.commits]));
  const treesByRepo = new Map<string, FileNode | undefined>(
    Object.entries(projectDetails).map(([id, det]) => [id, det.tree]),
  );
  const statusByRepo = new Map(projects.map((p) => [p.id, p.status]));
  const readmeByRepo = new Map(Object.entries(projectDetails).map(([k, v]) => [k, v.readme]));
  const aiSummaries = buildAISummaries({
    repos,
    commitsByRepo,
    recent30: recent30Counts,
    treesByRepo,
    statusByRepo,
    readmeByRepo,
  });
  const activityStats = buildActivityStats({
    repos,
    commits: allCommits.map((x) => x.commit),
    commitsByRepo,
    recent30: recent30Counts,
    treesByRepo,
    heatmap,
    productiveTime,
    streaks,
  });
  const emptyWriting: WritingOutput = { essays: [], essaysFeatured: null, now: null };
  let writing: WritingOutput;
  if (opts.writing === 'profile-repo') {
    writing = skinny
      ? emptyWriting
      : buildWritingFromFiles(await src.fetchMarkdownDir(cfg.user, cfg.user, 'writing'));
  } else if (opts.writing === undefined || opts.writing === 'none') {
    writing = emptyWriting;
  } else {
    writing = opts.writing;
  }

  const elapsedMs = Date.now() - t0;

  const out: GitData = {
    developer,
    projects,
    heatmap,
    totalCommitsYear,
    last30,
    commits30,
    activeDays30,
    languages30,
    hours30,
    themes30,
    recentCommits,
    projectDetails,
    focus30,
    pipeline: {
      lastRun: relativeWhen(new Date(now.getTime() - 1000), now),
      duration: formatDuration(elapsedMs),
      status: 'ok',
      scanned: bundles.length,
      newCommits: last30Commits.length,
      upstream: process.env.CI ? 'ci' : 'local',
      emittedAt: now.toISOString(),
    },
    headline,
    streaks,
    topRepos,
    productiveTime,
    achievements,
    activity,
    aiSummaries,
    activityStats,
    essays: writing.essays,
    essaysFeatured: writing.essaysFeatured,
    now: writing.now,
  };

  return { data: out, lockedCount };
}
