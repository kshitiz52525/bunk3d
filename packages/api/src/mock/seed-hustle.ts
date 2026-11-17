// SEED DATA for The Hustle. Mock only. Every record carries `seed: true`; the UI labels it as sample data.
// Brands and clubs are obviously fake ("Sample ...", "Acme ...", "Example ...") and amounts are made up for development.
import type { GigKind } from '@bunk3d/core';
import type { TrustFact } from '../contract';

export const DAY = 24 * 3600 * 1000;
export const HOUR = 3600 * 1000;

export type SeedGig = {
  id: string;
  seed: true;
  open: boolean;
  cat: 'campus' | 'remote' | 'brand';
  payerName: string;
  payerShort: string;
  payerLabel: string;
  payerVerified: boolean;
  tag: 'featured' | 'club' | 'referral' | 'remote' | null;
  title: string;
  chips: string[];
  dueInDays: number | null;
  payPaise: number;
  payUnit: string | null;
  kind: GigKind;
  slotsLeft: number | null;
  slotsTotal: number | null;
  sponsored: boolean;
  deliverables: string[];
  paidWhen: string;
  trust: TrustFact[];
  scopeNote: string | null;
  milestones: string[];
  reviewerName: string;
  reviewerRole: string;
  replyDays: number;
};

const base = {
  seed: true as const,
  open: true,
  payerVerified: true,
  sponsored: false,
  paidWhen: 'Approved, then payable after the 7-day hold',
  scopeNote: null as string | null,
  reviewerName: 'Rhea',
  reviewerRole: 'events lead',
  replyDays: 2,
};

