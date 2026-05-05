// Heuristic AI / agent / ML detector. Used by the pipeline (and the seed
// script) to flag projects so they sort to the bottom of the project grid —
// non-AI work surfaces first.

const AI_PATTERNS: RegExp[] = [
  /\b(ai|ml|llm|gpt|rag)\b/i,
  /\bagent\b/i,
  /\b(classifier|classification)\b/i,
  /\b(neural|transformer|embedding|tokeniz)/i,
  /\b(claude|openai|gemini|copilot|anthropic)\b/i,
  /\bmachine[- ]learning\b/i,
  /\bartificial[- ]intelligence\b/i,
  /\bsynthetic dataset\b/i,
  /\binference\b/i,
];

export function isAIProject(
  name: string,
  desc: string,
  topics: string[] = [],
): boolean {
  const haystack = [name, desc, ...topics].join(' ');
  return AI_PATTERNS.some((re) => re.test(haystack));
}

// Sort comparator used after isAI is computed.
// Primary: non-AI before AI.
// Secondary: pushedAt desc (most-recent first) when available, else recent desc.
// Tertiary: stars desc.
export function projectSort<T extends {
  isAI: boolean;
  recent: number;
  stars: number;
  pushedAt?: string;
}>(a: T, b: T): number {
  if (a.isAI !== b.isAI) return a.isAI ? 1 : -1;
  const ap = a.pushedAt ? Date.parse(a.pushedAt) : 0;
  const bp = b.pushedAt ? Date.parse(b.pushedAt) : 0;
  if (ap !== bp) return bp - ap;
  if (a.recent !== b.recent) return b.recent - a.recent;
  return b.stars - a.stars;
}
