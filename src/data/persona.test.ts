import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PERSONA_ALIASES, resolvePersona, maskPersona } from './persona.js';

test('resolvePersona matches slug and real login, any case', () => {
  const p = PERSONA_ALIASES[0];
  assert.equal(resolvePersona('BilkoBibitkov'), p);
  assert.equal(resolvePersona('bilkobibitkov'), p);
  assert.equal(resolvePersona('StanislavBG'), p);
  assert.equal(resolvePersona('STANISLAVBG'), p);
});

test('resolvePersona returns null for other logins', () => {
  assert.equal(resolvePersona('torvalds'), null);
  assert.equal(resolvePersona(''), null);
});

test('maskPersona replaces nested exact-case logins only', () => {
  const p = PERSONA_ALIASES[0];
  const out = maskPersona(
    { a: 'StanislavBG', n: { b: ['hi StanislavBG!', 'stanislavbg.github.io'] }, c: 3 },
    p,
  );
  assert.deepEqual(out, {
    a: 'Bilko Bibitkov',
    n: { b: ['hi Bilko Bibitkov!', 'stanislavbg.github.io'] },
    c: 3,
  });
});
