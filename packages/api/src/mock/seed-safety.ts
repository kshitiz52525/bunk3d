// SEED DATA. Mock only. Mod queue cases, flagged `seed: true`. The real backend replaces it.
import type { ReportReason, ReportTargetKind } from '../contract';

export type SeedCase = {
  id: string;
  headline: string;
  excerpt: string;
  targetKind: ReportTargetKind;
  targetId: string;
  /** Hidden from Mods. Only used so the mock can give the author a strike and hide the caller's own posts. */
  authorId: string;
  anon: boolean;
  source: 'reports' | 'ai';
  reasons: Partial<Record<ReportReason, number>>;
  context: string;
  /** Minutes before "now" the oldest report arrived. */
  ageMin: number;
  /** Votes already cast by other Mods. */
  votes: { modId: string; vote: 'keep' | 'remove' | 'escalate' }[];
  notLiveYet?: boolean;
  seed: true;
};

export const SEED_MODS_ON = 11;

export const SEED_CASES: SeedCase[] = [
  { id: 'case_1', headline: 'Naming someone', excerpt: 'the guy in 3rd yr mech who sits in the last row of Prof. Rao’s class and never showers — you know who you are', targetKind: 'post', targetId: 'seed_post_1', authorId: 'seed_author_1', anon: true, source: 'reports', reasons: { naming: 2, harassment: 1 }, context: '1h · #Random · as students see it', ageMin: 38, votes: [{ modId: 'mod_a', vote: 'remove' }], seed: true },
  { id: 'case_2', headline: 'AI hold · harassment (medium)', excerpt: 'Comment on “canteen prices” thread', targetKind: 'comment', targetId: 'seed_comment_1', authorId: 'seed_author_2', anon: false, source: 'ai', reasons: { harassment: 1 }, context: 'Comment · not live yet', ageMin: 21, votes: [], notLiveYet: true, seed: true },
  { id: 'case_3', headline: 'Spam', excerpt: '“DM me for assignment help ₹200/page”', targetKind: 'post', targetId: 'seed_post_3', authorId: 'seed_author_3', anon: false, source: 'reports', reasons: { spam: 4 }, context: '2h · #Academics · as students see it', ageMin: 9, votes: [], seed: true },
  { id: 'case_4', headline: 'Misinformation', excerpt: '“Sem 5 exams are cancelled, forward this to everyone”', targetKind: 'post', targetId: 'seed_post_4', authorId: 'seed_author_4', anon: true, source: 'reports', reasons: { misinfo: 3 }, context: '3h · #Campus · as students see it', ageMin: 6, votes: [], seed: true },
  // Authored by the seed signed-in user: must never appear in their own queue.
  { id: 'case_own', headline: 'Spam', excerpt: 'A post written by the signed-in Mod', targetKind: 'post', targetId: 'seed_post_own', authorId: 'u_returning', anon: false, source: 'reports', reasons: { spam: 3 }, context: '1h · #Random', ageMin: 50, votes: [], seed: true },
];

/** The five community rules from A9. Reasons map onto them where they fit. */
export const RULES: Record<string, { n: string; text: string }> = {
  hate: { n: '01', text: 'No hate. Not for anyone, not as a joke.' },
  naming: { n: '02', text: 'Anonymous posts may not name or point at a real student who isn’t a public figure on campus.' },
  harassment: { n: '03', text: 'No harassment, in posts or in DMs.' },
  doxxing: { n: '04', text: 'No doxxing — numbers, rooms, addresses.' },
};
