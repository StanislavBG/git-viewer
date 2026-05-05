// Generates public/data.sample.json (and seeds public/data.json) from the
// design fixture. Run once at scaffolding time:
//   tsx scripts/build-sample.ts
// Forkers running `pnpm dev` before `pnpm sync` see this fixture so the
// dashboard renders out of the box.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  GitData,
  HeatmapDay,
  Headline,
  Project,
  ProjectDetail,
  ProjectStatus,
  ProductiveTime,
  Streaks,
  TopRepos,
} from '../src/types.js';
import { isAIProject, projectSort } from '../src/util/classify.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

const developer = {
  name: 'Bilko Bibitkov',
  handle: 'bilko',
  role: 'Systems & ML engineer',
  location: 'Sofia · Berlin',
  bio:
    'Builds local-first data tools and quiet ops infrastructure. Currently obsessed with offline-first pipelines and small models that earn their keep.',
  email: 'bilko@bibitkov.dev',
  joined: '2014',
  pronouns: 'he/him',
};

interface SeedRow {
  id: string; name: string; lang: string; desc: string;
  stars: number; hue: number; recent: number; status: ProjectStatus;
  // Synthesized so the seed sort matches what the real pipeline emits.
  pushedDaysAgo: number;
}

const seedRows: SeedRow[] = [
  { id: 'gitoverview',    name: 'gitoverview',    lang: 'TypeScript', desc: 'Local-first repo scanner + portfolio renderer.',          stars: 412,  hue: 28,  recent: 184, status: 'active',       pushedDaysAgo: 0 },
  { id: 'carrier-pigeon', name: 'carrier-pigeon', lang: 'Rust',       desc: 'Mesh sync for offline field devices.',                    stars: 1820, hue: 14,  recent: 96,  status: 'active',       pushedDaysAgo: 1 },
  { id: 'lichen',         name: 'lichen',         lang: 'Python',     desc: 'Slow, careful ML training scheduler.',                    stars: 638,  hue: 142, recent: 71,  status: 'active',       pushedDaysAgo: 2 },
  { id: 'tideline',       name: 'tideline',       lang: 'Go',         desc: 'Time-series store for embedded sensors.',                 stars: 244,  hue: 220, recent: 38,  status: 'active',       pushedDaysAgo: 3 },
  { id: 'millrace',       name: 'millrace',       lang: 'Rust',       desc: 'Streaming ETL for log lakes.',                            stars: 91,   hue: 14,  recent: 22,  status: 'maintenance',  pushedDaysAgo: 14 },
  { id: 'paper-radio',    name: 'paper-radio',    lang: 'Swift',      desc: 'Read-only RSS in a notebook UI.',                         stars: 67,   hue: 28,  recent: 14,  status: 'active',       pushedDaysAgo: 5 },
  { id: 'kiln',           name: 'kiln',           lang: 'TypeScript', desc: 'Build-cache server with content addressing.',             stars: 309,  hue: 28,  recent: 41,  status: 'active',       pushedDaysAgo: 4 },
  { id: 'shorebird',      name: 'shorebird',      lang: 'Python',     desc: 'Migration framework for Postgres at scale.',              stars: 178,  hue: 142, recent: 19,  status: 'maintenance',  pushedDaysAgo: 28 },
  { id: 'mottle',         name: 'mottle',         lang: 'Elixir',     desc: 'Live collaborative whiteboard CRDTs.',                    stars: 54,   hue: 305, recent: 8,   status: 'experimental', pushedDaysAgo: 21 },
  { id: 'drift',          name: 'drift',          lang: 'Go',         desc: 'DNS exfiltration detector.',                              stars: 421,  hue: 220, recent: 28,  status: 'active',       pushedDaysAgo: 6 },
  { id: 'anvil-notes',    name: 'anvil-notes',    lang: 'TypeScript', desc: 'Plain-text knowledge graph.',                             stars: 1102, hue: 28,  recent: 53,  status: 'active',       pushedDaysAgo: 7 },
  { id: 'owl-tools',      name: 'owl-tools',      lang: 'Rust',       desc: 'CLI multitool for night-shift ops.',                     stars: 88,   hue: 14,  recent: 7,   status: 'maintenance',  pushedDaysAgo: 35 },
  { id: 'verglas',        name: 'verglas',        lang: 'C',          desc: 'Tiny embedded crypto for cold devices.',                  stars: 33,   hue: 200, recent: 5,   status: 'experimental', pushedDaysAgo: 47 },
  { id: 'ferment',        name: 'ferment',        lang: 'Python',     desc: 'Synthetic dataset generator for tabular ML.',             stars: 156,  hue: 142, recent: 17,  status: 'active',       pushedDaysAgo: 9 },
  { id: 'cooper',         name: 'cooper',         lang: 'TypeScript', desc: 'Component library for terminals-on-the-web.',             stars: 222,  hue: 28,  recent: 12,  status: 'maintenance',  pushedDaysAgo: 18 },
  { id: 'bristlecone',    name: 'bristlecone',    lang: 'Haskell',    desc: 'Long-lived task queues for batch jobs.',                  stars: 47,   hue: 280, recent: 3,   status: 'experimental', pushedDaysAgo: 60 },
  { id: 'polder',         name: 'polder',         lang: 'Go',         desc: 'Lightweight VPN for home labs.',                          stars: 612,  hue: 220, recent: 24,  status: 'active',       pushedDaysAgo: 8 },
  { id: 'grist-mill',     name: 'grist-mill',     lang: 'Rust',       desc: 'Code search across personal monorepos.',                  stars: 73,   hue: 14,  recent: 11,  status: 'active',       pushedDaysAgo: 12 },
  { id: 'longhand',       name: 'longhand',       lang: 'TypeScript', desc: 'Handwriting-first journaling app.',                       stars: 198,  hue: 28,  recent: 9,   status: 'maintenance',  pushedDaysAgo: 25 },
  { id: 'siskin',         name: 'siskin',         lang: 'Python',     desc: 'Bird-call classifier — small models, real audio.',        stars: 84,   hue: 142, recent: 6,   status: 'experimental', pushedDaysAgo: 40 },
];

