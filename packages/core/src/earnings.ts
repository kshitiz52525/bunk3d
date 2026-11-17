// The Hustle: earnings state machine, review clock, dispute window, payout rules, TDS, payout setup validation.
// Pure functions only. All money is integer paise. The mock API calls these now; Edge Functions will later.
import { computeTakeHome, FEE_CAP_PAISE, type GigKind, type TakeHome } from './money';

export const DAY_MS = 24 * 3600 * 1000;
export const HOUR_MS = 3600 * 1000;

export const HOLD_DAYS = 7; // approved earnings sit in Pending for 7 days (dispute window)
export const REVIEW_DAYS = 3; // reviewer has 3 days; no reply means auto-approved
export const MAX_REVISIONS = 2; // free revisions the reviewer can ask for
export const DISPUTE_EVIDENCE_HOURS = 48; // evidence due within 48h of opening a dispute

// ---- Earnings state machine -------------------------------------------------------------------
// Estimated -> Pending (approved, 7-day hold) -> Approved -> Payable -> Processing -> Paid.
export const EARNING_STAGES = ['estimated', 'pending', 'approved', 'payable', 'processing', 'paid'] as const;
export type EarningStage = (typeof EARNING_STAGES)[number];

export const stageIndex = (s: EarningStage) => EARNING_STAGES.indexOf(s);

/** Only forward, one step at a time. Processing can also fall back to Payable when a payout bounces. */
export function canTransition(from: EarningStage, to: EarningStage): boolean {
  if (from === 'processing' && to === 'payable') return true;
  return stageIndex(to) === stageIndex(from) + 1;
}

export function nextStage(s: EarningStage): EarningStage | null {
  return EARNING_STAGES[stageIndex(s) + 1] ?? null;
}

export const holdEndsAtMs = (approvedAtMs: number) => approvedAtMs + HOLD_DAYS * DAY_MS;

/** Money that counts as the student's own (past the payer's approval). */
export const isOwned = (s: EarningStage) => stageIndex(s) >= stageIndex('pending');

export type EarningClock = {
  stage: EarningStage;
  /** When the payer approved (or the 3-day auto-approve fired). Starts the 7-day hold. */
  approvedAtMs?: number;
  /** Set when the payer's escrow funds are confirmed. */
  escrowConfirmedAtMs?: number;
  /** Money under dispute never advances. */
  disputed?: boolean;
};

/**
 * Time-driven part of the machine, applied on read:
 * Pending becomes Approved once the 7-day hold has passed; Approved becomes Payable once escrow is confirmed.
 * Estimated, Processing and Paid move only on events (approval, withdrawal, payout), never on time.
 */
export function settleEarning(e: EarningClock, nowMs: number): EarningStage {
  if (e.disputed) return e.stage;
  let stage = e.stage;
  if (stage === 'pending' && e.approvedAtMs !== undefined && nowMs >= holdEndsAtMs(e.approvedAtMs)) stage = 'approved';
  if (stage === 'approved' && e.escrowConfirmedAtMs !== undefined && nowMs >= e.escrowConfirmedAtMs) stage = 'payable';
  return stage;
}

// ---- Review handoff (H6) ----------------------------------------------------------------------
export const reviewDeadlineMs = (submittedAtMs: number) => submittedAtMs + REVIEW_DAYS * DAY_MS;

export type ReviewState = 'in_review' | 'changes_asked' | 'approved' | 'auto_approved';

/** No reply within 3 days means auto-approved. A reply of any kind stops the clock. */
export function reviewState(i: { submittedAtMs: number; nowMs: number; repliedAs?: 'approved' | 'changes_asked' }): ReviewState {
  if (i.repliedAs === 'approved') return 'approved';
  if (i.repliedAs === 'changes_asked') return 'changes_asked';
  return i.nowMs >= reviewDeadlineMs(i.submittedAtMs) ? 'auto_approved' : 'in_review';
}

