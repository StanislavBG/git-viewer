import 'dotenv/config';

// Public-facing persona name. The GitHub account (GITHUB_USER) stays the real
// login so the API sync and repo URLs keep working; only the displayed name is
// anonymized. Override with GITHUB_DISPLAY_NAME if the persona changes.
const DEFAULT_DISPLAY_NAME = 'Bilko Bibitkov';

// Public-facing role line. Overrides the bio-inferred role so the persona reads
// as intended regardless of what the GitHub profile says. Override with
// GITHUB_DISPLAY_ROLE if the persona changes.
const DEFAULT_DISPLAY_ROLE = 'Solopreneur and farmer in the making';

export interface Config {
  user: string;
  token: string | undefined;
  displayName: string;
  displayRole: string;
}

export function loadConfig(): Config {
  const user = process.env.GITHUB_USER?.trim();
  if (!user) {
    throw new Error(
      'GITHUB_USER is not set. Copy .env.example to .env and fill it in.',
    );
  }
  const token = process.env.GITHUB_TOKEN?.trim() || undefined;
  const displayName = process.env.GITHUB_DISPLAY_NAME?.trim() || DEFAULT_DISPLAY_NAME;
  const displayRole = process.env.GITHUB_DISPLAY_ROLE?.trim() || DEFAULT_DISPLAY_ROLE;
  return { user, token, displayName, displayRole };
}
