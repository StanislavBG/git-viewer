import test from 'node:test';
import assert from 'node:assert/strict';
import * as lib from '../dist-lib/pipeline/index.js';

test('compiled library exposes buildPortfolio', () => {
  assert.equal(typeof lib.buildPortfolio, 'function');
  assert.equal(typeof lib.selectRepos, 'function');
  assert.equal(typeof lib.buildWritingFromFiles, 'function');
  assert.ok(lib.PLAN_LIMITS);
});
