import { MUTE_HOURS, activeStrikeTimes, actionForStrikeCount } from './strikes';

// Tea rules: voting, sorting, collapsing, posting gates, safety check, story video limits, destinations.
// Pure functions. The mock API calls these now; Edge Functions / Postgres functions reuse them later.

export const CAMPUS_TOPICS = ['Academics', 'Placements', 'Hostel & PG', 'Canteen', 'Events', 'Rant', 'Random'] as const;
export type CampusTopic = (typeof CAMPUS_TOPICS)[number];

export type TeaVote = -1 | 0 | 1;

/** Net score at or below this collapses the post for everyone ("Tap to show"). */
export const TEA_COLLAPSE_AT = -5;
/** Reports that hide a post from Hot and New until Campus Mods decide. */
export const TEA_UNDER_REVIEW_REPORTS = 3;
/** Strikes expire after 90 days. A second active strike mutes for 24 hours. */

export const STORY_VIDEO_MAX_SECONDS = 15;
export const STORY_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
/** Feed video limits (a product assumption, to be confirmed): same size cap, longer duration. */
export const FEED_VIDEO_MAX_SECONDS = 60;
export const FEED_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const TEA_MAX_PHOTOS = 10;
export const TEA_MAX_POLL_OPTIONS = 4;
export const TEA_MAX_POST_CHARS = 1000;

/** Change a user's vote and return the score delta. Voting the same way again clears it. */
export function applyTeaVote(prev: TeaVote, next: TeaVote): { vote: TeaVote; delta: number } {
  const vote: TeaVote = prev === next ? 0 : next;
  return { vote, delta: vote - prev };
}

export function isTeaCollapsed(score: number): boolean {
  return score <= TEA_COLLAPSE_AT;
}

export function isTeaUnderReview(reportCount: number): boolean {
  return reportCount >= TEA_UNDER_REVIEW_REPORTS;
}

/** Hot: net score decayed by age (hours), gravity 1.5. Higher is hotter. New: newest first. */
export function teaHotRank(score: number, createdAtMs: number, nowMs: number): number {
  const hours = Math.max(0, (nowMs - createdAtMs) / 3_600_000);
  return (score + 2) / Math.pow(hours + 2, 1.5);
}

export type TeaRankable = { score: number; createdAt: number };
export function sortTeaPosts<T extends TeaRankable>(posts: readonly T[], sort: 'hot' | 'new', nowMs: number): T[] {
  const copy = [...posts];
  if (sort === 'new') return copy.sort((a, b) => b.createdAt - a.createdAt);
  return copy.sort((a, b) => teaHotRank(b.score, b.createdAt, nowMs) - teaHotRank(a.score, a.createdAt, nowMs));
}

// ---- Gates ----------------------------------------------------------------

export type TeaGate = { verified: 'unverified' | 'pending' | 'verified' | 'rejected'; mutedUntil: number | null };
export type TeaGateResult = { ok: true } | { ok: false; reason: 'not_verified' | 'muted' };

/** Pending users can only read and browse. */
export function teaCanVote(g: TeaGate): TeaGateResult {
  return g.verified === 'verified' ? { ok: true } : { ok: false, reason: 'not_verified' };
}
/** Muted users can read (and vote) but not post or comment. */
export function teaCanPost(g: TeaGate, nowMs: number): TeaGateResult {
  if (g.verified !== 'verified') return { ok: false, reason: 'not_verified' };
  if (g.mutedUntil !== null && g.mutedUntil > nowMs) return { ok: false, reason: 'muted' };
  return { ok: true };
}

const DAY = 86_400_000;
export function teaAccountAgeDays(createdAtMs: number, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - createdAtMs) / DAY));
}

/** Muted for 24 hours from the strike that reached the mute threshold, until it passes. Uses the shared strike ladder. */
export function teaMuteUntil(strikeTimesMs: readonly number[], nowMs: number): number | null {
  const active = activeStrikeTimes(strikeTimesMs, nowMs).sort((a, b) => a - b);
  if (active.length === 0 || actionForStrikeCount(active.length) !== 'mute') return null;
  const until = active[active.length - 1]! + MUTE_HOURS * 3_600_000;
  return until > nowMs ? until : null;
}

