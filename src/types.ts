// Data contract between the local pipeline (`pnpm sync`) and the dashboard.
// Pipeline writes one of these into public/data.json; dashboard reads it once
// at boot via the GitData context.

export interface Developer {
  name: string;
  handle: string;
  role: string;
  location: string;
  bio: string;
  email: string;
  joined: string;
  pronouns?: string;
  avatarUrl?: string;
}

export type ProjectStatus = 'active' | 'maintenance' | 'experimental' | 'archived';

export interface Project {
  id: string;
  name: string;
  lang: string;
  desc: string;
  stars: number;
  hue: number;
  recent: number;
  status: ProjectStatus;
  isAI: boolean;          // sorted to the bottom of the project grid
  pushedAt?: string;      // ISO; primary sort key (most-recent first)
}

export interface HeatmapDayProject {
  id: string;
  name: string;
  count: number;
  hue: number;
}

export interface HeatmapDay {
  // ISO date string (YYYY-MM-DD). Dates after "today" carry count = -1.
  date: string;
  count: number;
  projects: HeatmapDayProject[];
}

export interface Language {
  name: string;
  pct: number;
  // CSS color (oklch / hex / etc).
  color: string;
}

export interface CommitTheme {
  label: string;
  count: number;
  hint: string;
}

export interface RecentCommit {
  sha: string;
  project: string;
  msg: string;
  when: string;
  add: number;
  del: number;
}

export interface ProjectDetail {
  heatmap: HeatmapDay[];
  contributors: number;
  branches: number;
  openIssues: number;
  pullRequests: number;
  primaryLang: string;
  secondary: string[];
  license: string;
  readme: string;
  commits: RecentCommit[];
  // PRD-05. Optional: only present when the pipeline could fetch the tree
  // (skipped in skinny mode).
  tree?: FileNode;
}

export interface FocusItem {
  label: string;
  weight: number;
  projects: string[];
}

export interface Pipeline {
  lastRun: string;
  duration: string;
  status: 'ok' | 'partial' | 'error';
  scanned: number;
  newCommits: number;
  upstream: 'local' | 'ci';
  // ISO timestamp of when the pipeline emitted this file.
  emittedAt: string;
}

// PRD-01.
export interface Headline {
  totalCommits: number;
  totalStars: number;
  totalPRs: number | null;
  totalIssues: number | null;
  followers: number;
  following: number;
  contributedTo: number | null;
  publicRepos: number;
  privateRepos: number | null;
}

// PRD-02.
export interface Streaks {
  current: number;
  longest: number;
  longestRange: [string, string] | null;
  totalActiveDays: number;
}

// PRD-03.
export interface TopRepoEntry {
  id: string;
  name: string;
  value: number;
  lang: string;
  desc: string;
}
export interface TopRepos {
  starred: TopRepoEntry[];
  active30: TopRepoEntry[];
  forked: TopRepoEntry[];
}

// PRD-07.
export interface ProductiveTime {
  matrix: number[][]; // 7 rows (Sun..Sat) × 24 cols (00..23)
  tz: string;
}

// PRD-04. Tier numerals: 0 = locked.
export type AchievementId =
  | 'pull-shark'
  | 'starstruck'
  | 'galaxy-brain'
  | 'pair-extraordinaire'
  | 'public-sponsor';
export interface Achievement {
  id: AchievementId;
  label: string;
  glyph: string;
  tier: 0 | 1 | 2 | 3 | 4 | 5;
  value: number;
  next?: number;
}

// PRD-05. Per-project file tree, capped at depth 4 in the pipeline.
export interface FileNode {
  name: string;
  path: string;
  size: number;     // bytes
  loc?: number;     // approx LOC = size/40
  lang?: string;    // by extension
  children?: FileNode[];
}

// PRD v3.2-projects. Heuristic per-repo summary (no LLM).
export interface ProjectSummary {
  tldr: string;
  vibe: string;
  grades: {
    architecture: number;
    docs: number;
    tests: number;
    performance: number;
    complexity: number;
  };
  useCases: string[];
  strengths: string[];
  risks: string[];
  keyFiles: string[];
  contributorsNote: string;
  similar: string[];
}

// PRD v3.2-activity. Funny / interesting cross-repo stats.
export interface CommitWord {
  word: string;
  n: number;
  hint?: string;
}
export interface Curiosity {
  stat: string;
  label: string;
  detail: string;
}
export interface FileExt {
  ext: string;
  bytes: number;
  files: number;
  color: string;
}
export interface HotFile {
  path: string;
  project: string;
  touches: number;
  last: string;
}
export interface Award {
  icon: string;
  title: string;
  detail: string;
}
export interface ActivityStats {
  commitWords: CommitWord[];
  curiosities: Curiosity[];
  hourDOW: number[][];   // 7 rows × 24 cols
  fileExts: FileExt[];
  velocity: number[];    // 52 weeks
  hotFiles: HotFile[];
  awards: Award[];
}

// PRD v3.2-writing.
export interface Essay {
  id: string;
  title: string;
  deck: string;
  date: string;
  read: number;
  tag: string;
  words: number;
  year: number;
}
export interface FeaturedEssay extends Essay {
  publishedAt: string;
  tags: string[];
  excerpt: string;
  pulls: string[];
  relatedProjects: string[];
}
export interface NowReading { title: string; author: string; since: string; }
export interface NowWriting { title: string; words: number; target: number; progress: number; }
export interface NowState {
  reading: NowReading[];
  writing: NowWriting | null;
  thinking: string[];
}

// PRD-06.
export type ActivityType =
  | 'pr_opened'
  | 'pr_merged'
  | 'issue_opened'
  | 'issue_closed'
  | 'release'
  | 'starred'
  | 'forked'
  | 'created_repo';
export interface ActivityEvent {
  type: ActivityType;
  repo: string;     // "owner/name"
  title: string;
  url?: string;
  ts: string;       // ISO
}

export interface GitData {
  developer: Developer;
  projects: Project[];
  heatmap: HeatmapDay[];
  totalCommitsYear: number;
  last30: HeatmapDay[];
  commits30: number;
  activeDays30: number;
  languages30: Language[];
  hours30: number[];
  themes30: CommitTheme[];
  recentCommits: RecentCommit[];
  projectDetails: Record<string, ProjectDetail>;
  focus30: FocusItem[];
  pipeline: Pipeline;
  headline: Headline;
  streaks: Streaks;
  topRepos: TopRepos;
  productiveTime: ProductiveTime;
  achievements: Achievement[];
  activity: ActivityEvent[];
  aiSummaries: Record<string, ProjectSummary>;
  activityStats: ActivityStats;
  essays: Essay[];
  essaysFeatured: FeaturedEssay | null;
  now: NowState | null;
}
