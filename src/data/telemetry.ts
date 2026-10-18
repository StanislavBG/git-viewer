// Same wire format as bilko host-kit's track()/trackFlow(). host-kit isn't a dependency because the
// npm release lacks trackFlow and a file:../Bilko link would break the GH Pages CI install.
export const APP = 'git-viewer';
export const PRODUCT = 'git-viewer';
export const PLAN_PRO = 'pro';

const NAME_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
const PII_RE = /(email|password|token|key|ssn|card|cvv|apikey|login|name)/i;

export type Props = Record<string, string | number | boolean | null | undefined>;

export type TelemetryEvent = {
  app: string;
  name: string;
  ts: number;
  props: Record<string, string | number | boolean | null>;
};

// Only bilko.run has a same-origin ingest that stamps the shared session cookie ids.
export function telemetryEndpoint(hostname: string): string | null {
  return hostname === 'bilko.run' || hostname === 'www.bilko.run' ? '/api/telemetry/event' : null;
}

export function isValidName(s: string): boolean {
  return NAME_RE.test(s);
}

export function scrubProps(props: Props): TelemetryEvent['props'] {
  const out: TelemetryEvent['props'] = {};
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || PII_RE.test(k)) continue;
    out[k] = typeof v === 'string' ? v.slice(0, 80) : v;
  }
  return out;
}

export function buildEvent(name: string, props: Props, path: string, ts: number): TelemetryEvent {
  return { app: APP, name, ts, props: scrubProps({ ...props, path: props.path ?? path }) };
}

export function buildFlowEvent(
  flow: string,
  step: string,
  props: Props,
  path: string,
  ts: number,
): TelemetryEvent | null {
  if (!isValidName(flow) || !isValidName(step)) return null;
  return buildEvent(`${flow}.${step}`, { ...props, flow, step }, path, ts);
}

function send(ev: TelemetryEvent | null): void {
  if (!ev || typeof window === 'undefined') return;
  try {
    const url = telemetryEndpoint(window.location.hostname);
    if (!url) {
      if (import.meta.env?.DEV) console.debug('[telemetry]', ev.name, ev.props);
      return;
    }
    const body = JSON.stringify({ batch: [ev] });
    if (navigator.sendBeacon?.(url, new Blob([body], { type: 'application/json' }))) return;
    void fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => {});
  } catch {
    /* telemetry never breaks the app */
  }
}

export function track(name: string, props: Props = {}): void {
  if (typeof window === 'undefined') return;
  send(buildEvent(name, props, window.location.pathname, Date.now()));
}

export function trackFlow(flow: string, step: string, props: Props = {}): void {
  if (typeof window === 'undefined') return;
  send(buildFlowEvent(flow, step, props, window.location.pathname, Date.now()));
}

let lastScreen: string | null = null;
let prevScreen: string | null = null;

export function trackScreen(screen: string): void {
  if (!isValidName(screen) || screen === lastScreen) return;
  prevScreen = lastScreen;
  lastScreen = screen;
  track('screen_view', { screen });
}

// For modals acting as pages: re-emit whatever screen was showing before the modal opened.
export function restoreScreen(): void {
  if (prevScreen) trackScreen(prevScreen);
}

export function checkoutProps(source: string): Props {
  return { product: PRODUCT, plan: PLAN_PRO, source };
}

const BUILD_KEY = 'gv_build_pending';

export function markBuildPending(): void {
  try {
    sessionStorage.setItem(BUILD_KEY, '1');
  } catch {
    /* storage blocked */
  }
}

export function takeBuildPending(): boolean {
  try {
    const pending = sessionStorage.getItem(BUILD_KEY) === '1';
    sessionStorage.removeItem(BUILD_KEY);
    return pending;
  } catch {
    return false;
  }
}
