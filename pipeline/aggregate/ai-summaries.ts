import type { ProjectSummary, FileNode, ProjectStatus } from '../../src/types.js';
import type { CommitSummary, RepoSummary } from '../sources/github.js';

interface Inputs {
  repos: RepoSummary[];
  commitsByRepo: Map<string, CommitSummary[]>;
  recent30: Map<string, number>;
  treesByRepo: Map<string, FileNode | undefined>;
  statusByRepo: Map<string, ProjectStatus>;
}

const SKIP_DIR = /(^|\/)(node_modules|dist|build|vendor|\.git|\.cache|coverage|target|\.next)(\/|$)/i;
const TEST_FILE = /(^|\/)(tests?|__tests__|spec)\//i;
const TEST_NAME = /\.(test|spec)\.[a-z]+$/i;

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(x)));
}

function leaves(node: FileNode | undefined): FileNode[] {
  if (!node) return [];
  if (!node.children || node.children.length === 0) return [node];
  return node.children.flatMap(leaves);
}

function ageMonths(pushedAt: string | undefined, repos: RepoSummary[]): number {
  if (!pushedAt) return 6;
  const ms = Date.now() - new Date(pushedAt).getTime();
  const months = ms / (1000 * 60 * 60 * 24 * 30);
  // Soft floor at 1 month so brand-new repos still grade.
  return Math.max(1, months);
  void repos;
}

function buildTLDR(repo: RepoSummary): string {
  const desc = (repo.description ?? '').trim();
  const topics = repo.topics.slice(0, 3).join(', ');
  if (desc.length >= 80) return desc;
  if (desc && topics) return `${desc} Tagged ${topics}.`;
  if (desc) return desc;
  if (topics) return `A ${repo.language ?? 'small'} project tagged ${topics}.`;
  return `A small ${repo.language ?? ''} project. The repo's description is empty — read the README.`.trim();
}

function buildVibe(repo: RepoSummary, status: ProjectStatus): string {
  const lang = repo.language ?? '—';
  const map: Record<ProjectStatus, string[]> = {
    active:        ['Pragmatic · In flight',     'Library-grade · Well-typed', 'Quietly opinionated · Local-first'],
    maintenance:   ['Mature · Low-churn',        'Fixes-only · Stable API',    'Battle-tested · Sleeping'],
    experimental:  ['Experimental · In flux',    'Sketchy · Curious',          'Playground · Throwaway-friendly'],
    archived:      ['Frozen · Read-only',        'Archived · Reference',       'Done · Unmaintained'],
  };
  const i = (repo.name.length + lang.length) % 3;
  return `${map[status][i]} · ${lang}`;
}

interface Grades {
  architecture: number;
  docs: number;
  tests: number;
  performance: number;
  complexity: number;
}

function gradeArchitecture(repo: RepoSummary): number {
  // Stars (log-scaled) + topic count + age.
  const stars = Math.log2(repo.stars + 2) * 10; // 0..~70
  const topics = Math.min(20, repo.topics.length * 4);
  const archived = repo.archived ? -10 : 0;
  return clamp(45 + stars * 0.5 + topics + archived, 30, 95);
}

