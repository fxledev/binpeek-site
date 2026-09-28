













import { auroraText, gradientText, lineShadowText, numberTicker, shinyText, sparklesText, textAnimate } from './text';
import { borderBeam, magicCard, meteors, particles, ripple, shineBorder } from './effects';
import { animatedList, bentoGrid, dock, marquee, progressiveBlur, terminal } from './components';

export interface AuthConfig {
  url: string;
  anonKey: string;
}

const OFFER_ENDS = '2026-10-14T23:59:59Z';



interface Plan {
  id: 'trial' | 'monthly' | 'annual' | 'lifetime';
  was: number;
  now: number;
}

const PLANS: Record<Plan['id'], Plan> = {
  trial: { id: 'trial', was: 0, now: 0 },
  monthly: { id: 'monthly', was: 5.99, now: 4.19 },
  annual: { id: 'annual', was: 27, now: 18.9 },
  lifetime: { id: 'lifetime', was: 29.99, now: 20.99 },
};

const DISCOUNT = 0.7;
const OFFER_ACTIVE = Date.now() < Date.parse(OFFER_ENDS);



function countdown(): void {
  const nodes = [...document.querySelectorAll<HTMLElement>('[data-countdown]')];
  if (nodes.length === 0) return;
  const end = Date.parse(nodes[0]?.dataset.countdown ?? OFFER_ENDS);

  function tick(): void {
    const left = Math.max(0, end - Date.now());
    const total = Math.floor(left / 1000);
    const parts = {
      d: Math.floor(total / 86400),
      h: Math.floor((total % 86400) / 3600),
      m: Math.floor((total % 3600) / 60),
      s: total % 60,
    };
    for (const node of nodes) {
      for (const [unit, value] of Object.entries(parts)) {
        const slot = node.querySelector(`[data-unit="${unit}"]`);
        if (slot !== null) slot.textContent = String(value).padStart(2, '0');
      }
      if (left === 0) {
        node.classList.add('is-over');
        const copy = node.parentElement?.querySelector('.offer-copy');
        if (copy !== null && copy !== undefined) {
          copy.textContent = 'the launch offer is over, prices are back up';
        }
      }
    }
    if (left > 0) requestAnimationFrame(() => setTimeout(tick, 1000));
  }
  tick();
}



function prices(): void {
  for (const node of document.querySelectorAll<HTMLElement>('[data-price]')) {
    const plan = node.dataset.price as Plan['id'] | undefined;
    const spec = plan === undefined ? undefined : PLANS[plan];
    if (spec === undefined) continue;
    const value = OFFER_ACTIVE ? spec.now : spec.was;
    node.textContent = `$${value.toFixed(2)}`;
  }
  for (const node of document.querySelectorAll<HTMLElement>('[data-was]')) {
    
    node.hidden = !OFFER_ACTIVE;
  }
  for (const node of document.querySelectorAll<HTMLElement>('.plan-buy')) {
    const plan = node.dataset.buy as Plan['id'] | undefined;
    if (plan === undefined) continue;
    const spec = PLANS[plan];
    node.textContent = plan === 'trial' ? 'Start the 7 day trial' : `Buy for $${(OFFER_ACTIVE ? spec.now : spec.was).toFixed(2)}`;
  }
}



let config: AuthConfig | null = null;

function readConfig(): AuthConfig | null {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
  const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';
  if (url.length === 0 || key.length === 0) return null;
  return { url: url.replace(/\/+$/, ''), anonKey: key };
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
}

let session: Session | null = null;

