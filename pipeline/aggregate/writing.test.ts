import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWriting, buildWritingFromFiles } from './writing.js';

const featuredMd = [
  '---',
  'title: Hello',
  'deck: A deck',
  'date: 2026-03-04',
  'read: 7',
  'tag: notes',
  'featured: true',
  'tags: [a, b]',
  'pulls:',
  '  - one',
  'relatedProjects: [git-viewer]',
  '---',
  '',
  'First paragraph.',
  '',
  'Second paragraph.',
].join('\n');

test('empty input returns empty output', () => {
  assert.deepEqual(buildWritingFromFiles([]), { essays: [], essaysFeatured: null, now: null });
});

test('one featured essay with frontmatter', () => {
  const out = buildWritingFromFiles([{ name: 'hello.md', content: featuredMd }]);
  assert.equal(out.essays.length, 1);
  const e = out.essays[0]!;
  assert.equal(e.id, 'hello');
  assert.equal(e.title, 'Hello');
  assert.equal(e.date, 'Mar 4 2026');
  assert.equal(e.read, 7);
  assert.equal(e.year, 2026);
  assert.ok(out.essaysFeatured);
  assert.equal(out.essaysFeatured.id, 'hello');
  assert.deepEqual(out.essaysFeatured.tags, ['a', 'b']);
  assert.deepEqual(out.essaysFeatured.pulls, ['one']);
  assert.deepEqual(out.essaysFeatured.relatedProjects, ['git-viewer']);
  assert.equal(out.essaysFeatured.excerpt, 'First paragraph.\n\nSecond paragraph.');
});

test('_now.md is parsed into now and is not an essay', () => {
  const nowMd = [
    '---',
    'reading:',
    '  - title: Book',
    '    author: Auth',
    '    since: 2026-01-01',
    'writing:',
    '  title: Draft',
    '  words: 500',
    '  target: 1000',
    'thinking:',
    '  - idea one',
    '---',
  ].join('\n');
  const out = buildWritingFromFiles([{ name: '_now.md', content: nowMd }]);
  assert.equal(out.essays.length, 0);
  assert.deepEqual(out.now, {
    reading: [{ title: 'Book', author: 'Auth', since: '2026-01-01' }],
    writing: { title: 'Draft', words: 500, target: 1000, progress: 0.5 },
    thinking: ['idea one'],
  });
});

test('non-.md and other underscore files are ignored', () => {
  const out = buildWritingFromFiles([
    { name: 'notes.txt', content: featuredMd },
    { name: '_draft.md', content: featuredMd },
    { name: 'image.png', content: '' },
  ]);
  assert.deepEqual(out, { essays: [], essaysFeatured: null, now: null });
});

test('essays are ordered newest-first', () => {
  const mk = (date: string) => `---\ntitle: T\ndate: ${date}\n---\nbody`;
  const out = buildWritingFromFiles([
    { name: 'old.md', content: mk('2024-01-01') },
    { name: 'new.md', content: mk('2026-06-01') },
    { name: 'mid.md', content: mk('2025-05-05') },
  ]);
  assert.deepEqual(out.essays.map((e) => e.id), ['new', 'mid', 'old']);
});

test('buildWriting on the repo root matches content/writing/', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const expected = readdirSync(join(root, 'content', 'writing'))
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .map((f) => f.replace(/\.md$/, ''))
    .sort();
  const got = buildWriting(root).essays.map((e) => e.id).sort();
  assert.deepEqual(got, expected);
});
