import { describe, expect, it } from 'vitest';
import { ANNUAL_PAID_MONTHS, CREDIT_PRICES, PLANS, TOPUP, assertFundingSource, brandPayoutFee, creditRefund, creditsFor, perCreditPaise, planInvoice, renewCredits, topupPerCreditPaise } from '../src';

const rs = (n: number) => Math.round(n * 100);

describe('brand plans (HANDOFF §4)', () => {
  it('matches the plan table', () => {
    expect(PLANS.map((p) => [p.id, p.pricePaise, p.credits, p.campuses, p.seats, p.brandFeeBp])).toEqual([
      ['starter', 0, 0, 1, 1, 700],
      ['launch', rs(9999), 100, 3, 2, 600],
      ['growth', rs(34999), 400, 15, 5, 500],
      ['scale', rs(99999), 1300, null, 15, 400],
      ['managed', rs(250000), null, null, null, null],
    ]);
    expect(PLANS[0].freeGigPostsPerMonth).toBe(1);
  });
  it('plan prices exclude GST, 18% added on top', () => {
    expect(planInvoice('growth')).toEqual({ taxablePaise: rs(34999), gstPaise: rs(6299.82), totalPaise: rs(41298.82), coversMonths: 1 });
    expect(planInvoice('starter').totalPaise).toBe(0);
  });
  it('annual billing: pay 10 months, get 12', () => {
    const a = planInvoice('launch', 'annual');
    expect(a.taxablePaise).toBe(rs(9999) * ANNUAL_PAID_MONTHS);
    expect(a.coversMonths).toBe(12);
  });
  it('top-up is 50 credits for Rs 6,000, Rs 120 a credit', () => {
    expect(TOPUP).toEqual({ credits: 50, pricePaise: rs(6000), validMonths: 6 });
    expect(topupPerCreditPaise()).toBe(rs(120));
    expect(perCreditPaise('growth')).toBe(8750);
    expect(perCreditPaise('starter')).toBeNull();
  });
  it('brand fee on payouts, plus GST on the fee', () => {
    expect(brandPayoutFee('growth', rs(60000))).toEqual({ rateBp: 500, feePaise: rs(3000), gstPaise: rs(540), totalPaise: rs(3540) });
    expect(brandPayoutFee('starter', rs(1000))?.feePaise).toBe(rs(70));
    expect(brandPayoutFee('managed', rs(1000))).toBeNull();
  });
});

describe('credits', () => {
  it('credit prices', () => {
    expect(Object.fromEntries(CREDIT_PRICES.map((c) => [c.action, c.credits]))).toEqual({ gig_post: 5, extra_campus: 2, bulk_gig: 15, college_request: 20, ai_shortlist: 3, sponsored_poll: 12 });
  });
  it('baskets: per-campus and per-college actions multiply', () => {
    expect(creditsFor([{ action: 'gig_post' }, { action: 'extra_campus', count: 2 }])).toBe(9);
    expect(creditsFor([{ action: 'sponsored_poll', count: 6 }])).toBe(72);
    expect(creditsFor([{ action: 'college_request', count: 3 }])).toBe(60);
  });
  it('rollover: one month, up to the plan allowance', () => {
    expect(renewCredits('growth', 59)).toEqual({ carried: 59, expired: 0, balance: 459 });
    expect(renewCredits('launch', 250)).toEqual({ carried: 100, expired: 150, balance: 200 });
    expect(renewCredits('starter', 5)).toEqual({ carried: 0, expired: 5, balance: 0 });
  });
  it('low-response refund: fewer than 3 applicants in 7 days', () => {
    expect(creditRefund({ creditsSpent: 5, applicants: 2, daysSincePosted: 7 })).toEqual({ refund: 5, reason: 'low_response' });
    expect(creditRefund({ creditsSpent: 5, applicants: 3, daysSincePosted: 7 }).refund).toBe(0);
    expect(creditRefund({ creditsSpent: 5, applicants: 0, daysSincePosted: 6 }).refund).toBe(0);
  });
  it('moderation removal is refunded unless the brand was at fault', () => {
    expect(creditRefund({ creditsSpent: 15, applicants: 50, daysSincePosted: 2, removedByModeration: true })).toEqual({ refund: 15, reason: 'moderation' });
    expect(creditRefund({ creditsSpent: 15, applicants: 50, daysSincePosted: 2, removedByModeration: true, brandAtFault: true }).refund).toBe(0);
  });
  it('credits never fund payouts or prizes', () => {
    expect(() => assertFundingSource('payout', 'credits')).toThrow();
    expect(() => assertFundingSource('prize', 'credits')).toThrow();
    expect(() => assertFundingSource('payout', 'escrow')).not.toThrow();
    expect(() => assertFundingSource('reach', 'credits')).not.toThrow();
    expect(() => assertFundingSource('reach', 'escrow')).toThrow();
  });
});
