import { describe, expect, it } from 'vitest';
import { QR_ROTATE_MS, ticketQrPayload, ticketQrSecondsLeft, ticketQrWindow, teamHasRoom, teamReady, verifyTicketQr, waitlistHoldUntil, WAITLIST_HOLD_MS } from '../src';

const T0 = 1_800_000_000_000;
const secrets: Record<string, string> = { t1: 'sec-1', t2: 'sec-2' };
const secretOf = (id: string) => secrets[id];

describe('rotating ticket QR', () => {
  it('is stable inside a minute and changes after it', () => {
    const w0 = ticketQrWindow(T0) * QR_ROTATE_MS;
    const a = ticketQrPayload({ ticketId: 't1', secret: 'sec-1', nowMs: w0 + 1 });
    expect(ticketQrPayload({ ticketId: 't1', secret: 'sec-1', nowMs: w0 + QR_ROTATE_MS - 1 })).toBe(a);
    expect(ticketQrPayload({ ticketId: 't1', secret: 'sec-1', nowMs: w0 + QR_ROTATE_MS })).not.toBe(a);
  });
  it('counts down to the next rotation', () => {
    const w0 = ticketQrWindow(T0) * QR_ROTATE_MS;
    expect(ticketQrSecondsLeft(w0)).toBe(60);
    expect(ticketQrSecondsLeft(w0 + 42_000)).toBe(18);
  });
  it('verifies a fresh code', () => {
    const p = ticketQrPayload({ ticketId: 't1', secret: 'sec-1', nowMs: T0 });
    expect(verifyTicketQr({ payload: p, secretOf, nowMs: T0 + 5_000 })).toEqual({ ok: true, ticketId: 't1' });
  });
  it('accepts the previous window (grace) but not older', () => {
    const p = ticketQrPayload({ ticketId: 't1', secret: 'sec-1', nowMs: T0 });
    expect(verifyTicketQr({ payload: p, secretOf, nowMs: T0 + QR_ROTATE_MS }).ok).toBe(true);
    const old = verifyTicketQr({ payload: p, secretOf, nowMs: T0 + 5 * QR_ROTATE_MS });
    expect(old).toMatchObject({ ok: false, reason: 'expired' });
    expect(old.ok === false && old.expiredMinutes).toBeGreaterThanOrEqual(3);
  });
  it('rejects forged, other-secret, malformed and unknown codes', () => {
    const p = ticketQrPayload({ ticketId: 't1', secret: 'sec-1', nowMs: T0 });
    expect(verifyTicketQr({ payload: p.slice(0, -1) + (p.endsWith('a') ? 'b' : 'a'), secretOf, nowMs: T0 })).toMatchObject({ reason: 'bad_signature' });
    expect(verifyTicketQr({ payload: ticketQrPayload({ ticketId: 't1', secret: 'sec-2', nowMs: T0 }), secretOf, nowMs: T0 })).toMatchObject({ reason: 'bad_signature' });
    expect(verifyTicketQr({ payload: 'hello', secretOf, nowMs: T0 })).toMatchObject({ reason: 'malformed' });
    expect(verifyTicketQr({ payload: ticketQrPayload({ ticketId: 'zz', secret: 'x', nowMs: T0 }), secretOf, nowMs: T0 })).toMatchObject({ reason: 'unknown_ticket' });
  });
  it('rejects a code from the future', () => {
    const p = ticketQrPayload({ ticketId: 't1', secret: 'sec-1', nowMs: T0 + 10 * QR_ROTATE_MS });
    expect(verifyTicketQr({ payload: p, secretOf, nowMs: T0 })).toMatchObject({ ok: false, reason: 'bad_signature' });
  });
});

describe('teams and waitlist', () => {
  it('teams are 2 to 4', () => {
    expect(teamReady(1)).toBe(false);
    expect(teamReady(2)).toBe(true);
    expect(teamHasRoom(3)).toBe(true);
    expect(teamHasRoom(4)).toBe(false);
  });
  it('a freed spot is held for 2 hours', () => expect(waitlistHoldUntil(T0) - T0).toBe(WAITLIST_HOLD_MS));
});