// ---- Safety check ---------------------------------------------------------

export type TeaSafetyVerdict =
  | { verdict: 'pass' }
  /** Held for Campus Mods; the author is told why. */
  | { verdict: 'hold'; rule: 'naming_student' }
  /** Removed with a strike. */
  | { verdict: 'block'; rule: 'abuse' };

const ABUSE = [/\bkill yourself\b/i, /\bkys\b/i];
// An anonymous post that points at a real student: an @handle or a "Firstname Lastname"-style pair after a pointer word.
const HANDLE = /(^|\s)@[a-z0-9_.]{2,}/i;
const POINTS_AT = /\b(that guy|that girl|this guy|this girl|named|called)\s+[A-Z][a-z]+\s+[A-Z][a-z]+/;

/** Mock-grade safety check. The real one runs server side; the contract (pass / hold / block) is what matters. */
export function teaSafetyCheck(input: { text: string; anon: boolean }): TeaSafetyVerdict {
  const t = input.text;
  if (ABUSE.some((r) => r.test(t))) return { verdict: 'block', rule: 'abuse' };
  if (input.anon && (HANDLE.test(t) || POINTS_AT.test(t))) return { verdict: 'hold', rule: 'naming_student' };
  return { verdict: 'pass' };
}

// ---- Media and destinations ----------------------------------------------

export type TeaVideoCheck = { ok: true } | { ok: false; reason: 'too_long' | 'too_big' };
export function validateStoryVideo(v: { durationSec: number; sizeBytes: number }): TeaVideoCheck {
  if (v.durationSec > STORY_VIDEO_MAX_SECONDS) return { ok: false, reason: 'too_long' };
  if (v.sizeBytes > STORY_VIDEO_MAX_BYTES) return { ok: false, reason: 'too_big' };
  return { ok: true };
}
export function validateFeedVideo(v: { durationSec: number; sizeBytes: number }): TeaVideoCheck {
  if (v.durationSec > FEED_VIDEO_MAX_SECONDS) return { ok: false, reason: 'too_long' };
  if (v.sizeBytes > FEED_VIDEO_MAX_BYTES) return { ok: false, reason: 'too_big' };
  return { ok: true };
}

export type TeaDestinations = { feed: boolean; story: boolean };
export type TeaDestCheck = { ok: true } | { ok: false; reason: 'none' | 'anon_story' | 'community_story' };
/** At least one destination. Stories are never anonymous and never go to a community. */
export function validateTeaDestinations(d: TeaDestinations, o: { anon: boolean; community: boolean }): TeaDestCheck {
  if (!d.feed && !d.story) return { ok: false, reason: 'none' };
  if (d.story && o.anon) return { ok: false, reason: 'anon_story' };
  if (d.story && o.community) return { ok: false, reason: 'community_story' };
  return { ok: true };
}

/** Someone else's photo can only be sent in DMs. Only your own post can be added to your story. */
export function canAddToStory(p: { authorId: string | null; me: string; anon: boolean }): boolean {
  return !p.anon && p.authorId !== null && p.authorId === p.me;
}

/** Campus-only posts never appear in communities; community posts never appear on a campus feed. */
export type TeaScope = { type: 'campus'; campusId: string } | { type: 'community'; communityId: string };
export function teaVisibleInFeed(post: { scope: TeaScope }, feed: TeaScope): boolean {
  if (post.scope.type !== feed.type) return false;
  return post.scope.type === 'campus' ? post.scope.campusId === (feed as { campusId: string }).campusId : post.scope.communityId === (feed as { communityId: string }).communityId;
}

/** Stable anonymous label per thread: first anon commenter is Anon 1, and the same user keeps their number. Post author is OP. */
export function teaAnonLabel(order: readonly string[], userId: string): string {
  const i = order.indexOf(userId);
  return `Anon ${(i === -1 ? order.length : i) + 1}`;
}

export function validateTeaPoll(options: readonly string[]): boolean {
  const o = options.map((s) => s.trim()).filter(Boolean);
  return o.length >= 2 && o.length <= TEA_MAX_POLL_OPTIONS && new Set(o.map((s) => s.toLowerCase())).size === o.length;
}
