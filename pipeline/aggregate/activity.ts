import type { ActivityEvent, ActivityType } from '../../src/types.js';
import type { EventRaw } from '../sources/github.js';

const FEED_LIMIT = 25;

interface PullPayload {
  action?: string;
  pull_request?: { merged?: boolean; title?: string; html_url?: string };
}
interface IssuePayload {
  action?: string;
  issue?: { title?: string; html_url?: string };
}
interface ReleasePayload {
  release?: { name?: string | null; tag_name?: string; html_url?: string };
}
interface CreatePayload {
  ref_type?: string;
}

function repoUrl(repo: string): string {
  return `https://github.com/${repo}`;
}

function map(event: EventRaw): ActivityEvent | null {
  const repo = event.repo.name;
  const ts = event.created_at ?? '';
  if (!ts) return null;

  switch (event.type) {
    case 'PullRequestEvent': {
      const p = event.payload as PullPayload;
      if (p.action === 'opened') {
        return {
          type: 'pr_opened',
          repo,
          title: p.pull_request?.title ?? 'pull request opened',
          url: p.pull_request?.html_url,
          ts,
        };
      }
      if (p.action === 'closed' && p.pull_request?.merged) {
        return {
          type: 'pr_merged',
          repo,
          title: p.pull_request?.title ?? 'pull request merged',
          url: p.pull_request?.html_url,
          ts,
        };
      }
      return null;
    }
    case 'IssuesEvent': {
      const p = event.payload as IssuePayload;
      const t: ActivityType | null =
        p.action === 'opened' ? 'issue_opened'
        : p.action === 'closed' ? 'issue_closed'
        : null;
      if (!t) return null;
      return {
        type: t,
        repo,
        title: p.issue?.title ?? 'issue',
        url: p.issue?.html_url,
        ts,
      };
    }
    case 'ReleaseEvent': {
      const p = event.payload as ReleasePayload;
      const tag = p.release?.tag_name ?? '';
      const name = p.release?.name ?? tag;
      return {
        type: 'release',
        repo,
        title: `released ${name || tag}`,
        url: p.release?.html_url,
        ts,
      };
    }
    case 'WatchEvent':
      return { type: 'starred', repo, title: `starred ${repo}`, url: repoUrl(repo), ts };
    case 'ForkEvent':
      return { type: 'forked', repo, title: `forked ${repo}`, url: repoUrl(repo), ts };
    case 'CreateEvent': {
      const p = event.payload as CreatePayload;
      if (p.ref_type === 'repository') {
        return { type: 'created_repo', repo, title: `created ${repo}`, url: repoUrl(repo), ts };
      }
      return null;
    }
    default:
      return null;
  }
}

export function buildActivity(events: EventRaw[]): ActivityEvent[] {
  const out: ActivityEvent[] = [];
  for (const ev of events) {
    const m = map(ev);
    if (m) out.push(m);
    if (out.length >= FEED_LIMIT) break;
  }
  return out;
}
