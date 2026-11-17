import { describe, expect, it } from 'vitest';
import {
  INSTANT_PAYOUT_FEE_PAISE, PAYOUT_TWO_PERSON_ABOVE_PAISE, canApprovePayout, instantFeeSplit, payoutApprovalsNeeded, TDS_194O_THRESHOLD_PAISE, accountBalance, brandFeeCharge, computeTakeHome, createLedger, financialYear, fundEscrow,
  gstInvoice, isBalanced, payoutToStudent, priceTicket, releaseToClub, releaseToStudent, settleTicketsToClub, tds194oPaise, ticketSale, trialBalance, type LedgerTxn,
} from '../src';

const rs = (n: number) => Math.round(n * 100);
let n = 0;
const txn = (memo: string, lines: LedgerTxn['lines']): LedgerTxn => ({ id: `t${++n}`, atMs: 0, memo, lines });

describe('ledger', () => {
  it('rejects unbalanced, one-sided and negative entries', () => {
    const l = createLedger();
    expect(() => l.post(txn('bad', [{ account: 'bank', debitPaise: 100, creditPaise: 0 }, { account: 'escrow', debitPaise: 0, creditPaise: 99 }]))).toThrow(/balance/);
    expect(() => l.post(txn('one', [{ account: 'bank', debitPaise: 100, creditPaise: 0 }]))).toThrow();
    expect(() => l.post(txn('neg', [{ account: 'bank', debitPaise: -1, creditPaise: 0 }, { account: 'escrow', debitPaise: 0, creditPaise: -1 }]))).toThrow();
    expect(() => l.post(txn('frac', [{ account: 'bank', debitPaise: 1.5, creditPaise: 0 }, { account: 'escrow', debitPaise: 0, creditPaise: 1.5 }]))).toThrow();
  });

  it('a Rs 2,500 gig releases to take-home Rs 2,352.50, fee Rs 125, GST Rs 22.50, and balances', () => {
    const l = createLedger();
    const th = computeTakeHome({ payPaise: rs(2500), kind: 'paid', lifetimeEarnedPaise: rs(5000) });
    l.post(txn('fund', fundEscrow('c1', rs(2500))));
    l.post(txn('release', releaseToStudent({ campaignId: 'c1', studentId: 's1', payPaise: th.payPaise, feePaise: th.feePaise, gstPaise: th.gstPaise })));
    const all = l.all();
    expect(accountBalance(all, 'escrow')).toBe(0);
    expect(accountBalance(all, 'student_payable', 's1')).toBe(rs(2352.5));
    expect(accountBalance(all, 'fee_revenue')).toBe(rs(125));
    expect(accountBalance(all, 'gst_payable')).toBe(rs(22.5));
    expect(trialBalance(all).balanced).toBe(true);
  });

  it('no fee on disputed money: the full pay stays payable-neutral', () => {
    const lines = releaseToStudent({ campaignId: 'c', studentId: 's', payPaise: rs(1500), feePaise: 0, gstPaise: 0 });
    expect(isBalanced({ lines })).toBe(true);
    expect(lines.some((x) => x.account === 'fee_revenue')).toBe(false);
  });

  it('ticket sale: Rs 199 ticket books Rs 210.74 in, Rs 199 to ticket_sales, Rs 9.95 fee, Rs 1.79 GST', () => {
    const t = priceTicket({ pricePaise: rs(199), qty: 1 });
    const l = createLedger();
    l.post(txn('sale', ticketSale('e1', t)));
    l.post(txn('settle', settleTicketsToClub('e1', 'club1', t.subtotalPaise)));
    const all = l.all();
    expect(accountBalance(all, 'bank')).toBe(t.totalPaise);
    expect(t.totalPaise).toBe(21074);
    expect(accountBalance(all, 'fee_revenue')).toBe(995);
    expect(accountBalance(all, 'gst_payable')).toBe(179);
    expect(accountBalance(all, 'ticket_sales')).toBe(0);
    expect(accountBalance(all, 'club_balance', 'club1')).toBe(rs(199));
  });

  it('brand fee, club release, payouts with TDS and instant fee all balance', () => {
    const l = createLedger();
    l.post(txn('fund', fundEscrow('c1', rs(42000))));
    l.post(txn('brand fee', brandFeeCharge('c1', rs(2100), rs(378))));
    l.post(txn('club', releaseToClub('c1', 'club1', rs(29400))));
    l.post(txn('student', releaseToStudent({ campaignId: 'c1', studentId: 's1', payPaise: rs(12600), feePaise: 0, gstPaise: 0 })));
    l.post(txn('payout', payoutToStudent({ studentId: 's1', amountPaise: rs(5000), tdsPaise: 500, instant: true })));
    const all = l.all();
    expect(all.every(isBalanced)).toBe(true);
    expect(accountBalance(all, 'escrow')).toBe(0);
    expect(accountBalance(all, 'instant_fee') + accountBalance(all, 'gst_payable', 's1')).toBe(INSTANT_PAYOUT_FEE_PAISE);
    expect(instantFeeSplit()).toEqual({ netPaise: 1271, gstPaise: 229, totalPaise: 1500 });
    expect(accountBalance(all, 'tds_payable')).toBe(500);
    expect(accountBalance(all, 'student_payable', 's1')).toBe(rs(12600) - rs(5000));
  });

  it('is append-only: reversal mirrors the entry and cannot happen twice', () => {
    const l = createLedger();
    const t = l.post(txn('fund', fundEscrow('c1', 1000)));
    l.reverse(t.id, 1, 'r1');
    expect(accountBalance(l.all(), 'escrow')).toBe(0);
    expect(() => l.reverse(t.id, 2, 'r2')).toThrow(/already reversed/);
    expect(() => l.post(t)).toThrow(/already posted/);
  });
});

describe('payout approvals', () => {
  it('batches above Rs 50,000 need two different people', () => {
    expect(payoutApprovalsNeeded(PAYOUT_TWO_PERSON_ABOVE_PAISE)).toBe(1);
    expect(payoutApprovalsNeeded(PAYOUT_TWO_PERSON_ABOVE_PAISE + 1)).toBe(2);
    expect(canApprovePayout(['a'], 'a')).toBe(false);
    expect(canApprovePayout(['a'], 'b')).toBe(true);
  });
});

describe('GST invoices and TDS 194-O', () => {
  it('every fee gets an invoice with 18% GST on top', () => {
    expect(gstInvoice('INV-1', 'student_fee', rs(125))).toMatchObject({ gstPaise: rs(22.5), totalPaise: rs(147.5) });
    expect(gstInvoice('INV-2', 'brand_fee', rs(2100)).gstPaise).toBe(rs(378));
  });
  it('TDS applies only above the yearly threshold', () => {
    expect(tds194oPaise({ grossThisPayoutPaise: rs(10000), grossEarlierThisFyPaise: 0 })).toBe(0);
    expect(tds194oPaise({ grossThisPayoutPaise: rs(20000), grossEarlierThisFyPaise: TDS_194O_THRESHOLD_PAISE - rs(10000) })).toBe(rs(10));
    expect(tds194oPaise({ grossThisPayoutPaise: rs(10000), grossEarlierThisFyPaise: TDS_194O_THRESHOLD_PAISE + rs(1) })).toBe(rs(10));
  });
  it('financial year runs April to March', () => {
    expect(financialYear(new Date(Date.UTC(2026, 10, 15)))).toBe('FY 2026-27');
    expect(financialYear(new Date(Date.UTC(2027, 1, 1)))).toBe('FY 2026-27');
  });
});
