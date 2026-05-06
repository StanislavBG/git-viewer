import type { Achievement, AchievementId } from '../../src/types.js';
import type { CommitSummary, RepoSummary } from '../sources/github.js';

interface Spec {
  id: AchievementId;
  label: string;
  glyph: string;
  // Ascending thresholds. tier = number of thresholds the value clears.
  tiers: number[];
}

const SPECS: Spec[] = [
  { id: 'pull-shark',          label: 'Pull Shark',          glyph: '🦈', tiers: [2, 16, 128, 1024, 4096] },
  { id: 'starstruck',          label: 'Starstruck',          glyph: '⭐', tiers: [16, 128, 512, 4096, 16384] },
  { id: 'galaxy-brain',        label: 'Galaxy Brain',        glyph: '🧠', tiers: [2, 8, 16, 32, 64] },
  { id: 'pair-extraordinaire', label: 'Pair Extraordinaire', glyph: '🤝', tiers: [1, 10, 24, 48] },
  { id: 'public-sponsor',      label: 'Public Sponsor',      glyph: '💛', tiers: [1] },
];

function build(spec: Spec, value: number): Achievement {
  let tier: 0 | 1 | 2 | 3 | 4 | 5 = 0;
  for (let i = 0; i < spec.tiers.length; i++) {
    if (value >= spec.tiers[i]!) tier = (i + 1) as 1 | 2 | 3 | 4 | 5;
  }
  const next = tier < spec.tiers.length ? spec.tiers[tier] : undefined;
  return { id: spec.id, label: spec.label, glyph: spec.glyph, tier, value, next };
}

function specOf(id: AchievementId): Spec {
  const s = SPECS.find((x) => x.id === id);
  if (!s) throw new Error(`unknown achievement ${id}`);
  return s;
}

interface Inputs {
  repos: RepoSummary[];
  commits: CommitSummary[];
  counters: { mergedPRsTotal: number; sponsoringTotal: number; discussionsAnswered: number } | null;
}

export function buildAchievements({ repos, commits, counters }: Inputs): Achievement[] {
  const maxStars = repos.reduce((m, r) => (r.stars > m ? r.stars : m), 0);
  const coAuthored = commits.filter((c) => /\nCo-authored-by:/i.test(c.message)).length;

  const out: Achievement[] = [
    build(specOf('starstruck'), maxStars),
    build(specOf('pair-extraordinaire'), coAuthored),
  ];
  if (counters) {
    out.push(
      build(specOf('pull-shark'), counters.mergedPRsTotal),
      build(specOf('galaxy-brain'), counters.discussionsAnswered),
      build(specOf('public-sponsor'), counters.sponsoringTotal),
    );
  }
  // Order: tier desc, value desc.
  return out
    .filter((a) => a.tier > 0)
    .sort((a, b) => (b.tier - a.tier) || (b.value - a.value));
}
