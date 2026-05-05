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
