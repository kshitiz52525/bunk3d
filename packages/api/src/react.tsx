import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { BunkApi, Session } from './contract';

const Ctx = createContext<BunkApi | null>(null);

export function ApiProvider({ api, children }: { api: BunkApi; children: ReactNode }) {
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useApi(): BunkApi {
  const api = useContext(Ctx);
  if (!api) throw new Error('useApi must be used inside <ApiProvider>');
  return api;
}

export function useSession(): Session | null {
  const api = useApi();
  return useSyncExternalStore(api.auth.subscribe, api.auth.getSession, api.auth.getSession);
}

export type AsyncState<T> =
  | { status: 'loading'; data: undefined; reload: () => void }
  | { status: 'error'; data: undefined; error: unknown; reload: () => void }
  | { status: 'ready'; data: T; reload: () => void };

/** Every list has loading, error and (via the caller) empty states (S1). */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<{ status: 'loading' | 'error' | 'ready'; data?: T; error?: unknown }>({ status: 'loading' });
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const reload = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    let live = true;
    setState((s) => (s.status === 'ready' ? s : { status: 'loading' }));
    fnRef.current().then(
      (data) => live && setState({ status: 'ready', data }),
      (error) => live && setState({ status: 'error', error }),
    );
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload } as AsyncState<T>;
}
