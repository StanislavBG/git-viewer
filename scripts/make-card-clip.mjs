#!/usr/bin/env node
// Build the bilko.run /projects card clip (listing.video): a faststart H.264 + AAC MP4, 1200x630,
// at most 8 MiB, from a Session Manager demo-video document that exposes window.smDemo.
// git-viewer's demo videos draw with HTML + SVG (no #cv canvas), so every frame is a full-viewport
// screenshot at 1200x630 (the document letterboxes its own 16:9 stage; never cropped). Frames are
// taken by pausing and seeking window.smDemo, never by wall-clock playback.
// The soundtrack is the first <audio> whose src is a data:audio/<type>;base64 URI; it is muxed as
// 128 kbps AAC padded or cut to the video length.
// Ported from starry-night-2/scripts/web/make-og-tile.mjs (mp4 + --audio mode).
// Usage: node scripts/make-card-clip.mjs <video index.html> [--out <file>] [--fps <n>]
// Needs ffmpeg on PATH and Playwright's Chromium.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const USAGE = 'usage: node scripts/make-card-clip.mjs <video index.html> [--out <file>] [--fps <n>]';
const WIDTH = 1200;
const HEIGHT = 630;
const MAX_BYTES = 8388608;
const MAX_DURATION = 61;
const AUDIO_EXT = {
  'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/wave': 'wav',
  'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/aac': 'm4a', 'audio/webm': 'webm',
};

class ClipError extends Error {}
const fail = (msg) => { throw new ClipError(msg); };

function parseArgs(argv) {
  const opts = { out: 'share/tile.mp4', fps: 30, input: undefined };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out' || a === '--fps') {
      const v = argv[++i];
      if (v === undefined) fail(`${a} needs a value; ${USAGE}`);
      if (a === '--out') opts.out = v;
      else {
        const n = Number(v);
        if (v.trim() === '' || !Number.isFinite(n)) fail(`--fps must be a number, got '${v}'`);
        opts.fps = n;
      }
    } else if (a.startsWith('--')) {
      fail(`unknown option ${a}; ${USAGE}`);
    } else if (opts.input === undefined) {
      opts.input = a;
    } else {
      fail(`unexpected argument '${a}'; ${USAGE}`);
    }
  }
  if (!opts.input) fail(`missing the video index.html; ${USAGE}`);
  if (!(opts.fps > 0)) fail(`--fps must be > 0, got ${opts.fps}`);
  const abs = resolve(opts.input);
  if (!existsSync(abs) || !statSync(abs).isFile()) fail(`input file not found: ${opts.input}`);
  opts.input = abs;
  return opts;
}

/** Times in seconds (rounded to ms): 0, step, 2*step, ... < duration. */
function frameTimes(step, duration, maxFrames) {
  const times = [];
  for (let k = 0; k * step < duration - 1e-9; k++) {
    times.push(Math.round(k * step * 1000) / 1000);
    if (times.length > maxFrames) fail(`more than ${maxFrames} frames (duration ${duration} s, step ${step} s)`);
  }
  return times;
}

/** Top-level MP4 box types, in file order. */
function mp4Boxes(buf) {
  const types = [];
  let off = 0;
  while (off + 8 <= buf.length) {
    let size = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    if (size === 1) {
      if (off + 16 > buf.length) break;
      size = Number(buf.readBigUInt64BE(off + 8));
    } else if (size === 0) {
      size = buf.length - off;
    }
    types.push(type);
    if (size < 8) break;
    off += size;
  }
  return types;
}

/** Throws unless buf is an MP4 ('ftyp' at bytes 4-7) with moov before mdat, at most 8 MiB. */
function checkMp4(buf) {
  if (buf.length < 8 || buf.toString('latin1', 4, 8) !== 'ftyp') fail("ffmpeg output has no 'ftyp' at bytes 4-7 (not an MP4)");
  const boxes = mp4Boxes(buf);
  const moov = boxes.indexOf('moov');
  const mdat = boxes.indexOf('mdat');
  if (moov < 0) fail("ffmpeg output has no top-level 'moov' box");
  if (mdat < 0) fail("ffmpeg output has no top-level 'mdat' box");
  if (moov > mdat) fail("ffmpeg output has 'mdat' before 'moov' (not faststart)");
  if (buf.length > MAX_BYTES) {
    fail(`output is ${buf.length} bytes, over the ${MAX_BYTES} byte (8 MiB) card-video limit; try a lower --fps`);
  }
}

