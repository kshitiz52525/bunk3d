import { describe, expect, it } from 'vitest';
import { computeTakeHome, formatPaise, priceTicket, ticketRefundPaise } from '../src';

const rs = (n: number) => Math.round(n * 100);
const LIFETIME_OK = rs(5000); // past the free first Rs 1,000, under Rs 25,000

describe('student fee, HANDOFF §4 worked examples', () => {
  it('Rs 2,500 paid gig (5%)', () => {
    const t = computeTakeHome({ payPaise: rs(2500), kind: 'paid', lifetimeEarnedPaise: LIFETIME_OK });
    expect([t.feePaise, t.gstPaise, t.takeHomePaise]).toEqual([rs(125), rs(22.5), rs(2352.5)]);
  });
  it('Rs 800 club gig (2.5%)', () => {
    const t = computeTakeHome({ payPaise: rs(800), kind: 'club', lifetimeEarnedPaise: LIFETIME_OK });
    expect([t.feePaise, t.gstPaise, t.takeHomePaise]).toEqual([rs(20), rs(3.6), rs(776.4)]);
  });
  it('Rs 1,000 club gig (2.5%)', () => {
    const t = computeTakeHome({ payPaise: rs(1000), kind: 'club', lifetimeEarnedPaise: LIFETIME_OK });
    expect([t.feePaise, t.gstPaise, t.takeHomePaise]).toEqual([rs(25), rs(4.5), rs(970.5)]);
  });
  it("Rs 1,200 first gig: 5% only on the Rs 200 after the free first Rs 1,000", () => {
    const t = computeTakeHome({ payPaise: rs(1200), kind: 'paid', lifetimeEarnedPaise: 0 });
    expect([t.waivedPaise, t.feePaise, t.gstPaise, t.takeHomePaise]).toEqual([rs(1000), rs(10), rs(1.8), rs(1188.2)]);
  });
});

describe('student fee rules', () => {
  it('referral and volunteer gigs are free', () => {
    for (const kind of ['referral', 'volunteer'] as const) {
      const t = computeTakeHome({ payPaise: rs(3000), kind, lifetimeEarnedPaise: 0 });
      expect([t.feePaise, t.gstPaise, t.takeHomePaise]).toEqual([0, 0, rs(3000)]);
    }
  });
  it('drops to 3% after Rs 25,000 lifetime', () => {
    const t = computeTakeHome({ payPaise: rs(2000), kind: 'paid', lifetimeEarnedPaise: rs(25000) });
    expect(t.feeRateBp).toBe(300);
    expect(t.feePaise).toBe(rs(60));
  });
  it('caps the fee at Rs 1,000 before GST', () => {
    const t = computeTakeHome({ payPaise: rs(100000), kind: 'paid', lifetimeEarnedPaise: LIFETIME_OK });
    expect(t.feePaise).toBe(rs(1000));
    expect(t.gstPaise).toBe(rs(180));
    expect(t.takeHomePaise).toBe(rs(100000) - rs(1180));
  });
  it('GST is never charged on the student pay', () => {
    const t = computeTakeHome({ payPaise: rs(2500), kind: 'paid', lifetimeEarnedPaise: LIFETIME_OK });
    expect(t.gstPaise).toBe(Math.round(t.feePaise * 0.18));
  });
});

describe('ticket price', () => {
  it('Rs 199 + 5% platform fee + 18% GST on the fee, rounded to paise', () => {
    const p = priceTicket({ pricePaise: rs(199), qty: 1 });
    expect([p.platformFeePaise, p.gstPaise, p.totalPaise]).toEqual([995, 179, 21074]); // Rs 9.95 + Rs 1.79 = Rs 210.74
  });
  it('free tickets cost nothing', () => {
    expect(priceTicket({ pricePaise: 0, qty: 1 }).totalPaise).toBe(0);
  });
});

describe('ticket refunds', () => {
  const start = Date.UTC(2026, 11, 20, 10);
  const total = 21074;
  it('full refund up to 48h before, none after', () => {
    expect(ticketRefundPaise({ totalPaise: total, eventStartMs: start, nowMs: start - 49 * 3600e3, hostCancelled: false })).toBe(total);
    expect(ticketRefundPaise({ totalPaise: total, eventStartMs: start, nowMs: start - 47 * 3600e3, hostCancelled: false })).toBe(0);
  });
  it('host cancel always refunds in full', () => {
    expect(ticketRefundPaise({ totalPaise: total, eventStartMs: start, nowMs: start - 3600e3, hostCancelled: true })).toBe(total);
  });
});

describe('formatPaise', () => {
  it('shows paise only when not whole rupees', () => {
    expect(formatPaise(235250)).toBe('₹2,352.50');
    expect(formatPaise(100000)).toBe('₹1,000');
    expect(formatPaise(21074)).toBe('₹210.74');
  });
});
