// Double-entry money ledger (HANDOFF §7). Finance FI1-FI8 reads from it. Integer paise only.
// Nothing is edited, only reversed. Every transaction must balance (debits == credits).
import { GST_BP } from './money';

export type LedgerAccount =
  | 'escrow'
  | 'student_payable'
  | 'club_balance'
  | 'fee_revenue'
  | 'gst_payable'
  | 'instant_fee'
  | 'ticket_sales'
  // Counterparties outside the ledger's own books: the payment partner and tax deducted on behalf of students.
  | 'bank'
  | 'tds_payable';

export const LEDGER_ACCOUNTS: readonly LedgerAccount[] = ['escrow', 'student_payable', 'club_balance', 'fee_revenue', 'gst_payable', 'instant_fee', 'ticket_sales', 'bank', 'tds_payable'];

/** Accounts whose natural balance is a credit (liabilities and revenue). `bank` is the only debit-natural account. */
const DEBIT_NATURAL: ReadonlySet<LedgerAccount> = new Set(['bank']);

export type LedgerLine = { account: LedgerAccount; /** Owner (campaign, club, student); optional. */ ownerId?: string; debitPaise: number; creditPaise: number };
export type LedgerTxn = { id: string; atMs: number; memo: string; reverses?: string; lines: LedgerLine[] };

export const dr = (account: LedgerAccount, paise: number, ownerId?: string): LedgerLine => ({ account, ownerId, debitPaise: paise, creditPaise: 0 });
export const cr = (account: LedgerAccount, paise: number, ownerId?: string): LedgerLine => ({ account, ownerId, debitPaise: 0, creditPaise: paise });

export function isBalanced(t: Pick<LedgerTxn, 'lines'>): boolean {
  const d = t.lines.reduce((s, l) => s + l.debitPaise, 0);
  const c = t.lines.reduce((s, l) => s + l.creditPaise, 0);
  return d === c && d > 0;
}

export function validateTxn(t: LedgerTxn): void {
  if (t.lines.length < 2) throw new Error(`Txn ${t.id}: needs at least two lines`);
  for (const l of t.lines) {
    if (!Number.isInteger(l.debitPaise) || !Number.isInteger(l.creditPaise)) throw new Error(`Txn ${t.id}: amounts must be whole paise`);
    if (l.debitPaise < 0 || l.creditPaise < 0) throw new Error(`Txn ${t.id}: negative amount`);
    if ((l.debitPaise > 0) === (l.creditPaise > 0)) throw new Error(`Txn ${t.id}: a line is either a debit or a credit`);
  }
  if (!isBalanced(t)) throw new Error(`Txn ${t.id}: debits and credits do not balance`);
}

/** Append-only ledger. `post` rejects anything unbalanced; `reverse` posts the mirror entry. */
export function createLedger() {
  const txns: LedgerTxn[] = [];
  const post = (t: LedgerTxn): LedgerTxn => {
    validateTxn(t);
    if (txns.some((x) => x.id === t.id)) throw new Error(`Txn ${t.id}: already posted`);
    txns.push(t);
    return t;
  };
  const reverse = (id: string, atMs: number, newId: string): LedgerTxn => {
    const orig = txns.find((x) => x.id === id);
    if (!orig) throw new Error(`Txn ${id}: not found`);
    if (txns.some((x) => x.reverses === id)) throw new Error(`Txn ${id}: already reversed`);
    return post({ id: newId, atMs, memo: `Reversal of ${id}`, reverses: id, lines: orig.lines.map((l) => ({ ...l, debitPaise: l.creditPaise, creditPaise: l.debitPaise })) });
  };
  return { post, reverse, all: () => [...txns] as readonly LedgerTxn[] };
}
export type Ledger = ReturnType<typeof createLedger>;

/** Balance of an account in its natural direction (credit-natural: credits - debits). Optionally for one owner. */
export function accountBalance(txns: readonly LedgerTxn[], account: LedgerAccount, ownerId?: string): number {
  let net = 0;
  for (const t of txns) for (const l of t.lines) if (l.account === account && (ownerId === undefined || l.ownerId === ownerId)) net += l.creditPaise - l.debitPaise;
  return DEBIT_NATURAL.has(account) ? -net : net;
}

export function trialBalance(txns: readonly LedgerTxn[]): { debitPaise: number; creditPaise: number; balanced: boolean } {
  let d = 0, c = 0;
  for (const t of txns) for (const l of t.lines) { d += l.debitPaise; c += l.creditPaise; }
  return { debitPaise: d, creditPaise: c, balanced: d === c };
}

// ---- Posting recipes. Each returns the lines of one balanced transaction. ----

/** A brand funds a campaign's escrow (payouts and prizes only, never credits). */
export const fundEscrow = (campaignId: string, paise: number): LedgerLine[] => [dr('bank', paise), cr('escrow', paise, campaignId)];

/** A brand pays its fee (on top of payouts) plus GST on that fee. */
export const brandFeeCharge = (campaignId: string, feePaise: number, gstPaise: number): LedgerLine[] => [dr('bank', feePaise + gstPaise), cr('fee_revenue', feePaise, campaignId), cr('gst_payable', gstPaise, campaignId)];

/**
 * Release a student's gig pay from escrow. Pay = take-home + fee + GST on the fee.
 * No fee on disputed money: pass feePaise 0 and gstPaise 0.
 */
