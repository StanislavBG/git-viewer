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
}
