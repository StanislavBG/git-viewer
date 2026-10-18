import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEvent, buildFlowEvent, checkoutProps, scrubProps, telemetryEndpoint } from './telemetry.js';

test('telemetryEndpoint is same-origin on bilko.run and off elsewhere', () => {
  assert.equal(telemetryEndpoint('bilko.run'), '/api/telemetry/event');
  assert.equal(telemetryEndpoint('www.bilko.run'), '/api/telemetry/event');
  assert.equal(telemetryEndpoint('stanislavbg.github.io'), null);
  assert.equal(telemetryEndpoint('localhost'), null);
  assert.equal(telemetryEndpoint('evil-bilko.run'), null);
});

test('buildFlowEvent matches the host-kit trackFlow wire format', () => {
  const ev = buildFlowEvent('checkout', 'click-buy', checkoutProps('claim-bar'), '/projects/git-viewer/', 42);
  assert.deepEqual(ev, {
    app: 'git-viewer',
    name: 'checkout.click-buy',
    ts: 42,
    props: {
      product: 'git-viewer',
      plan: 'pro',
      source: 'claim-bar',
      flow: 'checkout',
      step: 'click-buy',
      path: '/projects/git-viewer/',
    },
  });
});

test('buildFlowEvent rejects names outside the taxonomy pattern', () => {
  assert.equal(buildFlowEvent('Checkout', 'success', {}, '/', 0), null);
  assert.equal(buildFlowEvent('checkout', 'click_buy', {}, '/', 0), null);
  assert.equal(buildFlowEvent('-x', 'start', {}, '/', 0), null);
  assert.equal(buildFlowEvent('a'.repeat(41), 'start', {}, '/', 0), null);
});

test('scrubProps drops PII-shaped keys and undefined values', () => {
  assert.deepEqual(
    scrubProps({ email: 'a@b.c', token: 't', login: 'octocat', userName: 'x', apiKey: 'k', reason: 'error', n: undefined }),
    { reason: 'error' },
  );
});

test('scrubProps truncates long strings', () => {
  assert.equal((scrubProps({ reason: 'x'.repeat(200) }).reason as string).length, 80);
});

test('buildEvent keeps an explicit path', () => {
  assert.equal(buildEvent('screen_view', { screen: 'landing', path: '/p/' }, '/x/', 1).props.path, '/p/');
});
