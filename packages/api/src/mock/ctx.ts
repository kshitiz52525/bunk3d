import type { Session } from '../contract';

export type MockOptions = {
  latencyMs?: number;
  now?: () => number;
  /** Campus wave for the mock user (1-4). Default 4 so every screen is reachable in dev. */
  wave?: 1 | 2 | 3 | 4;
};

/** Shared mock state handed to every domain slice. */
export type MockCtx = {
  wait: (ms?: number) => Promise<void>;
  now: () => number;
  wave: 1 | 2 | 3 | 4;
  getSession: () => Session | null;
  /** Current user's id; throws if signed out. */
  requireUser: () => string;
  setSession: (s: Session | null) => void;
  patchSession: (p: Partial<Session>) => void;
  subscribe: (fn: () => void) => () => void;
  /** The signed-in user's profile basics, shared across slices. Set by onboarding / seeded for the returning user. */
  profile: { name: string; username: string; degree?: string; dept?: string; year?: string; photoUri?: string } | null;
};

const STORE_KEY = 'bunk3d.mock.session';
type Store = { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void };
/** Browser-only convenience so a reload does not sign the dev user out. Absent on native; never throws. */
const store = (): Store | null => {
  try { return (globalThis as { localStorage?: Store }).localStorage ?? null; } catch { return null; }
};
function restore(): { session: Session; profile: MockCtx['profile'] } | null {
  try { const raw = store()?.getItem(STORE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function createCtx(opts: MockOptions = {}): MockCtx {
  const saved = opts.latencyMs === undefined ? restore() : null; // tests pass latencyMs and stay isolated
  let session: Session | null = saved?.session ?? null;
  const listeners = new Set<() => void>();
  const setSession = (s: Session | null) => {
    session = s;
    if (opts.latencyMs === undefined) {
      try { if (s) store()?.setItem(STORE_KEY, JSON.stringify({ session: s, profile: ctx.profile })); else store()?.removeItem(STORE_KEY); } catch { /* storage unavailable */ }
    }
    listeners.forEach((l) => l());
  };
  const ctx: MockCtx = {
    wait: (ms) => new Promise<void>((r) => setTimeout(r, opts.latencyMs ?? ms ?? 150)),
    now: opts.now ?? (() => Date.now()),
    wave: opts.wave ?? 4,
    getSession: () => session,
    requireUser: () => {
      if (!session) throw new Error('Not signed in');
      return session.userId;
    },
    setSession,
    patchSession: (p) => session && setSession({ ...session, ...p }),
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    profile: saved?.profile ?? null,
  };
  return ctx;
}
