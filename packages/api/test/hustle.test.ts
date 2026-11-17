import { describe, expect, it } from 'vitest';
import { createMockApi } from '../src/mock';
import { MOCK_CODE } from '../src/mock/seed';
import { HustleError } from '../src/contract';

const DAY = 24 * 3600 * 1000;
async function setup(startMs = Date.UTC(2026, 10, 18, 9)) {
  let t = startMs;
  const api = createMockApi({ latencyMs: 0, now: () => t });
  await api.auth.verifyOtp('9876543210', MOCK_CODE, { returning: true });
  return { api, h: api.hustle, advance: (ms: number) => { t += ms; } };
}
const rejects = async (p: Promise<unknown>, code: string) => {
  const e = await p.then(() => null, (x: unknown) => x);
  expect(e).toBeInstanceOf(HustleError);
  expect((e as HustleError).code).toBe(code);
};

describe('gigs: take-home comes from the API with fee and GST as separate lines', () => {
  it('lists seed gigs flagged as seed with take-home matching HANDOFF section 4', async () => {
    const { h } = await setup();
    const gigs = await h.listGigs('for-you');
    expect(gigs.every((g) => g.seed)).toBe(true);
    const by = Object.fromEntries(gigs.map((g) => [g.id, g]));
    expect(by['g-acme']!.takeHome).toMatchObject({ payPaise: 250000, feePaise: 12500, gstPaise: 2250, takeHomePaise: 235250 });
    expect(by['g-ecell']!.takeHome).toMatchObject({ feePaise: 2000, gstPaise: 360, takeHomePaise: 77640 });
    expect(by['g-posters']!.takeHome).toMatchObject({ feePaise: 2500, gstPaise: 450, takeHomePaise: 97050 });
    expect(by['g-zordo']!.takeHome).toMatchObject({ feeRateBp: 0, feePaise: 0, takeHomePaise: 50000 });
    expect(by['g-skill']!.takeHome.takeHomePaise).toBe(5646); // per clip
  });
  it('filters by category and never lists closed gigs', async () => {
    const { h } = await setup();
    expect((await h.listGigs('remote')).map((g) => g.id)).toEqual(['g-skill']);
    expect((await h.listGigs('for-you')).some((g) => g.id === 'g-sampling')).toBe(false);
    expect((await h.listGigs('for-you')).find((g) => g.id === 'g-ecell')!.applied).toBe(true);
  });
  it('requires a signed-in user', async () => {
    const api = createMockApi({ latencyMs: 0 });
    await expect(api.hustle.listGigs('for-you')).rejects.toThrow('Not signed in');
  });
});

describe('fee calculator reproduces the HANDOFF section 4 worked examples', () => {
  it.each([
    [250000, 'paid', 'earned', 12500, 2250, 235250],
    [80000, 'club', 'earned', 2000, 360, 77640],
    [100000, 'club', 'earned', 2500, 450, 97050],
    [120000, 'paid', 'first', 1000, 180, 118820],
  ] as const)('pay %i %s at level %s', async (pay, kind, level, fee, gst, take) => {
    const { h } = await setup();
    const opts = await h.getFeeCalcOptions();
    const lifetimePaise = opts.levels.find((l) => l.key === level)!.lifetimePaise;
    const q = await h.calculateTakeHome({ payPaise: pay, kind, lifetimePaise });
    expect([q.feePaise, q.gstPaise, q.takeHomePaise]).toEqual([fee, gst, take]);
  });
  it('caps the fee at Rs 1,000 and drops to 3% after Rs 25,000', async () => {
    const { h } = await setup();
    const capped = await h.calculateTakeHome({ payPaise: 4_000_000, kind: 'paid', lifetimePaise: 1_000_000 });
    expect(capped).toMatchObject({ feePaise: 100000, capped: true });
    const pro = await h.calculateTakeHome({ payPaise: 100000, kind: 'paid', lifetimePaise: 2_500_000 });
    expect(pro.feeRateBp).toBe(300);
  });
});

