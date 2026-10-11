export const MAX_ALLOWLIST = 12;

export type ClaimResult =
  | { status: 'claimed'; login: string; tier: 'free' | 'paid'; allowlist: string[] }
  | { status: 'sign_in_required' }
  | { status: 'not_owner' }
  | { status: 'error'; message: string };

export type CheckoutResult = { status: 'redirect'; url: string } | { status: 'error'; message: string };

export type BuiltRequest = { url: string; init: RequestInit };

function asRecord(body: unknown): Record<string, unknown> | null {
  return typeof body === 'object' && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null;
}

export function capAllowlist(repos: readonly string[]): string[] {
  return [...new Set(repos)].slice(0, MAX_ALLOWLIST);
}

export function buildClaimRequest(opts: {
  origin: string;
  login: string;
  token: string;
  allowlist?: readonly string[];
}): BuiltRequest {
  const body: { login: string; allowlist?: string[] } = { login: opts.login };
  const allowlist = opts.allowlist ? capAllowlist(opts.allowlist) : [];
  if (allowlist.length > 0) body.allowlist = allowlist;
  return {
    url: opts.origin + '/api/git-viewer/claim',
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${opts.token}` },
      body: JSON.stringify(body),
    },
  };
}

export function parseClaimResponse(httpStatus: number, body: unknown): ClaimResult {
  if (httpStatus === 401) return { status: 'sign_in_required' };
  if (httpStatus === 403) return { status: 'not_owner' };
  const b = asRecord(body);
  if (httpStatus === 200 && b && b.ok === true && typeof b.login === 'string' && (b.tier === 'free' || b.tier === 'paid')) {
    const allowlist = Array.isArray(b.allowlist)
      ? b.allowlist.filter((r): r is string => typeof r === 'string')
      : [];
    return { status: 'claimed', login: b.login, tier: b.tier, allowlist };
  }
  return { status: 'error', message: `Claim failed (HTTP ${httpStatus})` };
}

export function buildCheckoutRequest(opts: { origin: string; email: string }): BuiltRequest {
  return {
    url: opts.origin + '/api/stripe/create-checkout-session',
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: opts.email, priceType: 'git_viewer' }),
    },
  };
}

export function parseCheckoutResponse(httpStatus: number, body: unknown): CheckoutResult {
  const url = asRecord(body)?.url;
  if (httpStatus === 200 && typeof url === 'string' && url) return { status: 'redirect', url };
  return { status: 'error', message: `Checkout failed (HTTP ${httpStatus})` };
}