/** The reviewer may ask for changes only while free revisions remain; after that they approve or reject. */
export const canAskForChanges = (revisionsUsed: number) => revisionsUsed < MAX_REVISIONS;
export const revisionsLeft = (revisionsUsed: number) => Math.max(0, MAX_REVISIONS - revisionsUsed);

// ---- Dispute (H7) -----------------------------------------------------------------------------
export const evidenceDeadlineMs = (openedAtMs: number) => openedAtMs + DISPUTE_EVIDENCE_HOURS * HOUR_MS;
export const canAddEvidence = (openedAtMs: number, nowMs: number) => nowMs < evidenceDeadlineMs(openedAtMs);

/** A student can open a dispute only once the reviewer has rejected the work (free revisions used up or rejected outright). */
export const canOpenDispute = (i: { rejected: boolean; alreadyOpen: boolean }) => i.rejected && !i.alreadyOpen;

/** No Bunk3d fee is ever charged on money under dispute. */
export function chargeableFeePaise(feePaise: number, disputed: boolean): number {
  return disputed ? 0 : feePaise;
}

// ---- Fee quote (B6 calculator) ----------------------------------------------------------------
export type FeeQuote = TakeHome & { capped: boolean };

/** The take-home for a gig plus whether the Rs 1,000 cap applied, for the calculator's explanation line. */
export function quoteTakeHome(i: { payPaise: number; kind: GigKind; lifetimeEarnedPaise: number }): FeeQuote {
  const t = computeTakeHome(i);
  const uncapped = Math.round(((t.payPaise - t.waivedPaise) * t.feeRateBp) / 10000);
  return { ...t, capped: t.feePaise === FEE_CAP_PAISE && uncapped > FEE_CAP_PAISE };
}

// ---- Withdrawals (B4) -------------------------------------------------------------------------
export const MIN_WITHDRAW_PAISE = 10_000; // Rs 100
export const INSTANT_FEE_PAISE = 1_500; // Rs 15
export const STANDARD_ETA_DAYS = 3; // "2-3 working days"; the longest end is used for the clock
export type PayoutSpeed = 'standard' | 'instant';

export type WithdrawQuote = {
  amountPaise: number;
  feePaise: number;
  receivePaise: number;
  ok: boolean;
  error?: 'below_minimum' | 'above_payable';
};

/** Standard UPI payout is free; instant costs Rs 15, taken from the withdrawn amount. */
export function quoteWithdrawal(i: { amountPaise: number; payablePaise: number; speed: PayoutSpeed }): WithdrawQuote {
  const fee = i.speed === 'instant' ? INSTANT_FEE_PAISE : 0;
  const base = { amountPaise: i.amountPaise, feePaise: fee, receivePaise: Math.max(0, i.amountPaise - fee) };
  if (i.amountPaise < MIN_WITHDRAW_PAISE) return { ...base, ok: false, error: 'below_minimum' };
  if (i.amountPaise > i.payablePaise) return { ...base, ok: false, error: 'above_payable' };
  return { ...base, ok: true };
}

// ---- Payout setup (B3): PAN, then UPI verified by a Rs 1 penny drop, then consent --------------
export const PENNY_DROP_PAISE = 100;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const UPI_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;

export const normalizePan = (s: string) => s.trim().toUpperCase();
export const isValidPan = (s: string) => PAN_RE.test(normalizePan(s));
export const isValidUpi = (s: string) => UPI_RE.test(s.trim());
/** Only the first 5 and last character are ever shown back: "ABCDE1234F" -> "ABCDE••••F". */
export const maskPan = (s: string) => {
  const p = normalizePan(s);
  return `${p.slice(0, 5)}••••${p.slice(-1)}`;
};

export const SETUP_STEPS = ['pan', 'upi', 'consent'] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];
/** Steps must be done in order. */
export function nextSetupStep(done: Record<SetupStep, boolean>): SetupStep | null {
  return SETUP_STEPS.find((s) => !done[s]) ?? null;
}
