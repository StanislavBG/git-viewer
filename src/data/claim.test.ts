import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_ALLOWLIST,
  buildClaimRequest,
  buildCheckoutRequest,
  parseClaimResponse,
  parseCheckoutResponse,
} from './claim.js';

test('buildClaimRequest posts login with bearer token', () => {
  const r = buildClaimRequest({ origin: 'https://bilko.run', login: 'octo', token: 'tok' });
  assert.equal(r.url, 'https://bilko.run/api/git-viewer/claim');
  assert.equal(r.init.method, 'POST');
  const h = r.init.headers as Record<string, string>;
  assert.equal(h.Authorization, 'Bearer tok');
  assert.equal(h['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(r.init.body as string), { login: 'octo' });
});

test('buildClaimRequest caps the allowlist at 12 and dedupes', () => {
  const repos = Array.from({ length: 20 }, (_, i) => `r${i}`);
  const r = buildClaimRequest({ origin: '', login: 'octo', token: 't', allowlist: [...repos, 'r0'] });
  const body = JSON.parse(r.init.body as string);
  assert.equal(MAX_ALLOWLIST, 12);
  assert.deepEqual(body.allowlist, repos.slice(0, 12));
});

test('buildClaimRequest omits an empty allowlist', () => {
  const r = buildClaimRequest({ origin: '', login: 'octo', token: 't', allowlist: [] });
  assert.equal('allowlist' in JSON.parse(r.init.body as string), false);
});

test('parseClaimResponse maps 200 to claimed', () => {
  assert.deepEqual(
    parseClaimResponse(200, { ok: true, login: 'octo', tier: 'paid', allowlist: ['a'] }),
    { status: 'claimed', login: 'octo', tier: 'paid', allowlist: ['a'] },
  );
  assert.deepEqual(
    parseClaimResponse(200, { ok: true, login: 'octo', tier: 'free' }),
    { status: 'claimed', login: 'octo', tier: 'free', allowlist: [] },
  );
});

test('parseClaimResponse maps 401, 403 and everything else', () => {
  assert.equal(parseClaimResponse(401, {}).status, 'sign_in_required');
  assert.equal(parseClaimResponse(403, {}).status, 'not_owner');
  assert.equal(parseClaimResponse(500, {}).status, 'error');
  assert.equal(parseClaimResponse(200, { ok: false }).status, 'error');
  assert.equal(parseClaimResponse(200, null).status, 'error');
});

test('buildCheckoutRequest uses the primary email and git_viewer price', () => {
  const r = buildCheckoutRequest({ origin: 'https://bilko.run', email: 'me@x.io' });
  assert.equal(r.url, 'https://bilko.run/api/stripe/create-checkout-session');
  assert.equal(r.init.method, 'POST');
  assert.deepEqual(JSON.parse(r.init.body as string), { email: 'me@x.io', priceType: 'git_viewer' });
});

test('parseCheckoutResponse returns the redirect url', () => {
  assert.deepEqual(parseCheckoutResponse(200, { url: 'https://checkout.stripe.com/x' }), {
    status: 'redirect',
    url: 'https://checkout.stripe.com/x',
  });
  assert.equal(parseCheckoutResponse(200, {}).status, 'error');
  assert.equal(parseCheckoutResponse(500, { url: 'https://a' }).status, 'error');
});