const seedToday = new Date('2026-05-03T12:00:00Z').getTime();
const projects: Project[] = seedRows
  .map((r) => {
    const pushedAt = new Date(seedToday - r.pushedDaysAgo * 86400_000).toISOString();
    return {
      id: r.id, name: r.name, lang: r.lang, desc: r.desc,
      stars: r.stars, hue: r.hue, recent: r.recent, status: r.status,
      isAI: isAIProject(r.name, r.desc, []),
      pushedAt,
    };
  })
  .sort(projectSort);

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateHeatmap(seed: number, projectFilter: Project | null = null): HeatmapDay[] {
  const rand = mulberry32(seed);
  const days: HeatmapDay[] = [];
  const today = new Date('2026-05-03T00:00:00Z');
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 371);
  while (start.getUTCDay() !== 0) start.setUTCDate(start.getUTCDate() + 1);

  for (let i = 0; i < 371; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const dateStr = d.toISOString().slice(0, 10);

    if (d > today) {
      days.push({ date: dateStr, count: -1, projects: [] });
      continue;
    }

    const dow = d.getUTCDay();
    const weekendFactor = dow === 0 || dow === 6 ? 0.4 : 1.0;
    const week = Math.floor(i / 7);
    const sprintWave = 0.5 + 0.5 * Math.sin((week / 6) * Math.PI);
    const recencyBoost = i > 280 ? 1.4 : i > 200 ? 1.1 : 0.85;

    let base = rand() * 12 * weekendFactor * sprintWave * recencyBoost;
    if (rand() < 0.18) base = 0;
    if (rand() < 0.04) base *= 3.5;
    const count = Math.round(base);

    const dayProjects: HeatmapDay['projects'] = [];
    if (count > 0) {
      const numProjects = Math.min(count, 1 + Math.floor(rand() * 3));
      const pool = projectFilter ? [projectFilter] : projects.slice(0, 12);
      let remaining = count;
      for (let p = 0; p < numProjects; p++) {
        const proj = pool[Math.floor(rand() * pool.length)];
        const c =
          p === numProjects - 1 ? remaining : Math.ceil(remaining * (0.3 + rand() * 0.5));
        dayProjects.push({ id: proj.id, name: proj.name, count: c, hue: proj.hue });
        remaining -= c;
        if (remaining <= 0) break;
      }
    }

    days.push({ date: dateStr, count, projects: dayProjects });
  }
  return days;
}

const heatmap = generateHeatmap(7);
const totalCommitsYear = heatmap.reduce((s, d) => s + Math.max(0, d.count), 0);
const last30 = heatmap.slice(-30);
const commits30 = last30.reduce((s, d) => s + Math.max(0, d.count), 0);
const activeDays30 = last30.filter((d) => d.count > 0).length;

