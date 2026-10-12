import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { exampleLogins, normalizeLoginInput } from '../data/landing';

const STEPS = [
  'Enter your GitHub username',
  'We read your public repos, commits and activity',
  'Share the link or download your résumé as a PDF',
];

const FREE = [
  '3 featured projects',
  'Contribution heatmap, streaks, activity',
  'Résumé PDF',
  'Refreshed at most once a day',
  'Public data only',
];

const PRO = [
  'Up to 12 projects you choose',
  'Daily refresh',
  'Writing tab from your <login>/<login> repo’s writing/ folder',
  'Cancel anytime via Manage billing',
];

const FAQ: ReadonlyArray<readonly [string, string]> = [
  [
    'Do you need access to my GitHub?',
    'No. Only public data is used, and no token is ever requested.',
  ],
  ['Are private repos shown?', 'No. Private repositories are never read or displayed.'],
  [
    'How do I claim and customize my portfolio?',
    'Open your portfolio and sign in with the account linked to your GitHub.',
  ],
  [
    'How do I cancel?',
    'Manage billing on your portfolio opens Stripe’s portal, where you can cancel anytime.',
  ],
];

export function Landing() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    document.title = 'Your Git, your Résumé · git-viewer by Bilko';
  }, []);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const login = normalizeLoginInput(inputRef.current?.value ?? '');
    if (!login) {
      setError(true);
      return;
    }
    setError(false);
    window.location.search = '?u=' + encodeURIComponent(login);
  };

  const focusInput = () => inputRef.current?.focus();

  return (
    <div className="landing">
      <header className="landing-hero">
        <div className="eyebrow">git-viewer</div>
        <h1>Your Git, your Résumé.</h1>
        <p className="landing-deck">
          Paste your GitHub username. Get an editorial portfolio and a print-ready résumé built
          from your real commits — no install, no token, no setup.
        </p>
        <form className="landing-form" aria-label="Build my portfolio" onSubmit={onSubmit}>
          <input
            ref={inputRef}
            type="text"
            name="login"
            placeholder="github username or profile URL"
            aria-label="GitHub username or profile URL"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-invalid={error}
            onChange={() => error && setError(false)}
          />
          <button type="submit">Build my portfolio</button>
        </form>
        {error && (
          <p className="landing-error" role="alert">
            That doesn’t look like a GitHub username.
          </p>
        )}
      </header>

      <section aria-labelledby="landing-example">
        <h2 id="landing-example">See an example</h2>
        <ul className="landing-examples">
          {exampleLogins.map((login) => (
            <li key={login}>
              <a href={'?u=' + encodeURIComponent(login)}>{login}</a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="landing-how">
        <h2 id="landing-how">How it works</h2>
        <ol className="landing-steps">
          {STEPS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="landing-pricing">
        <h2 id="landing-pricing">Pricing</h2>
        <div className="landing-plans">
          <div className="landing-plan">
            <h3>Free</h3>
            <div className="landing-price">$0</div>
            <ul>
              {FREE.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button type="button" onClick={focusInput}>
              Start free
            </button>
          </div>
          <div className="landing-plan pro">
            <h3>Pro</h3>
            <div className="landing-price">
              $5<span>/mo</span>
            </div>
            <ul>
              {PRO.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p className="landing-note">Included with bilko.run Pro, Business and Team.</p>
            <button type="button" onClick={focusInput}>
              Go Pro
            </button>
          </div>
        </div>
      </section>

      <section aria-labelledby="landing-faq">
        <h2 id="landing-faq">FAQ</h2>
        <dl className="landing-faq">
          {FAQ.map(([q, a]) => (
            <div key={q}>
              <dt>{q}</dt>
              <dd>{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="landing-foot">
        <a href="https://bilko.run/projects">by Bilko · bilko.run/projects</a>
      </footer>
    </div>
  );
}
