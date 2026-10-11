import { useCallback, useEffect, useState } from 'react';
import { useTenant } from '../data/loader';
import {
  buildCheckoutRequest,
  buildClaimRequest,
  parseCheckoutResponse,
  parseClaimResponse,
} from '../data/claim';

type ClerkLike = {
  load: () => Promise<void>;
  openSignIn: () => void;
  addListener: (cb: () => void) => void;
  session?: { getToken: () => Promise<string | null> } | null;
  user?: { primaryEmailAddress?: { emailAddress: string } | null } | null;
};

// Publishable keys are public; defaulting it means a plain `pnpm build` can't ship sign-in disabled.
const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_live_Y2xlcmsuYmlsa28ucnVuJA';
// Loaded from the host's Clerk Frontend API at runtime (as bilko host-kit does) — bundling
// @clerk/clerk-js adds ~830 KB gz and blows the bilko.run publish budget.
const CLERK_SCRIPT_SRC = `https://${atob(CLERK_KEY.split('_')[2] ?? '').replace(/\$$/, '')}/npm/@clerk/clerk-js@5/dist/clerk.browser.js`;

declare global {
  interface Window {
    Clerk?: ClerkLike;
  }
}

let clerkPromise: Promise<ClerkLike> | null = null;

function injectClerkScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Clerk) return resolve();
    const script = document.createElement('script');
    script.src = CLERK_SCRIPT_SRC;
    script.setAttribute('data-clerk-publishable-key', CLERK_KEY);
    script.crossOrigin = 'anonymous';
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => {
      script.remove();
      reject(new Error('Failed to load sign-in'));
    });
    document.head.appendChild(script);
  });
}

function loadClerk(): Promise<ClerkLike> {
  clerkPromise ??= injectClerkScript().then(async () => {
    const clerk = window.Clerk;
    if (!clerk) throw new Error('Failed to load sign-in');
    await clerk.load();
    return clerk;
  });
  clerkPromise.catch(() => {
    clerkPromise = null;
  });
  return clerkPromise;
}

type Msg = { kind: 'ok' | 'err'; text: string } | null;

export function useHostedActions() {
  const tenant = useTenant();
  const [clerk, setClerk] = useState<ClerkLike | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;
    loadClerk()
      .then((c) => {
        if (cancelled) return;
        setClerk(c);
        setSignedIn(!!c.user);
        c.addListener(() => setSignedIn(!!c.user));
      })
      .catch((e) => {
        if (!cancelled) setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [tenant?.login]);

  const signIn = useCallback(() => clerk?.openSignIn(), [clerk]);

  const claim = useCallback(async () => {
    if (!clerk || !tenant) return;
    setBusy(true);
    setMsg(null);
    try {
      const token = await clerk.session?.getToken();
      if (!token) {
        clerk.openSignIn();
        return;
      }
      const req = buildClaimRequest({ origin: window.location.origin, login: tenant.login, token });
      const r = await fetch(req.url, req.init);
      const res = parseClaimResponse(r.status, await r.json().catch(() => null));
      if (res.status === 'claimed') {
        setMsg({ kind: 'ok', text: 'Portfolio claimed. Changes show up within ~5 minutes.' });
      } else if (res.status === 'sign_in_required') {
        clerk.openSignIn();
      } else if (res.status === 'not_owner') {
        setMsg({ kind: 'err', text: 'Your linked GitHub account does not match this portfolio.' });
      } else {
        setMsg({ kind: 'err', text: res.message });
      }
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }, [clerk, tenant]);

  const upgrade = useCallback(async () => {
    if (!clerk) return;
    const email = clerk.user?.primaryEmailAddress?.emailAddress;
    if (!email) {
      clerk.openSignIn();
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const req = buildCheckoutRequest({ origin: window.location.origin, email });
      const r = await fetch(req.url, req.init);
      const res = parseCheckoutResponse(r.status, await r.json().catch(() => null));
      if (res.status === 'redirect') window.location.assign(res.url);
      else setMsg({ kind: 'err', text: res.message });
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }, [clerk]);

  return { tenant, ready: !!clerk, signedIn, busy, msg, signIn, claim, upgrade };
}

export function ClaimBar() {
  const h = useHostedActions();
  if (!h.tenant) return null;
  return (
    <div className="claim-bar">
      <span>Hosted portfolio · {h.tenant.login} · {h.tenant.tier}</span>
      {!h.signedIn ? (
        <button disabled={!h.ready} onClick={h.signIn}>Sign in</button>
      ) : (
        <>
          <button disabled={h.busy} onClick={() => void h.claim()}>Claim this portfolio</button>
          {h.tenant.tier === 'free' && (
            <button disabled={h.busy} onClick={() => void h.upgrade()}>Upgrade — $5/mo</button>
          )}
        </>
      )}
      {h.msg && <span className={`claim-msg ${h.msg.kind}`}>{h.msg.text}</span>}
    </div>
  );
}

export function UpgradeButton() {
  const h = useHostedActions();
  return (
    <button className="upgrade-btn" disabled={h.busy || !h.ready} onClick={() => void (h.signedIn ? h.upgrade() : h.signIn())}>
      {h.signedIn ? 'Unlock all projects — $5/mo' : 'Sign in to unlock all projects — $5/mo'}
    </button>
  );
}
