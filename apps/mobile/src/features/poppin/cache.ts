import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

type Cached<T> = { at: number; data: T };
const PREFIX = 'bunk3d.cache.';

export async function readCache<T>(key: string): Promise<Cached<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as Cached<T>) : null;
  } catch { return null; }
}
export async function writeCache<T>(key: string, data: T) {
  try { await AsyncStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), data })); } catch { /* storage unavailable */ }
}
export async function dropCache(key: string) {
  try { await AsyncStorage.removeItem(PREFIX + key); } catch { /* storage unavailable */ }
}

/** True when the browser reports no connection. Native builds rely on the API call failing instead. */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && 'onLine' in navigator && navigator.onLine === false;
}

export type CachedState<T> =
  | { status: 'loading'; data: undefined; offlineSince: null; reload: () => void }
  | { status: 'error'; data: undefined; offlineSince: null; reload: () => void }
  | { status: 'ready'; data: T; offlineSince: number | null; reload: () => void };

/**
 * Loads from the API and keeps the last good answer on the device (S1 offline: banner + cache).
 * If the call fails or the device is offline and a cached copy exists, it is shown with `offlineSince` set.
 */
export function useCachedAsync<T>(key: string, fn: () => Promise<T>, deps: unknown[]): CachedState<T> {
  const [state, setState] = useState<{ key: string; status: 'loading' | 'error' | 'ready'; data?: T; offlineSince: number | null }>({ key, status: 'loading', offlineSince: null });
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; });
  const reload = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        if (isOffline()) throw new Error('offline');
        const data = await fnRef.current();
        if (!live) return;
        setState({ key, status: 'ready', data, offlineSince: null });
        await writeCache(key, data);
      } catch {
        const c = await readCache<T>(key);
        if (!live) return;
        setState(c ? { key, status: 'ready', data: c.data, offlineSince: c.at } : { key, status: 'error', offlineSince: null });
      }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ...deps, tick]);
  // A different key (another tab, filter or id) starts from loading; a reload of the same key keeps what is on screen.
  const cur = state.key === key ? state : { key, status: 'loading' as const, offlineSince: null };
  return { ...cur, reload } as CachedState<T>;
}

export function ago(at: number, now = Date.now()): string {
  const m = Math.max(1, Math.round((now - at) / 60000));
  return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
}
