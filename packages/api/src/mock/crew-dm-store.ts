// Shared mock state for the crew and dm slices. Club channels appear in both The Crew (C8) and DMs (D1),
// so both slices reach the same store, keyed by the mock context (one store per createMockApi call).
import type { ClubRole } from '@bunk3d/core';
import type { MockCtx } from './ctx';
import { SEED_CHANNELS, SEED_FOLLOWED_CHANNELS, SEED_MY_CLUBS, tintFor, initialsOf, type SeedChannel } from './seed-crew';

export type ChannelRec = {
  id: string; name: string; adminOnly: boolean; pinned?: { text: string; by: string }; unread: number;
  msgs: { id: string; authorId: string; who: string; role?: ClubRole; text: string; atMs: number; mine: boolean; seed?: true }[];
};

export type Store = {
  channels: Map<string, ChannelRec[]>;
  follows: Set<string>;
  membership: Map<string, { state: 'joined' | 'pending'; role?: ClubRole }>;
  muted: Set<string>;
  listeners: Set<() => void>;
  emit: () => void;
  subscribe: (fn: () => void) => () => void;
  nextId: (p: string) => string;
};

const stores = new WeakMap<MockCtx, Store>();

const seedChannel = (clubId: string, c: SeedChannel, now: number): ChannelRec => ({
  id: c.id, name: c.name, adminOnly: c.adminOnly, pinned: c.pinned, unread: c.unread,
  msgs: c.msgs.map((m, i) => ({ id: `${clubId}-${c.id}-${i}`, authorId: `u_${m.who.split(/[ .]/)[0].toLowerCase()}`, who: m.who, role: m.role, text: m.text, atMs: now - m.agoMin * 60_000, mine: false, seed: true as const })),
});

export function getStore(ctx: MockCtx): Store {
  let s = stores.get(ctx);
  if (s) return s;
  const now = ctx.now();
  const listeners = new Set<() => void>();
  let n = 0;
  s = {
    channels: new Map(Object.entries(SEED_CHANNELS).map(([clubId, cs]) => [clubId, cs.map((c) => seedChannel(clubId, c, now))])),
    follows: new Set(SEED_FOLLOWED_CHANNELS),
    membership: new Map(Object.entries(SEED_MY_CLUBS).map(([id, m]) => [id, { state: m.state, role: m.role }])),
    muted: new Set(),
    listeners,
    emit: () => listeners.forEach((l) => l()),
    subscribe: (fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    nextId: (p) => `${p}-${++n}`,
  };
  stores.set(ctx, s);
  return s;
}

export const person = (id: string, name: string) => ({ id, name, initials: initialsOf(name), tint: tintFor(id) });
