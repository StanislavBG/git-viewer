import type { Developer } from '../../src/types.js';
import type { DeveloperRaw } from '../sources/github.js';

function inferRole(bio: string | null, company: string | null): string {
  const text = `${bio ?? ''} ${company ?? ''}`.toLowerCase();
  if (/\b(systems?|infra|backend|distributed)\b/.test(text)) return 'Systems engineer';
  if (/\b(ml|ai|data scientist|llm)\b/.test(text))             return 'ML engineer';
  if (/\b(frontend|react|design)\b/.test(text))                return 'Frontend engineer';
  if (/\b(founder|cto|ceo)\b/.test(text))                      return 'Founder';
  return 'Software engineer';
}

export function buildDeveloper(raw: DeveloperRaw): Developer {
  const joined = raw.createdAt ? raw.createdAt.slice(0, 4) : '';
  return {
    name: raw.name ?? raw.login,
    handle: raw.login,
    role: inferRole(raw.bio, raw.company),
    location: raw.location ?? '',
    bio: raw.bio ?? '',
    email: raw.email ?? '',
    joined,
    avatarUrl: raw.avatarUrl,
  };
}
