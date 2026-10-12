import { LOGIN_RE } from './tenant.js';

const NON_LANDING_HOSTS = new Set(['stanislavbg.github.io', 'localhost', '127.0.0.1']);

export const exampleLogins: readonly string[] = ['StanislavBG', 'torvalds', 'gaearon'];

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
