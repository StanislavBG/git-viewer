import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shareAssetCheck } from './share-assets.mjs';

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function png(width: number, height: number): Buffer {
  const buf = Buffer.alloc(33);
  Buffer.from(PNG_SIG).copy(buf, 0);
  buf.writeUInt32BE(13, 8);
  buf.write('IHDR', 12, 'latin1');
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

function mp4(size: number): Buffer {
  const buf = Buffer.alloc(size);
  buf.writeUInt32BE(24, 0);
  buf.write('ftypisom', 4, 'latin1');
  return buf;
}

test('shareImage: a 1200x630 PNG passes', () => {
  assert.deepEqual(shareAssetCheck('shareImage', png(1200, 630), 'og.png'), { ok: true, reason: undefined });
});

test('shareImage: a 1200x631 PNG fails with a reason', () => {
  const r = shareAssetCheck('shareImage', png(1200, 631), 'og.png');
  assert.equal(r.ok, false);
  assert.match(r.reason, /1200x631/);
});

test('icon: a square 512 PNG passes, a non-square one fails', () => {
  assert.equal(shareAssetCheck('icon', png(512, 512), 'icon.png').ok, true);
  assert.equal(shareAssetCheck('icon', png(512, 256), 'icon.png').ok, false);
  assert.equal(shareAssetCheck('icon', png(64, 64), 'icon.png').ok, false);
});

test('video: a valid MP4 header passes', () => {
  assert.deepEqual(shareAssetCheck('video', mp4(1024), 'card.mp4'), { ok: true, reason: undefined });
});

test('video: an 8388609-byte MP4 fails', () => {
  const r = shareAssetCheck('video', mp4(8388609), 'card.mp4');
  assert.equal(r.ok, false);
  assert.match(r.reason, /8388609/);
});

test('video: a .webm with EBML passes; mismatched extension fails', () => {
  const webm = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(60)]);
  assert.equal(shareAssetCheck('video', webm, 'card.webm').ok, true);
  assert.equal(shareAssetCheck('video', webm, 'card.mp4').ok, false);
  assert.equal(shareAssetCheck('video', mp4(64), 'card.webm').ok, false);
});
