import { describe, expect, it } from 'vitest';
import {
  DAY_MS, HOUR_MS, canAddEvidence, canAskForChanges, canOpenDispute, canTransition, chargeableFeePaise, evidenceDeadlineMs,
  holdEndsAtMs, isValidPan, isValidUpi, maskPan, nextSetupStep, quoteTakeHome, quoteWithdrawal, reviewDeadlineMs, reviewState,
  revisionsLeft, settleEarning, bannedListingReason,
} from '../src';

const T0 = Date.UTC(2026, 9, 23);

describe('earnings state machine', () => {
  it('moves forward one step at a time; a bounced payout returns to payable', () => {
    expect(canTransition('estimated', 'pending')).toBe(true);
    expect(canTransition('pending', 'payable')).toBe(false);
    expect(canTransition('paid', 'payable')).toBe(false);
    expect(canTransition('processing', 'payable')).toBe(true);
    expect(canTransition('payable', 'estimated')).toBe(false);
  });
  it('holds money in Pending for 7 days, then Approved, then Payable once escrow is confirmed', () => {
    const e = { stage: 'pending' as const, approvedAtMs: T0, escrowConfirmedAtMs: T0 + 7 * DAY_MS };
    expect(holdEndsAtMs(T0)).toBe(T0 + 7 * DAY_MS);
    expect(settleEarning(e, T0 + 7 * DAY_MS - 1)).toBe('pending');
    expect(settleEarning(e, T0 + 7 * DAY_MS)).toBe('payable');
    expect(settleEarning({ stage: 'pending', approvedAtMs: T0 }, T0 + 8 * DAY_MS)).toBe('approved');
  });
  it('never advances disputed money, and leaves estimated alone', () => {
    expect(settleEarning({ stage: 'pending', approvedAtMs: T0, disputed: true }, T0 + 30 * DAY_MS)).toBe('pending');
    expect(settleEarning({ stage: 'estimated' }, T0 + 30 * DAY_MS)).toBe('estimated');
  });
});

describe('review handoff', () => {
  it('auto-approves after 3 days of no reply, not before', () => {
    expect(reviewDeadlineMs(T0)).toBe(T0 + 3 * DAY_MS);
    expect(reviewState({ submittedAtMs: T0, nowMs: T0 + 3 * DAY_MS - 1 })).toBe('in_review');
    expect(reviewState({ submittedAtMs: T0, nowMs: T0 + 3 * DAY_MS })).toBe('auto_approved');
  });
  it('a reply stops the clock', () => {
    expect(reviewState({ submittedAtMs: T0, nowMs: T0 + 9 * DAY_MS, repliedAs: 'changes_asked' })).toBe('changes_asked');
    expect(reviewState({ submittedAtMs: T0, nowMs: T0 + 9 * DAY_MS, repliedAs: 'approved' })).toBe('approved');
  });
  it('allows 2 free revisions', () => {
    expect(canAskForChanges(0)).toBe(true);
    expect(canAskForChanges(1)).toBe(true);
    expect(canAskForChanges(2)).toBe(false);
    expect(revisionsLeft(1)).toBe(1);
    expect(revisionsLeft(5)).toBe(0);
  });
});

describe('dispute', () => {
  it('takes evidence within 48h of opening only', () => {
    expect(evidenceDeadlineMs(T0)).toBe(T0 + 48 * HOUR_MS);
    expect(canAddEvidence(T0, T0 + 48 * HOUR_MS - 1)).toBe(true);
    expect(canAddEvidence(T0, T0 + 48 * HOUR_MS)).toBe(false);
  });
  it('can be opened only after a rejection, once', () => {
    expect(canOpenDispute({ rejected: true, alreadyOpen: false })).toBe(true);
    expect(canOpenDispute({ rejected: false, alreadyOpen: false })).toBe(false);
    expect(canOpenDispute({ rejected: true, alreadyOpen: true })).toBe(false);
  });
  it('charges no fee on disputed money', () => {
    expect(chargeableFeePaise(2500, true)).toBe(0);
    expect(chargeableFeePaise(2500, false)).toBe(2500);
  });
});

describe('fee quote reproduces HANDOFF §4 worked examples', () => {
  const rs = (n: number) => Math.round(n * 100);
  it.each([
    [2500, 'paid', 640000, 125, 22.5, 2352.5],
    [800, 'club', 640000, 20, 3.6, 776.4],
    [1000, 'club', 640000, 25, 4.5, 970.5],
    [1200, 'paid', 0, 10, 1.8, 1188.2],
  ] as const)('Rs %s %s gig', (pay, kind, life, fee, gst, take) => {
    const q = quoteTakeHome({ payPaise: rs(pay), kind, lifetimeEarnedPaise: life });
    expect([q.feePaise, q.gstPaise, q.takeHomePaise]).toEqual([rs(fee), rs(gst), rs(take)]);
    expect(q.capped).toBe(false);
  });
  it('flags the Rs 1,000 cap', () => {
    const q = quoteTakeHome({ payPaise: rs(40000), kind: 'paid', lifetimeEarnedPaise: 640000 });
    expect(q.feePaise).toBe(100000);
    expect(q.capped).toBe(true);
  });
});

describe('withdrawals', () => {
  it('standard is free, instant costs Rs 15', () => {
    expect(quoteWithdrawal({ amountPaise: 124000, payablePaise: 124000, speed: 'standard' })).toMatchObject({ ok: true, feePaise: 0, receivePaise: 124000 });
    expect(quoteWithdrawal({ amountPaise: 124000, payablePaise: 124000, speed: 'instant' })).toMatchObject({ ok: true, feePaise: 1500, receivePaise: 122500 });
  });
  it('enforces the Rs 100 minimum and the payable balance', () => {
    expect(quoteWithdrawal({ amountPaise: 9999, payablePaise: 124000, speed: 'standard' })).toMatchObject({ ok: false, error: 'below_minimum' });
    expect(quoteWithdrawal({ amountPaise: 124100, payablePaise: 124000, speed: 'standard' })).toMatchObject({ ok: false, error: 'above_payable' });
  });
});

describe('payout setup', () => {
  it('validates PAN and UPI and masks the PAN', () => {
    expect(isValidPan('abcde1234f')).toBe(true);
    expect(isValidPan('ABCDE12345')).toBe(false);
    expect(maskPan('abcde1234f')).toBe('ABCDE••••F');
    expect(isValidUpi('aarav@okaxis')).toBe(true);
    expect(isValidUpi('aarav')).toBe(false);
  });
  it('goes PAN, then UPI, then consent', () => {
    expect(nextSetupStep({ pan: false, upi: false, consent: false })).toBe('pan');
    expect(nextSetupStep({ pan: true, upi: false, consent: false })).toBe('upi');
    expect(nextSetupStep({ pan: true, upi: true, consent: false })).toBe('consent');
    expect(nextSetupStep({ pan: true, upi: true, consent: true })).toBeNull();
  });
});

describe('swap banned list', () => {
  it('blocks weapons, medicines and exam notes for cash', () => {
    expect(bannedListingReason('Air gun, barely used')).toBe('weapons');
    expect(bannedListingReason('Strips of paracetamol tablets')).toBe('medicines');
    expect(bannedListingReason('Leaked question paper for tomorrow')).toBe('exam_notes');
  });
  it('lets ordinary listings through', () => {
    expect(bannedListingReason('Casio fx-991EX calculator')).toBeNull();
    expect(bannedListingReason('GATE ECE PYQ set')).toBeNull();
    expect(bannedListingReason('Grewal Engg. Maths, 44th ed')).toBeNull();
  });
});
