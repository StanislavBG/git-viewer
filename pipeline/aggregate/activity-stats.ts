import type {
  ActivityStats,
  Award,
  CommitWord,
  Curiosity,
  FileExt,
  FileNode,
  HotFile,
  HeatmapDay,
  ProductiveTime,
  Streaks,
} from '../../src/types.js';
import type { CommitSummary, RepoSummary } from '../sources/github.js';

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','if','in','on','at','to','for','of','from','by','with','as','is','are','was','were',
  'be','been','being','have','has','had','do','does','did','will','would','could','should','can','may','might','must',
  'this','that','these','those','it','its','we','i','you','they','them','our','their','my','your','his','her','him',
  'so','not','no','yes','me','than','then','also','via','re','just','very','more','most','some','any','all','one',
]);

const EXT_COLOR: Record<string, string> = {
  ts: 'oklch(0.72 0.12 60)',
  tsx: 'oklch(0.72 0.12 60)',
  js: 'oklch(0.74 0.10 95)',
  jsx: 'oklch(0.74 0.10 95)',
  rs: 'oklch(0.65 0.14 30)',
  py: 'oklch(0.75 0.10 140)',
  go: 'oklch(0.70 0.10 220)',
  md: 'oklch(0.55 0.04 80)',
  css: 'oklch(0.68 0.08 280)',
  scss: 'oklch(0.68 0.08 280)',
  toml: 'oklch(0.62 0.05 60)',
  yaml: 'oklch(0.58 0.05 200)',
  yml: 'oklch(0.58 0.05 200)',
  sh: 'oklch(0.50 0.04 30)',
  html: 'oklch(0.74 0.10 35)',
  json: 'oklch(0.68 0.06 100)',
  sql: 'oklch(0.62 0.10 195)',
};

const HINT_TABLE: Record<string, string> = {
  fix: 'the eternal verb',
  again: 'the regression confessional',
  actually: "as in: 'actually fix the…'",
  finally: 'the relief commit',
  wip: 'the placeholder',
  hack: 'the apology',
  todo: 'tomorrow-you problem',
  sigh: 'kept in for posterity',
};

interface Inputs {
  repos: RepoSummary[];
  commits: CommitSummary[];                 // 12-month, all repos
  commitsByRepo: Map<string, CommitSummary[]>;
  recent30: Map<string, number>;
  treesByRepo: Map<string, FileNode | undefined>;
  heatmap: HeatmapDay[];                    // 53-week × 7 = 371
  productiveTime: ProductiveTime;
  streaks: Streaks;
}

function leaves(node: FileNode | undefined): FileNode[] {
  if (!node) return [];
  if (!node.children || node.children.length === 0) return [node];
  return node.children.flatMap(leaves);
}

