import { useCallback, useEffect, useState } from 'react';
import { useGitData, useTenant } from '../data/loader';
import { RepoPicker } from './RepoPicker';
import {
  buildCheckoutRequest,
  buildClaimRequest,
  buildPortalRequest,
  checkoutReturnUrls,
  parseCheckoutFlag,
  parseCheckoutResponse,
  parseClaimResponse,
  parsePortalResponse,
} from '../data/claim';
import { PRODUCT, checkoutProps, restoreScreen, trackFlow, trackScreen } from '../data/telemetry';
import { version as APP_VERSION } from '../../package.json';

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
// useHostedActions mounts once per ClaimBar/UpgradeButton; the Stripe return is one event.
let checkoutReturnTracked = false;

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

export const RESUME_ARTIFACT = { artifact: 'resume-pdf', version: APP_VERSION, platform: 'web' } as const;

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

  useEffect(() => {
    if (!tenant) return;
    const flag = parseCheckoutFlag(window.location.search);
    if (flag && !checkoutReturnTracked) {
      checkoutReturnTracked = true;
      trackFlow('checkout', flag, checkoutProps('stripe-return'));
    }
    if (flag === 'success') {
      setMsg({ kind: 'ok', text: 'Payment received — your portfolio switches to Pro within ~5 minutes. Reload to check.' });
    } else if (flag === 'cancel') {
      setMsg({ kind: 'ok', text: 'Checkout cancelled — you’re still on the free plan.' });
    }
  }, [tenant?.login]);

  const signIn = useCallback(() => clerk?.openSignIn(), [clerk]);

  const claim = useCallback(async (allowlist?: string[]): Promise<boolean> => {
    if (!clerk || !tenant) return false;
    const mode = allowlist ? 'choose-projects' : 'claim';
    trackFlow('claim', 'start', { mode, tier: tenant.tier });
    let claimed = false;
    setBusy(true);
    setMsg(null);
    try {
      const token = await clerk.session?.getToken();
      if (!token) {
        trackFlow('claim', 'fail', { mode, reason: 'sign-in-required' });
        clerk.openSignIn();
        return false;
      }
      const req = buildClaimRequest({ origin: window.location.origin, login: tenant.login, token, allowlist });
      const r = await fetch(req.url, req.init);
      const res = parseClaimResponse(r.status, await r.json().catch(() => null));
      if (res.status === 'claimed') {
        claimed = true;
        trackFlow('claim', 'success', { mode, tier: res.tier, projects: res.allowlist.length });
        setMsg({ kind: 'ok', text: 'Portfolio claimed. Changes show up within ~5 minutes.' });
      } else if (res.status === 'sign_in_required') {
        trackFlow('claim', 'fail', { mode, reason: 'sign-in-required' });
        clerk.openSignIn();
      } else if (res.status === 'not_owner') {
        trackFlow('claim', 'fail', { mode, reason: 'not-owner' });
        setMsg({ kind: 'err', text: 'Your linked GitHub account does not match this portfolio.' });
      } else {
        trackFlow('claim', 'fail', { mode, reason: 'error', http: r.status });
        setMsg({ kind: 'err', text: res.message });
      }
    } catch (e) {
      trackFlow('claim', 'fail', { mode, reason: 'network' });
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
    return claimed;
  }, [clerk, tenant]);

  const upgrade = useCallback(async (source: string) => {
    if (!clerk) return;
    const props = checkoutProps(source);
    const email = clerk.user?.primaryEmailAddress?.emailAddress;
    if (!email) {
      trackFlow('checkout', 'fail', { ...props, reason: 'sign-in-required' });
      clerk.openSignIn();
      return;
    }
    const claimed = await claim();
    if (!claimed) {
      trackFlow('checkout', 'fail', { ...props, reason: 'claim-failed' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const { successUrl, cancelUrl } = checkoutReturnUrls(window.location.href);
      const req = buildCheckoutRequest({ origin: window.location.origin, email, successUrl, cancelUrl });
      const r = await fetch(req.url, req.init);
      const res = parseCheckoutResponse(r.status, await r.json().catch(() => null));
      if (res.status === 'redirect') {
        trackFlow('checkout', 'checkout-redirect', props);
        window.location.assign(res.url);
      } else {
        trackFlow('checkout', 'fail', { ...props, reason: 'error', http: r.status });
        setMsg({ kind: 'err', text: res.message });
      }
    } catch (e) {
      trackFlow('checkout', 'fail', { ...props, reason: 'network' });
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }, [clerk, claim]);

  const manageBilling = useCallback(async (): Promise<void> => {
    if (!clerk) return;
    trackFlow('billing-portal', 'start', { product: PRODUCT });
    const email = clerk.user?.primaryEmailAddress?.emailAddress;
    if (!email) {
      trackFlow('billing-portal', 'fail', { reason: 'sign-in-required' });
      clerk.openSignIn();
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const back = new URL(window.location.href);
      back.searchParams.delete('checkout');
      const req = buildPortalRequest({ origin: window.location.origin, email, returnUrl: back.toString() });
      const r = await fetch(req.url, req.init);
      const res = parsePortalResponse(r.status, await r.json().catch(() => null));
      if (res.status === 'redirect') {
        trackFlow('billing-portal', 'success');
        window.location.assign(res.url);
      } else if (res.status === 'no_customer') {
        trackFlow('billing-portal', 'fail', { reason: 'no-customer' });
        setMsg({ kind: 'err', text: `No subscription found for ${email}.` });
      } else {
        trackFlow('billing-portal', 'fail', { reason: 'error', http: r.status });
        setMsg({ kind: 'err', text: res.message });
      }
    } catch (e) {
      trackFlow('billing-portal', 'fail', { reason: 'network' });
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }, [clerk]);

  return { tenant, ready: !!clerk, signedIn, busy, msg, signIn, claim, upgrade, manageBilling };
}

export function ClaimBar() {
  const h = useHostedActions();
  const { projects } = useGitData();
  const [picking, setPicking] = useState(false);
  const offerShown = h.signedIn && h.tenant?.tier === 'free';
  useEffect(() => {
    if (offerShown) trackFlow('checkout', 'view-offer', checkoutProps('claim-bar'));
  }, [offerShown]);
  useEffect(() => {
    if (picking) trackScreen('repo-picker');
  }, [picking]);
  if (!h.tenant) return null;
  const resumeUrl = new URL(window.location.href);
  resumeUrl.searchParams.set('print', '1');
  resumeUrl.searchParams.delete('checkout');
  return (
    <div className="claim-bar">
      <a
        className="resume-link"
        href={resumeUrl.toString()}
        data-track="download-resume-pdf"
        onClick={() => trackFlow('download', 'click-download', RESUME_ARTIFACT)}
        style={{ font: 'inherit', fontWeight: 600, color: 'inherit', textDecoration: 'underline', border: '1px solid currentColor', padding: '2px 10px', borderRadius: 4 }}
      >
        Résumé PDF
      </a>
      <span data-track-redact>Hosted portfolio · {h.tenant.login} · {h.tenant.tier}</span>
      {!h.signedIn ? (
        <button data-track="subscribe-sign-in" disabled={!h.ready} onClick={h.signIn}>Sign in</button>
      ) : (
        <>
          <button data-track="subscribe-claim" disabled={h.busy} onClick={() => void h.claim()}>Claim this portfolio</button>
          {h.tenant.tier === 'free' && (
            <button
              data-track="subscribe-upgrade"
              disabled={h.busy}
              onClick={() => {
                trackFlow('checkout', 'click-buy', checkoutProps('claim-bar'));
                void h.upgrade('claim-bar');
              }}
            >
              Upgrade — $5/mo
            </button>
          )}
          {h.tenant.tier === 'paid' && (
            <>
              <button data-track="subscribe-choose-projects" disabled={h.busy} onClick={() => setPicking(true)}>Choose projects</button>
              <button data-track="subscribe-manage-billing" disabled={h.busy} onClick={() => void h.manageBilling()}>Manage billing</button>
            </>
          )}
        </>
      )}
      {h.msg && <span className={`claim-msg ${h.msg.kind}`} data-track-redact>{h.msg.text}</span>}
      {picking && (
        <RepoPicker
          login={h.tenant.login}
          initial={projects.map((p) => p.name)}
          onSave={async (names) => {
            if (await h.claim(names)) {
              setPicking(false);
              restoreScreen();
            }
          }}
          onClose={() => {
            setPicking(false);
            restoreScreen();
          }}
        />
      )}
    </div>
  );
}

export function UpgradeButton() {
  const h = useHostedActions();
  useEffect(() => {
    trackFlow('checkout', 'view-offer', checkoutProps('projects-tab'));
  }, []);
  return (
    <button
      className="upgrade-btn"
      data-track="subscribe-unlock-all"
      disabled={h.busy || !h.ready}
      onClick={() => {
        trackFlow('checkout', 'click-buy', checkoutProps('projects-tab'));
        void (h.signedIn ? h.upgrade('projects-tab') : h.signIn());
      }}
    >
      {h.signedIn ? 'Unlock all projects — $5/mo' : 'Sign in to unlock all projects — $5/mo'}
    </button>
  );
}