const projectDetails: Record<string, ProjectDetail> = {};
projects.forEach((p, idx) => {
  const ph = generateHeatmap(idx + 100, p);
  projectDetails[p.id] = {
    heatmap: ph,
    contributors: 1 + Math.floor(p.stars / 200),
    branches: 2 + (idx % 5),
    openIssues: Math.floor(p.recent / 8),
    pullRequests: Math.floor(p.recent / 12),
    primaryLang: p.lang,
    secondary: ['Markdown', 'Shell', 'TOML'].slice(0, 2 + (idx % 2)),
    license: ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'MPL-2.0'][idx % 4]!,
    readme: `# ${p.name}\n\n${p.desc}\n\nMaintained by Bilko since 20${14 + (idx % 10)}.`,
    commits: [
      { sha: '0000000', msg: `feat: ${p.name} initial public surface`, when: `${1 + idx}d`, add: 200 + idx * 7, del: idx * 3, project: p.id },
      { sha: '0000001', msg: `fix: edge case in ${p.lang.toLowerCase()} adapter`, when: `${2 + idx}d`, add: 14, del: 8, project: p.id },
      { sha: '0000002', msg: 'refactor: rename internal types', when: `${3 + idx}d`, add: 41, del: 39, project: p.id },
      { sha: '0000003', msg: 'docs: add architecture notes', when: `${5 + idx}d`, add: 124, del: 0, project: p.id },
      { sha: '0000004', msg: 'chore: dep bumps', when: `${7 + idx}d`, add: 6, del: 6, project: p.id },
    ],
  };
});

// PRD-02 streaks from the deterministic heatmap.
function computeStreaks(days: HeatmapDay[]): Streaks {
  const past = days.filter((d) => d.count >= 0);
  let longest = 0;
  let cur = 0;
  let curStart = '';
  let lStart = '';
  let lEnd = '';
  for (const d of past) {
    if (d.count > 0) {
      if (cur === 0) curStart = d.date;
      cur += 1;
      if (cur > longest) {
        longest = cur;
        lStart = curStart;
        lEnd = d.date;
      }
    } else {
      cur = 0;
    }
  }
  let current = 0;
  for (let i = past.length - 1; i >= 0; i--) {
    if (past[i].count > 0) current += 1;
    else if (i === past.length - 1) continue;
    else break;
  }
  return {
    current,
    longest,
    longestRange: longest > 0 ? [lStart, lEnd] : null,
    totalActiveDays: past.filter((d) => d.count > 0).length,
  };
}

const streaks = computeStreaks(heatmap);

// PRD-03 top repos from the project list.
const topRepos: TopRepos = {
  starred: [...projects]
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 3)
    .map((p) => ({ id: p.id, name: p.name, value: p.stars, lang: p.lang, desc: p.desc })),
  active30: [...projects]
    .filter((p) => p.recent > 0)
    .sort((a, b) => b.recent - a.recent)
    .slice(0, 3)
    .map((p) => ({ id: p.id, name: p.name, value: p.recent, lang: p.lang, desc: p.desc })),
  forked: [...projects]
    .slice(0, 3)
    .map((p, i) => ({ id: p.id, name: p.name, value: 80 - i * 22, lang: p.lang, desc: p.desc })),
};

// PRD-07 productive-time fixture (Mon-Fri peaks at 10 and 16).
const productiveTime: ProductiveTime = (() => {
  const matrix: number[][] = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  for (let dow = 1; dow <= 5; dow++) {
    for (let h = 8; h <= 19; h++) {
      const hourFactor = h === 10 || h === 16 ? 1.4 : 1;
      matrix[dow][h] = Math.round((6 + (h - 8)) * hourFactor);
    }
  }
  for (let h = 10; h <= 14; h++) matrix[0][h] = Math.round(2 + Math.random() * 3);
  for (let h = 10; h <= 14; h++) matrix[6][h] = Math.round(2 + Math.random() * 3);
  return { matrix, tz: 'Europe/Sofia' };
})();

// PRD-01 headline (synthetic).
const headline: Headline = {
  totalCommits: totalCommitsYear,
  totalStars: projects.reduce((s, p) => s + p.stars, 0),
  totalPRs: 318,
  totalIssues: 142,
  followers: 256,
  following: 89,
  contributedTo: 47,
  publicRepos: projects.length,
  privateRepos: 12,
};

