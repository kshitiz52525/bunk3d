// Hustle domain contract (wave 3): Gigs, My Work, My Bag and payouts, Swap, Portfolio.
// Money is integer paise and is computed on the server (the mock calls `computeTakeHome` from @bunk3d/core).
// Screens only format. Every method needs a signed-in user on a campus at wave >= 3 (RLS: `campus_wave_gate`).
import type { EarningStage, GigKind, PayoutSpeed, TakeHome } from '@bunk3d/core';

export type { EarningStage, GigKind, PayoutSpeed, TakeHome };

export type HustleErrorCode =
  | 'scope_not_accepted'
  | 'already_applied'
  | 'gig_full'
  | 'milestones_incomplete'
  | 'proof_files_required'
  | 'not_in_state'
  | 'evidence_window_closed'
  | 'cannot_open_dispute'
  | 'payout_setup_required'
  | 'invalid_pan'
  | 'invalid_upi'
  | 'below_minimum'
  | 'above_payable'
  | 'banned_item'
  | 'invalid_listing'
  | 'not_found';

/** Thrown by hustle methods. `code` is stable; `message` is safe to show. */
export class HustleError extends Error {
  constructor(public code: HustleErrorCode, message: string) {
    super(message);
    this.name = 'HustleError';
  }
}

// ---- Gigs (H1-H3) ----
export type GigFilter = 'for-you' | 'campus' | 'remote' | 'brand';
export type GigTag = 'featured' | 'club' | 'referral' | 'remote' | null;

export type GigCard = {
  id: string;
  /** Mock/seed record. The UI marks it as sample and never presents it as a real opportunity. */
  seed: boolean;
  payerName: string;
  payerShort: string;
  /** Payer description shown under the name, e.g. "brand collab", "club". */
  payerLabel: string;
  payerVerified: boolean;
  tag: GigTag;
  title: string;
  chips: string[];
  dueAtMs: number | null;
  /** What the payer pays: per unit when `payUnit` is set (e.g. "clip", "referral"). */
  payPaise: number;
  payUnit: string | null;
  kind: GigKind;
  /** Take-home with fee and GST as separate lines. Rate and fee use the student's lifetime earnings now. */
  takeHome: TakeHome;
  slotsLeft: number | null;
  slotsTotal: number | null;
  saved: boolean;
  /** The caller already applied to this gig. */
  applied: boolean;
};

export type TrustFact = { label: string; value: string; basis: 'verified' | 'claimed' };

export type GigDetail = GigCard & {
  sponsored: boolean;
  deliverables: string[];
  deadlineAtMs: number | null;
  paidWhen: string;
  trust: TrustFact[];
  /** Extra scope line the student explicitly accepts when applying (e.g. "Content must carry the #ad label."). */
  scopeNote: string | null;
  /** Set when the caller already applied. */
  applicationId: string | null;
};

export type PortfolioItem = { id: string; tag: string; label: string; verified: boolean };
export type Availability = 'yes' | 'part';

export type ApplyPreview = {
  gigId: string;
  gigTitle: string;
  payerName: string;
  payPaise: number;
  payUnit: string | null;
  scopeText: string;
  /** Fee as it would be locked now. */
  takeHome: TakeHome;
  availabilityQuestion: string | null;
  attachable: PortfolioItem[];
  /** Typical reply time shown in the sent state; null when the payer has no history. */
  replyDays: number | null;
};

export type ApplyInput = {
  gigId: string;
  pitch: string;
  portfolioIds: string[];
  availability: Availability;
  /** Must be true: the student explicitly accepted scope and pay. Nothing starts before this. */
  scopeAccepted: boolean;
};

export type Application = {
  id: string;
  gigId: string;
  status: 'applied' | 'shortlisted' | 'selected' | 'declined';
  appliedAtMs: number;
  scopeAcceptedAtMs: number;
  /** Fee locked at apply. Later changes to lifetime earnings never change it. */
  lockedTakeHome: TakeHome;
  /** Applying never costs money. */
  costToApplyPaise: 0;
  replyDays: number | null;
};

