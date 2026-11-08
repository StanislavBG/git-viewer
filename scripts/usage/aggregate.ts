export const PACIFIC_TZ = 'America/Los_Angeles';

const GIT_VIEWER_APP = 'git-viewer';
const NEW_PAGE = 'portfolio-load.generating';
const PAGE_LOADED = 'portfolio-load.success';
const BUILD_DONE = 'build-portfolio.success';
const CLAIMED = 'claim.success';
const RESUME_STEPS = ['download.click-download', 'download.download-started'];

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: PACIFIC_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const clockFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: PACIFIC_TZ,
  hour: 'numeric',
  minute: '2-digit',
  hourCycle: 'h12',
  timeZoneName: 'short',
});

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((p) => p.type === type)?.value ?? '';
}

// Built from parts, not format(): en-CA's joined pattern has changed between ICU releases.
export function pacificDay(ms: number): string {
  const parts = dayFormat.formatToParts(ms);
  return `${part(parts, 'year')}-${part(parts, 'month')}-${part(parts, 'day')}`;
}

// Joined with plain spaces: newer ICU puts a narrow no-break space before AM/PM.
export function pacificTime(ms: number): string {
  const parts = clockFormat.formatToParts(ms);
  const clock = `${part(parts, 'hour')}:${part(parts, 'minute')} ${part(parts, 'dayPeriod')}`;
  return `${pacificDay(ms)} ${clock} ${part(parts, 'timeZoneName')}`;
}

export type SessionClass = 'mine' | 'bot' | 'real';

export function classifySession(s: { mine: boolean; bot: boolean }): SessionClass {
  if (s.mine) return 'mine';
  if (s.bot) return 'bot';
  return 'real';
}

export interface TimelineItem {
  ts: number;
  kind: 'view' | 'click' | 'event' | 'error';
  path?: string | null;
  referrer?: string | null;
  name?: string | null;
  app?: string | null;
  props?: Record<string, unknown> | null;
}

export interface UsageSession {
  sessionId: string;
  startedAt: number;
  endedAt: number;
  mine: boolean;
  bot: boolean;
  country: string | null;
  device: string | null;
  referrerHost: string | null;
  sourceBucket: string | null;
  timeline: TimelineItem[];
}

function flowStep(item: TimelineItem): string | null {
  if (item.kind !== 'event' || item.app !== GIT_VIEWER_APP) return null;
  const flow = item.props?.flow;
  const step = item.props?.step;
  return typeof flow === 'string' && typeof step === 'string' ? `${flow}.${step}` : null;
}

export function flowSteps(timeline: TimelineItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of timeline) {
    const key = flowStep(item);
    if (key !== null) counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export interface Utm {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
}

const UTM_PARAMS = [
  ['source', 'utm_source'],
  ['medium', 'utm_medium'],
  ['campaign', 'utm_campaign'],
  ['content', 'utm_content'],
] as const;

function utmFromUrl(raw: string | null | undefined): Utm | null {
  if (!raw) return null;
  let params: URLSearchParams;
  try {
    params = new URL(raw, 'https://bilko.run').searchParams;
  } catch {
    return null;
  }
  if (!params.get('utm_source')) return null;
  const utm: Utm = {};
  for (const [field, param] of UTM_PARAMS) {
    const value = params.get(param);
    if (value) utm[field] = value;
  }
  return utm;
}

// "First" by ts rather than array position, so the answer doesn't depend on timeline order.
export function utmFromTimeline(timeline: TimelineItem[]): Utm | null {
  let first: { ts: number; utm: Utm } | null = null;
  for (const item of timeline) {
    if (item.kind !== 'view' || (first !== null && item.ts >= first.ts)) continue;
    const utm = utmFromUrl(item.path) ?? utmFromUrl(item.referrer);
    if (utm) first = { ts: item.ts, utm };
  }
  return first?.utm ?? null;
}

export interface DayRow {
  day: string;
  sessions: number;
  mine: number;
  bot: number;
  real: number;
  newPages: number;
  realBuilds: number;
  claims: number;
  resumeDownloads: number;
  checkouts: number;
}

export function rollupByDay(sessions: UsageSession[], checkoutCreatedMs: number[]): DayRow[] {
  const rows = new Map<string, DayRow>();
  const rowFor = (ms: number): DayRow => {
    const day = pacificDay(ms);
    let row = rows.get(day);
    if (!row) {
      row = { day, sessions: 0, mine: 0, bot: 0, real: 0, newPages: 0, realBuilds: 0, claims: 0, resumeDownloads: 0, checkouts: 0 };
      rows.set(day, row);
    }
    return row;
  };
  for (const s of sessions) {
    const row = rowFor(s.startedAt);
    const cls = classifySession(s);
    row.sessions += 1;
    row[cls] += 1;
    if (cls !== 'real') continue;
    const steps = flowSteps(s.timeline);
    if (steps[NEW_PAGE]) row.newPages += 1;
    if (steps[BUILD_DONE]) row.realBuilds += 1;
    if (steps[CLAIMED]) row.claims += 1;
    if (RESUME_STEPS.some((key) => steps[key])) row.resumeDownloads += 1;
  }
  for (const ms of checkoutCreatedMs) rowFor(ms).checkouts += 1;
  return [...rows.values()].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}

export interface ProfileRow {
  login: string;
  tier: 'free' | 'paid';
  claimed: boolean;
  showcase: boolean;
  builtBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

function builtAtMs(p: ProfileRow): number | null {
  const stamp = p.createdAt ?? p.updatedAt;
  if (stamp === null) return null;
  const ms = Date.parse(stamp);
  return Number.isNaN(ms) ? null : ms;
}

export function matchBuildToProfile(successTs: number, profiles: ProfileRow[], toleranceMs = 120_000): ProfileRow | null {
  let best: ProfileRow | null = null;
  let bestGap = Infinity;
  for (const p of profiles) {
    const builtAt = p.showcase ? null : builtAtMs(p);
    if (builtAt === null) continue;
    const gap = Math.abs(builtAt - successTs);
    if (gap <= toleranceMs && gap < bestGap) {
      best = p;
      bestGap = gap;
    }
  }
  return best;
}

export interface BurrowReply {
  postId: string;
  postedAt: number;
  text: string;
  target: string | null;
  mode: string | null;
  lane: string | null;
}

export function attributeBurrow(sessionStart: number, replies: BurrowReply[], windowMs = 48 * 3_600_000): BurrowReply | null {
  let latest: BurrowReply | null = null;
  for (const r of replies) {
    const age = sessionStart - r.postedAt;
    if (age < 0 || age > windowMs) continue;
    if (latest === null || r.postedAt > latest.postedAt) latest = r;
  }
  return latest;
}

export function portfolioUrl(login: string): string {
  return `https://bilko.run/projects/git-viewer/?u=${encodeURIComponent(login)}`;
}

const EMAIL_KEY = /email/i;
const EMAIL_ADDRESS = /[\w.%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]+/g;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

// Only strings, arrays and plain objects are rebuilt: the report is JSON-shaped.
// Object.fromEntries (not assignment) so a "__proto__" key stays an own property.
function scrubEmails(value: unknown): unknown {
  if (typeof value === 'string') return value.replace(EMAIL_ADDRESS, '[email]');
  if (Array.isArray(value)) return value.map(scrubEmails);
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !EMAIL_KEY.test(key))
      .map(([key, inner]) => [key, scrubEmails(inner)]),
  );
}

