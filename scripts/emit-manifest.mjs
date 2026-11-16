#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { SHARE_ASSET_KEYS, shareAssetCheck } from './share-assets.mjs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const distDir = 'dist';

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const SLUG = 'git-viewer';

function shareAssetFiles() {
  const exclude = new Set();
  const notes = [];
  if (!existsSync('bilko.listing.json')) return { exclude, notes };
  const listing = JSON.parse(readFileSync('bilko.listing.json', 'utf8')).listing ?? {};
  const root = resolve(distDir);
  const prefix = `/projects/${SLUG}/`;
  for (const key of SHARE_ASSET_KEYS) {
    const declared = listing[key];
    if (!declared) continue;
    const warn = (reason) => console.warn(`emit-manifest: WARN ${key} ${reason}`);
    if (typeof declared !== 'string' || !declared.startsWith(prefix)) {
      warn(`${declared} is not under ${prefix}; counted in the bundle size`);
      continue;
    }
    const abs = resolve(root, declared.slice(prefix.length));
    if (abs === root || !abs.startsWith(root + sep)) {
      warn(`${declared} escapes ${distDir}/; counted in the bundle size`);
      continue;
    }
    if (!existsSync(abs) || !statSync(abs).isFile()) {
      warn(`${declared} not found in ${distDir}/; counted in the bundle size`);
      continue;
    }
    if (exclude.has(abs)) continue;
    const buf = readFileSync(abs);
    const { ok, reason } = shareAssetCheck(key, buf, abs);
    if (!ok) {
      warn(`${declared} ${reason}; counted in the bundle size`);
      continue;
    }
    exclude.add(abs);
    notes.push({ name: basename(abs), gzBytes: gzipSync(buf).length });
  }
  return { exclude, notes };
}

const share = shareAssetFiles();
const files = walk(distDir).filter((f) => !share.exclude.has(resolve(f)));
const totalGz = files.reduce((acc, f) => acc + gzipSync(readFileSync(f)).length, 0);

const sha    = execSync('git rev-parse --short HEAD').toString().trim();
const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

const hostKitRaw = pkg.dependencies?.['@bilkobibitkov/host-kit'] ?? '0.0.0';
const hostKitVer = hostKitRaw.replace(/^[\^~]/, '');

const manifest = {
  schemaVersion: 1,
  slug: 'git-viewer',
  version: pkg.version,
  builtAt: new Date().toISOString(),
  gitSha: sha,
  gitBranch: branch,
  hostKit: { version: hostKitVer },
  golden: { path: '/projects/git-viewer/', expect: 'Bilko Bibitkov' },
  health: {},
  bundle: { sizeBytesGz: totalGz, fileCount: files.length },
};

writeFileSync(join(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
const shareNote = share.notes.length
  ? `; share assets not counted: ${share.notes.map((n) => `${n.name} ${(n.gzBytes / 1024).toFixed(1)} KB gz`).join(', ')}`
  : '';
console.log(`emit-manifest: git-viewer ${pkg.version} (${sha}, kit ${hostKitVer}, ${(totalGz / 1024).toFixed(1)} KB gz, ${files.length} files${shareNote})`);
