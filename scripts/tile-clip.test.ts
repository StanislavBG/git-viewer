import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const CLIP = new URL('../share/tile.mp4', import.meta.url);
const MAX_BYTES = 8388608;
const FPS = 30;

function topLevelBoxes(buf: Buffer): string[] {
  const types: string[] = [];
  let off = 0;
  while (off + 8 <= buf.length) {
    let size = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    if (size === 1) size = Number(buf.readBigUInt64BE(off + 8));
    else if (size === 0) size = buf.length - off;
    if (size < 8) break;
    types.push(type);
    off += size;
  }
  return types;
}

test('share/tile.mp4 is a faststart MP4 within the 8 MiB card-clip limit', () => {
  const buf = readFileSync(CLIP);
  assert.equal(buf.toString('latin1', 4, 8), 'ftyp');
  const boxes = topLevelBoxes(buf);
  const moov = boxes.indexOf('moov');
  const mdat = boxes.indexOf('mdat');
  assert.ok(moov >= 0 && mdat >= 0, boxes.join(','));
  assert.ok(moov < mdat, `moov must precede mdat: ${boxes.join(',')}`);
  assert.ok(buf.length <= MAX_BYTES, `${buf.length} bytes`);
});

const hasFfprobe = spawnSync('ffprobe', ['-version']).status === 0;

test('share/tile.mp4 streams: 1200x630 yuv420p h264 + aac, 55-61 s', { skip: !hasFfprobe && 'ffprobe not on PATH' }, () => {
  const r = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', CLIP.pathname],
    { encoding: 'utf8' },
  );
  assert.equal(r.status, 0, r.stderr);
  const info = JSON.parse(r.stdout) as {
    streams: { codec_type: string; codec_name: string; width?: number; height?: number; pix_fmt?: string; r_frame_rate?: string }[];
    format: { duration: string };
  };
  const video = info.streams.filter((s) => s.codec_type === 'video');
  const audio = info.streams.filter((s) => s.codec_type === 'audio');
  assert.equal(video.length, 1);
  assert.equal(audio.length, 1);
  const v = video[0]!;
  assert.equal(v.codec_name, 'h264');
  assert.equal(v.width, 1200);
  assert.equal(v.height, 630);
  assert.equal(v.pix_fmt, 'yuv420p');
  const [num, den] = (v.r_frame_rate ?? '0/1').split('/').map(Number);
  assert.equal(num! / den!, FPS);
  assert.equal(audio[0]!.codec_name, 'aac');
  const duration = Number(info.format.duration);
  assert.ok(duration >= 55 && duration <= 61, `duration ${duration}`);
});