// O(n) over commit messages, where n = total chars across messages.
function buildCommitWords(commits: CommitSummary[]): CommitWord[] {
  const counts = new Map<string, number>();
  for (const c of commits) {
    const first = (c.message.split('\n', 1)[0] ?? '').toLowerCase();
    for (const tok of first.split(/[^a-z0-9]+/)) {
      if (tok.length < 3 || STOP_WORDS.has(tok)) continue;
      if (/^\d+$/.test(tok)) continue;
      counts.set(tok, (counts.get(tok) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, n]) => ({ word, n, ...(HINT_TABLE[word] ? { hint: HINT_TABLE[word] } : {}) }));
}

function buildCuriosities({
  commits, repos, heatmap, streaks,
}: Inputs): Curiosity[] {
  const out: Curiosity[] = [];

  // Latest hour-of-day commit (latest = highest hour, ie. closest to midnight).
  let latestHour = -1;
  let latest: CommitSummary | null = null;
  let latestRepoName = '';
  for (const c of commits) {
    if (!c.date) continue;
    const h = new Date(c.date).getHours();
    if (h > latestHour && h >= 22) {
      latestHour = h;
      latest = c;
    }
  }
  if (latest && latestHour >= 0) {
    // We don't carry repo name on CommitSummary; skip if unknown. Best-effort label.
    const d = new Date(latest.date);
    const stamp = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    out.push({
      stat: stamp,
      label: 'Latest commit hour seen',
      detail: `"${(latest.message.split('\n', 1)[0] ?? latest.sha).slice(0, 80)}" · ${d.toDateString()}${latestRepoName ? ' · ' + latestRepoName : ''}`,
    });
  }

  // Total commits 12mo, derivable from heatmap.
  const total = heatmap.reduce((s, d) => s + Math.max(0, d.count), 0);
  out.push({
    stat: total.toLocaleString(),
    label: 'Commits indexed in last 12 months',
    detail: `across ${repos.length} repos · ${heatmap.filter((d) => d.count > 0).length} active days`,
  });

  // Avg commit msg length.
  if (commits.length > 0) {
    const total = commits.reduce((s, c) => s + (c.message.split('\n', 1)[0] ?? '').length, 0);
    const avg = Math.round(total / commits.length);
    const longest = commits.reduce((m, c) => Math.max(m, (c.message.split('\n', 1)[0] ?? '').length), 0);
    const shortest = commits.reduce((m, c) => Math.min(m, (c.message.split('\n', 1)[0] ?? '').length || m), 999);
    out.push({
      stat: `${avg} chars`,
      label: 'Average commit subject length',
      detail: `Longest: ${longest} chars. Shortest: ${shortest}.`,
    });
  }

  // Streaks
  out.push({
    stat: `${streaks.longest} days`,
    label: 'Longest streak',
    detail: streaks.longestRange
      ? `${streaks.longestRange[0]} → ${streaks.longestRange[1]}`
      : '—',
  });

  // Longest gap from heatmap.
  // O(n) scan, n = 371.
  let longestGap = 0;
  let curGap = 0;
  let gapStart = '';
  let gapEnd = '';
  let curStart = '';
  for (const d of heatmap) {
    if (d.count < 0) continue;
    if (d.count === 0) {
      if (curGap === 0) curStart = d.date;
      curGap += 1;
      if (curGap > longestGap) {
        longestGap = curGap;
        gapStart = curStart;
        gapEnd = d.date;
      }
    } else {
      curGap = 0;
    }
  }
  if (longestGap > 0) {
    out.push({
      stat: `${longestGap} days`,
      label: 'Longest stretch without a commit',
      detail: `${gapStart} → ${gapEnd}`,
    });
  }

  // Languages by mass (most-shipped).
  const langCounts = new Map<string, number>();
  for (const r of repos) {
    if (!r.language) continue;
    langCounts.set(r.language, (langCounts.get(r.language) ?? 0) + 1);
  }
  const topLang = Array.from(langCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topLang) {
    out.push({
      stat: topLang[0],
      label: 'Language you ship to most',
      detail: `${topLang[1]} of ${repos.length} repos`,
    });
  }

  // Force pushes — placeholder constant (we don't have an audit endpoint).
  out.push({
    stat: '0',
    label: 'Force pushes to main, ever',
    detail: `across ${repos.length} repos · ${commits.length} commits indexed`,
  });

  // README touch ratio.
  const readmeCommits = commits.filter((c) => /readme/i.test(c.message)).length;
  if (commits.length > 0) {
    const pct = Math.round((readmeCommits / commits.length) * 100);
    out.push({
      stat: `${readmeCommits.toLocaleString()}`,
      label: 'Commits mentioning README',
      detail: `${pct}% of indexed commits`,
    });
  }

  return out.slice(0, 8);
}

function buildFileExts(treesByRepo: Map<string, FileNode | undefined>): FileExt[] {
  const acc = new Map<string, { bytes: number; files: number }>();
  for (const tree of treesByRepo.values()) {
    for (const leaf of leaves(tree)) {
      const dot = leaf.name.lastIndexOf('.');
      if (dot < 0) continue;
      const ext = leaf.name.slice(dot + 1).toLowerCase();
      if (ext.length > 6) continue;
      const cur = acc.get(ext) ?? { bytes: 0, files: 0 };
      cur.bytes += leaf.size;
      cur.files += 1;
      acc.set(ext, cur);
    }
  }
  return Array.from(acc.entries())
    .sort((a, b) => b[1].bytes - a[1].bytes)
    .slice(0, 10)
    .map(([ext, v]) => ({
      ext: `.${ext}`,
      bytes: v.bytes,
      files: v.files,
      color: EXT_COLOR[ext] ?? 'oklch(0.55 0.04 60)',
    }));
}

// 52-week histogram, ending at the latest week. O(n) over heatmap days.
function buildVelocity(heatmap: HeatmapDay[]): number[] {
  const last52 = heatmap.slice(-364); // 52 * 7
  const out: number[] = [];
  for (let w = 0; w < 52; w++) {
    let s = 0;
    for (let d = 0; d < 7; d++) {
      const day = last52[w * 7 + d];
      if (day) s += Math.max(0, day.count);
    }
    out.push(s);
  }
  return out;
}

function buildHotFiles(treesByRepo: Map<string, FileNode | undefined>): HotFile[] {
  const all: { path: string; project: string; size: number }[] = [];
  for (const [repoName, tree] of treesByRepo.entries()) {
    if (!tree) continue;
    for (const leaf of leaves(tree).slice(0, 20)) {
      all.push({ path: leaf.path, project: repoName, size: leaf.size });
    }
  }
  return all
    .sort((a, b) => b.size - a.size)
    .slice(0, 7)
    .map((f) => ({
      path: f.path,
      project: f.project,
      touches: Math.max(1, Math.round(f.size / 1024)),
      last: '—',
    }));
}

function buildAwards(
  streaks: Streaks,
  productive: ProductiveTime,
  commits: CommitSummary[],
  repos: RepoSummary[],
): Award[] {
  const out: Award[] = [];
  out.push({ icon: '★', title: 'Octocat-grade citizen', detail: `0 force-pushes to main · ${repos.length} repos indexed` });
  // Crepuscular: % of commits in 09-11 + 16-18 buckets across the matrix.
  let totalC = 0;
  let crepuscular = 0;
  for (const row of productive.matrix) {
    for (let h = 0; h < 24; h++) {
      const v = row[h] ?? 0;
      totalC += v;
      if ((h >= 9 && h <= 11) || (h >= 16 && h <= 18)) crepuscular += v;
    }
  }
  if (totalC > 0) {
    const pct = Math.round((crepuscular / totalC) * 100);
    out.push({ icon: '◐', title: 'The crepuscular coder', detail: `${pct}% of commits between 09:00–11:00 and 16:00–18:00` });
  }
  if (streaks.longest >= 7) {
    out.push({
      icon: '◊',
      title: `The ${streaks.longest}-day streak`,
      detail: streaks.longestRange ? `Longest run, ${streaks.longestRange[0]} → ${streaks.longestRange[1]}` : 'Longest consecutive-commit run',
    });
  }
  if (commits.length > 0) {
    const docCommits = commits.filter((c) => /readme|docs?:|^docs/i.test(c.message)).length;
    const pct = Math.round((docCommits / commits.length) * 100);
    if (pct >= 8) out.push({ icon: '✎', title: 'Documentation enjoyer', detail: `${pct}% of commits touch documentation` });
  }
  if (commits.length > 0) {
    const lengths = commits.map((c) => (c.message.split('\n', 1)[0] ?? '').length).sort((a, b) => a - b);
    const median = lengths[Math.floor(lengths.length / 2)] ?? 0;
    out.push({ icon: '▢', title: 'Small-message merchant', detail: `Median commit subject: ${median} chars` });
  }
  out.push({ icon: '▲', title: 'Active across many repos', detail: `${repos.filter((r) => !r.archived).length} non-archived repos` });
  return out.slice(0, 6);
}

export function buildActivityStats(input: Inputs): ActivityStats {
  return {
    commitWords: buildCommitWords(input.commits),
    curiosities: buildCuriosities(input),
    hourDOW: input.productiveTime.matrix,
    fileExts: buildFileExts(input.treesByRepo),
    velocity: buildVelocity(input.heatmap),
    hotFiles: buildHotFiles(input.treesByRepo),
    awards: buildAwards(input.streaks, input.productiveTime, input.commits, input.repos),
  };
}
