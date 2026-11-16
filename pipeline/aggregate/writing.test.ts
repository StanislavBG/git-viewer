import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWriting } from './writing.js';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

test('buildWriting returns the empty state when content/writing is missing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'git-viewer-writing-'));
  try {
    assert.deepEqual(buildWriting(dir), { essays: [], essaysFeatured: null, now: null });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('repo content/writing carries no placeholder essay or now panel', () => {
  const out = buildWriting(REPO_ROOT);
  assert.equal(out.essays.some((e) => e.id === 'the-quiet-pipeline'), false);
  assert.equal(out.now, null);
});
