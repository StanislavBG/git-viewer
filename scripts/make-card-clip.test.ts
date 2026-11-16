import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(root, 'scripts/make-card-clip.mjs');
const fixture = join(root, 'scripts/fixtures/demo-video-fixture.html');

function run(args: string[]) {
  return spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8', timeout: 180000 });
}

function mp4Boxes(buf: Buffer): string[] {
  const types: string[] = [];
  let off = 0;
  while (off + 8 <= buf.length) {
    let size = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    if (size === 1) size = Number(buf.readBigUInt64BE(off + 8));
    else if (size === 0) size = buf.length - off;
    types.push(type);
    if (size < 8) break;
    off += size;
  }
  return types;
}

const hasFfprobe = spawnSync('ffprobe', ['-version'], { encoding: 'utf8', timeout: 10000 }).status === 0;

interface ProbeStream {
  codec_type: string;
  codec_name: string;
  width?: number;
  height?: number;
  pix_fmt?: string;
}

test('builds a faststart 1200x630 H.264 + AAC card clip from a DOM demo-video document', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'card-clip-test-'));
  try {
    const out = join(tmp, 'tile.mp4');
    const r = run([fixture, '--fps', '5', '--out', out]);
    assert.equal(r.status, 0, `exit ${r.status}\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout, /make-card-clip: wrote .*\(30 frames, \d+ bytes, 1200x630, 5 fps, aac\)/);
    const buf = readFileSync(out);
    assert.equal(buf.toString('latin1', 4, 8), 'ftyp');
    const boxes = mp4Boxes(buf);
    const moov = boxes.indexOf('moov');
    const mdat = boxes.indexOf('mdat');
    assert.ok(moov >= 0 && mdat >= 0 && moov < mdat, `moov before mdat: ${boxes.join(',')}`);
    if (!hasFfprobe) return;
    const p = spawnSync('ffprobe', ['-v', 'error', '-show_entries',
      'stream=codec_type,codec_name,width,height,pix_fmt', '-of', 'json', out], { encoding: 'utf8', timeout: 30000 });
    assert.equal(p.status, 0, p.stderr);
    const { streams } = JSON.parse(p.stdout) as { streams: ProbeStream[] };
    const video = streams.filter((s) => s.codec_type === 'video');
    const audio = streams.filter((s) => s.codec_type === 'audio');
    assert.equal(video.length, 1);
    assert.equal(video[0].codec_name, 'h264');
    assert.equal(video[0].width, 1200);
    assert.equal(video[0].height, 630);
    assert.equal(video[0].pix_fmt, 'yuv420p');
    assert.equal(audio.length, 1);
    assert.equal(audio[0].codec_name, 'aac');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('rejects a non-numeric --fps with an ERROR line and no output', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'card-clip-test-'));
  try {
    const out = join(tmp, 'tile.mp4');
    const r = run([fixture, '--fps', 'abc', '--out', out]);
    assert.equal(r.status, 1, `exit ${r.status}\n${r.stdout}\n${r.stderr}`);
    assert.match(r.stdout + r.stderr, /make-card-clip: ERROR/);
    assert.equal(existsSync(out), false);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
