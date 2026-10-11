import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadConfig } from './config.js';
import { buildPortfolio } from './portfolio.js';
import { buildWriting } from './aggregate/writing.js';
import { formatDuration } from './util.js';

const __filename = fileURLToPath(import.meta.url);
const root = dirname(dirname(__filename));

async function main(): Promise<void> {
  const t0 = Date.now();
  const cfg = loadConfig();

  const { data } = await buildPortfolio({
    user: cfg.user,
    token: cfg.token,
    displayName: cfg.displayName,
    displayRole: cfg.displayRole,
    writing: buildWriting(root),
    log: console.log,
  });

  mkdirSync(join(root, 'public'), { recursive: true });
  // Anonymize the website: the public site must show the persona, never the
  // real GitHub login. One chokepoint over the whole serialized payload so the
  // handle, commit messages, and READMEs the dashboard renders are all scrubbed
  // at once. Case-sensitive on the exact login, so it never touches the
  // lowercase `stanislavbg.github.io` Pages host. The GitHub account itself
  // (cfg.user — used for the API and the loader's fetch host) is untouched.
  const json = JSON.stringify(data, null, 2).split(cfg.user).join(cfg.displayName);
  writeFileSync(join(root, 'public', 'data.json'), json);

  const elapsed = formatDuration(Date.now() - t0);
  console.log(`✓ public/data.json written (${elapsed})`);
  console.log(
    `  ${data.projects.length} projects · ${data.totalCommitsYear} commits/12mo · ${data.commits30}/30d`,
  );
}

main().catch((err: unknown) => {
  console.error('sync failed:', err);
  process.exit(1);
});