describe('apply: fee locked, scope accepted, never pay to apply', () => {
  it('refuses to apply until scope and pay are explicitly accepted', async () => {
    const { h } = await setup();
    await rejects(h.applyToGig({ gigId: 'g-menu', pitch: 'hi', portfolioIds: [], availability: 'yes', scopeAccepted: false }), 'scope_not_accepted');
    expect((await h.getGig('g-menu')).applicationId).toBeNull();
  });
  it('locks the fee at apply, costs nothing and stays locked when lifetime earnings change', async () => {
    const { h } = await setup();
    const app = await h.applyToGig({ gigId: 'g-menu', pitch: 'I can staff the desk.', portfolioIds: [], availability: 'yes', scopeAccepted: true });
    expect(app.costToApplyPaise).toBe(0);
    expect(app.lockedTakeHome).toMatchObject({ feePaise: 7500, gstPaise: 1350, takeHomePaise: 141150 });
    expect((await h.getGig('g-menu')).takeHome).toEqual(app.lockedTakeHome);
    await rejects(h.applyToGig({ gigId: 'g-menu', pitch: 'again', portfolioIds: [], availability: 'yes', scopeAccepted: true }), 'already_applied');
    expect((await h.listMyWork('applied')).some((w) => w.gigId === 'g-menu' && w.status === 'applied')).toBe(true);
  });
  it('moves an application to My Work > Active once the payer replies', async () => {
    const { h, advance } = await setup();
    await h.applyToGig({ gigId: 'g-menu', pitch: 'x', portfolioIds: [], availability: 'yes', scopeAccepted: true });
    advance(3 * DAY);
    expect((await h.listMyWork('active')).some((w) => w.gigId === 'g-menu' && w.status === 'in_progress')).toBe(true);
  });
});

describe('workspace and proof: review handoff', () => {
  const file = { name: 'posters.zip', sizeLabel: '18 MB' };
  it('needs every milestone and a file before submitting, then starts a 3-day review clock', async () => {
    const { h } = await setup();
    await rejects(h.submitProof('w-posters', { note: 'n', files: [file] }), 'milestones_incomplete');
    await h.toggleMilestone('w-posters', 2);
    await h.toggleMilestone('w-posters', 3);
    await rejects(h.submitProof('w-posters', { note: 'n', files: [] }), 'proof_files_required');
    const p = await h.submitProof('w-posters', { note: 'Source files in the zip.', files: [file] });
    expect(p.status).toBe('in_review');
    expect(p.reviewDeadlineAtMs! - p.submittedAtMs!).toBe(3 * DAY);
    expect(p.revisionsMax).toBe(2);
  });
  it('auto-approves after 3 days of silence: earning becomes Pending with a 7-day hold, then Payable', async () => {
    const { h, advance } = await setup();
    await h.toggleMilestone('w-posters', 2);
    await h.toggleMilestone('w-posters', 3);
    await h.submitProof('w-posters', { note: '', files: [file] });
    advance(3 * DAY + 1000);
    const p = await h.getProof('w-posters');
    expect(p.status).toBe('approved');
    const e = await h.getEarning(p.earningId!);
    expect(e).toMatchObject({ stage: 'pending', grossPaise: 100000, feePaise: 2500, gstPaise: 450, netPaise: 97050 });
    advance(7 * DAY + 7 * 3600 * 1000);
    expect((await h.getEarning(e.id)).stage).toBe('payable');
  });
  it('lets a resubmission follow a change request without using up revisions again', async () => {
    const { h } = await setup();
    const before = await h.getProof('w-expo');
    expect(before).toMatchObject({ status: 'changes_asked', revisionsUsed: 1, revisionsMax: 2 });
    const after = await h.submitProof('w-expo', { note: 'Added afternoon entries.', files: before.files });
    expect(after.status).toBe('in_review');
  });
});