export function releaseToStudent(i: { campaignId: string; studentId: string; payPaise: number; feePaise: number; gstPaise: number }): LedgerLine[] {
  const takeHome = i.payPaise - i.feePaise - i.gstPaise;
  const lines = [dr('escrow', i.payPaise, i.campaignId), cr('student_payable', takeHome, i.studentId)];
  if (i.feePaise) lines.push(cr('fee_revenue', i.feePaise, i.studentId));
  if (i.gstPaise) lines.push(cr('gst_payable', i.gstPaise, i.studentId));
  return lines;
}

/** Release a club's share from escrow. */
export const releaseToClub = (campaignId: string, clubId: string, paise: number): LedgerLine[] => [dr('escrow', paise, campaignId), cr('club_balance', paise, clubId)];

/** Pay out to the student's UPI: TDS 194-O withheld where it applies, instant fee where chosen. Standard payout is free. */
export function payoutToStudent(i: { studentId: string; amountPaise: number; tdsPaise?: number; instant?: boolean }): LedgerLine[] {
  const tds = i.tdsPaise ?? 0;
  const split = i.instant ? instantFeeSplit() : { netPaise: 0, gstPaise: 0, totalPaise: 0 };
  const lines = [dr('student_payable', i.amountPaise, i.studentId), cr('bank', i.amountPaise - tds - split.totalPaise)];
  if (tds) lines.push(cr('tds_payable', tds, i.studentId));
  if (split.totalPaise) lines.push(cr('instant_fee', split.netPaise, i.studentId), cr('gst_payable', split.gstPaise, i.studentId));
  return lines;
}

/** Buyer pays a ticket: price to ticket_sales, platform fee to fee_revenue, GST on that fee to gst_payable. */
export const ticketSale = (eventId: string, t: { subtotalPaise: number; platformFeePaise: number; gstPaise: number }): LedgerLine[] => [
  dr('bank', t.subtotalPaise + t.platformFeePaise + t.gstPaise),
  cr('ticket_sales', t.subtotalPaise, eventId),
  cr('fee_revenue', t.platformFeePaise, eventId),
  cr('gst_payable', t.gstPaise, eventId),
];

/** Ticket money moves to the host club's balance after the event. */
export const settleTicketsToClub = (eventId: string, clubId: string, paise: number): LedgerLine[] => [dr('ticket_sales', paise, eventId), cr('club_balance', paise, clubId)];

// ---- GST invoices (one per fee) ----
export const INSTANT_PAYOUT_FEE_PAISE = 1500;
/**
 * The Rs 15 instant fee is what the student pays in total, so it is treated as GST-inclusive: Rs 12.71 fee + Rs 2.29 GST.
 * (Open question for the owner: HANDOFF §4 says "Instant costs Rs 15" without saying whether GST is extra.)
 */
export function instantFeeSplit(): { netPaise: number; gstPaise: number; totalPaise: number } {
  const net = Math.round((INSTANT_PAYOUT_FEE_PAISE * 10000) / (10000 + GST_BP));
  return { netPaise: net, gstPaise: INSTANT_PAYOUT_FEE_PAISE - net, totalPaise: INSTANT_PAYOUT_FEE_PAISE };
}

// ---- Two-person rule for payout batches ----
export const PAYOUT_TWO_PERSON_ABOVE_PAISE = 5_000_000; // Rs 50,000
export const payoutApprovalsNeeded = (batchPaise: number): 1 | 2 => (batchPaise > PAYOUT_TWO_PERSON_ABOVE_PAISE ? 2 : 1);
/** The second approver must be a different Finance user. */
export const canApprovePayout = (approvers: readonly string[], me: string): boolean => !approvers.includes(me);

export type GstInvoice = { number: string; kind: 'student_fee' | 'ticket_platform_fee' | 'brand_fee' | 'plan' | 'instant_fee'; taxablePaise: number; gstPaise: number; totalPaise: number };

/** Invoice for a fee: taxable value is the fee; GST is the 18% on top. */
export function gstInvoice(number: string, kind: GstInvoice['kind'], taxablePaise: number): GstInvoice {
  const gst = Math.round((taxablePaise * GST_BP) / 10000);
  return { number, kind, taxablePaise, gstPaise: gst, totalPaise: taxablePaise + gst };
}

// ---- TDS 194-O (e-commerce operator) ----
// Rate and threshold are statutory parameters: 0.1% of gross, on amounts above Rs 5,00,000 a financial year for an individual seller.
// Confirm both with the company's CA before launch (reported as an open question).
export const TDS_194O_RATE_BP = 10;
export const TDS_194O_THRESHOLD_PAISE = 50_000_000;

/** TDS on a payout: only the part of this year's gross that is above the threshold is liable. */
export function tds194oPaise(i: { grossThisPayoutPaise: number; grossEarlierThisFyPaise: number }): number {
  const before = i.grossEarlierThisFyPaise;
  const after = before + i.grossThisPayoutPaise;
  const liable = Math.max(0, after - Math.max(before, TDS_194O_THRESHOLD_PAISE));
  return Math.round((liable * TDS_194O_RATE_BP) / 10000);
}

/** Indian financial year label for a date, e.g. 15 Nov 2026 -> "FY 2026-27". */
export function financialYear(d: Date): string {
  const y = d.getUTCMonth() >= 3 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  return `FY ${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}
