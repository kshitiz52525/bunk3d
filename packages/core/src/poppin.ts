// Poppin' rules: rotating ticket QR, check-in verification, team size, waitlist hold. Pure, no I/O.
// The signature below is a small non-cryptographic hash so the mock and tests run anywhere.
// BACKEND PHASE: replace `sign` with HMAC-SHA256 over the same `ticketId:window` string (rotate_ticket_qr / verify_checkin).

export const QR_ROTATE_MS = 60_000; // the code changes about every minute
/** A scanner accepts the current code and the one before it (clock drift, slow scan). */
export const QR_GRACE_WINDOWS = 1;
export const WAITLIST_HOLD_MS = 2 * 60 * 60 * 1000; // a freed spot is held 2 hours
export const TEAM_MIN = 2;
export const TEAM_MAX = 4;

export const ticketQrWindow = (nowMs: number) => Math.floor(nowMs / QR_ROTATE_MS);
/** Seconds until the code rotates, 1..60. */
export const ticketQrSecondsLeft = (nowMs: number) => Math.ceil((QR_ROTATE_MS - (nowMs % QR_ROTATE_MS)) / 1000) || 60;

function sign(secret: string, ticketId: string, win: number): string {
  const s = `${secret}|${ticketId}|${win}`;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return ((h2 >>> 0).toString(36) + (h1 >>> 0).toString(36)).padStart(12, '0');
}

/** The string shown as a QR on the ticket. Computable offline from the ticket secret. */
export function ticketQrPayload(i: { ticketId: string; secret: string; nowMs: number }): string {
  const w = ticketQrWindow(i.nowMs);
  return `b3:${i.ticketId}:${w}:${sign(i.secret, i.ticketId, w)}`;
}

export type TicketQrCheck =
  | { ok: true; ticketId: string }
  | { ok: false; reason: 'malformed' | 'unknown_ticket' | 'bad_signature' | 'expired'; ticketId?: string; expiredMinutes?: number };

export function parseTicketQr(payload: string): { ticketId: string; win: number; sig: string } | null {
  const m = /^b3:([^:]+):(\d+):([0-9a-z]+)$/.exec(payload.trim());
  return m ? { ticketId: m[1], win: Number(m[2]), sig: m[3] } : null;
}

/** Verify a scanned code. `secretOf` returns the ticket secret (from the server, or from the scanner's offline snapshot). */
export function verifyTicketQr(i: { payload: string; secretOf: (ticketId: string) => string | undefined; nowMs: number }): TicketQrCheck {
  const p = parseTicketQr(i.payload);
  if (!p) return { ok: false, reason: 'malformed' };
  const secret = i.secretOf(p.ticketId);
  if (secret === undefined) return { ok: false, reason: 'unknown_ticket', ticketId: p.ticketId };
  if (sign(secret, p.ticketId, p.win) !== p.sig) return { ok: false, reason: 'bad_signature', ticketId: p.ticketId };
  const cur = ticketQrWindow(i.nowMs);
  if (p.win > cur + QR_GRACE_WINDOWS) return { ok: false, reason: 'bad_signature', ticketId: p.ticketId };
  if (p.win < cur - QR_GRACE_WINDOWS) {
    const expiredMinutes = Math.max(1, Math.floor((i.nowMs - (p.win + 1) * QR_ROTATE_MS) / 60_000));
    return { ok: false, reason: 'expired', ticketId: p.ticketId, expiredMinutes };
  }
  return { ok: true, ticketId: p.ticketId };
}

/** Team of 2-4 (the captain counts). Registration needs at least 2 accepted members. */
export const teamReady = (acceptedIncludingCaptain: number) => acceptedIncludingCaptain >= TEAM_MIN;
export const teamHasRoom = (membersIncludingInvited: number) => membersIncludingInvited < TEAM_MAX;

/** When a held waitlist spot lapses. */
export const waitlistHoldUntil = (offeredAtMs: number) => offeredAtMs + WAITLIST_HOLD_MS;
