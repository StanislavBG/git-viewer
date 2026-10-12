import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_ALLOWLIST,
  buildClaimRequest,
  buildCheckoutRequest,
  parseClaimResponse,
  parseCheckoutResponse,
  checkoutReturnUrls,
  parseCheckoutFlag,
  buildPortalRequest,
  parsePortalResponse,
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

test('checkoutReturnUrls keeps the path and u param and adds the flag', () => {
  const r = checkoutReturnUrls('https://bilko.run/projects/git-viewer/?u=octocat');
  assert.equal(r.successUrl, 'https://bilko.run/projects/git-viewer/?u=octocat&checkout=success');
  assert.equal(r.cancelUrl, 'https://bilko.run/projects/git-viewer/?u=octocat&checkout=cancel');
});

test('checkoutReturnUrls replaces an existing checkout param and strips the hash', () => {
  const r = checkoutReturnUrls('https://bilko.run/p/?checkout=cancel&u=octocat#/projects');
  assert.equal(r.successUrl, 'https://bilko.run/p/?u=octocat&checkout=success');
  assert.equal(r.cancelUrl, 'https://bilko.run/p/?u=octocat&checkout=cancel');
});

test('buildCheckoutRequest includes return urls only when given', () => {
  const r = buildCheckoutRequest({
    origin: 'https://bilko.run',
    email: 'me@x.io',
    successUrl: 'https://bilko.run/a?checkout=success',
    cancelUrl: 'https://bilko.run/a?checkout=cancel',
  });
  assert.deepEqual(JSON.parse(r.init.body as string), {
    email: 'me@x.io',
    priceType: 'git_viewer',
    successUrl: 'https://bilko.run/a?checkout=success',
    cancelUrl: 'https://bilko.run/a?checkout=cancel',
  });
  const only = buildCheckoutRequest({ origin: '', email: 'e', successUrl: 'https://a/b' });
  const body = JSON.parse(only.init.body as string);
  assert.equal(body.successUrl, 'https://a/b');
  assert.equal('cancelUrl' in body, false);
});

test('parseCheckoutFlag accepts only success and cancel', () => {
  assert.equal(parseCheckoutFlag('?u=octo&checkout=success'), 'success');
  assert.equal(parseCheckoutFlag('checkout=cancel'), 'cancel');
  assert.equal(parseCheckoutFlag('?checkout=nope'), null);
  assert.equal(parseCheckoutFlag('?u=octo'), null);
  assert.equal(parseCheckoutFlag(''), null);
});

test('buildPortalRequest posts email and returnUrl', () => {
  const r = buildPortalRequest({ origin: 'https://bilko.run', email: 'me@x.io', returnUrl: 'https://bilko.run/p/' });
  assert.equal(r.url, 'https://bilko.run/api/stripe/billing-portal');
  assert.equal(r.init.method, 'POST');
  assert.deepEqual(JSON.parse(r.init.body as string), { email: 'me@x.io', returnUrl: 'https://bilko.run/p/' });
});

test('parsePortalResponse maps 200, 404 and everything else', () => {
  assert.deepEqual(parsePortalResponse(200, { url: 'https://billing.stripe.com/x' }), {
    status: 'redirect',
    url: 'https://billing.stripe.com/x',
  });
  assert.deepEqual(parsePortalResponse(404, {}), { status: 'no_customer' });
  assert.deepEqual(parsePortalResponse(500, {}), { status: 'error', message: 'Billing portal failed (HTTP 500)' });
  assert.equal(parsePortalResponse(200, { url: '' }).status, 'error');
  assert.equal(parsePortalResponse(200, null).status, 'error');
});
