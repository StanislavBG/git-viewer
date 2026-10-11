import type { GitData } from '../types';

export const LOGIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

export type TenantResponse =
  | {
      status: 'ready';
      login: string;
      tier: 'free' | 'paid';
      lockedCount: number;
      updatedAt: string;
      data: GitData;
    }
  | { status: 'generating'; retryAfterSec: number }
  | { status: 'not_found' }
  | { status: 'rate_limited'; retryAfterSec: number };

export function parseLogin(search: string): string | null {
  const value = new URLSearchParams(search).get('u');
  if (!value || !LOGIN_RE.test(value)) return null;
  return value;
}

export function tenantApiUrl(login: string, origin: string): string {
  return origin + '/api/git-viewer/u/' + encodeURIComponent(login);
}

function asRecord(body: unknown): Record<string, unknown> | null {
  return typeof body === 'object' && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null;
}

function retryAfter(body: unknown): number {
  const raw = asRecord(body)?.retryAfterSec;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 5;
  return Math.min(15, Math.max(2, raw));
}

export function parseTenantResponse(httpStatus: number, body: unknown): TenantResponse {
  switch (httpStatus) {
    case 200: {
      const b = asRecord(body);
      if (!b) throw new Error('Hosted API returned a malformed body for 200');
      const data = asRecord(b.data);
      if (!data) throw new Error('Hosted API 200 response is missing data');
      if (typeof b.login !== 'string') throw new Error('Hosted API 200 response is missing login');
      if (b.tier !== 'free' && b.tier !== 'paid') throw new Error('Hosted API 200 response has an invalid tier');
      if (typeof b.updatedAt !== 'string') throw new Error('Hosted API 200 response is missing updatedAt');
      const lockedCount =
        typeof b.lockedCount === 'number' && Number.isFinite(b.lockedCount) ? b.lockedCount : 0;
      return {
        status: 'ready',
        login: b.login,
        tier: b.tier,
        lockedCount,
        updatedAt: b.updatedAt,
        data: data as unknown as GitData,
      };
    }
    case 202:
      return { status: 'generating', retryAfterSec: retryAfter(body) };
    case 404:
      return { status: 'not_found' };
    case 429:
      return { status: 'rate_limited', retryAfterSec: retryAfter(body) };
    default:
      throw new Error(`Hosted API returned unexpected HTTP status ${httpStatus}`);
  }
}
