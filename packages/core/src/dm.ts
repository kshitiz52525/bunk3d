// DM rules. Pure; the mock calls these now and Postgres functions / RLS reuse them later.

export const DM_REQUESTS_PER_DAY = 20;
const IST_OFFSET_MS = 5.5 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;

/** Start (ms, UTC epoch) of the current day in India. The request limit resets at midnight IST. */
export function istDayStart(nowMs: number): number {
  return Math.floor((nowMs + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
}

export type RequestQuota = { limit: number; sentToday: number; remaining: number; allowed: boolean; resetsAtMs: number };

/** New message requests (first messages to people you share no club with): 20 a day. Existing chats are never limited. */
export function requestQuota(sentAtMs: readonly number[], nowMs: number): RequestQuota {
  const start = istDayStart(nowMs);
  const sentToday = sentAtMs.filter((t) => t >= start && t <= nowMs).length;
  const remaining = Math.max(0, DM_REQUESTS_PER_DAY - sentToday);
  return { limit: DM_REQUESTS_PER_DAY, sentToday, remaining, allowed: remaining > 0, resetsAtMs: start + DAY_MS };
}

export type MessagingInput = {
  /** Sender's verification: DMs unlock only after verification. */
  senderVerified: boolean;
  blocked: boolean;
  blockedByThem: boolean;
  sharesClub: boolean;
  /** A chat already exists and the request (if any) was accepted. */
  accepted: boolean;
  /** I already sent a request that is still waiting. */
  requestPending: boolean;
  quota: RequestQuota;
};

export type MessagingMode =
  | { mode: 'locked' }
  | { mode: 'cannot_send' }
  | { mode: 'direct' }
  | { mode: 'new_request' }
  | { mode: 'request_pending' }
  | { mode: 'request_limit'; resetsAtMs: number };

/** What the sender may do in a one-to-one chat. */
export function messagingMode(i: MessagingInput): MessagingMode {
  if (!i.senderVerified) return { mode: 'locked' };
  if (i.blocked || i.blockedByThem) return { mode: 'cannot_send' };
  if (i.accepted || i.sharesClub) return { mode: 'direct' };
  if (i.requestPending) return { mode: 'request_pending' };
  if (!i.quota.allowed) return { mode: 'request_limit', resetsAtMs: i.quota.resetsAtMs };
  return { mode: 'new_request' };
}

/**
 * Read receipts are mutual: if you turn yours off you cannot see theirs either, and
 * if theirs are off you cannot see them. A stranger's request shows no receipts until accepted.
 */
export function receiptsVisible(i: { myReceiptsOn: boolean; theirReceiptsOn: boolean; accepted: boolean }): boolean {
  return i.myReceiptsOn && i.theirReceiptsOn && i.accepted;
}

export type ChatFilter = 'All' | 'Unread' | 'People' | 'Squads' | 'Clubs';
export const CHAT_FILTERS: readonly ChatFilter[] = ['All', 'Unread', 'People', 'Squads', 'Clubs'];
export type ChatKind = 'person' | 'squad' | 'club';

export function chatMatchesFilter(c: { kind: ChatKind; unread: number }, f: ChatFilter): boolean {
  switch (f) {
    case 'All': return true;
    case 'Unread': return c.unread > 0;
    case 'People': return c.kind === 'person';
    case 'Squads': return c.kind === 'squad';
    case 'Clubs': return c.kind === 'club';
  }
}

/** Club channels are listed in DMs as e.g. "GDG Atria #general". */
export const clubChannelLabel = (clubName: string, channel: string) => `${clubName} #${channel}`;
