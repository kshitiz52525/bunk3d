import {
  BANNED_COPY, DAY_MS, MAX_REVISIONS, PENNY_DROP_PAISE, bannedListingReason, canAddEvidence, canOpenDispute, computeTakeHome, evidenceDeadlineMs, financialYear,
  formatPaise, holdEndsAtMs, isValidPan, isValidUpi, maskPan, nextSetupStep, quoteTakeHome, quoteWithdrawal, reviewDeadlineMs, reviewState, revisionsLeft, settleEarning,
  tds194oPaise, INSTANT_FEE_PAISE, MIN_WITHDRAW_PAISE, STANDARD_ETA_DAYS, TIER_THRESHOLD_PAISE, FIRST_FREE_PAISE, FEE_CAP_PAISE,
  type EarningStage, type SetupStep,
} from '@bunk3d/core';
import {
  HustleError,
  type Application, type ApplyInput, type ApplyPreview, type Bag, type Dispute, type DisputeView, type Earning, type EarningStep, type GigCard, type GigDetail, type GigFilter,
  type HistoryFilter, type HistoryRow, type HustleApi, type ListingInput, type PayoutSetup, type Portfolio, type ProofInput, type ProofView, type SwapListing,
  type WithdrawOptions, type Withdrawal, type WorkFile, type WorkItem, type WorkStatus, type WorkTab, type Workspace,
} from '../contract';
import type { MockCtx } from './ctx';
import { DAY, HOUR, SEED_GIGS, SEED_LISTINGS, SEED_PORTFOLIO_ITEMS, SEED_SKILLS, type SeedGig } from './seed-hustle';

// ---- internal records ----
type DisputeRec = { id: string; code: string; openedAtMs: number; rejectedAtMs: number; rejectionReason: string; statement: string; attachments: string[]; evidenceSentAtMs: number | null };
type WorkRec = {
  id: string; seed: boolean; gigId: string; application: Application; status: WorkStatus; milestones: boolean[]; files: WorkFile[]; note: string;
  submittedAtMs: number | null; revisionsUsed: number; changeRequest: string | null; changeSummary: string | null; rejectionReason: string | null;
  earningId: string | null; dispute: DisputeRec | null; lastMessage: Workspace['lastMessage']; paidAtMs: number | null; nextOverride: string | null;
};
type EarningRec = {
  id: string; seed: boolean; ref: string; title: string; payerName: string; workId: string | null; gigId: string; stage: EarningStage; approvedAtMs: number;
  escrowConfirmedAtMs?: number; kind: Earning['kind']; feeRateBp: number; grossPaise: number; feePaise: number; gstPaise: number; tdsPaise: number; netPaise: number;
  feeLockedAtMs: number; history: Partial<Record<EarningStage, number>>; withdrawnPaise: number; paidAtMs: number | null;
};
type WithdrawalRec = Withdrawal & { alloc: { earningId: string; paise: number }[] };
type ListingRec = SwapListing & { campus: string };

const STAGE_LABEL: Record<EarningStage, string> = { estimated: 'Estimated', pending: 'Pending', approved: 'Approved', payable: 'Payable', processing: 'Processing', paid: 'Paid' };
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayName = (ms: number) => WEEKDAY[new Date(ms).getDay()]!;
const dayMonth = (ms: number) => `${new Date(ms).getDate()} ${MONTH[new Date(ms).getMonth()]}`;

const nf = (e: unknown, code: ConstructorParameters<typeof HustleError>[0] = 'not_found') => new HustleError(code, typeof e === 'string' ? e : 'Not found');