const data: GitData = {
  developer,
  projects,
  heatmap,
  totalCommitsYear,
  last30,
  commits30,
  activeDays30,
  languages30: [
    { name: 'TypeScript', pct: 38, color: 'oklch(0.72 0.12 60)' },
    { name: 'Rust',       pct: 24, color: 'oklch(0.65 0.14 30)' },
    { name: 'Python',     pct: 18, color: 'oklch(0.75 0.10 140)' },
    { name: 'Go',         pct: 12, color: 'oklch(0.70 0.10 220)' },
    { name: 'Other',      pct: 8,  color: 'oklch(0.55 0.02 80)' },
  ],
  hours30: [0, 0, 0, 0, 0, 1, 3, 8, 14, 22, 31, 28, 19, 12, 18, 26, 33, 29, 21, 14, 9, 6, 3, 1],
  themes30: [
    { label: 'feat',     count: 42, hint: 'new capability' },
    { label: 'fix',      count: 31, hint: 'bug or regression' },
    { label: 'refactor', count: 18, hint: 'no behavior change' },
    { label: 'perf',     count: 9,  hint: 'speed / memory' },
    { label: 'docs',     count: 14, hint: 'writing' },
    { label: 'test',     count: 11, hint: 'coverage' },
    { label: 'chore',    count: 7,  hint: 'deps, infra' },
  ],
  recentCommits: [
    { sha: 'a3f9c21', project: 'gitoverview',    msg: 'feat(scanner): incremental rev-walk with checkpointing', when: '2h', add: 184, del: 22 },
    { sha: '7b2e814', project: 'carrier-pigeon', msg: 'fix(mesh): handle clock drift on join',                  when: '6h', add: 41,  del: 18 },
    { sha: 'c91fa05', project: 'lichen',         msg: 'perf(train): batch prefetch reduces stall by 38%',       when: '1d', add: 92,  del: 67 },
    { sha: 'e44d70b', project: 'kiln',           msg: 'refactor(cache): split eviction policy into trait',      when: '1d', add: 256, del: 311 },
    { sha: 'f01c8a3', project: 'tideline',       msg: 'feat(query): time-bucket aggregation',                   when: '2d', add: 128, del: 14 },
    { sha: 'b8e2911', project: 'anvil-notes',    msg: 'docs: revise the architecture chapter',                  when: '2d', add: 412, del: 198 },
    { sha: 'd72f4cc', project: 'drift',          msg: 'fix: false positives on .arpa lookups',                  when: '3d', add: 27,  del: 9 },
    { sha: '1a93e8d', project: 'ferment',        msg: 'feat: copula-based correlation preservation',            when: '3d', add: 178, del: 12 },
    { sha: '5c12fab', project: 'polder',         msg: 'chore: bump wireguard-go to v0.0.20260311',              when: '4d', add: 4,   del: 4 },
    { sha: '9e8a2d4', project: 'gitoverview',    msg: 'feat(ui): radial heatmap variant',                       when: '4d', add: 312, del: 41 },
  ],
  projectDetails,
  focus30: [
    { label: 'Local-first scanning', weight: 38, projects: ['gitoverview', 'grist-mill'] },
    { label: 'Mesh & sync',          weight: 22, projects: ['carrier-pigeon', 'polder'] },
    { label: 'Training infra',       weight: 18, projects: ['lichen', 'ferment', 'siskin'] },
    { label: 'Time-series storage',  weight: 12, projects: ['tideline', 'millrace'] },
    { label: 'Docs & writing',       weight: 10, projects: ['anvil-notes'] },
  ],
  pipeline: {
    lastRun: '12 minutes ago',
    duration: '4m 18s',
    status: 'ok',
    scanned: projects.length,
    newCommits: 3,
    upstream: 'local',
    emittedAt: new Date().toISOString(),
  },
  headline,
  streaks,
  topRepos,
  productiveTime,
};

mkdirSync(join(root, 'public'), { recursive: true });
writeFileSync(join(root, 'public', 'data.sample.json'), JSON.stringify(data, null, 2));
writeFileSync(join(root, 'public', 'data.json'), JSON.stringify(data, null, 2));

const _unused: ProjectStatus = 'active';
void _unused;

console.log(
  `wrote public/data.sample.json + public/data.json (${projects.length} projects, ${heatmap.length} days, ${totalCommitsYear} commits)`,
);
