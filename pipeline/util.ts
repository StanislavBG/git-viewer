// Format a delta from `then` to `now` as a compact relative string.
export function relativeWhen(then: Date, now: Date = new Date()): string {
  const ms = now.getTime() - then.getTime();
  const sec = Math.max(1, Math.floor(ms / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo`;
  return `${Math.floor(day / 365)}y`;
}

export function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  return `${min}m ${String(remSec).padStart(2, '0')}s`;
}

// Deterministic hue from a string (0-359).
export function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

const LANG_HUES: Record<string, number> = {
  TypeScript: 60,
  JavaScript: 95,
  Python: 142,
  Rust: 14,
  Go: 220,
  Swift: 28,
  C: 200,
  'C++': 280,
  'C#': 290,
  Ruby: 25,
  Elixir: 305,
  Haskell: 280,
  Shell: 130,
  HTML: 35,
  CSS: 270,
};

export function hueForLanguage(lang: string | null): number {
  if (!lang) return 220;
  return LANG_HUES[lang] ?? hueFromString(lang);
}