export function createHustle(ctx: MockCtx): HustleApi {
  const { wait } = ctx;
  const now = () => ctx.now();
  const t0 = now();
  let seq = 100;
  const nextId = (p: string) => `${p}-${++seq}`;
  const ref5 = () => String(88000 + ++seq);

  const gigsById = new Map<string, SeedGig>(SEED_GIGS.map((g) => [g.id, g]));
  const savedGigs = new Set<string>();
  const works: WorkRec[] = [];
  const earnings: EarningRec[] = [];
  const withdrawals: WithdrawalRec[] = [];
  let listings: ListingRec[] = [];
  const setup: { pan: string | null; upi: string | null; consent: boolean } = { pan: null, upi: null, consent: false };
  let portfolioPublic = false;

  // ---- money helpers (all maths in @bunk3d/core) ----
  const earnedSoFar = () => earnings.reduce((a, e) => a + e.grossPaise, 0); // gross of everything the payer approved
  const takeHomeFor = (g: SeedGig, at = now()) => {
    void at;
    return computeTakeHome({ payPaise: g.payPaise, kind: g.kind, lifetimeEarnedPaise: earnedSoFar() });
  };

  // ---- seed ----
  const mkApp = (g: SeedGig, status: Application['status'], appliedAgoMs: number, lifetime = 640_000): Application => {
    const at = t0 - appliedAgoMs;
    return { id: nextId('app'), gigId: g.id, status, appliedAtMs: at, scopeAcceptedAtMs: at, lockedTakeHome: computeTakeHome({ payPaise: g.payPaise, kind: g.kind, lifetimeEarnedPaise: lifetime }), costToApplyPaise: 0, replyDays: g.replyDays };
  };
  const seedWork = (id: string, gigId: string, status: WorkStatus, appliedAgoMs: number, patch: Partial<WorkRec> = {}) => {
    const g = gigsById.get(gigId)!;
    const n = g.milestones.length;
    const w: WorkRec = {
      id, seed: true, gigId, application: mkApp(g, status === 'applied' ? 'applied' : status === 'shortlisted' ? 'shortlisted' : 'selected', appliedAgoMs), status,
      milestones: Array.from({ length: n }, () => status !== 'applied' && status !== 'shortlisted' && status !== 'in_progress'), files: [], note: '', submittedAtMs: null, revisionsUsed: 0,
      changeRequest: null, changeSummary: null, rejectionReason: null, earningId: null, dispute: null, lastMessage: null, paidAtMs: null, nextOverride: null, ...patch,
    };
    works.push(w);
    return w;
  };
  const seedEarning = (i: { title: string; payer: string; gigId: string; workId: string | null; kind: EarningRec['kind']; gross: number; stage: EarningStage; approvedAgoMs: number; confirm?: 'now+6h' | 'at-hold-end'; paidAgoMs?: number }) => {
    const th = computeTakeHome({ payPaise: i.gross, kind: i.kind, lifetimeEarnedPaise: 640_000 });
    const approvedAtMs = t0 - i.approvedAgoMs;
    const e: EarningRec = {
      id: nextId('ern'), seed: true, ref: `ERN-${ref5()}`, title: i.title, payerName: i.payer, workId: i.workId, gigId: i.gigId, stage: i.stage, approvedAtMs,
      escrowConfirmedAtMs: i.confirm === 'now+6h' ? t0 + 6 * HOUR : i.stage === 'pending' ? holdEndsAtMs(approvedAtMs) + 6 * HOUR : holdEndsAtMs(approvedAtMs), kind: i.kind, feeRateBp: th.feeRateBp,
      grossPaise: i.gross, feePaise: th.feePaise, gstPaise: th.gstPaise, tdsPaise: 0, netPaise: th.takeHomePaise, feeLockedAtMs: approvedAtMs - 5 * DAY,
      history: { estimated: approvedAtMs - 5 * DAY, pending: approvedAtMs }, withdrawnPaise: 0, paidAtMs: i.paidAgoMs !== undefined ? t0 - i.paidAgoMs : null,
    };
    if (e.stage === 'payable') e.history.payable = holdEndsAtMs(approvedAtMs);
    if (e.stage === 'paid') { e.history.approved = holdEndsAtMs(approvedAtMs); e.history.payable = holdEndsAtMs(approvedAtMs); e.history.processing = e.paidAtMs! - 3 * DAY; e.history.paid = e.paidAtMs!; e.withdrawnPaise = e.netPaise; }
    earnings.push(e);
    return e;
  };

  // Earlier paid gigs: Rs 600 + Rs 2,000 + Rs 3,800 = Rs 6,400 gross (past the first-Rs-1,000 free band).
  seedEarning({ title: 'Sound check crew, fest night', payer: 'Sample Music Society', gigId: 'g-sound', workId: 'w-sound', kind: 'club', gross: 60_000, stage: 'paid', approvedAgoMs: 40 * DAY, paidAgoMs: 25 * DAY });
  seedEarning({ title: 'Campus survey runs (sample)', payer: 'Example Survey Co', gigId: 'g-sound', workId: null, kind: 'paid', gross: 200_000, stage: 'paid', approvedAgoMs: 60 * DAY, paidAgoMs: 45 * DAY });
  seedEarning({ title: 'Brand sampler shifts (sample)', payer: 'Example Eats (sample)', gigId: 'g-sampling', workId: null, kind: 'paid', gross: 380_000, stage: 'paid', approvedAgoMs: 90 * DAY, paidAgoMs: 75 * DAY });
  // Payable now: three gigs.
  seedEarning({ title: 'Quiz night host (sample)', payer: 'Sample Quiz Club', gigId: 'g-sound', workId: null, kind: 'club', gross: 100_000, stage: 'payable', approvedAgoMs: 14 * DAY });
  seedEarning({ title: 'Referral round 1 (sample)', payer: 'Zordo Pay (sample)', gigId: 'g-zordo', workId: null, kind: 'referral', gross: 50_000, stage: 'payable', approvedAgoMs: 12 * DAY });
  seedEarning({ title: 'Registration desk (sample)', payer: 'Sample E-Cell', gigId: 'g-ecell', workId: null, kind: 'club', gross: 80_000, stage: 'payable', approvedAgoMs: 10 * DAY });
  // Approved: the hold passed, escrow confirmation arrives within hours.
  seedEarning({ title: 'Society night volunteers (sample)', payer: 'Sample Music Society', gigId: 'g-sound', workId: null, kind: 'club', gross: 80_000, stage: 'pending', approvedAgoMs: 8 * DAY, confirm: 'now+6h' });

  seedWork('w-acme', 'g-acme', 'applied', 1 * DAY);
  seedWork('w-skill', 'g-skill', 'shortlisted', 2 * DAY, { nextOverride: 'Sample clip requested' });
  seedWork('w-posters', 'g-posters', 'in_progress', 4 * DAY, { milestones: [true, true, false, false], lastMessage: { from: 'Rhea', atMs: t0 - 2 * HOUR, text: 'Poster 2 looks fire. Can we push the date bigger on 3?' } });
  seedWork('w-expo', 'g-ecell', 'changes_asked', 6 * DAY, {
    milestones: [true, true, true], files: [{ name: 'visitor-sheet.pdf', sizeLabel: '240 KB' }], note: 'Both shifts done, sheet attached.', submittedAtMs: t0 - 2 * DAY, revisionsUsed: 1,
    changeRequest: 'Visitor sheet is missing the afternoon entries. Please add them.', changeSummary: 'Fix visitor sheet',
  });
  seedWork('w-sampling', 'g-sampling', 'in_dispute', 12 * DAY, {
    milestones: [true, true, true], files: [{ name: 'stall-photos.zip', sizeLabel: '9 MB' }], submittedAtMs: t0 - 5 * DAY, revisionsUsed: 2,
    dispute: { id: 'd-2041', code: 'D-2041', openedAtMs: t0 - 30 * HOUR, rejectedAtMs: t0 - 4 * DAY, rejectionReason: 'Stall ran 2 hrs short.', statement: '', attachments: [], evidenceSentAtMs: null },
  });
  seedWork('w-flyer', 'g-flyer', 'rejected', 9 * DAY, {
    milestones: [true], files: [{ name: 'flyer-log.jpg', sizeLabel: '1 MB' }], submittedAtMs: t0 - 3 * DAY, revisionsUsed: 2, rejectionReason: 'Flyers were not handed out in Block B.',
  });
  const wPhoto = seedWork('w-photo', 'g-photo', 'approved', 9 * DAY, { milestones: [true, true], files: [{ name: 'fest-photos.zip', sizeLabel: '120 MB' }], submittedAtMs: t0 - 4 * DAY });
  const photoEarning = seedEarning({ title: 'Fest photo coverage', payer: 'Sample Photo Club', gigId: 'g-photo', workId: 'w-photo', kind: 'club', gross: 100_000, stage: 'pending', approvedAgoMs: 2 * DAY });
  wPhoto.earningId = photoEarning.id;
  const wSound = seedWork('w-sound', 'g-sound', 'paid', 50 * DAY, { milestones: [true], submittedAtMs: t0 - 41 * DAY });
  wSound.earningId = earnings[0]!.id;
  wSound.paidAtMs = earnings[0]!.paidAtMs;
  // Withdrawal history (seed).
  withdrawals.push(
    { id: 'wd-49920', ref: 'WD-49920', amountPaise: 320_000, feePaise: 0, receivePaise: 320_000, speed: 'standard', upiId: 'aarav@okaxis', status: 'paid', createdAtMs: t0 - 30 * DAY, expectedAtMs: t0 - 27 * DAY, note: null, alloc: [] },
    { id: 'wd-48811', ref: 'WD-48811', amountPaise: 50_000, feePaise: 0, receivePaise: 50_000, speed: 'standard', upiId: 'aarav@okaxis', status: 'returned', createdAtMs: t0 - 38 * DAY, expectedAtMs: t0 - 35 * DAY, note: 'Bank was down. The money returned to Payable.', alloc: [] },
  );

  const ownSeedListing = (s: (typeof SEED_LISTINGS)[number]): ListingRec => ({
    id: s.id, seed: true, title: s.title, pricePaise: s.pricePaise, negotiable: s.negotiable, condition: s.condition, category: s.category, glyph: s.glyph, description: s.description,
    sellerId: `seller-${s.id}`, sellerName: s.sellerName, sellerInitials: s.sellerName.split(' ').map((p) => p[0]).join(''), sellerLine: s.sellerLine, swapsDone: s.swapsDone,
    postedAtMs: t0 - s.ageDays * DAY, sold: false, mine: false, photoCount: 1, campus: s.campus,
  });
  listings = SEED_LISTINGS.map(ownSeedListing);

  // ---- time-driven settlement, applied at the start of every read ----
  function approveWork(w: WorkRec, atMs: number) {
    const g = gigsById.get(w.gigId)!;
    const th = w.application.lockedTakeHome;
    const fy = financialYear(new Date(atMs));
    const earlier = earnings.filter((e) => financialYear(new Date(e.approvedAtMs)) === fy).reduce((a, e) => a + e.grossPaise, 0);
    const tds = tds194oPaise({ grossThisPayoutPaise: th.payPaise, grossEarlierThisFyPaise: earlier });
    const e: EarningRec = {
      id: nextId('ern'), seed: false, ref: `ERN-${ref5()}`, title: g.title, payerName: g.payerName, workId: w.id, gigId: g.id, stage: 'pending', approvedAtMs: atMs,
      escrowConfirmedAtMs: holdEndsAtMs(atMs) + 6 * HOUR, kind: g.kind, feeRateBp: th.feeRateBp, grossPaise: th.payPaise, feePaise: th.feePaise, gstPaise: th.gstPaise, tdsPaise: tds,
      netPaise: th.takeHomePaise - tds, feeLockedAtMs: w.application.appliedAtMs, history: { estimated: w.application.scopeAcceptedAtMs, pending: atMs }, withdrawnPaise: 0, paidAtMs: null,
    };
    earnings.push(e);
    w.status = 'approved';
    w.earningId = e.id;
  }

  function settle() {
    const n = now();
    for (const w of works) {
      if (w.status === 'applied' && n >= w.application.appliedAtMs + w.application.replyDays! * DAY_MS) {
        w.status = 'in_progress';
        w.application = { ...w.application, status: 'selected' };
        w.milestones = gigsById.get(w.gigId)!.milestones.map(() => false);
      }
      if (w.status === 'in_review' && w.submittedAtMs !== null && reviewState({ submittedAtMs: w.submittedAtMs, nowMs: n }) === 'auto_approved') approveWork(w, reviewDeadlineMs(w.submittedAtMs));
    }
    for (const e of earnings) {
      if (e.stage === 'pending' || e.stage === 'approved') {
        const s = settleEarning({ stage: e.stage, approvedAtMs: e.approvedAtMs, escrowConfirmedAtMs: e.escrowConfirmedAtMs }, n);
        if (s !== e.stage) {
          if (s === 'approved' || s === 'payable') e.history.approved = holdEndsAtMs(e.approvedAtMs);
          if (s === 'payable') e.history.payable = e.escrowConfirmedAtMs ?? holdEndsAtMs(e.approvedAtMs);
          e.stage = s;
        }
      }
    }
    for (const wd of withdrawals) {
      if (wd.status === 'processing' && n >= wd.expectedAtMs) {
        wd.status = 'paid';
        for (const a of wd.alloc) {
          const e = earnings.find((x) => x.id === a.earningId);
          if (e && e.stage === 'processing' && e.withdrawnPaise >= e.netPaise) { e.stage = 'paid'; e.paidAtMs = wd.expectedAtMs; e.history.paid = wd.expectedAtMs; }
        }
      }
    }
  }

  // ---- mappers ----
  const gigOf = (id: string) => {
    const g = gigsById.get(id);
    if (!g) throw nf('That gig is gone.');
    return g;
  };
  const appFor = (gigId: string) => works.find((w) => w.gigId === gigId);
  const toCard = (g: SeedGig): GigCard => {
    const w = appFor(g.id);
    return {
      id: g.id, seed: true, payerName: g.payerName, payerShort: g.payerShort, payerLabel: g.payerLabel, payerVerified: g.payerVerified, tag: g.tag, title: g.title, chips: g.chips,
      dueAtMs: g.dueInDays === null ? null : t0 + g.dueInDays * DAY, payPaise: g.payPaise, payUnit: g.payUnit, kind: g.kind, takeHome: w ? w.application.lockedTakeHome : takeHomeFor(g),
      slotsLeft: g.slotsLeft, slotsTotal: g.slotsTotal, saved: savedGigs.has(g.id), applied: !!w,
    };
  };
  const toDetail = (g: SeedGig): GigDetail => ({ ...toCard(g), sponsored: g.sponsored, deliverables: g.deliverables, deadlineAtMs: g.dueInDays === null ? null : t0 + g.dueInDays * DAY, paidWhen: g.paidWhen, trust: g.trust, scopeNote: g.scopeNote, applicationId: appFor(g.id)?.application.id ?? null });

  const tabOf = (s: WorkStatus): WorkTab => (s === 'applied' || s === 'shortlisted' ? 'applied' : s === 'approved' || s === 'paid' ? 'done' : 'active');
  const nextLine = (w: WorkRec): string => {
    const g = gigOf(w.gigId);
    const n = now();
    switch (w.status) {
      case 'applied': return w.nextOverride ?? `Reply expected by ${dayName(w.application.appliedAtMs + w.application.replyDays! * DAY_MS)}`;
      case 'shortlisted': return w.nextOverride ?? 'Shortlisted. The payer will message you';
      case 'in_progress': return `${w.milestones.filter(Boolean).length} of ${w.milestones.length} done${g.dueInDays !== null ? ` · due ${dayName(t0 + g.dueInDays * DAY)}` : ''}`;
      case 'in_review': return `Reviewer replies by ${dayName(reviewDeadlineMs(w.submittedAtMs!))}, or it auto-approves`;
      case 'changes_asked': return w.changeSummary ?? 'Changes asked';
      case 'rejected': return 'You can open a dispute';
      case 'in_dispute': return w.dispute && canAddEvidence(w.dispute.openedAtMs, n) && !w.dispute.evidenceSentAtMs ? 'Add your evidence within 48h' : 'Ops reviewing';
      case 'approved': return 'Approved · Pending in My Bag';
      case 'paid': return `Paid ${dayMonth(w.paidAtMs ?? n)}`;
    }
  };
  const progress = (w: WorkRec) => (w.status === 'in_progress' ? Math.round((w.milestones.filter(Boolean).length / Math.max(1, w.milestones.length)) * 100) : w.status === 'changes_asked' ? 80 : w.status === 'in_review' || w.status === 'rejected' || w.status === 'in_dispute' || w.status === 'approved' || w.status === 'paid' ? 100 : 0);
  const targetOf = (w: WorkRec): Pick<WorkItem, 'target' | 'targetId'> => {
    switch (w.status) {
      case 'applied': case 'shortlisted': return { target: 'gig', targetId: w.gigId };
      case 'in_progress': return { target: 'workspace', targetId: w.id };
      case 'in_review': case 'changes_asked': case 'rejected': return { target: 'proof', targetId: w.id };
      case 'in_dispute': return { target: 'dispute', targetId: w.id };
      case 'approved': case 'paid': return w.earningId ? { target: 'earning', targetId: w.earningId } : { target: 'proof', targetId: w.id };
    }
  };
  const toItem = (w: WorkRec): WorkItem => {
    const g = gigOf(w.gigId);
    return { id: w.id, seed: w.seed, gigId: w.gigId, payerName: g.payerName, payerKind: g.payerLabel, title: g.title, status: w.status, next: nextLine(w), payPaise: g.payPaise, takeHomePaise: w.application.lockedTakeHome.takeHomePaise, progressPct: progress(w), ...targetOf(w) };
  };
  const workOf = (id: string) => {
    const w = works.find((x) => x.id === id);
    if (!w) throw nf('That work is gone.');
    return w;
  };
  const toWorkspace = (w: WorkRec): Workspace => {
    const g = gigOf(w.gigId);
    if (w.status === 'applied' || w.status === 'shortlisted') throw new HustleError('not_in_state', 'The workspace opens once you are picked.');
    return {
      workId: w.id, seed: w.seed, gigId: g.id, title: g.title, payerName: g.payerName, payPaise: g.payPaise, takeHome: w.application.lockedTakeHome, dueAtMs: g.dueInDays === null ? null : t0 + g.dueInDays * DAY, status: w.status,
      milestones: g.milestones.map((label, i) => ({ label, done: !!w.milestones[i] })), briefFrom: g.reviewerName, briefFiles: [{ name: 'brief.pdf', sizeLabel: '2.1 MB' }], lastMessage: w.lastMessage, scopeAcceptedAtMs: w.application.scopeAcceptedAtMs,
    };
  };
  const proofStatus = (s: WorkStatus): ProofView['status'] => (s === 'in_review' ? 'in_review' : s === 'changes_asked' ? 'changes_asked' : s === 'approved' || s === 'paid' ? 'approved' : s === 'rejected' || s === 'in_dispute' ? 'rejected' : 'working');
  const toProof = (w: WorkRec): ProofView => {
    const g = gigOf(w.gigId);
    const submitted = w.submittedAtMs;
    return {
      workId: w.id, title: g.title, payPaise: g.payPaise, takeHome: w.application.lockedTakeHome, status: proofStatus(w.status), files: w.files, requiredFilesLabel: 'Files required by the brief', note: w.note,
      reviewerName: g.reviewerName, reviewerRole: `${g.reviewerRole}, ${g.payerName}`, submittedAtMs: submitted, reviewDeadlineAtMs: w.status === 'in_review' && submitted !== null ? reviewDeadlineMs(submitted) : null,
      autoApproved: false, revisionsUsed: w.revisionsUsed, revisionsMax: MAX_REVISIONS, changeRequest: w.changeRequest, earningId: w.earningId, canDispute: w.status === 'approved' || w.status === 'rejected' || w.status === 'in_dispute',
      ready: w.milestones.length > 0 && w.milestones.every(Boolean),
    };
  };
  const toDispute = (w: WorkRec): Dispute => {
    const d = w.dispute!;
    const g = gigOf(w.gigId);
    const open = canAddEvidence(d.openedAtMs, now()) && !d.evidenceSentAtMs;
    return {
      id: d.id, code: d.code, workId: w.id, title: g.title, payerName: g.payerName, amountPaise: g.payPaise, rejectionReason: d.rejectionReason, openedAtMs: d.openedAtMs, evidenceDeadlineAtMs: evidenceDeadlineMs(d.openedAtMs),
      canAddEvidence: open, statement: d.statement, attachments: d.attachments, evidenceSentAtMs: d.evidenceSentAtMs, status: d.evidenceSentAtMs ? 'evidence_received' : 'open', decisionByMs: d.openedAtMs + 7 * DAY,
      timeline: [
        { kind: 'submitted', atMs: w.submittedAtMs, label: 'Proof submitted' },
        { kind: 'rejected', atMs: d.rejectedAtMs, label: `Rejected by ${g.payerName}` },
        { kind: 'opened', atMs: d.openedAtMs, label: 'You opened a dispute' },
        d.evidenceSentAtMs ? { kind: 'evidence', atMs: d.evidenceSentAtMs, label: 'Evidence received · Ops reviewing' } : { kind: 'evidence', atMs: evidenceDeadlineMs(d.openedAtMs), label: 'Add your evidence' },
      ],
      inEscrow: true, feeChargedPaise: 0,
    };
  };

  const stageOrder: EarningStage[] = ['estimated', 'pending', 'approved', 'payable', 'processing', 'paid'];
  const STEP_NOTE: Record<EarningStage, string> = { estimated: 'Accepted', pending: 'Approved · 7-day hold', approved: 'Escrow confirmed', payable: 'Withdraw from ₹100', processing: 'Sent to UPI', paid: 'Landed in bank' };
  const toEarning = (e: EarningRec): Earning => {
    const reached = stageIndexOf(e.stage);
    const steps: EarningStep[] = stageOrder.map((s, i) => ({ stage: s, label: STAGE_LABEL[s], atMs: i <= reached ? (e.history[s] ?? (s === 'payable' ? holdEndsAtMs(e.approvedAtMs) : null)) : null, note: STEP_NOTE[s] }));
    return {
      id: e.id, seed: e.seed, ref: e.ref, title: e.title, payerName: e.payerName, workId: e.workId, gigId: e.gigId, stage: e.stage, grossPaise: e.grossPaise, kind: e.kind, feeRateBp: e.feeRateBp,
      feePaise: e.feePaise, gstPaise: e.gstPaise, tdsPaise: e.tdsPaise, netPaise: e.netPaise, feeLockedAtMs: e.feeLockedAtMs, steps, payableFromAtMs: holdEndsAtMs(e.approvedAtMs), canDispute: e.stage === 'pending' || e.stage === 'approved',
    };
  };
  function stageIndexOf(s: EarningStage) { return stageOrder.indexOf(s); }

  const payableOf = (e: EarningRec) => (e.stage === 'payable' ? e.netPaise - e.withdrawnPaise : 0);
  const payableTotal = () => earnings.reduce((a, e) => a + payableOf(e), 0);
  const setupView = (): PayoutSetup => {
    const done = { pan: !!setup.pan, upi: !!setup.upi, consent: setup.consent };
    const steps = [
      { key: 'pan' as const, done: done.pan, summary: setup.pan ? `${maskPan(setup.pan)} · name matches` : null },
      { key: 'upi' as const, done: done.upi, summary: setup.upi ? `${setup.upi} · ₹1 test credit received` : null },
      { key: 'consent' as const, done: done.consent, summary: done.consent ? 'Agreed' : null },
    ];
    const next = nextSetupStep(done);
    return { steps, doneCount: steps.filter((s) => s.done).length, complete: next === null, upiId: setup.upi, next };
  };
  const toWithdrawal = (wd: WithdrawalRec): Withdrawal => { const { alloc, ...rest } = wd; void alloc; return rest; };

  const me = () => ctx.profile ?? { name: 'Student', username: 'student' };
  const initialsOf = (n: string) => n.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const shortName = (n: string) => { const [f, ...r] = n.split(/\s+/); return r.length ? `${f} ${r[r.length - 1]![0]}.` : f!; };
  const myCampus = () => ctx.getSession()?.campusId ?? 'own';
  const visible = (l: ListingRec) => l.campus === 'own' || l.campus === myCampus();
  const listingOf = (id: string) => {
    const l = listings.find((x) => x.id === id && visible(x));
    if (!l) throw nf('That listing is gone.');
    return l;
  };

  const FEE_RULES = [
    { label: 'Paid gig (fixed or day rate)', value: '5%' },
    { label: `After ${formatPaise(TIER_THRESHOLD_PAISE)} lifetime earnings`, value: '3%' },
    { label: 'Club-published paid gig', value: '2.5%' },
    { label: 'Referral or commission gig', value: '0%' },
    { label: `Your first ${formatPaise(FIRST_FREE_PAISE)} ever`, value: '0%' },
    { label: 'Volunteer, certificate or XP task', value: '0%' },
    { label: 'Most you’ll pay on one gig', value: `${formatPaise(FEE_CAP_PAISE)} + GST` },
    { label: 'Payout to UPI · standard / instant', value: `free / ${formatPaise(INSTANT_FEE_PAISE)}` },
  ];

  return {
    async listGigs(filter: GigFilter) {
      await wait(); ctx.requireUser(); settle();
      const open = SEED_GIGS.filter((g) => g.open && (filter === 'for-you' || g.cat === filter));
      return open.map(toCard);
    },
    async getGig(id) { await wait(); ctx.requireUser(); settle(); return toDetail(gigOf(id)); },
    async toggleSaveGig(id) { await wait(); ctx.requireUser(); gigOf(id); if (savedGigs.has(id)) savedGigs.delete(id); else savedGigs.add(id); return savedGigs.has(id); },
    async previewApplication(gigId): Promise<ApplyPreview> {
      await wait(); ctx.requireUser(); settle();
      const g = gigOf(gigId);
      const th = takeHomeFor(g);
      return {
        gigId, gigTitle: g.title, payerName: g.payerName, payPaise: g.payPaise, payUnit: g.payUnit,
        scopeText: [...g.deliverables, ...(g.scopeNote ? [g.scopeNote] : [])].join('. '), takeHome: th, availabilityQuestion: g.cat === 'campus' || g.id === 'g-acme' ? 'Are you available on the day?' : null,
        attachable: SEED_PORTFOLIO_ITEMS.map((p) => ({ ...p })), replyDays: g.replyDays,
      };
    },
    async applyToGig(input: ApplyInput) {
      await wait(); ctx.requireUser(); settle();
      const g = gigOf(input.gigId);
      if (!input.scopeAccepted) throw new HustleError('scope_not_accepted', 'Accept the scope and pay before you apply. No work starts until you do.');
      if (appFor(g.id)) throw new HustleError('already_applied', 'You already applied to this gig.');
      if (g.slotsLeft === 0) throw new HustleError('gig_full', 'No slots left on this gig.');
      const at = now();
      const app: Application = { id: nextId('app'), gigId: g.id, status: 'applied', appliedAtMs: at, scopeAcceptedAtMs: at, lockedTakeHome: takeHomeFor(g), costToApplyPaise: 0, replyDays: g.replyDays };
      works.push({
        id: nextId('w'), seed: false, gigId: g.id, application: app, status: 'applied', milestones: g.milestones.map(() => false), files: [], note: '', submittedAtMs: null, revisionsUsed: 0, changeRequest: null,
        changeSummary: null, rejectionReason: null, earningId: null, dispute: null, lastMessage: null, paidAtMs: null, nextOverride: null,
      });
      return app;
    },

    async listMyWork(tab) { await wait(); ctx.requireUser(); settle(); return works.filter((w) => tabOf(w.status) === tab).map(toItem); },
    async workCounts() {
      await wait(); ctx.requireUser(); settle();
      const c = { applied: 0, active: 0, done: 0 };
      for (const w of works) c[tabOf(w.status)]++;
      return c;
    },
    async getWorkspace(workId) { await wait(); ctx.requireUser(); settle(); return toWorkspace(workOf(workId)); },
    async toggleMilestone(workId, index) {
      await wait(); ctx.requireUser(); settle();
      const w = workOf(workId);
      if (w.status !== 'in_progress' && w.status !== 'changes_asked') throw new HustleError('not_in_state', 'This work can’t be edited right now.');
      if (index < 0 || index >= w.milestones.length) throw nf('No such milestone.');
      w.milestones[index] = !w.milestones[index];
      return toWorkspace(w);
    },
    async getProof(workId) { await wait(); ctx.requireUser(); settle(); return toProof(workOf(workId)); },
    async saveProofDraft(workId, input: ProofInput) {
      await wait(); ctx.requireUser(); settle();
      const w = workOf(workId);
      if (w.status !== 'in_progress' && w.status !== 'changes_asked') throw new HustleError('not_in_state', 'This work can’t be edited right now.');
      w.note = input.note; w.files = input.files;
      return toProof(w);
    },
    async submitProof(workId, input) {
      await wait(); ctx.requireUser(); settle();
      const w = workOf(workId);
      if (w.status !== 'in_progress' && w.status !== 'changes_asked') throw new HustleError('not_in_state', 'This work can’t be submitted right now.');
      if (!w.milestones.every(Boolean)) throw new HustleError('milestones_incomplete', 'Finish every milestone before you submit.');
      if (input.files.length === 0) throw new HustleError('proof_files_required', 'Add the files the brief asks for.');
      w.note = input.note; w.files = input.files; w.submittedAtMs = now(); w.status = 'in_review'; w.changeRequest = null;
      return toProof(w);
    },
    async getDispute(workId): Promise<DisputeView> {
      await wait(); ctx.requireUser(); settle();
      const w = workOf(workId);
      const g = gigOf(w.gigId);
      if (w.dispute) return { dispute: toDispute(w), canOpen: false, cannotOpenReason: null, workTitle: g.title };
      const can = canOpenDispute({ rejected: w.status === 'rejected', alreadyOpen: false });
      return { dispute: null, canOpen: can, cannotOpenReason: can ? null : 'A dispute can be opened only after the payer rejects your work. Message them first if something looks off.', workTitle: g.title };
    },
    async openDispute(workId) {
      await wait(); ctx.requireUser(); settle();
      const w = workOf(workId);
      if (!canOpenDispute({ rejected: w.status === 'rejected', alreadyOpen: !!w.dispute })) throw new HustleError('cannot_open_dispute', 'You can open a dispute only after the payer rejects your work.');
      const n = now();
      w.status = 'in_dispute';
      w.dispute = { id: nextId('d'), code: `D-${2000 + ++seq}`, openedAtMs: n, rejectedAtMs: n - HOUR, rejectionReason: w.rejectionReason ?? 'Rejected by the payer.', statement: '', attachments: [], evidenceSentAtMs: null };
      return toDispute(w);
    },
    async addDisputeEvidence(workId, input) {
      await wait(); ctx.requireUser(); settle();
      const w = workOf(workId);
      if (!w.dispute) throw new HustleError('not_in_state', 'There is no open dispute for this work.');
      if (!canAddEvidence(w.dispute.openedAtMs, now()) || w.dispute.evidenceSentAtMs) throw new HustleError('evidence_window_closed', 'The 48 hour window for evidence has closed.');
      w.dispute.statement = input.statement; w.dispute.attachments = input.attachments; w.dispute.evidenceSentAtMs = now();
      return toDispute(w);
    },

    async getBag(): Promise<Bag> {
      await wait(); ctx.requireUser(); settle();
      const n = now();
      const est = works.filter((w) => w.status === 'in_progress' || w.status === 'changes_asked' || w.status === 'in_review');
      const sumStage = (s: EarningStage) => { const es = earnings.filter((e) => e.stage === s); return { paise: es.reduce((a, e) => a + (s === 'payable' ? payableOf(e) : e.netPaise), 0), count: es.length }; };
      const proc = withdrawals.filter((w) => w.status === 'processing');
      const fy = financialYear(new Date(n));
      let paid = earnings.filter((e) => e.stage === 'paid' && e.paidAtMs !== null && financialYear(new Date(e.paidAtMs)) === fy).reduce((a, e) => a + e.netPaise, 0);
      for (const wd of withdrawals) if (wd.status === 'paid') for (const a of wd.alloc) { const e = earnings.find((x) => x.id === a.earningId); if (e && e.stage !== 'paid') paid += a.paise; }
      const pend = earnings.filter((e) => e.stage === 'pending').map((e) => holdEndsAtMs(e.approvedAtMs)).sort((a, b) => a - b)[0] ?? null;
      const states: Bag['states'] = [
        { stage: 'estimated', paise: est.reduce((a, w) => a + w.application.lockedTakeHome.takeHomePaise, 0), count: est.length },
        { stage: 'pending', ...sumStage('pending') },
        { stage: 'approved', ...sumStage('approved') },
        { stage: 'processing', paise: proc.reduce((a, w) => a + w.amountPaise, 0), count: proc.length },
        { stage: 'paid', paise: paid, count: earnings.filter((e) => e.stage === 'paid').length },
      ];
      return {
        payablePaise: payableTotal(), payableCount: earnings.filter((e) => payableOf(e) > 0).length, states,
        disputedPaise: works.filter((w) => w.status === 'in_dispute').reduce((a, w) => a + w.application.lockedTakeHome.payPaise, 0), nextPayableAtMs: pend, paidThisFyPaise: paid, fy, payoutReady: setupView().complete,
      };
    },
    async getEarning(id) { await wait(); ctx.requireUser(); settle(); const e = earnings.find((x) => x.id === id); if (!e) throw nf('That earning is gone.'); return toEarning(e); },
    async getPayoutSetup() { await wait(); ctx.requireUser(); return setupView(); },
    async verifyPan(pan) {
      await wait(); ctx.requireUser();
      if (!isValidPan(pan)) throw new HustleError('invalid_pan', 'That PAN doesn’t look right. It is 5 letters, 4 digits, 1 letter.');
      setup.pan = pan.trim().toUpperCase();
      return setupView();
    },
    async verifyUpi(upiId) {
      await wait(); ctx.requireUser();
      if (!setup.pan) throw new HustleError('payout_setup_required', 'Verify your PAN first.');
      if (!isValidUpi(upiId)) throw new HustleError('invalid_upi', 'That UPI ID doesn’t look right. It looks like name@bank.');
      void PENNY_DROP_PAISE; // the Rs 1 penny drop is sent here in the backend phase
      setup.upi = upiId.trim();
      return setupView();
    },
    async agreePayoutConsent() {
      await wait(); ctx.requireUser();
      if (!setup.upi) throw new HustleError('payout_setup_required', 'Verify your UPI ID first.');
      setup.consent = true;
      return setupView();
    },
    async getWithdrawOptions(): Promise<WithdrawOptions> {
      await wait(); ctx.requireUser(); settle();
      return {
        payablePaise: payableTotal(), minPaise: MIN_WITHDRAW_PAISE, upiId: setup.upi, payoutReady: setupView().complete,
        speeds: [
          { key: 'standard', label: 'Standard · free', feePaise: 0, etaLabel: '2–3 working days' },
          { key: 'instant', label: `Instant · ${formatPaise(INSTANT_FEE_PAISE)}`, feePaise: INSTANT_FEE_PAISE, etaLabel: 'usually under 1 hour' },
        ],
      };
    },
    async quoteWithdrawal(input) {
      await wait(0); ctx.requireUser(); settle();
      const q = quoteWithdrawal({ amountPaise: input.amountPaise, payablePaise: payableTotal(), speed: input.speed });
      return { amountPaise: q.amountPaise, feePaise: q.feePaise, receivePaise: q.receivePaise, ok: q.ok, error: q.error ?? null };
    },
    async withdraw(input) {
      await wait(); ctx.requireUser(); settle();
      if (!setupView().complete) throw new HustleError('payout_setup_required', 'Finish payout setup before your first withdrawal.');
      const q = quoteWithdrawal({ amountPaise: input.amountPaise, payablePaise: payableTotal(), speed: input.speed });
      if (!q.ok) throw new HustleError(q.error!, q.error === 'below_minimum' ? 'The minimum withdrawal is ₹100.' : 'That’s more than your Payable balance.');
      let need = q.amountPaise;
      const alloc: WithdrawalRec['alloc'] = [];
      for (const e of [...earnings].filter((x) => payableOf(x) > 0).sort((a, b) => a.approvedAtMs - b.approvedAtMs)) {
        if (need <= 0) break;
        const take = Math.min(payableOf(e), need);
        e.withdrawnPaise += take; need -= take; alloc.push({ earningId: e.id, paise: take });
        if (e.withdrawnPaise >= e.netPaise) { e.stage = 'processing'; e.history.processing = now(); }
      }
      const n = now();
      const wd: WithdrawalRec = {
        id: nextId('wd'), ref: `WD-${55000 + ++seq}`, amountPaise: q.amountPaise, feePaise: q.feePaise, receivePaise: q.receivePaise, speed: input.speed, upiId: setup.upi!, status: 'processing', createdAtMs: n,
        expectedAtMs: input.speed === 'instant' ? n + HOUR : n + STANDARD_ETA_DAYS * DAY_MS, note: null, alloc,
      };
      withdrawals.push(wd);
      return toWithdrawal(wd);
    },
    async getWithdrawal(id) { await wait(); ctx.requireUser(); settle(); const w = withdrawals.find((x) => x.id === id); if (!w) throw nf('That withdrawal is gone.'); return toWithdrawal(w); },
    async listHistory(filter: HistoryFilter) {
      await wait(); ctx.requireUser(); settle();
      const rows: HistoryRow[] = [
        ...earnings.filter((e) => e.stage !== 'estimated').map((e): HistoryRow => ({ id: e.id, kind: 'earning', title: e.title, meta: `${e.payerName} · ${dayMonth(e.approvedAtMs)} · ${e.ref}`, atMs: e.approvedAtMs, amountPaise: e.netPaise, status: e.stage, earningId: e.id })),
        ...withdrawals.map((w): HistoryRow => ({ id: w.id, kind: 'withdrawal', title: w.status === 'returned' ? 'Withdrawal returned' : 'Withdrawal to UPI', meta: `${dayMonth(w.createdAtMs)} · ${w.ref}`, atMs: w.createdAtMs, amountPaise: -w.amountPaise, status: w.status === 'processing' ? 'processing' : w.status === 'paid' ? 'paid' : 'returned', earningId: null })),
      ].sort((a, b) => b.atMs - a.atMs);
      return filter === 'all' ? rows : rows.filter((r) => r.kind === (filter === 'earnings' ? 'earning' : 'withdrawal'));
    },
    async getTaxSummary() {
      await wait(); ctx.requireUser(); settle();
      const fy = financialYear(new Date(now()));
      const tds = earnings.filter((e) => financialYear(new Date(e.approvedAtMs)) === fy).reduce((a, e) => a + e.tdsPaise, 0);
      return { fy, tdsDeductedPaise: tds, certificateIssued: tds > 0, note: 'Form 16A' };
    },
    async downloadTaxCertificate() {
      await wait(); ctx.requireUser(); settle();
      const fy = financialYear(new Date(now()));
      const tds = earnings.filter((e) => financialYear(new Date(e.approvedAtMs)) === fy).reduce((a, e) => a + e.tdsPaise, 0);
      return { fileName: `bunk3d-tds-${fy.replace(/\s/g, '-')}.txt`, text: `Bunk3d TDS statement (sample)\n${fy}\nTDS deducted under 194-O: ${formatPaise(tds)}\nForm 16A is issued by Bunk3d when TDS has been deducted.\n` };
    },

    async getFeeCalcOptions() {
      await wait(); ctx.requireUser(); settle();
      const life = earnedSoFar();
      return {
        levels: [
          { key: 'first', label: 'First gig', lifetimePaise: 0 },
          { key: 'earned', label: `${formatPaise(life)} earned`, lifetimePaise: life },
          { key: 'pro', label: `${formatPaise(TIER_THRESHOLD_PAISE)}+ earned`, lifetimePaise: TIER_THRESHOLD_PAISE },
        ],
        rules: FEE_RULES, defaultPayPaise: 120_000,
      };
    },
    async calculateTakeHome(input) { await wait(0); ctx.requireUser(); return quoteTakeHome({ payPaise: input.payPaise, kind: input.kind, lifetimeEarnedPaise: input.lifetimePaise }); },

    async listListings(category) {
      await wait(); ctx.requireUser();
      return listings.filter((l) => visible(l) && !l.sold && (category === 'All' || l.category === category)).sort((a, b) => b.postedAtMs - a.postedAtMs);
    },
    async getListing(id) { await wait(); ctx.requireUser(); return listingOf(id); },
    async createListing(input: ListingInput) {
      await wait(); const uid = ctx.requireUser();
      const title = input.title.trim();
      if (title.length < 3 || input.pricePaise < 0) throw new HustleError('invalid_listing', 'Add a title and a price.');
      const banned = bannedListingReason(`${title} ${input.description ?? ''}`);
      if (banned) throw new HustleError('banned_item', BANNED_COPY[banned]);
      const p = me();
      const l: ListingRec = {
        id: nextId('q'), seed: false, title, pricePaise: input.pricePaise, negotiable: input.negotiable, condition: input.condition, category: input.category, glyph: input.category.slice(0, 4).toUpperCase(),
        description: input.description?.trim() ?? '', sellerId: uid, sellerName: shortName(p.name), sellerInitials: initialsOf(p.name), sellerLine: `${p.year ?? ''} yr`.trim(), swapsDone: 0, postedAtMs: now(), sold: false, mine: true,
        photoCount: input.photoCount, campus: myCampus(),
      };
      listings.unshift(l);
      return l;
    },
    async markListingSold(id) {
      await wait(); ctx.requireUser();
      const l = listingOf(id);
      if (!l.mine) throw new HustleError('not_found', 'Only the seller can mark a listing sold.');
      l.sold = true;
      return l;
    },

    async getPortfolio(): Promise<Portfolio> {
      await wait(); ctx.requireUser(); settle();
      const p = me();
      const approved = works.filter((w) => w.status === 'approved' || w.status === 'paid');
      return {
        name: p.name, initials: initialsOf(p.name), line: [p.degree, p.dept, p.year ? `${p.year} yr` : null].filter(Boolean).join(' · '), verified: ctx.getSession()?.verified === 'verified', payoutDone: setupView().complete,
        gigsApproved: approved.length, payerRating: null, onTimePct: null, skills: SEED_SKILLS.map((s) => ({ ...s })),
        work: approved.map((w) => ({ id: w.id, by: gigOf(w.gigId).payerName, title: gigOf(w.gigId).title })), publicLink: portfolioPublic, publicUrl: `bunk3d.in/w/${p.username}`,
      };
    },
    async setPortfolioPublic(on) { await wait(); ctx.requireUser(); portfolioPublic = on; return this.getPortfolio(); },
  };
}