function gradeDocs(repo: RepoSummary, tree: FileNode | undefined): number {
  // Topic count + presence of docs/ + readme by name in tree.
  const ls = leaves(tree);
  const hasDocsDir = ls.some((f) => /^docs\//i.test(f.path));
  const hasReadme = ls.some((f) => /(^|\/)readme\.md$/i.test(f.path));
  let s = 50 + repo.topics.length * 3;
  if (hasReadme) s += 10;
  if (hasDocsDir) s += 15;
  if ((repo.description ?? '').length > 40) s += 5;
  return clamp(s, 30, 95);
}

function gradeTests(tree: FileNode | undefined): number {
  if (!tree) return 50;
  const ls = leaves(tree);
  const testFiles = ls.filter((f) => TEST_FILE.test(f.path) || TEST_NAME.test(f.path)).length;
  if (testFiles === 0) return 35;
  if (testFiles < 5) return 55;
  if (testFiles < 20) return 75;
  return 88;
}

function gradePerformance(repo: RepoSummary, themes: number): number {
  // Defaults to 60. Bonus for systems-language and for `perf` themes.
  let s = 60;
  const fast = ['Rust', 'Go', 'C', 'C++', 'Zig'];
  if (repo.language && fast.includes(repo.language)) s += 12;
  if (themes >= 3) s += 10;
  return clamp(s, 30, 95);
}

function gradeComplexity(tree: FileNode | undefined): number {
  // Inverted: smaller score = simpler. We report as-is so higher = simpler.
  if (!tree) return 60;
  const ls = leaves(tree);
  const fileCount = ls.length;
  if (fileCount < 20) return 85;
  if (fileCount < 80) return 70;
  if (fileCount < 200) return 55;
  return 40;
}

function buildUseCases(repo: RepoSummary): string[] {
  const lang = repo.language ?? 'this language';
  const topic = repo.topics[0];
  const out: string[] = [];
  if (topic) out.push(`Drop-in for ${topic} workflows`);
  out.push(`Reference for ${lang} solo projects`);
  out.push(`Internal tooling with low operational overhead`);
  return out.slice(0, 3);
}

function buildStrengthsRisks(
  repo: RepoSummary,
  status: ProjectStatus,
  recent30: number,
  testsScore: number,
  hasReadme: boolean,
): { strengths: string[]; risks: string[] } {
  const strengths: string[] = [];
  const risks: string[] = [];
  if (recent30 >= 5) strengths.push('Active maintainership');
  if (testsScore >= 75) strengths.push('Test coverage signal looks healthy');
  if (hasReadme) strengths.push('Has a README at the root');
  if (repo.license) strengths.push(`Licensed (${repo.license})`);
  if (repo.topics.length >= 3) strengths.push('Tagged with topics for discoverability');

  if (status === 'archived') risks.push('Archived — no further updates expected');
  if (testsScore < 50) risks.push('No test suite detected');
  if (!hasReadme) risks.push('No root README — onboarding will be slow');
  if (!repo.license) risks.push('No license — reuse is legally ambiguous');
  if (repo.openIssues > 30) risks.push(`${repo.openIssues} open issues`);

  if (strengths.length === 0) strengths.push('Readable codebase');
  if (risks.length === 0) risks.push('Limited platform coverage');
  return { strengths: strengths.slice(0, 3), risks: risks.slice(0, 2) };
}

function buildKeyFiles(tree: FileNode | undefined): string[] {
  if (!tree) return [];
  const files = leaves(tree)
    .filter((f) => f.size > 0 && !SKIP_DIR.test(f.path))
    .sort((a, b) => b.size - a.size)
    .slice(0, 3)
    .map((f) => f.path);
  return files;
}

function buildContributorsNote(status: ProjectStatus): string {
  if (status === 'active') return 'Active. Issues triaged regularly.';
  if (status === 'maintenance') return 'Maintenance mode. Fixes welcome, features unlikely.';
  if (status === 'archived') return 'Archived. Read-only.';
  return 'Experimental. Public for transparency.';
}

function buildSimilar(repo: RepoSummary, all: RepoSummary[], recent30: Map<string, number>): string[] {
  return all
    .filter((q) => q.language === repo.language && q.name !== repo.name && !q.archived)
    .map((q) => ({ name: q.name, recent: recent30.get(q.name) ?? 0 }))
    .sort((a, b) => b.recent - a.recent)
    .slice(0, 2)
    .map((q) => q.name);
}

export function buildAISummaries({
  repos, commitsByRepo, recent30, treesByRepo, statusByRepo,
}: Inputs): Record<string, ProjectSummary> {
  const out: Record<string, ProjectSummary> = {};
  for (const repo of repos) {
    const status = statusByRepo.get(repo.name) ?? 'experimental';
    const tree = treesByRepo.get(repo.name);
    const commits = commitsByRepo.get(repo.name) ?? [];
    const perfThemes = commits.filter((c) => /^perf(\(|:)/i.test(c.message.split('\n', 1)[0] ?? '')).length;
    const ls = leaves(tree);
    const hasReadme = ls.some((f) => /(^|\/)readme\.md$/i.test(f.path));

    const grades: Grades = {
      architecture: gradeArchitecture(repo),
      docs: gradeDocs(repo, tree),
      tests: gradeTests(tree),
      performance: gradePerformance(repo, perfThemes),
      complexity: gradeComplexity(tree),
    };
    const sr = buildStrengthsRisks(repo, status, recent30.get(repo.name) ?? 0, grades.tests, hasReadme);

    out[repo.name] = {
      tldr: buildTLDR(repo),
      vibe: buildVibe(repo, status),
      grades,
      useCases: buildUseCases(repo),
      strengths: sr.strengths,
      risks: sr.risks,
      keyFiles: buildKeyFiles(tree),
      contributorsNote: buildContributorsNote(status),
      similar: buildSimilar(repo, repos, recent30),
    };
    void ageMonths(repo.pushedAt, repos);
  }
  return out;
}
