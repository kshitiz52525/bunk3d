import { describe, expect, it } from 'vitest';
import {
  activeStrikeCount, decideScan, idPhotoDeleteAtMs, mergeOfflineScans, modVerdict, qrToken, strikeOutcome,
  validateEventDraft, verifyQr, wave3Gate, type EventDraft,
} from '../src';

const T0 = 1_800_000_000_000;
const secrets: Record<string, string> = { 'HTC-1': 's1' };
const lookup = (id: string) => secrets[id];

describe('rotating QR', () => {
  it('verifies in the same minute and the next, fails after', () => {
    const t = qrToken('HTC-1', 's1', T0);
    expect(verifyQr(t, lookup, T0 + 5_000).valid).toBe(true);
    expect(verifyQr(t, lookup, T0 + 70_000).valid).toBe(true);
    expect(verifyQr(t, lookup, T0 + 200_000).valid).toBe(false);
  });
  it('rejects a forged signature and unknown ticket', () => {
    expect(verifyQr(qrToken('HTC-1', 'wrong', T0), lookup, T0).valid).toBe(false);
    expect(verifyQr(qrToken('HTC-9', 's1', T0), lookup, T0).valid).toBe(false);
    expect(verifyQr('garbage', lookup, T0).valid).toBe(false);
  });
});

describe('check-in decision', () => {
  const ticket = { ticketId: 'HTC-1', eventId: 'e1' };
  it('covers the four results', () => {
    expect(decideScan({ eventId: 'e1', qrValid: true, ticket, alreadyCheckedIn: false })).toBe('checked_in');
    expect(decideScan({ eventId: 'e1', qrValid: true, ticket, alreadyCheckedIn: true })).toBe('already_used');
    expect(decideScan({ eventId: 'e2', qrValid: true, ticket, alreadyCheckedIn: false })).toBe('wrong_event');
    expect(decideScan({ eventId: 'e1', qrValid: false, ticket, alreadyCheckedIn: false })).toBe('not_registered');
    expect(decideScan({ eventId: 'e1', qrValid: true, ticket: undefined, alreadyCheckedIn: false })).toBe('not_registered');
  });
});

describe('offline sync', () => {
  it('earliest scan wins, repeats and already-synced are duplicates', () => {
    const r = mergeOfflineScans(new Set(['A']), [
      { ticketId: 'B', scannedAtMs: 20, scannerId: 'x' },
      { ticketId: 'B', scannedAtMs: 10, scannerId: 'y' },
      { ticketId: 'A', scannedAtMs: 5, scannerId: 'x' },
    ]);
    expect(r.accepted.map((s) => s.scannerId)).toEqual(['y']);
    expect(r.duplicates).toHaveLength(2);
  });
});

describe('event draft', () => {
  const ok: EventDraft = { title: 'T', category: 'Tech', startsAtMs: 100, endsAtMs: 200, venue: 'Lab', capacity: 10, rsvpDeadlineMs: 90, ticketType: 'free', pricePaise: 0 };
  it('accepts a valid free draft', () => expect(validateEventDraft(ok, { paidAllowed: false })).toEqual([]));
  it('needs a price for paid and wave 3', () => {
    expect(validateEventDraft({ ...ok, ticketType: 'paid' }, { paidAllowed: true }).map((i) => i.field)).toEqual(['pricePaise']);
    expect(validateEventDraft({ ...ok, ticketType: 'paid', pricePaise: 19900 }, { paidAllowed: false }).map((i) => i.field)).toEqual(['ticketType']);
    expect(validateEventDraft({ ...ok, ticketType: 'paid', pricePaise: 19900 }, { paidAllowed: true })).toEqual([]);
  });
  it('checks times and capacity', () => {
    const f = validateEventDraft({ ...ok, endsAtMs: 50, capacity: 0, rsvpDeadlineMs: 150 }, { paidAllowed: false }).map((i) => i.field);
    expect(f).toEqual(['endsAtMs', 'capacity', 'rsvpDeadlineMs']);
  });
});

describe('ops rules', () => {
  it('ID photo is deleted 30 days after the decision', () => expect(idPhotoDeleteAtMs(0)).toBe(30 * 86_400_000));
  it('strikes expire after 90 days and escalate 1 to 4', () => {
    const day = 86_400_000;
    expect(activeStrikeCount([0, 20 * day, 100 * day], 100 * day)).toBe(2);
    expect([1, 2, 3, 4, 5].map(strikeOutcome)).toEqual(['warning', 'mute_24h', 'ban_7d', 'removed', 'removed']);
    expect(strikeOutcome(0)).toBeNull();
  });
  it('two matching votes decide, a split escalates', () => {
    expect(modVerdict(['remove', 'remove'])).toBe('remove');
    expect(modVerdict(['keep', 'keep'])).toBe('keep');
    expect(modVerdict(['remove', 'keep'])).toBe('escalate');
    expect(modVerdict(['remove'])).toBe('pending');
  });
  it('wave 3 gate needs thresholds set, both metrics, and legal and CA sign-off', () => {
    const base = { day7RetentionPct: 31, weeklyActives: 1040, legalSignoff: true, caSignoff: true, minDay7RetentionPct: 25, minWeeklyActives: 500 };
    expect(wave3Gate(base).open).toBe(true);
    expect(wave3Gate({ ...base, caSignoff: false }).open).toBe(false);
    expect(wave3Gate({ ...base, minWeeklyActives: null }).open).toBe(false);
    expect(wave3Gate({ ...base, day7RetentionPct: 10 }).checks[0]?.ok).toBe(false);
  });
});