export function stripEmails<T>(value: T): T {
  return scrubEmails(value) as T;
}

export interface RealVisitor {
  sessionId: string;
  startedAt: number;
  country: string | null;
  device: string | null;
  referrerHost: string | null;
  utm: Utm | null;
  steps: Record<string, number>;
  login: string | null;
  url: string | null;
  burrow: BurrowReply | null;
}

function lastStepTs(timeline: TimelineItem[], key: string): number | null {
  let last: number | null = null;
  for (const item of timeline) {
    if (flowStep(item) === key && (last === null || item.ts > last)) last = item.ts;
  }
  return last;
}

export function buildRealVisitors(sessions: UsageSession[], profiles: ProfileRow[], replies: BurrowReply[]): RealVisitor[] {
  return sessions
    .filter((s) => classifySession(s) === 'real')
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((s) => {
      const steps = flowSteps(s.timeline);
      const utm = utmFromTimeline(s.timeline);
      // A brand-new page's profile row is written as its first load finishes, so match on that time.
      const loadedAt = steps[NEW_PAGE] ? lastStepTs(s.timeline, PAGE_LOADED) : null;
      const login = loadedAt === null ? null : (matchBuildToProfile(loadedAt, profiles)?.login ?? null);
      const viaBurrow = utm?.source === 'burrow' || s.referrerHost === 't.co';
      return {
        sessionId: s.sessionId,
        startedAt: s.startedAt,
        country: s.country,
        device: s.device,
        referrerHost: s.referrerHost,
        utm,
        steps,
        login,
        url: login === null ? null : portfolioUrl(login),
        burrow: viaBurrow ? attributeBurrow(s.startedAt, replies) : null,
      };
    });
}

export function unmatchedBuilds(profiles: ProfileRow[], visitors: RealVisitor[], sinceMs: number): ProfileRow[] {
  const accountedFor = new Set(visitors.map((v) => v.login));
  return profiles.filter((p) => {
    if (p.showcase || accountedFor.has(p.login)) return false;
    const builtAt = builtAtMs(p);
    return builtAt !== null && builtAt >= sinceMs;
  });
}

export type Section<T> = ({ ok: true } & T) | { ok: false; error: string };

export interface UsageReport {
  generatedAt: string;
  window: { days: number; sinceMs: number; untilMs: number };
  portfolios: Section<{
    totals: { all: number; free: number; paid: number; claimed: number; byBuiltBy: Record<string, number> };
    subscriptions: { active: number; total: number };
    rows: ProfileRow[];
  }>;
  sessions: Section<{ total: number; mine: number; bot: number; real: number; timelinesCapped: boolean }>;
  flows: Section<{ realSessions: number; allSessions: number; telemetryOnlyReal: number }>;
  days: DayRow[];
  realVisitors: RealVisitor[];
  unmatchedBuilds: ProfileRow[];
  burrow: Section<{ replies: number }>;
  stripe: Section<{
    subscriptionsByStatus: Record<string, number>;
    checkouts: {
      id: string;
      createdMs: number;
      status: string;
      paymentStatus: string;
      plan: 'yearly' | 'monthly';
      u: string | null;
    }[];
  }>;
  traffic: Section<{
    humanVisitors: number;
    humanSingleHit: number;
    byDayUtc: { date: string; hits: number; visitors: number }[];
  }>;
  health: {
    errors: number | null;
    gitViewerOk: boolean | null;
    pagesRuns: { createdAt: string; conclusion: string | null }[] | null;
    problems: string[];
  };
}