describe('dispute', () => {
  it('holds money in escrow with no fee, and accepts evidence only within 48h', async () => {
    const { h, advance } = await setup();
    const v = await h.getDispute('w-sampling');
    expect(v.dispute).toMatchObject({ inEscrow: true, feeChargedPaise: 0, canAddEvidence: true, amountPaise: 150000 });
    const bag = await h.getBag();
    expect(bag.disputedPaise).toBe(150000);
    advance(19 * 3600 * 1000); // opened 30h ago, window is 48h
    await rejects(h.addDisputeEvidence('w-sampling', { statement: 'late', attachments: [] }), 'evidence_window_closed');
  });
  it('accepts evidence inside the window and then says Ops is reviewing', async () => {
    const { h } = await setup();
    const d = await h.addDisputeEvidence('w-sampling', { statement: 'I was there 10 to 4.', attachments: ['checkin.jpg'] });
    expect(d).toMatchObject({ status: 'evidence_received', canAddEvidence: false });
    await rejects(h.addDisputeEvidence('w-sampling', { statement: 'again', attachments: [] }), 'evidence_window_closed');
  });
  it('can be opened only after a rejection, and then locks the money', async () => {
    const { h } = await setup();
    await rejects(h.openDispute('w-posters'), 'cannot_open_dispute');
    expect((await h.getDispute('w-flyer')).canOpen).toBe(true);
    const d = await h.openDispute('w-flyer');
    expect(d.evidenceDeadlineAtMs - d.openedAtMs).toBe(2 * DAY);
    expect((await h.listMyWork('active')).find((w) => w.id === 'w-flyer')!.status).toBe('in_dispute');
  });
});

describe('My Bag: every rupee shows its state', () => {
  it('splits money by state and keeps payable separate', async () => {
    const { h } = await setup();
    const bag = await h.getBag();
    const s = Object.fromEntries(bag.states.map((x) => [x.stage, x.paise]));
    expect(bag.payablePaise).toBe(97050 + 50000 + 77640);
    expect(s.estimated).toBe(97050 + 77640);
    expect(s.pending).toBe(97050); // photo coverage, approved 2 days ago
    expect(s.approved).toBe(77640); // society night: hold passed, escrow confirms in 6h
    expect(s.paid).toBeGreaterThan(0);
  });
  it('promotes Approved to Payable when escrow is confirmed, and Pending to Approved after the hold', async () => {
    const { h, advance } = await setup();
    advance(1000); // seeded Approved earning: hold passed, escrow not confirmed yet
    expect((await h.getBag()).states.find((x) => x.stage === 'approved')!.paise).toBe(77640);
    advance(7 * 3600 * 1000);
    const after = await h.getBag();
    expect(after.states.find((x) => x.stage === 'approved')!.paise).toBe(0);
    expect(after.payablePaise).toBe(97050 + 50000 + 77640 + 77640);
    advance(6 * DAY);
    const later = await h.getBag();
    expect(later.states.find((x) => x.stage === 'pending')!.paise).toBe(0);
    expect(later.payablePaise).toBe(97050 + 50000 + 77640 + 77640 + 97050);
  });
});

describe('payout setup and withdrawals', () => {
  it('goes PAN, then UPI (Rs 1 penny drop), then consent, in order', async () => {
    const { h } = await setup();
    await rejects(h.verifyUpi('aarav@okaxis'), 'payout_setup_required');
    await rejects(h.verifyPan('nope'), 'invalid_pan');
    const a = await h.verifyPan('abcde1234f');
    expect(a.steps[0]!.summary).toBe('ABCDE••••F · name matches');
    await rejects(h.verifyUpi('aarav'), 'invalid_upi');
    await h.verifyUpi('aarav@okaxis');
    await rejects(h.withdraw({ amountPaise: 10000, speed: 'standard' }), 'payout_setup_required');
    const done = await h.agreePayoutConsent();
    expect(done).toMatchObject({ complete: true, doneCount: 3, next: null });
  });
  it('standard is free, instant costs Rs 15, minimum Rs 100, never above payable', async () => {
    const { h } = await setup();
    await h.verifyPan('ABCDE1234F'); await h.verifyUpi('aarav@okaxis'); await h.agreePayoutConsent();
    expect(await h.quoteWithdrawal({ amountPaise: 50000, speed: 'instant' })).toMatchObject({ feePaise: 1500, receivePaise: 48500, ok: true });
    await rejects(h.withdraw({ amountPaise: 5000, speed: 'standard' }), 'below_minimum');
    await rejects(h.withdraw({ amountPaise: 99_999_999, speed: 'standard' }), 'above_payable');
    const before = (await h.getBag()).payablePaise;
    const wd = await h.withdraw({ amountPaise: 50000, speed: 'standard' });
    expect(wd).toMatchObject({ status: 'processing', feePaise: 0, receivePaise: 50000 });
    const bag = await h.getBag();
    expect(bag.payablePaise).toBe(before - 50000);
    expect(bag.states.find((s) => s.stage === 'processing')!.paise).toBe(50000);
  });
  it('lands in 2-3 working days and then counts as Paid', async () => {
    const { h, advance } = await setup();
    await h.verifyPan('ABCDE1234F'); await h.verifyUpi('aarav@okaxis'); await h.agreePayoutConsent();
    const paidBefore = (await h.getBag()).paidThisFyPaise;
    const wd = await h.withdraw({ amountPaise: 100000, speed: 'standard' });
    advance(3 * DAY + 1000);
    expect((await h.getWithdrawal(wd.id)).status).toBe('paid');
    expect((await h.getBag()).paidThisFyPaise).toBeGreaterThan(paidBefore);
  });
});

