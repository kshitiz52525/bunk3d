import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import type { Post } from '@bunk3d/api';

/** "now", "12m", "3h", "2d" */
export function ago(createdAt: number, now = Date.now()): string {
  const m = Math.max(0, Math.round((now - createdAt) / 60_000));
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

/** "11:40 AM tomorrow" / "11:40 AM today" */
export function untilText(until: number, now = Date.now()): string {
  const d = new Date(until);
  const t = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase().replace(/\s+/g, ' ');
  const sameDay = new Date(now).toDateString() === d.toDateString();
  return `${t} ${sameDay ? 'today' : 'tomorrow'}`;
}

export function compactCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : String(n);
}

export function mmss(sec: number): string {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Current time, refreshed so relative text stays true without reading the clock during render. */
export function useNow(ms = 30_000): number {
  const [n, setN] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setN(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return n;
}

/** Browser online state on web; always online elsewhere until a native network module is added. */
export function useOnline(): boolean {
  const [on, setOn] = useState(() => (typeof navigator !== 'undefined' && 'onLine' in navigator ? navigator.onLine : true));
  useEffect(() => {
    if (typeof window === 'undefined' || !window.addEventListener) return;
    const up = () => setOn(true);
    const down = () => setOn(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return on;
}

/** Actions that arrive while offline are queued and sent when the connection is back ("Votes and replies send when you're back"). */
const queue: (() => Promise<unknown>)[] = [];
export function useOfflineQueue(online: boolean) {
  const ref = useRef(online);
  useEffect(() => {
    if (online && !ref.current) { const q = queue.splice(0); q.forEach((f) => f().catch(() => undefined)); }
    ref.current = online;
  }, [online]);
  return (fn: () => Promise<unknown>) => { if (ref.current) return fn(); queue.push(fn); return Promise.resolve(undefined); };
}

export const goPending = () => router.push('/onboarding/pending');
export const goReport = (postId: string) => router.push(`/report?targetKind=post&targetId=${postId}`);

export const postLabel = (p: Post) => (p.author.anon ? 'Anonymous' : p.author.name);

/** Pushed Tea screens (create, detail, viewer) tell the mounted feed that something changed. Tabs stay frozen under pushed routes, so focus events do not fire. */
const changed = new Set<() => void>();
export function notifyTeaChanged() { changed.forEach((f) => f()); }
export function useTeaChanged(cb: () => void) {
  useEffect(() => { changed.add(cb); return () => { changed.delete(cb); }; }, [cb]);
}