// ---- My Work (H4-H7) ----
export type WorkTab = 'applied' | 'active' | 'done';
export type WorkStatus =
  | 'applied' | 'shortlisted' | 'in_progress' | 'in_review' | 'changes_asked' | 'rejected' | 'in_dispute' | 'approved' | 'paid';

export type WorkItem = {
  id: string;
  seed: boolean;
  gigId: string;
  payerName: string;
  payerKind: string;
  title: string;
  status: WorkStatus;
  /** Plain next-step line, e.g. "Reply expected by Mon". */
  next: string;
  /** The payer pays this (per unit when set); `takeHomePaise` is after the locked fee and GST. */
  payPaise: number;
  takeHomePaise: number;
  progressPct: number;
  /** Where a tap goes. */
  target: 'gig' | 'workspace' | 'proof' | 'dispute' | 'earning';
  targetId: string;
};

export type Milestone = { label: string; done: boolean };
export type WorkFile = { name: string; sizeLabel: string };

export type Workspace = {
  workId: string;
  seed: boolean;
  gigId: string;
  title: string;
  payerName: string;
  payPaise: number;
  /** Locked fee breakdown from the application. */
  takeHome: TakeHome;
  dueAtMs: number | null;
  status: WorkStatus;
  milestones: Milestone[];
  briefFrom: string;
  briefFiles: WorkFile[];
  lastMessage: { from: string; atMs: number; text: string } | null;
  scopeAcceptedAtMs: number;
};

export type ProofStatus = 'working' | 'in_review' | 'changes_asked' | 'approved' | 'rejected';
export type ProofView = {
  workId: string;
  title: string;
  payPaise: number;
  takeHome: TakeHome;
  status: ProofStatus;
  files: WorkFile[];
  requiredFilesLabel: string;
  note: string;
  reviewerName: string;
  reviewerRole: string;
  submittedAtMs: number | null;
  /** submittedAt + 3 days: no reply means auto-approved. */
  reviewDeadlineAtMs: number | null;
  autoApproved: boolean;
  revisionsUsed: number;
  revisionsMax: number;
  changeRequest: string | null;
  earningId: string | null;
  canDispute: boolean;
  /** All milestones done; proof can be submitted. */
  ready: boolean;
};
export type ProofInput = { note: string; files: WorkFile[] };

export type DisputeTimelineKind = 'submitted' | 'rejected' | 'opened' | 'evidence' | 'decision';
export type Dispute = {
  id: string;
  code: string;
  workId: string;
  title: string;
  payerName: string;
  amountPaise: number;
  rejectionReason: string;
  openedAtMs: number;
  /** openedAt + 48h. */
  evidenceDeadlineAtMs: number;
  canAddEvidence: boolean;
  statement: string;
  attachments: string[];
  evidenceSentAtMs: number | null;
  status: 'open' | 'evidence_received' | 'decided';
  decisionByMs: number | null;
  timeline: { kind: DisputeTimelineKind; atMs: number | null; label: string }[];
  /** Always true: the money stays in escrow and no fee is charged on it. */
  inEscrow: true;
  feeChargedPaise: 0;
};
export type DisputeView = { dispute: Dispute | null; canOpen: boolean; cannotOpenReason: string | null; workTitle: string };

// ---- My Bag (B1-B5) ----
export type BagState = { stage: EarningStage; paise: number; count: number };
export type Bag = {
  /** Withdrawable now. Other states are tracked, not added together. */
  payablePaise: number;
  payableCount: number;
  states: BagState[];
  /** Money under dispute: held in escrow, no fee, not part of any state above. */
  disputedPaise: number;
  /** When the next Pending earning becomes Payable. */
  nextPayableAtMs: number | null;
  paidThisFyPaise: number;
  fy: string;
  payoutReady: boolean;
};

export type EarningStep = { stage: EarningStage; label: string; atMs: number | null; note: string };
export type Earning = {
  id: string;
  seed: boolean;
  ref: string;
  title: string;
  payerName: string;
  workId: string | null;
  gigId: string;
  stage: EarningStage;
  grossPaise: number;
  kind: GigKind;
  feeRateBp: number;
  feePaise: number;
  gstPaise: number;
  tdsPaise: number;
  netPaise: number;
  feeLockedAtMs: number;
  steps: EarningStep[];
  payableFromAtMs: number | null;
  canDispute: boolean;
};

