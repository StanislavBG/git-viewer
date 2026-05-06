// GitHub GraphQL enrichment. Hits user.contributionsCollection.contributionCalendar
// to get the same numbers GitHub's own profile page shows (counts include
// private contribs the PAT can read, PR reviews, issues opened, etc. — things
// REST `/commits` does NOT see).
//
// Requires a PAT (GraphQL is gated). Returns null when unauthenticated.

export interface ContribDay {
  date: string;
  contributionCount: number;
}

export async function fetchContributionCalendar(
  user: string,
  token: string | undefined,
  fromIso: string,
  toIso: string,
): Promise<{ totalContributions: number; days: ContribDay[] } | null> {
  if (!token) return null;
  const query = `query($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'git-viewer/0.1.0',
    },
    body: JSON.stringify({
      query,
      variables: { login: user, from: fromIso, to: toIso },
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    data?: {
      user?: {
        contributionsCollection?: {
          contributionCalendar?: {
            totalContributions: number;
            weeks: { contributionDays: ContribDay[] }[];
          };
        };
      };
    };
    errors?: unknown;
  };
  const cal = json.data?.user?.contributionsCollection?.contributionCalendar;
  if (!cal) return null;
  const days = cal.weeks.flatMap((w) => w.contributionDays);
  return { totalContributions: cal.totalContributions, days };
}

// PRD-04. Pulls the achievement-relevant counters in one round trip.
// `mergedPRsTotal` is the public count of PRs the user opened that landed
// merged (proxy for pull-shark; differs from native "PR was merged BY user"
// but is the closest public-API analog). `sponsoringTotal` and
// `discussionsAnswered` come from the same query to keep the call count down.
export async function fetchAchievementCounters(
  user: string,
  token: string | undefined,
): Promise<{
  mergedPRsTotal: number;
  sponsoringTotal: number;
  discussionsAnswered: number;
} | null> {
  if (!token) return null;
  const query = `query($login: String!, $q: String!) {
    user(login: $login) {
      pullRequests(states: MERGED) { totalCount }
      sponsoring { totalCount }
    }
    search(query: $q, type: ISSUE, first: 1) { issueCount }
  }`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'user-agent': 'git-viewer/0.1.0',
    },
    body: JSON.stringify({
      query,
      variables: {
        login: user,
        q: `type:DISCUSSION involves:${user} is:answered`,
      },
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    data?: {
      user?: {
        pullRequests?: { totalCount: number };
        sponsoring?: { totalCount: number };
      };
      search?: { issueCount: number };
    };
  };
  return {
    mergedPRsTotal: json.data?.user?.pullRequests?.totalCount ?? 0,
    sponsoringTotal: json.data?.user?.sponsoring?.totalCount ?? 0,
    discussionsAnswered: json.data?.search?.issueCount ?? 0,
  };
}