describe('history and tax', () => {
  it('lists earnings and withdrawals, newest first, with filters', async () => {
    const { h } = await setup();
    const all = await h.listHistory('all');
    expect(all.some((r) => r.kind === 'withdrawal' && r.status === 'returned')).toBe(true);
    expect((await h.listHistory('withdrawals')).every((r) => r.kind === 'withdrawal' && r.amountPaise < 0)).toBe(true);
    expect((await h.listHistory('earnings')).every((r) => r.kind === 'earning' && r.amountPaise > 0)).toBe(true);
    expect(all.map((r) => r.atMs)).toEqual([...all.map((r) => r.atMs)].sort((a, b) => b - a));
  });
  it('reports TDS (194-O) and the financial year', async () => {
    const { h } = await setup();
    const t = await h.getTaxSummary();
    expect(t).toMatchObject({ fy: 'FY 2026-27', tdsDeductedPaise: 0 });
    expect((await h.downloadTaxCertificate()).fileName).toContain('2026-27');
  });
});

describe('earning detail', () => {
  it('shows gross, fee, GST and TDS as separate lines with all six steps', async () => {
    const { h } = await setup();
    const pending = (await h.listHistory('earnings')).find((r) => r.status === 'pending')!;
    const e = await h.getEarning(pending.earningId!);
    expect(e.grossPaise - e.feePaise - e.gstPaise - e.tdsPaise).toBe(e.netPaise);
    expect(e.steps.map((s) => s.stage)).toEqual(['estimated', 'pending', 'approved', 'payable', 'processing', 'paid']);
    expect(e.steps[1]!.atMs).not.toBeNull();
    expect(e.steps[2]!.atMs).toBeNull();
  });
});

describe('swap: no payments, own campus only, real names, banned items', () => {
  it('shows only listings from the caller’s campus', async () => {
    const { h } = await setup();
    const l = await h.listListings('All');
    expect(l.some((x) => x.id === 'q-other')).toBe(false);
    await rejects(h.getListing('q-other'), 'not_found');
    expect(l.every((x) => x.sellerName.includes('.'))).toBe(true); // real name + initial
  });
  it('filters by category', async () => {
    const { h } = await setup();
    expect((await h.listListings('Rides')).map((x) => x.id)).toEqual(['q-cycle']);
  });
  it('rejects weapons, medicines and notes-for-cash on exams', async () => {
    const { h } = await setup();
    const base = { pricePaise: 10000, negotiable: false, condition: 'Used', category: 'Gear', photoCount: 0 } as const;
    await rejects(h.createListing({ ...base, title: 'Air gun' }), 'banned_item');
    await rejects(h.createListing({ ...base, title: 'Tablets strip', description: 'medicine' }), 'banned_item');
    await rejects(h.createListing({ ...base, title: 'Leaked question paper' }), 'banned_item');
  });
  it('lists under the seller’s real name and marks sold', async () => {
    const { h } = await setup();
    const l = await h.createListing({ title: 'Arduino Uno kit', pricePaise: 90000, negotiable: true, condition: 'Good', category: 'Gear', photoCount: 1 });
    expect(l).toMatchObject({ sellerName: 'Aarav S.', mine: true, seed: false });
    expect((await h.listListings('All'))[0]!.id).toBe(l.id);
    await h.markListingSold(l.id);
    expect((await h.listListings('All')).some((x) => x.id === l.id)).toBe(false);
  });
});

describe('portfolio', () => {
  it('never shows earnings and never invents a rating', async () => {
    const { h } = await setup();
    const p = await h.getPortfolio();
    expect(p.payerRating).toBeNull();
    expect(JSON.stringify(p)).not.toMatch(/earn|paise/i);
    expect((await h.setPortfolioPublic(true)).publicLink).toBe(true);
  });
});