export type SetupStepKey = 'pan' | 'upi' | 'consent';
export type PayoutSetup = {
  steps: { key: SetupStepKey; done: boolean; summary: string | null }[];
  doneCount: number;
  complete: boolean;
  upiId: string | null;
  /** The step the student must do next, or null when complete. */
  next: SetupStepKey | null;
};

export type WithdrawOptions = {
  payablePaise: number;
  minPaise: number;
  upiId: string | null;
  payoutReady: boolean;
  speeds: { key: PayoutSpeed; label: string; feePaise: number; etaLabel: string }[];
};
export type WithdrawQuoteView = { amountPaise: number; feePaise: number; receivePaise: number; ok: boolean; error: 'below_minimum' | 'above_payable' | null };
export type Withdrawal = {
  id: string;
  ref: string;
  amountPaise: number;
  feePaise: number;
  receivePaise: number;
  speed: PayoutSpeed;
  upiId: string;
  status: 'processing' | 'paid' | 'returned';
  createdAtMs: number;
  expectedAtMs: number;
  note: string | null;
};

export type HistoryFilter = 'all' | 'earnings' | 'withdrawals';
export type HistoryRow = {
  id: string;
  kind: 'earning' | 'withdrawal';
  title: string;
  meta: string;
  atMs: number;
  /** Signed: earnings positive, withdrawals negative. */
  amountPaise: number;
  /** Earning stage, or withdrawal status. */
  status: EarningStage | 'returned';
  earningId: string | null;
};
export type TaxSummary = { fy: string; tdsDeductedPaise: number; certificateIssued: boolean; note: string };
export type TaxCertificate = { fileName: string; text: string };

// ---- Fees (B6) ----
export type FeeLevelKey = 'first' | 'earned' | 'pro';
export type FeeCalcOptions = {
  levels: { key: FeeLevelKey; label: string; lifetimePaise: number }[];
  /** Fee table rows, as shown on the rules list. */
  rules: { label: string; value: string }[];
  defaultPayPaise: number;
};
export type FeeQuoteView = TakeHome & { capped: boolean };

// ---- Swap (Q1-Q3) ----
export type SwapListing = {
  id: string;
  seed: boolean;
  title: string;
  pricePaise: number;
  negotiable: boolean;
  condition: 'New' | 'Like new' | 'Good' | 'Used' | 'Notes';
  category: 'Books' | 'Gear' | 'Rides' | 'Hostel';
  /** Short tile label shown where a photo would be, e.g. "BOOK". */
  glyph: string;
  description: string;
  sellerId: string;
  /** Always the seller's real name ("Sana K.") and year line. Never anonymous. */
  sellerName: string;
  sellerInitials: string;
  sellerLine: string;
  swapsDone: number;
  postedAtMs: number;
  sold: boolean;
  mine: boolean;
  photoCount: number;
};
export type ListingInput = {
  title: string;
  pricePaise: number;
  negotiable: boolean;
  condition: 'New' | 'Like new' | 'Good' | 'Used';
  category: 'Books' | 'Gear' | 'Rides' | 'Hostel';
  description?: string;
  photoCount: number;
};

// ---- Portfolio (P4) ----
export type Portfolio = {
  name: string;
  initials: string;
  line: string;
  verified: boolean;
  payoutDone: boolean;
  gigsApproved: number;
  /** Null until at least one payer rated. Never invented. */
  payerRating: number | null;
  onTimePct: number | null;
  skills: { name: string; verified: boolean }[];
  work: { id: string; by: string; title: string }[];
  publicLink: boolean;
  publicUrl: string;
};

export interface HustleApi {
  /** Student on a wave >= 3 campus. RLS: gigs visible when the gig's campuses include the caller's campus and status = open. */
  listGigs(filter: GigFilter): Promise<GigCard[]>;
  /** Same as listGigs. */
  getGig(id: string): Promise<GigDetail>;
  /** Caller only. RLS: saved_gigs row owned by auth.uid(). */
  toggleSaveGig(id: string): Promise<boolean>;
  /** Caller only. Shows the fee as it would lock; nothing is charged or locked. */
  previewApplication(gigId: string): Promise<ApplyPreview>;
  /**
   * Caller only. Requires `scopeAccepted` (no work before scope and pay are explicitly accepted).
   * Locks the fee (fee_locked_pct) and stores `scope_accepted_at`. Never charges the student: applying is free.
   * RLS: applications.student_id = auth.uid(); one application per gig and student.
   */
  applyToGig(input: ApplyInput): Promise<Application>;

