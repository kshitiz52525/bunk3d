// Brand plans and credits (HANDOFF §4, Collab HQ BR13/BR14). All money is integer paise.
// Plan prices and brand fees exclude GST; 18% GST is added on top. Credits buy reach, never access to a student.
import { GST_BP } from './money';

const bp = (amount: number, basisPoints: number) => Math.round((amount * basisPoints) / 10000);
const rs = (n: number) => n * 100;

export type PlanId = 'starter' | 'launch' | 'growth' | 'scale' | 'managed';

export type BrandPlan = {
  id: PlanId;
  name: string;
  /** Per month, excluding GST. Managed is per campaign ("from"). */
  pricePaise: number;
  priceBasis: 'month' | 'campaign';
  /** Monthly credit allowance; Starter gets one free gig post instead. Null = included / negotiated. */
  credits: number | null;
  freeGigPostsPerMonth: number;
  /** Null = unlimited. */
  campuses: number | null;
  seats: number | null;
  /** Fee the brand pays on top of payouts, in basis points. Null = negotiated. */
  brandFeeBp: number | null;
};

export const PLANS: readonly BrandPlan[] = [
  { id: 'starter', name: 'Starter', pricePaise: 0, priceBasis: 'month', credits: 0, freeGigPostsPerMonth: 1, campuses: 1, seats: 1, brandFeeBp: 700 },
  { id: 'launch', name: 'Launch', pricePaise: rs(9999), priceBasis: 'month', credits: 100, freeGigPostsPerMonth: 0, campuses: 3, seats: 2, brandFeeBp: 600 },
  { id: 'growth', name: 'Growth', pricePaise: rs(34999), priceBasis: 'month', credits: 400, freeGigPostsPerMonth: 0, campuses: 15, seats: 5, brandFeeBp: 500 },
  { id: 'scale', name: 'Scale', pricePaise: rs(99999), priceBasis: 'month', credits: 1300, freeGigPostsPerMonth: 0, campuses: null, seats: 15, brandFeeBp: 400 },
  { id: 'managed', name: 'Managed', pricePaise: rs(250000), priceBasis: 'campaign', credits: null, freeGigPostsPerMonth: 0, campuses: null, seats: null, brandFeeBp: null },
];

export const planById = (id: PlanId): BrandPlan => PLANS.find((p) => p.id === id)!;

/** Top-up: 50 credits for Rs 6,000 (excl. GST); lasts 6 months. */
export const TOPUP = { credits: 50, pricePaise: rs(6000), validMonths: 6 } as const;
/** Credits roll over one month, up to the plan's allowance. */
export const ROLLOVER_MONTHS = 1;
/** Annual billing: pay 10 months, get 12. */
export const ANNUAL_PAID_MONTHS = 10;

export type CreditAction = 'gig_post' | 'extra_campus' | 'bulk_gig' | 'college_request' | 'ai_shortlist' | 'sponsored_poll';

export type CreditPrice = { action: CreditAction; label: string; credits: number; per?: 'campus' | 'college'; note: string };

export const CREDIT_PRICES: readonly CreditPrice[] = [
  { action: 'gig_post', label: 'Gig post', credits: 5, note: '10 slots, 30 days, 1 campus' },
  { action: 'extra_campus', label: 'Extra campus', credits: 2, per: 'campus', note: 'Added to a gig post' },
  { action: 'bulk_gig', label: 'Bulk gig', credits: 15, note: 'Up to 50 slots' },
  { action: 'college_request', label: 'College request', credits: 20, per: 'college', note: 'Proposal and MoU workflow' },
  { action: 'ai_shortlist', label: 'AI shortlist', credits: 3, note: 'You still choose the final selection' },
  { action: 'sponsored_poll', label: 'Sponsored poll', credits: 12, per: 'campus', note: 'Campus-level targeting only' },
];

