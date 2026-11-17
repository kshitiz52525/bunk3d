// All money is integer paise. Computed on the server only; clients display what the API returns.
// Rounding: each step (fee, GST) is rounded to the nearest paise.

export const GST_BP = 1800; // 18%, in basis points
const bp = (amount: number, basisPoints: number) => Math.round((amount * basisPoints) / 10000);

export type GigKind = 'paid' | 'club' | 'referral' | 'volunteer';

export const FIRST_FREE_PAISE = 100_000; // first Rs 1,000 ever earned: no fee
export const TIER_THRESHOLD_PAISE = 2_500_000; // after Rs 25,000 lifetime: 3%
export const FEE_CAP_PAISE = 100_000; // Rs 1,000 per gig, before GST

export type TakeHome = {
  payPaise: number;
  feeRateBp: number;
  /** Part of the pay that was fee-free because of the student's first Rs 1,000. */
  waivedPaise: number;
  feePaise: number;
  gstPaise: number;
  takeHomePaise: number;
};

/** Student fee: taken from gig pay. GST (18%) is charged on the fee, never on the student's pay. */
export function computeTakeHome(i: { payPaise: number; kind: GigKind; lifetimeEarnedPaise: number }): TakeHome {
  const { payPaise, kind, lifetimeEarnedPaise } = i;
  const rate = kind === 'referral' || kind === 'volunteer' ? 0 : kind === 'club' ? 250 : lifetimeEarnedPaise >= TIER_THRESHOLD_PAISE ? 300 : 500;
  const waived = rate === 0 ? 0 : Math.min(payPaise, Math.max(0, FIRST_FREE_PAISE - lifetimeEarnedPaise));
  const fee = Math.min(bp(payPaise - waived, rate), FEE_CAP_PAISE);
  const gst = bp(fee, GST_BP);
  return { payPaise, feeRateBp: rate, waivedPaise: waived, feePaise: fee, gstPaise: gst, takeHomePaise: payPaise - fee - gst };
}

export type TicketPrice = { pricePaise: number; qty: number; subtotalPaise: number; platformFeePaise: number; gstPaise: number; totalPaise: number };

/** Ticket price + 5% platform fee + 18% GST on that platform fee. */
export function priceTicket(i: { pricePaise: number; qty: number }): TicketPrice {
  const subtotal = i.pricePaise * i.qty;
  const platformFee = bp(subtotal, 500);
  const gst = bp(platformFee, GST_BP);
  return { pricePaise: i.pricePaise, qty: i.qty, subtotalPaise: subtotal, platformFeePaise: platformFee, gstPaise: gst, totalPaise: subtotal + platformFee + gst };
}

const H48 = 48 * 3600 * 1000;
/** Full refund until 48h before the event, none after; automatic full refund if the host cancels. */
export function ticketRefundPaise(i: { totalPaise: number; eventStartMs: number; nowMs: number; hostCancelled: boolean }): number {
  if (i.hostCancelled) return i.totalPaise;
  return i.eventStartMs - i.nowMs >= H48 ? i.totalPaise : 0;
}

/** Display only: 123450 -> "₹1,234.50"; whole rupees drop the paise. */
export function formatPaise(paise: number): string {
  const neg = paise < 0;
  const a = Math.abs(paise);
  const rupees = Math.floor(a / 100);
  const p = a % 100;
  const r = rupees.toString().replace(/(\d)(?=(\d\d)+\d$)/g, '$1,');
  return `${neg ? '-' : ''}₹${r}${p ? '.' + String(p).padStart(2, '0') : ''}`;
}
