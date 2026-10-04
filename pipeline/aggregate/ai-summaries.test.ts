import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readmeLead } from './ai-summaries.js';

test('heading + badge + paragraph README returns the paragraph', () => {
  const readme = [
    '# My Project',
    '',
    '![Build Status](https://ci.example.com/badge.svg)',
    '',
    'This project does a bunch of useful things for developers who need it.',
    '',
    '## Installation',
    '',
    'npm install my-project',
  ].join('\n');
  assert.equal(
    readmeLead(readme),
    'This project does a bunch of useful things for developers who need it.',
  );
});

test('link syntax is reduced to its text', () => {
  const readme = [
    '# Title',
    '',
    'Check out the [documentation](https://example.com/docs) for more details on this tool.',
  ].join('\n');
  assert.equal(
    readmeLead(readme),
    'Check out the documentation for more details on this tool.',
  );
});

test('long text is truncated to at most 200 chars at a word boundary', () => {
  const sentence = 'This is a sufficiently long sentence that keeps going and going '.repeat(5);
  const readme = `# Title\n\n${sentence}`;
  const result = readmeLead(readme);
  assert.ok(result.length <= 200);
  assert.ok(result.endsWith('…'));
});

test('HTML-only README returns empty string', () => {
  const readme = [
    '<div align="center">',
    '  <img src="logo.png" />',
    '</div>',
  ].join('\n');
  assert.equal(readmeLead(readme), '');
});

test('empty README returns empty string', () => {
  assert.equal(readmeLead(''), '');
});
