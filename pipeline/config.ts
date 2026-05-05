import 'dotenv/config';

export interface Config {
  user: string;
  token: string | undefined;
}

export function loadConfig(): Config {
  const user = process.env.GITHUB_USER?.trim();
  if (!user) {
    throw new Error(
      'GITHUB_USER is not set. Copy .env.example to .env and fill it in.',
    );
  }
  const token = process.env.GITHUB_TOKEN?.trim() || undefined;
  return { user, token };
}
