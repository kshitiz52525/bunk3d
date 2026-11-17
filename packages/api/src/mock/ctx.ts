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

export function createCtx(opts: MockOptions = {}): MockCtx {
  let session: Session | null = null;
  const listeners = new Set<() => void>();
  const setSession = (s: Session | null) => {
    session = s;
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
    profile: null,
  };
  return ctx;
}
