// Mirrors bilko.run's share-assets gate: a declared listing.shareImage, listing.icon or
// listing.video that passes these checks is left out of the host's budget sum.
import { extname } from 'node:path';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBM_SIGNATURE = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);
const SHARE_IMAGE = { width: 1200, height: 630, maxBytes: 5242880 };
const ICON = { min: 128, max: 1024, maxBytes: 524288 };
const VIDEO = { maxBytes: 8388608 };

export const SHARE_ASSET_KEYS = ['shareImage', 'icon', 'video'];

const fail = (reason) => ({ ok: false, reason });
const pass = () => ({ ok: true, reason: undefined });

function checkVideo(buf, fileName) {
  const ext = extname(fileName).toLowerCase();
  if (ext === '.mp4') {
    if (buf.length < 8 || buf.toString('latin1', 4, 8) !== 'ftyp') return fail('not an MP4 (no ftyp at bytes 4-7)');
  } else if (ext === '.webm') {
    if (buf.length < 4 || !buf.subarray(0, 4).equals(WEBM_SIGNATURE)) return fail('not a WebM (no EBML signature)');
  } else {
    return fail('must end in .mp4 or .webm');
  }
  if (buf.length > VIDEO.maxBytes) return fail(`is ${buf.length} bytes, over the ${VIDEO.maxBytes} byte limit`);
  return pass();
}

/** @returns {{ ok: boolean, reason: string | undefined }} */
export function shareAssetCheck(key, buf, fileName) {
  if (key === 'video') return checkVideo(buf, fileName);
  if (key !== 'shareImage' && key !== 'icon') return fail(`unknown share asset key ${key}`);
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIGNATURE) || buf.toString('latin1', 12, 16) !== 'IHDR') {
    return fail('not a PNG');
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (key === 'shareImage') {
    if (width !== SHARE_IMAGE.width || height !== SHARE_IMAGE.height) {
      return fail(`is ${width}x${height}, must be exactly ${SHARE_IMAGE.width}x${SHARE_IMAGE.height}`);
    }
    if (buf.length > SHARE_IMAGE.maxBytes) return fail(`is ${buf.length} bytes, over the ${SHARE_IMAGE.maxBytes} byte limit`);
    return pass();
  }
  if (width !== height) return fail(`is ${width}x${height}, must be square`);
  if (width < ICON.min || width > ICON.max) return fail(`is ${width}x${height}, must be ${ICON.min}-${ICON.max} px`);
  if (buf.length > ICON.maxBytes) return fail(`is ${buf.length} bytes, over the ${ICON.maxBytes} byte limit`);
  return pass();
}