async function api(path: string, init: RequestInit, token?: string | undefined): Promise<any> {
  if (config === null) throw new Error('this page is not wired to a Supabase project yet');
  const response = await fetch(`${config.url}${path}`, {
    ...init,
    headers: {
      apikey: config.anonKey,
      'content-type': 'application/json',
      ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  const body = text.length > 0 ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(String(body?.message ?? `the server answered ${response.status}`));
  }
  return body;
}

function toSession(data: any): Session {
  return {
    accessToken: String(data.access_token),
    refreshToken: String(data.refresh_token),
    userId: String(data.user.id),
    email: String(data.user.email ?? ''),
  };
}

async function signUp(email: string, password: string): Promise<Session> {
  const data = await api('/auth/v1/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data.access_token === undefined) {
    
    
    throw new Error('check your inbox and confirm the address, then sign in');
  }
  return toSession(data);
}

async function signIn(email: string, password: string): Promise<Session> {
  return toSession(
    await api('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  );
}

async function myLicences(token: string): Promise<Array<{ lic: string; plan: string; expires: string | null }>> {
  const rows = await api('/rest/v1/licences?select=lic,plan,expires', { method: 'GET' }, token);
  return Array.isArray(rows) ? rows : [];
}

const SESSION_KEY = 'binpeek.web.session';

function rememberSession(value: Session | null): void {
  session = value;
  if (value === null) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, JSON.stringify(value));
}

function restoreSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (raw === null) return null;
  try {
    session = JSON.parse(raw) as Session;
  } catch {
    session = null;
  }
  return session;
}



let pendingPlan: Plan['id'] = 'lifetime';

async function checkout(): Promise<void> {
  if (config === null) {
    throw new Error('this page is not wired to a Supabase project yet, so it cannot take payment');
  }
  if (session === null) throw new Error('sign in first');
  
  
  const response = await fetch(`${config.url}/functions/v1/create-checkout`, {
    method: 'POST',
    headers: {
      apikey: config.anonKey,
      authorization: `Bearer ${session.accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ plan: pendingPlan, discount: OFFER_ACTIVE ? DISCOUNT : 1 }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(String(body?.error ?? 'the payment service refused'));
  if (typeof body?.url !== 'string' || body.url.length === 0) {
    throw new Error('the payment service did not return a link');
  }
  window.location.assign(body.url);
}



function show(view: string): void {
  const sheet = document.querySelector<HTMLDialogElement>('[data-sheet]');
  if (sheet === null) return;
  for (const node of sheet.querySelectorAll<HTMLElement>('[data-view]')) {
    node.hidden = node.dataset.view !== view;
  }
  if (!sheet.open) sheet.showModal();
}

function note(text: string, kind: 'info' | 'error' = 'info'): void {
  const sheet = document.querySelector<HTMLDialogElement>('[data-sheet]');
  const slot = sheet?.querySelector<HTMLElement>('[data-note]');
  if (slot === null || slot === undefined) return;
  slot.textContent = text;
  slot.dataset.kind = kind;
}

async function renderAccount(): Promise<void> {
  const sheet = document.querySelector<HTMLDialogElement>('[data-sheet]');
  if (sheet === null) return;
  const email = sheet.querySelector<HTMLElement>('[data-account-email]');
  const box = sheet.querySelector<HTMLElement>('[data-licences]');
  if (email !== null && session !== null) email.textContent = session.email;
  if (box === null || session === null) return;
  box.replaceChildren();
  try {
    const rows = await myLicences(session.accessToken);
    if (rows.length === 0) {
      box.append(el('p', 'licence-empty', 'No licence on this account yet.'));
      return;
    }
    for (const row of rows) {
      const card = el('div', 'licence-card');
      card.append(
        el('p', 'licence-id', row.lic),
        el('p', 'licence-plan', row.plan),
        el('p', 'licence-expires', row.expires === null ? 'never expires' : `expires ${row.expires}`),
      );
      box.append(card);
    }
  } catch (error) {
    box.append(el('p', 'licence-empty', `could not read your licence: ${(error as Error).message}`));
  }
}

function el(tag: string, className: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function wire(): void {
  const sheet = document.querySelector<HTMLDialogElement>('[data-sheet]');
  if (sheet === null) return;

  sheet.querySelector('[data-close]')?.addEventListener('click', () => sheet.close());
  for (const node of sheet.querySelectorAll<HTMLElement>('[data-switch]')) {
    node.addEventListener('click', () => {
      const view = node.dataset.switch;
      if (view !== undefined) show(view);
    });
  }

  for (const node of document.querySelectorAll<HTMLElement>('[data-buy]')) {
    node.addEventListener('click', () => {
      const plan = node.dataset.buy as Plan['id'] | undefined;
      if (plan !== undefined) pendingPlan = plan;
      if (session === null) {
        show('signup');
        note('Create the account, then you pay. The licence lands in it.');
        return;
      }
      show('pay');
      const lede = sheet.querySelector<HTMLElement>('[data-pay-lede]');
      if (lede !== null) {
        const spec = PLANS[pendingPlan];
        lede.textContent =
          pendingPlan === 'trial'
            ? 'A week, no card, every engine. It expires on its own.'
            : `You are about to pay $${(OFFER_ACTIVE ? spec.now : spec.was).toFixed(2)} for the ${spec.id} plan.`;
      }
    });
  }

  document.querySelector('[data-account]')?.addEventListener('click', () => {
    if (session === null) {
      show('signin');
      return;
    }
    show('account');
    void renderAccount();
  });

  sheet.querySelector('[data-signout]')?.addEventListener('click', () => {
    rememberSession(null);
    sheet.close();
  });

  sheet.querySelector('[data-checkout]')?.addEventListener('click', () => {
    note('opening Stripe');
    void checkout().catch((error: Error) => note(error.message, 'error'));
  });

  const signup = sheet.querySelector<HTMLFormElement>('[data-signup]');
  signup?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(signup);
    const email = String(data.get('email') ?? '');
    const password = String(data.get('password') ?? '');
    note('creating the account');
    void signUp(email, password)
      .then((created) => {
        rememberSession(created);
        show('account');
        void renderAccount();
      })
      .catch((error: Error) => note(error.message, 'error'));
  });

  const signin = sheet.querySelector<HTMLFormElement>('[data-signin-form]');
  signin?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(signin);
    note('signing in');
    void signIn(String(data.get('email') ?? ''), String(data.get('password') ?? ''))
      .then((found) => {
        rememberSession(found);
        show('account');
        void renderAccount();
      })
      .catch((error: Error) => note(error.message, 'error'));
  });
}

/* ------------------------------------------------------- magic ui effects */

function applyTextEffects(): void {
  for (const node of document.querySelectorAll<HTMLElement>('[data-text-effect]')) {
    const effect = node.dataset.textEffect;
    if (effect === 'shiny') shinyText(node, { shimmerWidth: 120 });
    else if (effect === 'sparkles') sparklesText(node, { count: 9 });
    else if (effect === 'line-shadow') lineShadowText(node, { shadowColor: '#8f8f8f' });
    else if (effect === 'aurora') auroraText(node, { speed: 0.6 });
    else if (effect === 'animate') textAnimate(node, { animation: 'fadeIn', by: 'word' });
    else if (effect === 'gradient') gradientText(node, { speed: 1.4 });
  }
}

function applyTicker(): void {
  const nodes = [...document.querySelectorAll<HTMLElement>('[data-ticker]')];
  if (nodes.length === 0) return;

  const show = (node: HTMLElement): void => {
    const value = Number(node.dataset.ticker ?? '0');
    numberTicker(node, { value, delay: 0.1 });
  };

  if (!('IntersectionObserver' in window)) {
    for (const node of nodes) show(node);
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        show(entry.target as HTMLElement);
      }
    },
    { threshold: 0.6 },
  );
  for (const node of nodes) observer.observe(node);
}

function applyTerminal(): void {
  const host = document.querySelector<HTMLElement>('[data-terminal]');
  if (host === null) return;
  terminal(host, {
    command: 'binpeek',
    duration: 34,
    delay: 320,
    lines: [
      { text: 'binpeek inspect Clumps-2.1.0.jar', tone: 'bright', typing: true },
      { text: 'read 175 classes, 1054 methods', tone: 'dim' },
      { text: 'constant pool ok, no bad magic', tone: 'dim' },
      { text: 'net/fabricmc/fabric/IMinecraft: native calls, 2', tone: 'dim' },
      { text: 'high entropy constants: 41 classes', tone: 'dim' },
      { text: 'dispatcher detected in 6 methods', tone: 'dim' },
      { text: 'score 38 / 100, band: light', tone: 'bright' },
      { text: '0 bytes left this machine', tone: 'dim' },
    ],
  });
}

function applyList(): void {
  const host = document.querySelector<HTMLElement>('[data-list]');
  if (host === null) return;
  animatedList(host, {
    delay: 2000,
    items: [
      { title: 'String table is encrypted', detail: 'owner decrypts at class init' },
      { title: 'Control flow is flattened', detail: 'switch dispatcher over a state var' },
      { title: 'Debug info stripped', detail: 'no line numbers, no local var names' },
      { title: 'A native load in the archive', detail: 'LDC of a library that is not JDK' },
    ],
  });
}

function applyDock(): void {
  const host = document.querySelector<HTMLElement>('[data-dock]');
  if (host === null) return;
  dock(host, { size: 40, magnification: 60, distance: 140 });
}

function applyBackdropFx(): void {
  const fx = (name: string): HTMLElement | null =>
    document.querySelector<HTMLElement>(`[data-fx="${name}"]`);

  const field = fx('particles');
  if (field !== null) particles(field, { quantity: 70, ease: 90, color: '#ffffff' });

  const sky = fx('meteors');
  if (sky !== null) meteors(sky, { number: 14, angle: 215 });

  const hero = fx('hero');
  if (hero !== null) ripple(hero, { numCircles: 7 });

  const wash = fx('aurora-wash');
  if (wash !== null) particles(wash, { quantity: 0 });
}

function applyCards(): void {
  for (const node of document.querySelectorAll<HTMLElement>('[data-magic]')) {
    magicCard(node, { gradientSize: 220, gradientOpacity: 0.75 });
  }
  for (const node of document.querySelectorAll<HTMLElement>('[data-beam]')) {
    borderBeam(node, { size: 120, duration: 7, colorFrom: '#ffffff', colorTo: '#2f2f2f' });
  }
  for (const node of document.querySelectorAll<HTMLElement>('[data-bento]')) {
    bentoGrid(node);
  }
  const blurHost = document.querySelector<HTMLElement>('[data-blur-host]');
  if (blurHost !== null) {
    blurHost.classList.add('mu-pblur-host');
    const blur = document.createElement('div');
    blur.setAttribute('aria-hidden', 'true');
    blurHost.append(blur);
    progressiveBlur(blur, { position: 'bottom', height: '26%' });
  }
  const offer = document.querySelector<HTMLElement>('.offer');
  if (offer !== null) shineBorder(offer, { duration: 16 });
  const heroButton = document.querySelector<HTMLElement>('[data-fx-button]');
  if (heroButton !== null) shineBorder(heroButton, { duration: 9 });
}

function applyMarquee(): void {
  for (const node of document.querySelectorAll<HTMLElement>('[data-marquee-host]')) {
    marquee(node, { repeat: 4, duration: 38, pauseOnHover: true });
  }
}

config = readConfig();
restoreSession();
countdown();
prices();
wire();
applyTextEffects();
applyTicker();
applyBackdropFx();
applyCards();
applyMarquee();
applyTerminal();
applyList();
applyDock();
