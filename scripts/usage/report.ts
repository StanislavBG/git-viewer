import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import {
  buildRealVisitors,
  classifySession,
  pacificDay,
  rollupByDay,
  stripEmails,
  unmatchedBuilds,
  type BurrowReply,
  type ProfileRow,
  type Section,
  type TimelineItem,
  type UsageReport,
  type UsageSession,
} from './aggregate.js';
import { renderMarkdown } from './render.js';

const run = promisify(execFile);

const DAY_MS = 86_400_000;
const MAX_DAYS = 30;
const FETCH_TIMEOUT_MS = 20_000;
const TIMELINE_CAP = 50;
const TIMELINE_CONCURRENCY = 5;
const YEARLY_PRICE = 'price_1UUDkTR6w0VtQRLTdMok0qzl';
const MONTHLY_PRICE = 'price_1UPDEjR6w0VtQRLT1SKNJ3T1';
const PRICES = { [YEARLY_PRICE]: 'yearly', [MONTHLY_PRICE]: 'monthly' } as const;

export function parseUsageArgs(argv: string[]): { days: number; out: string } {
  let days = MAX_DAYS;
  let out = `.cache/usage/${pacificDay(Date.now())}.json`;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const [flag, inline] = arg.includes('=') ? [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)] : [arg, undefined];
    if (flag !== '--days' && flag !== '--out') continue;
    const value = inline ?? argv[++i];
    if (value === undefined) continue;
    if (flag === '--out') {
      out = value;
    } else {
      const n = Number.parseInt(value, 10);
      days = Number.isNaN(n) ? MAX_DAYS : Math.min(MAX_DAYS, Math.max(1, n));
    }
  }
  return { days, out };
}