  /** Caller's own work grouped by tab. RLS: applications / work owned by auth.uid(). */
  listMyWork(tab: WorkTab): Promise<WorkItem[]>;
  /** Counts for the three tabs. */
  workCounts(): Promise<Record<WorkTab, number>>;
  /** Caller's own selected work. Brand/club reviewers read it through their own console policies. */
  getWorkspace(workId: string): Promise<Workspace>;
  toggleMilestone(workId: string, index: number): Promise<Workspace>;
  /** Caller only. */
  getProof(workId: string): Promise<ProofView>;
  /** Caller only; keeps a draft without submitting. */
  saveProofDraft(workId: string, input: ProofInput): Promise<ProofView>;
  /** Caller only. Requires every milestone done and at least one file. Starts the 3-day review clock. */
  submitProof(workId: string, input: ProofInput): Promise<ProofView>;
  /** Caller only. The open dispute for this work (or whether one can be opened). */
  getDispute(workId: string): Promise<DisputeView>;
  /** Caller only, once the work was rejected. Locks the escrow; no fee is charged on disputed money. */
  openDispute(workId: string): Promise<Dispute>;
  /** Caller only, within 48h of opening. Rejected with `evidence_window_closed` after that. */
  addDisputeEvidence(workId: string, input: { statement: string; attachments: string[] }): Promise<Dispute>;

  /** Caller only. RLS: earnings.student_id = auth.uid(). */
  getBag(): Promise<Bag>;
  getEarning(id: string): Promise<Earning>;
  /** Caller only. Needs PAN, UPI (Rs 1 penny drop) and consent. */
  getPayoutSetup(): Promise<PayoutSetup>;
  /** Step 1. Stores the PAN encrypted; only the masked value is ever returned. */
  verifyPan(pan: string): Promise<PayoutSetup>;
  /** Step 2 (needs step 1). Sends Rs 1 to the UPI id to confirm it belongs to the student. */
  verifyUpi(upiId: string): Promise<PayoutSetup>;
  /** Step 3 (needs step 2). */
  agreePayoutConsent(): Promise<PayoutSetup>;
  getWithdrawOptions(): Promise<WithdrawOptions>;
  quoteWithdrawal(input: { amountPaise: number; speed: PayoutSpeed }): Promise<WithdrawQuoteView>;
  /** Caller only. Rejected until payout setup is complete. Standard is free (2-3 working days); instant costs Rs 15. */
  withdraw(input: { amountPaise: number; speed: PayoutSpeed }): Promise<Withdrawal>;
  getWithdrawal(id: string): Promise<Withdrawal>;
  listHistory(filter: HistoryFilter): Promise<HistoryRow[]>;
  /** TDS 194-O summary and Form 16A status for the current financial year. */
  getTaxSummary(): Promise<TaxSummary>;
  downloadTaxCertificate(): Promise<TaxCertificate>;

  /** Any signed-in student. The calculator is the same maths the gig cards use. */
  getFeeCalcOptions(): Promise<FeeCalcOptions>;
  calculateTakeHome(input: { payPaise: number; kind: GigKind; lifetimePaise: number }): Promise<FeeQuoteView>;

  /** Students of the caller's own campus only. RLS: listings.campus_id = caller's campus_id. */
  listListings(category: 'All' | SwapListing['category']): Promise<SwapListing[]>;
  getListing(id: string): Promise<SwapListing>;
  /** Caller only. Rejects banned items (weapons, medicines, notes-for-cash on exams). Lists under the caller's real name. */
  createListing(input: ListingInput): Promise<SwapListing>;
  /** Seller only. */
  markListingSold(id: string): Promise<SwapListing>;

  /** Caller's own portfolio. Earnings are never part of it. */
  getPortfolio(): Promise<Portfolio>;
  setPortfolioPublic(on: boolean): Promise<Portfolio>;
}
