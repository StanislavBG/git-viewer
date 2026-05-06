import { useGitData } from '../data/loader';
import type { Achievement } from '../types';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

function tierColor(tier: number): string {
  return `var(--heat-${Math.min(4, Math.max(1, tier))})`;
}

function Badge({ a }: { a: Achievement }) {
  const tip = a.next != null
    ? `${a.value.toLocaleString()} / next tier at ${a.next.toLocaleString()}`
    : `${a.value.toLocaleString()} (max tier)`;
  return (
    <div className="ach-badge" title={`${a.label}: ${tip}`}>
      <span className="ach-glyph">{a.glyph}</span>
      <span className="ach-name">{a.label}</span>
      <span className="ach-tier">{ROMAN[a.tier] ?? ''}</span>
      <span className="ach-dot" style={{ background: tierColor(a.tier) }} />
    </div>
  );
}

export function Achievements() {
  const { achievements } = useGitData();
  if (!achievements || achievements.length === 0) return null;
  return (
    <div className="ach-row">
      {achievements.map((a) => <Badge key={a.id} a={a} />)}
    </div>
  );
}