export const SEED_GIGS: SeedGig[] = [
  {
    ...base, id: 'g-acme', cat: 'brand', payerName: 'Acme Rides (sample)', payerShort: 'ACM', payerLabel: 'brand collab', tag: 'featured', sponsored: true,
    title: 'Campus ambassador: 3 reels + 1 stall day', chips: ['On campus', '6 hrs total'], dueInDays: 21, payPaise: 250_000, payUnit: null, kind: 'paid', slotsLeft: 4, slotsTotal: 10,
    deliverables: ['3 reels (30-45s) about Acme Rides on campus', '1 stall day, 10 to 4', 'Links and screenshots of reach after 48h'],
    paidWhen: 'Approved, then payable after the 7-day hold',
    trust: [
      { label: 'paid students on Bunk3d', value: '48', basis: 'verified' },
      { label: 'riders (the brand’s own number)', value: '2M', basis: 'claimed' },
      { label: 'lost disputes', value: '0', basis: 'verified' },
    ],
    scopeNote: 'Content must carry the #ad label.', milestones: ['Reel 1', 'Reel 2', 'Reel 3', 'Stall day'], reviewerName: 'Kabir', reviewerRole: 'campus lead, Acme Rides',
  },
  {
    ...base, id: 'g-ecell', cat: 'campus', payerName: 'Sample E-Cell', payerShort: 'E-C', payerLabel: 'club', tag: 'club', title: 'Startup expo help desk',
    chips: ['On campus', 'Thu 10-4', 'Shift'], dueInDays: 10, payPaise: 80_000, payUnit: null, kind: 'club', slotsLeft: 2, slotsTotal: 6,
    deliverables: ['Staff the help desk Thursday 10 to 4', 'Keep the visitor sheet up to date'],
    trust: [{ label: 'paid students on Bunk3d', value: '12', basis: 'verified' }, { label: 'lost disputes', value: '0', basis: 'verified' }],
    milestones: ['Morning shift', 'Afternoon shift', 'Visitor sheet'], reviewerName: 'Ishaan', reviewerRole: 'expo lead',
  },
  {
    ...base, id: 'g-zordo', cat: 'brand', payerName: 'Zordo Pay (sample)', payerShort: 'ZRD', payerLabel: 'fintech startup', tag: 'referral', title: 'Refer classmates, paid per validated sign-up',
    chips: ['Remote', 'Your pace'], dueInDays: 12, payPaise: 50_000, payUnit: 'referral', kind: 'referral', slotsLeft: null, slotsTotal: null,
    deliverables: ['Share your referral link with classmates', 'A sign-up counts once Zordo validates it'],
    trust: [{ label: 'lost disputes', value: '0', basis: 'verified' }], milestones: ['First validated sign-up'],
  },
  {
    ...base, id: 'g-skill', cat: 'remote', payerName: 'Skillvine (sample)', payerShort: 'SKL', payerLabel: 'startup', tag: 'remote', title: 'Transcribe 20 Kannada lecture clips',
    chips: ['Remote', '~5 hrs', 'Kannada'], dueInDays: 14, payPaise: 6_000, payUnit: 'clip', kind: 'paid', slotsLeft: null, slotsTotal: null,
    deliverables: ['Transcribe 20 clips', 'Sample clip first, then the rest'],
    trust: [{ label: 'paid students on Bunk3d', value: '30', basis: 'verified' }, { label: 'lost disputes', value: '1', basis: 'verified' }],
    milestones: ['Clips 1-10', 'Clips 11-20'], reviewerName: 'Meera', reviewerRole: 'ops, Skillvine',
  },
  {
    ...base, id: 'g-posters', cat: 'campus', payerName: 'Sample Design Club', payerShort: 'SDC', payerLabel: 'club', tag: 'club', title: 'Design 4 event posters',
    chips: ['Remote', 'Figma'], dueInDays: 3, payPaise: 100_000, payUnit: null, kind: 'club', slotsLeft: 1, slotsTotal: 4,
    deliverables: ['4 event posters as source files and exports'], trust: [{ label: 'lost disputes', value: '0', basis: 'verified' }],
    milestones: ['Poster 1 · Hack the Canteen', 'Poster 2 · Flutter workshop', 'Poster 3 · Chai & Code', 'Poster 4 · Results night'],
  },
  {
    ...base, id: 'g-menu', cat: 'campus', payerName: 'Example Cafe (sample)', payerShort: 'EXC', payerLabel: 'local business', tag: null, title: 'Weekend menu photo shoot',
    chips: ['On campus', '3 hrs'], dueInDays: 9, payPaise: 150_000, payUnit: null, kind: 'paid', slotsLeft: 2, slotsTotal: 2,
    deliverables: ['Shoot 12 menu items', 'Deliver 24 edited photos within 2 days'], trust: [{ label: 'lost disputes', value: '0', basis: 'verified' }],
    milestones: ['Shoot', 'Edit and deliver'], reviewerName: 'Tara', reviewerRole: 'owner',
  },
  // Gigs the student already worked on (not open for new applications).
  {
    ...base, id: 'g-sampling', open: false, cat: 'brand', payerName: 'Example Eats (sample)', payerShort: 'EXE', payerLabel: 'brand', tag: null, title: 'Sampling stall, Block C',
    chips: ['On campus'], dueInDays: null, payPaise: 150_000, payUnit: null, kind: 'paid', slotsLeft: 0, slotsTotal: 5, deliverables: ['Run the sampling stall for 6 hours'], trust: [],
    milestones: ['Stall set up', 'Stall run', 'Checkout photos'], reviewerName: 'Dev', reviewerRole: 'brand manager, Example Eats',
  },
  {
    ...base, id: 'g-sound', open: false, cat: 'campus', payerName: 'Sample Music Society', payerShort: 'SMS', payerLabel: 'club', tag: 'club', title: 'Sound check crew, fest night',
    chips: ['On campus'], dueInDays: null, payPaise: 60_000, payUnit: null, kind: 'club', slotsLeft: 0, slotsTotal: 4, deliverables: ['Sound check crew on fest night'], trust: [], milestones: ['Sound check'],
  },
  {
    ...base, id: 'g-flyer', open: false, cat: 'campus', payerName: 'Sample Cafe', payerShort: 'SCF', payerLabel: 'local business', tag: null, title: 'Flyer distribution, Block B',
    chips: ['On campus'], dueInDays: null, payPaise: 40_000, payUnit: null, kind: 'paid', slotsLeft: 0, slotsTotal: 3, deliverables: ['Hand out 300 flyers in Block B'], trust: [], milestones: ['Flyers handed out'],
    reviewerName: 'Tara', reviewerRole: 'owner, Sample Cafe',
  },
  {
    ...base, id: 'g-photo', open: false, cat: 'campus', payerName: 'Sample Photo Club', payerShort: 'SPC', payerLabel: 'club', tag: 'club', title: 'Fest photo coverage',
    chips: ['On campus'], dueInDays: null, payPaise: 100_000, payUnit: null, kind: 'club', slotsLeft: 0, slotsTotal: 2, deliverables: ['Cover the fest and deliver 40 edited photos'], trust: [], milestones: ['Shoot', 'Edit'],
  },
];