async function captureFrames(opts, dir) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
    page.setDefaultTimeout(30000);
    await page.setViewportSize({ width: WIDTH, height: HEIGHT });
    await page.goto(pathToFileURL(opts.input).href, { waitUntil: 'load', timeout: 30000 });
    try {
      await page.waitForFunction(
        () =>
          window.smDemo &&
          typeof window.smDemo.seek === 'function' &&
          typeof window.smDemo.pause === 'function' &&
          Array.from(document.images).every((img) => img.complete),
        undefined,
        { timeout: 15000 },
      );
    } catch {
      fail('no window.smDemo with seek() and pause() (and all images loaded) within 15 s');
    }
    const duration = await page.evaluate(() => {
      window.smDemo.pause();
      return Number(window.smDemo.duration);
    });
    if (!(duration > 0)) fail(`window.smDemo.duration must be > 0, got ${duration}`);
    if (duration > MAX_DURATION) fail(`demo is ${duration} s, over the ${MAX_DURATION} s card-clip limit`);

    const src = await page.evaluate(() => {
      for (const a of Array.from(document.querySelectorAll('audio'))) {
        const s = a.getAttribute('src') || '';
        if (/^data:audio\/[a-z0-9.+-]+;base64,/i.test(s)) return s;
      }
      return null;
    });
    if (src === null) fail('the document has no <audio> element with a data:audio/<type>;base64 src');
    const m = /^data:(audio\/[a-z0-9.+-]+);base64,/i.exec(src);
    const ext = AUDIO_EXT[m[1].toLowerCase()];
    if (!ext) fail(`unsupported <audio> type ${m[1]}`);
    const bytes = Buffer.from(src.slice(m[0].length), 'base64');
    if (bytes.length === 0) fail('<audio> data URI is empty');
    const audioPath = join(dir, `audio.${ext}`);
    writeFileSync(audioPath, bytes);

    await page.evaluate(() => document.fonts && document.fonts.ready);
    const times = frameTimes(1 / opts.fps, duration, Math.ceil(MAX_DURATION * opts.fps) + 1);
    for (let i = 0; i < times.length; i++) {
      await page.evaluate((t) => { window.smDemo.seek(t); }, times[i]);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const png = await page.screenshot({ type: 'png', fullPage: false });
      writeFileSync(join(dir, `${String(i).padStart(5, '0')}.png`), png);
    }
    return { frames: times.length, audioPath };
  } finally {
    await browser.close();
  }
}

// -shortest alone lets apad'd AAC run past the last video frame (x264 lookahead), so the audio
// encode is also bounded at exactly frames / fps seconds with -t.
function encode(opts, dir, tmpOut, audioPath, frames) {
  const argv = ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(opts.fps), '-i', `${dir}/%05d.png`,
    '-i', audioPath, '-map', '0:v:0', '-map', '1:a:0',
    '-vf', `scale=${WIDTH}:${HEIGHT}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow',
    '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-crf', '23', '-maxrate', '1000k', '-bufsize', '2000k',
    '-c:a', 'aac', '-b:a', '128k', '-af', 'apad', '-shortest', '-t', String(frames / opts.fps),
    '-movflags', '+faststart', '-f', 'mp4', tmpOut];
  const r = spawnSync('ffmpeg', argv, { encoding: 'utf8', timeout: 600000 });
  if (r.error) {
    if (r.error.code === 'ENOENT') fail('ffmpeg not found on PATH');
    fail(`ffmpeg failed to run: ${r.error.message}`);
  }
  if (r.status !== 0) {
    const last = (r.stderr || '').trim().split('\n').pop() || `signal ${r.signal}`;
    fail(`ffmpeg exited ${r.status}: ${last}`);
  }
}

async function main() {
  let dir;
  try {
    const opts = parseArgs(process.argv.slice(2));
    dir = mkdtempSync(join(tmpdir(), 'card-clip-'));
    const { frames, audioPath } = await captureFrames(opts, dir);
    if (frames === 0) fail('no frames to capture');
    const tmpOut = join(dir, 'tile.mp4');
    encode(opts, dir, tmpOut, audioPath, frames);
    const buf = readFileSync(tmpOut);
    checkMp4(buf);
    mkdirSync(dirname(resolve(opts.out)), { recursive: true });
    copyFileSync(tmpOut, opts.out);
    console.log(`make-card-clip: wrote ${opts.out} (${frames} frames, ${buf.length} bytes, ${WIDTH}x${HEIGHT}, ${opts.fps} fps, aac)`);
    return 0;
  } catch (err) {
    const msg = err instanceof ClipError ? err.message : String(err && err.message ? err.message : err).split('\n')[0];
    console.error(`make-card-clip: ERROR ${msg}`);
    return 1;
  } finally {
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
}

process.exitCode = await main();
