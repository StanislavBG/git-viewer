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

export type ExternalAccount = { provider: string; username?: string | null };

export function githubLinkState(
  accounts: readonly ExternalAccount[] | null | undefined,
  login: string,
): 'linked' | 'other-account' | 'none' {
  const github = (accounts ?? []).filter((a) => a.provider === 'oauth_github' || a.provider === 'github');
  if (github.length === 0) return 'none';
  const want = login.toLowerCase();
  return github.some((a) => a.username?.toLowerCase() === want) ? 'linked' : 'other-account';
}

export function upgradeStep(
  claim: ClaimResult | null,
  signedIn: boolean,
): 'sign-in' | 'checkout' | 'not-owner' | 'error' {
  if (!signedIn) return 'sign-in';
  if (claim?.status === 'claimed') return 'checkout';
  if (claim?.status === 'not_owner') return 'not-owner';
  if (claim?.status === 'sign_in_required') return 'sign-in';
  return 'error';
}

export function checkoutReturnUrls(href: string): { successUrl: string; cancelUrl: string } {
  const withFlag = (flag: 'success' | 'cancel') => {
    const u = new URL(href);
    u.hash = '';
    u.searchParams.delete('checkout');
    u.searchParams.set('checkout', flag);
    return u.toString();
  };
  return { successUrl: withFlag('success'), cancelUrl: withFlag('cancel') };
}

export function parseCheckoutFlag(search: string): 'success' | 'cancel' | null {
  const v = new URLSearchParams(search).get('checkout');
  return v === 'success' || v === 'cancel' ? v : null;
}

export function buildCheckoutRequest(opts: {
  origin: string;
  email: string;
  successUrl?: string;
  cancelUrl?: string;
}): BuiltRequest {
  const body: { email: string; priceType: string; successUrl?: string; cancelUrl?: string } = {
    email: opts.email,
    priceType: 'git_viewer',
  };
  if (opts.successUrl) body.successUrl = opts.successUrl;
  if (opts.cancelUrl) body.cancelUrl = opts.cancelUrl;
  return {
    url: opts.origin + '/api/stripe/create-checkout-session',
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  };
}

export function parseCheckoutResponse(httpStatus: number, body: unknown): CheckoutResult {
  const url = asRecord(body)?.url;
  if (httpStatus === 200 && typeof url === 'string' && url) return { status: 'redirect', url };
  return { status: 'error', message: `Checkout failed (HTTP ${httpStatus})` };
}

export type PortalResult =
  | { status: 'redirect'; url: string }
  | { status: 'no_customer' }
  | { status: 'error'; message: string };

export function buildPortalRequest(opts: { origin: string; email: string; returnUrl: string }): BuiltRequest {
  return {
    url: opts.origin + '/api/stripe/billing-portal',
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: opts.email, returnUrl: opts.returnUrl }),
    },
  };
}

export function parsePortalResponse(httpStatus: number, body: unknown): PortalResult {
  const url = asRecord(body)?.url;
  if (httpStatus === 200 && typeof url === 'string' && url) return { status: 'redirect', url };
  if (httpStatus === 404) return { status: 'no_customer' };
  return { status: 'error', message: `Billing portal failed (HTTP ${httpStatus})` };
}