function readAdminKey(): string | null {
  const fromEnv = process.env.BILKO_ADMIN_KEY?.trim();
  if (fromEnv) return fromEnv;
  const file = process.env.BILKO_ADMIN_KEY_FILE || join(homedir(), '.config/bilko-host/admin-key');
  try {
    return readFileSync(file, 'utf8').trim() || null;
  } catch {
    return null;
  }
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function settle<T extends object>(work: () => Promise<T>): Promise<Section<T>> {
  try {
    return { ok: true, ...(await work()) };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

function toMs(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const asNumber = Number(value);
    if (value.trim() !== '' && !Number.isNaN(asNumber)) return asNumber;
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

const str = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

type Json = Record<string, any>;

function makeClient(base: string, key: string) {
  return async (path: string, auth = true): Promise<Json> => {
    const res = await fetch(`${base}${path}`, {
      headers: auth ? { Authorization: `Bearer ${key}` } : {},
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
    return (await res.json()) as Json;
  };
}

type Get = ReturnType<typeof makeClient>;

function toProfile(r: Json): ProfileRow {
  return {
    login: String(r.login),
    tier: r.tier === 'paid' ? 'paid' : 'free',
    claimed: Boolean(r.claimed),
    showcase: Boolean(r.showcase),
    builtBy: str(r.builtBy),
    createdAt: str(r.createdAt),
    updatedAt: str(r.updatedAt),
  };
}

async function fetchPortfolios(get: Get) {
  const body = await get('/api/admin/git-viewer/profiles');
  const t = body.totals ?? {};
  return {
    totals: {
      all: num(t.all),
      free: num(t.byTier?.free),
      paid: num(t.byTier?.paid),
      claimed: num(t.claimed),
      byBuiltBy: (t.byBuiltBy ?? {}) as Record<string, number>,
    },
    subscriptions: { active: num(body.subscriptions?.active), total: num(body.subscriptions?.total) },
    rows: ((body.rows ?? []) as Json[]).map(toProfile),
  };
}

function toTimelineItem(t: Json): TimelineItem {
  return {
    ts: toMs(t.ts),
    kind: t.kind,
    path: str(t.path),
    referrer: str(t.referrer),
    name: str(t.name),
    app: str(t.app),
    props: t.props && typeof t.props === 'object' ? (t.props as Record<string, unknown>) : null,
  };
}

function toSession(s: Json): UsageSession {
  return {
    sessionId: String(s.session_id),
    startedAt: toMs(s.started_at),
    endedAt: toMs(s.ended_at),
    mine: Boolean(s.mine),
    bot: Boolean(s.bot),
    country: str(s.country),
    device: str(s.device),
    referrerHost: str(s.referrer_host),
    sourceBucket: str(s.source_bucket),
    timeline: [],
  };
}

async function mapLimited<T>(items: T[], limit: number, work: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await work(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

async function fetchSessions(get: Get, days: number): Promise<{ sessions: UsageSession[]; capped: boolean }> {
  const body = await get(`/api/admin/sessions?app=git-viewer&days=${days}&limit=200&mine=include&bots=include`);
  const sessions = ((body.sessions ?? []) as Json[]).map((s) => stripEmails(toSession(s)));
  const real = sessions.filter((s) => classifySession(s) === 'real');
  const withTimelines = real.slice(0, TIMELINE_CAP);
  await mapLimited(withTimelines, TIMELINE_CONCURRENCY, async (s) => {
    try {
      const detail = await get(`/api/admin/sessions/${encodeURIComponent(s.sessionId)}`);
      s.timeline = stripEmails(((detail.timeline ?? []) as Json[]).map(toTimelineItem));
    } catch (err) {
      process.stderr.write(`usage: timeline ${s.sessionId} unavailable: ${message(err)}\n`);
    }
  });
  return { sessions, capped: real.length > TIMELINE_CAP };
}

async function fetchFlows(get: Get, days: number, realFromSessions: number) {
  const count = async (filter: string) => {
    const body = await get(`/api/admin/flows?app=git-viewer&days=${days}&${filter}`);
    return num(body.apps?.[0]?.sessions);
  };
  const [realSessions, allSessions] = await Promise.all([count('mine=exclude&bots=exclude'), count('mine=include&bots=include')]);
  return { realSessions, allSessions, telemetryOnlyReal: Math.max(0, realSessions - realFromSessions) };
}

export async function fetchTraffic(get: Get, days: number) {
  const body = await get(`/api/admin/traffic?slug=git-viewer&days=${days}&mine=exclude`);
  return {
    humanVisitors: num(body.totals?.visitors),
    humanSingleHit: num(body.quality?.singleHitVisitors),
    byDayUtc: ((body.byDay ?? []) as Json[]).map((d) => ({ date: String(d.date), hits: num(d.hits), visitors: num(d.visitors) })),
  };
}

async function stripeJson(args: string[]): Promise<Json> {
  const { stdout } = await run('stripe', args, { timeout: 60_000, maxBuffer: 20 * 1024 * 1024 });
  return JSON.parse(stdout) as Json;
}

async function fetchStripe(sinceMs: number) {
  const subscriptionsByStatus: Record<string, number> = {};
  for (const price of Object.keys(PRICES)) {
    const body = await stripeJson(['subscriptions', 'list', '--live', '--status', 'all', '--price', price, '--limit', '100']);
    for (const sub of (body.data ?? []) as Json[]) {
      const status = String(sub.status);
      subscriptionsByStatus[status] = (subscriptionsByStatus[status] ?? 0) + 1;
    }
  }
  const sinceSec = Math.floor(sinceMs / 1000);
  const body = await stripeJson([
    'checkout', 'sessions', 'list', '--live', '--limit', '100', '--expand', 'data.line_items', '-d', `created[gte]=${sinceSec}`,
  ]);
  const checkouts: Extract<UsageReport['stripe'], { ok: true }>['checkouts'] = [];
  for (const cs of (body.data ?? []) as Json[]) {
    const priceId = ((cs.line_items?.data ?? []) as Json[])
      .map((li) => str(li.price?.id))
      .find((id): id is keyof typeof PRICES => id !== null && id in PRICES);
    if (!priceId) continue;
    let u: string | null = null;
    try {
      u = new URL(String(cs.success_url)).searchParams.get('u');
    } catch {
      u = null;
    }
    checkouts.push({
      id: String(cs.id),
      createdMs: num(cs.created) * 1000,
      status: String(cs.status),
      paymentStatus: String(cs.payment_status),
      plan: PRICES[priceId],
      u,
    });
  }
  return { subscriptionsByStatus, checkouts };
}

async function fetchPagesRuns(): Promise<{ createdAt: string; conclusion: string | null }[]> {
  const { stdout } = await run(
    'gh',
    ['run', 'list', '--repo', 'StanislavBG/git-viewer', '--workflow', 'pages.yml', '--limit', '7', '--json', 'createdAt,conclusion'],
    { timeout: 60_000 },
  );
  return ((JSON.parse(stdout) ?? []) as Json[]).map((r) => ({ createdAt: String(r.createdAt), conclusion: str(r.conclusion) || null }));
}

const LEADING_HANDLE = /^\s*@(\w+)/;

async function readBurrow(): Promise<BurrowReply[]> {
  const path = process.env.BURROW_X_DB || join(homedir(), 'Projects/burrow/downloads/x-tracker.db');
  if (!existsSync(path)) throw new Error(`burrow DB not found at ${path}`);
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    const rows = db
      .prepare(
        `SELECT p.post_id, p.posted_at, p.text, i.target_author, i.mode, i.lane
         FROM our_posts p
         LEFT JOIN interactions i ON i.reply_tweet_id = p.post_id AND i.action = 'product_reply'
         WHERE p.text LIKE '%git-viewer%'
         ORDER BY p.posted_at`,
      )
      .all() as Json[];
    return rows.map((r) => {
      const text = String(r.text ?? '');
      return {
        postId: String(r.post_id),
        postedAt: Date.parse(String(r.posted_at)),
        text,
        target: str(r.target_author) || (LEADING_HANDLE.exec(text)?.[1] ?? null),
        mode: str(r.mode),
        lane: str(r.lane),
      };
    });
  } finally {
    db.close();
  }
}

async function main(): Promise<void> {
  const { days, out } = parseUsageArgs(process.argv.slice(2));
  const key = readAdminKey();
  if (key === null) {
    process.stderr.write('usage: no admin key — set BILKO_ADMIN_KEY or put the key in BILKO_ADMIN_KEY_FILE (default ~/.config/bilko-host/admin-key)\n');
    process.exit(1);
  }
  const base = (process.env.BILKO_BASE_URL || 'https://bilko.run').replace(/\/+$/, '');
  const get = makeClient(base, key);
  const now = Date.now();
  const sinceMs = now - days * DAY_MS;

  const sessionsP = fetchSessions(get, days).then(
    (v) => ({ ok: true as const, ...v }),
    (err: unknown) => ({ ok: false as const, error: message(err) }),
  );
  const [portfolios, sessionsRes, traffic, stripe, burrowRes, errorsRes, healthRes, pagesRes] = await Promise.all([
    settle(() => fetchPortfolios(get)),
    sessionsP,
    settle(() => fetchTraffic(get, days)),
    settle(() => fetchStripe(sinceMs)),
    settle(async () => ({ replies: await readBurrow() })),
    settle(async () => ({ errors: num((await get(`/api/admin/observability/errors?app=git-viewer&days=${days}&env=prod`)).totals?.errors) })),
    settle(async () => ({ gitViewerOk: Boolean((await get('/api/health', false)).gitViewer?.ok) })),
    settle(async () => ({ runs: await fetchPagesRuns() })),
  ]);

  const sessions = sessionsRes.ok ? sessionsRes.sessions : [];
  const realCount = sessions.filter((s) => classifySession(s) === 'real').length;
  const flows = await settle(() => fetchFlows(get, days, realCount));
  const rows = portfolios.ok ? portfolios.rows : [];
  const replies = burrowRes.ok ? burrowRes.replies : [];
  const checkouts = stripe.ok ? stripe.checkouts : [];
  const realVisitors = buildRealVisitors(sessions, rows, replies);

  const problems: string[] = [];
  if (!errorsRes.ok) problems.push(`errors: ${errorsRes.error}`);
  if (!healthRes.ok) problems.push(`health: ${healthRes.error}`);
  if (!pagesRes.ok) problems.push(`pages runs: ${pagesRes.error}`);

  const report: UsageReport = stripEmails({
    generatedAt: new Date(now).toISOString(),
    window: { days, sinceMs, untilMs: now },
    portfolios,
    sessions: sessionsRes.ok
      ? {
          ok: true,
          total: sessions.length,
          mine: sessions.filter((s) => classifySession(s) === 'mine').length,
          bot: sessions.filter((s) => classifySession(s) === 'bot').length,
          real: realCount,
          timelinesCapped: sessionsRes.capped,
        }
      : sessionsRes,
    flows,
    days: rollupByDay(sessions, checkouts.map((c) => c.createdMs)),
    realVisitors,
    unmatchedBuilds: unmatchedBuilds(rows, realVisitors, sinceMs),
    burrow: burrowRes.ok ? { ok: true, replies: replies.length } : burrowRes,
    stripe,
    traffic,
    health: {
      errors: errorsRes.ok ? errorsRes.errors : null,
      gitViewerOk: healthRes.ok ? healthRes.gitViewerOk : null,
      pagesRuns: pagesRes.ok ? pagesRes.runs : null,
      problems,
    },
  } satisfies UsageReport);

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  const markdown = renderMarkdown(report);
  process.stdout.write(markdown.endsWith('\n') ? markdown : `${markdown}\n`);
  process.stderr.write(`usage: wrote ${out}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err: unknown) => {
    process.stderr.write(`usage: ${message(err)}\n`);
    process.exit(1);
  });
}
