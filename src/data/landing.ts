import { LOGIN_RE } from './tenant.js';

const NON_LANDING_HOSTS = new Set(['stanislavbg.github.io', 'localhost', '127.0.0.1']);

export const exampleLogins: readonly string[] = ['BilkoBibitkov', 'torvalds', 'gaearon'];

export interface CommunityPortfolio {
  /** GitHub login; the page lives at ?u=<login>. */
  login: string;
  /** Public GitHub display name, if set. */
  name?: string;
  /** 'YYYY-MM-DD', the Pacific date the portfolio was first built. */
  builtOn: string;
}

// Curated by hand, because any visitor can build any login's page via ?u=; add only people confirmed to have built their own page, newest first.
export const communityPortfolios: readonly CommunityPortfolio[] = [
  { login: 'bidyut10', name: 'Bidyut Kundu', builtOn: '2026-11-07' },
];

export function avatarUrl(login: string, size = 96): string {
  return 'https://avatars.githubusercontent.com/' + encodeURIComponent(login) + '?s=' + size;
}

export function portfolioHref(login: string): string {
  return '?u=' + encodeURIComponent(login);
}

const BUILT_ON_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatBuiltOn(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return isoDate;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return isoDate;
  return BUILT_ON_FORMAT.format(date);
}

export function isLandingMode(hostname: string, search: string): boolean {
  const params = new URLSearchParams(search);
  if (params.get('u')) return false;
  if (params.get('landing') === '1') return true;
  return !NON_LANDING_HOSTS.has(hostname);
}

export function normalizeLoginInput(raw: string): string | null {
  let s = raw.trim();
  const url = /^(?:https?:\/\/)?(?:www\.)?github\.com\//i.exec(s);
  if (url) s = s.slice(url[0].length);
  else if (s.includes('/') || s.includes(':')) return null;
  s = s.replace(/^@/, '');
  const login = s.split('/')[0];
  return LOGIN_RE.test(login) ? login : null;
}