/** Things that are never charged in credits: they are not reach. */
export const FREE_ACTIONS = ['read_applications', 'message_selected_students', 'approve_work', 'raise_dispute'] as const;

export const creditPrice = (a: CreditAction) => CREDIT_PRICES.find((c) => c.action === a)!.credits;

/** Total credits for a basket. `count` is campuses/colleges for per-unit actions, otherwise how many. */
export function creditsFor(items: { action: CreditAction; count?: number }[]): number {
  return items.reduce((sum, i) => sum + creditPrice(i.action) * Math.max(0, i.count ?? 1), 0);
}

export const addGst = (paise: number) => paise + bp(paise, GST_BP);
export const gstOn = (paise: number) => bp(paise, GST_BP);

/** What the brand is invoiced for a plan month: price + 18% GST on top. */
export function planInvoice(planId: PlanId, billing: 'monthly' | 'annual' = 'monthly') {
  const p = planById(planId);
  const months = billing === 'annual' ? ANNUAL_PAID_MONTHS : 1;
  const taxable = p.pricePaise * months;
  const gst = bp(taxable, GST_BP);
  return { taxablePaise: taxable, gstPaise: gst, totalPaise: taxable + gst, coversMonths: billing === 'annual' ? 12 : 1 };
}

/** Effective price per credit (excl. GST), rounded to paise. Null where there are no credits to price. */
export function perCreditPaise(planId: PlanId): number | null {
  const p = planById(planId);
  if (!p.credits || p.priceBasis !== 'month') return null;
  return Math.round(p.pricePaise / p.credits);
}
export const topupPerCreditPaise = () => Math.round(TOPUP.pricePaise / TOPUP.credits);

/** Fee the brand pays on top of settled payouts, plus GST on that fee. Null fee rate (Managed) is negotiated: returns null. */
export function brandPayoutFee(planId: PlanId, settledPaise: number) {
  const rate = planById(planId).brandFeeBp;
  if (rate === null) return null;
  const fee = bp(settledPaise, rate);
  const gst = bp(fee, GST_BP);
  return { rateBp: rate, feePaise: fee, gstPaise: gst, totalPaise: fee + gst };
}

/** Monthly renewal: unused credits roll over one month, up to the plan's allowance; then the new allowance is added. */
export function renewCredits(planId: PlanId, unusedCredits: number) {
  const allowance = planById(planId).credits ?? 0;
  const carried = Math.min(Math.max(0, unusedCredits), allowance);
  return { carried, expired: Math.max(0, unusedCredits) - carried, balance: carried + allowance };
}

export const LOW_RESPONSE_MIN_APPLICANTS = 3;
export const LOW_RESPONSE_DAYS = 7;

/** Automatic refund: a gig with fewer than 3 applicants in 7 days gets its credits back. Moderation removals that were not the brand's fault are refunded too. */
export function creditRefund(i: { creditsSpent: number; applicants: number; daysSincePosted: number; removedByModeration?: boolean; brandAtFault?: boolean }): { refund: number; reason: 'low_response' | 'moderation' | null } {
  if (i.removedByModeration && !i.brandAtFault) return { refund: i.creditsSpent, reason: 'moderation' };
  if (i.daysSincePosted >= LOW_RESPONSE_DAYS && i.applicants < LOW_RESPONSE_MIN_APPLICANTS) return { refund: i.creditsSpent, reason: 'low_response' };
  return { refund: 0, reason: null };
}

export type FundingSource = 'credits' | 'escrow';
/** Credits never fund payouts or prizes; those are funded separately into escrow. */
export function assertFundingSource(purpose: 'payout' | 'prize' | 'reach', source: FundingSource): void {
  if (purpose !== 'reach' && source === 'credits') throw new Error('Credits cannot fund payouts or prizes; fund escrow instead.');
  if (purpose === 'reach' && source === 'escrow') throw new Error('Escrow cannot pay for reach; use credits.');
}