export type SeedListing = {
  id: string;
  campus: 'own' | 'other-campus';
  title: string;
  pricePaise: number;
  negotiable: boolean;
  condition: 'New' | 'Like new' | 'Good' | 'Used' | 'Notes';
  category: 'Books' | 'Gear' | 'Rides' | 'Hostel';
  glyph: string;
  description: string;
  sellerName: string;
  sellerLine: string;
  swapsDone: number;
  ageDays: number;
};

export const SEED_LISTINGS: SeedListing[] = [
  { id: 'q-maths', campus: 'own', title: 'Grewal Engg. Maths, 44th ed', pricePaise: 35_000, negotiable: true, condition: 'Good', category: 'Books', glyph: 'BOOK', description: 'Some highlighting in the first three chapters.', sellerName: 'Nikhil V.', sellerLine: '3rd yr', swapsDone: 2, ageDays: 3 },
  { id: 'q-calc', campus: 'own', title: 'Casio fx-991EX calculator', pricePaise: 70_000, negotiable: true, condition: 'Like new', category: 'Gear', glyph: 'CALC', description: 'Used one sem. Box + manual. Exam-approved model. Pickup near Block A.', sellerName: 'Sana K.', sellerLine: '2nd yr B.Des', swapsDone: 4, ageDays: 2 },
  { id: 'q-coat', campus: 'own', title: 'Lab coat, size M', pricePaise: 15_000, negotiable: false, condition: 'Used', category: 'Gear', glyph: 'COAT', description: 'Washed, no stains.', sellerName: 'Dev R.', sellerLine: '1st yr', swapsDone: 0, ageDays: 5 },
  { id: 'q-cycle', campus: 'own', title: 'Hercules cycle + lock', pricePaise: 280_000, negotiable: true, condition: 'Good', category: 'Rides', glyph: 'CYCLE', description: 'Single owner, new tyres last month.', sellerName: 'Kabir M.', sellerLine: '3rd yr', swapsDone: 1, ageDays: 1 },
  { id: 'q-pyq', campus: 'own', title: 'GATE ECE PYQ set', pricePaise: 0, negotiable: false, condition: 'Notes', category: 'Books', glyph: 'PYQ', description: 'Past papers I no longer need.', sellerName: 'Meera T.', sellerLine: '2nd yr', swapsDone: 3, ageDays: 6 },
  { id: 'q-other', campus: 'other-campus', title: 'Drafting table (other campus)', pricePaise: 120_000, negotiable: true, condition: 'Good', category: 'Gear', glyph: 'DESK', description: 'Never visible outside its own campus.', sellerName: 'Tara S.', sellerLine: '4th yr', swapsDone: 0, ageDays: 2 },
];

export const SEED_PORTFOLIO_ITEMS = [
  { id: 'pf-reel', tag: 'REEL', label: 'Sample fest recap', verified: false },
  { id: 'pf-design', tag: 'DESIGN', label: 'Sample E-Cell posters', verified: false },
  { id: 'pf-expo', tag: 'PAID GIG', label: 'Expo desk', verified: true },
];

export const SEED_SKILLS = [
  { name: 'Figma', verified: true },
  { name: 'Reels', verified: true },
  { name: 'Flutter', verified: false },
  { name: 'Event ops', verified: true },
  { name: 'Kannada', verified: false },
];
