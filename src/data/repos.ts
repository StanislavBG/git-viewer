export type PickerRepo = {
  name: string;
  description: string;
  stars: number;
  pushedAt: string;
  fork: boolean;
};

export type ParsedRepos =
  | { status: 'ok'; repos: PickerRepo[] }
  | { status: 'rate_limited' }
  | { status: 'error'; message: string };

export function publicReposUrl(login: string): string {
  return `https://api.github.com/users/${encodeURIComponent(login)}/repos?per_page=100&type=owner&sort=pushed`;
}

function asRecord(body: unknown): Record<string, unknown> | null {
  return body && typeof body === 'object' && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null;
}

export function parsePublicRepos(httpStatus: number, body: unknown): ParsedRepos {
  if (httpStatus === 403 || httpStatus === 429) return { status: 'rate_limited' };
  if (httpStatus !== 200) return { status: 'error', message: `GitHub returned ${httpStatus}` };
  if (!Array.isArray(body)) return { status: 'error', message: 'Unexpected response from GitHub' };
  const repos: PickerRepo[] = [];
  for (const item of body) {
    const r = asRecord(item);
    if (!r || typeof r.name !== 'string') continue;
    if (r.archived === true || r.private === true) continue;
    repos.push({
      name: r.name,
      description: typeof r.description === 'string' ? r.description : '',
      stars: typeof r.stargazers_count === 'number' ? r.stargazers_count : 0,
      pushedAt: typeof r.pushed_at === 'string' ? r.pushed_at : '',
      fork: r.fork === true,
    });
  }
  repos.sort((a, b) => {
    if (a.fork !== b.fork) return a.fork ? 1 : -1;
    return a.pushedAt < b.pushedAt ? 1 : a.pushedAt > b.pushedAt ? -1 : 0;
  });
  return { status: 'ok', repos };
}
