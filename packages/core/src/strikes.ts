// Campus Mod voting and strikes (HANDOFF section 4, Safety).
// Two matching votes decide; a split goes to Bunk3d ops. Mods never vote on their own posts.
// Strikes: 1 = warning, 2 = 24 h mute, 3 = 7-day ban, 4 = removed. Strikes expire after 90 days.

export const STRIKE_EXPIRY_DAYS = 90;
export const MUTE_HOURS = 24;
export const BAN_DAYS = 7;
const HOUR = 3600_000;
const DAY = 24 * HOUR;

export type ModVoteKind = 'keep' | 'remove' | 'escalate';
export type ModVote = { modId: string; vote: ModVoteKind; at?: number };

export type ModOutcome =
  | { status: 'pending'; votes: number }
  | { status: 'removed' | 'kept'; /** True when the author earns a strike. */ strike: boolean }
  | { status: 'escalated'; reason: 'split' | 'unsure' };

/**
 * Decide a reported item from its mod votes.
 * - Votes from the author are ignored (mods never see their own posts), and each mod counts once (first vote wins).
 * - Two matching keep/remove votes decide it. A keep and a remove together are a split and go to ops.
 * - A mod who is not sure can escalate; that goes to ops straight away.
 * - Votes are read in order, so a later vote can never overturn a decision already reached.
 */
export function modDecide(votes: readonly ModVote[], authorId?: string): ModOutcome {
  const seen = new Set<string>();
  const valid: ModVote[] = [];
  const ordered = votes.map((v, i) => ({ v, i })).sort((a, b) => (a.v.at ?? 0) - (b.v.at ?? 0) || a.i - b.i);
  for (const { v } of ordered) {
    if (authorId && v.modId === authorId) continue;
    if (seen.has(v.modId)) continue;
    seen.add(v.modId);
    valid.push(v);
  }
  for (let i = 0; i < valid.length; i++) {
    if (valid[i].vote === 'escalate') return { status: 'escalated', reason: 'unsure' };
    if (i === 1) {
      const [a, b] = [valid[0].vote, valid[1].vote];
      if (a === b) return a === 'remove' ? { status: 'removed', strike: true } : { status: 'kept', strike: false };
      return { status: 'escalated', reason: 'split' };
    }
  }
  return { status: 'pending', votes: valid.length };
}

export type StrikeAction = 'none' | 'warning' | 'mute' | 'ban' | 'removed';

/** Strikes still counting at `now` (issued less than 90 days ago). `issuedAt` are epoch ms. */
export function activeStrikeTimes(issuedAt: readonly number[], now: number): number[] {
  return issuedAt.filter((t) => t <= now && now - t < STRIKE_EXPIRY_DAYS * DAY).sort((a, b) => a - b);
}

/** What the nth active strike does. */
export function actionForStrikeCount(n: number): StrikeAction {
  if (n <= 0) return 'none';
  if (n === 1) return 'warning';
  if (n === 2) return 'mute';
  if (n === 3) return 'ban';
  return 'removed';
}

export type Standing = {
  activeStrikes: number;
  /** The consequence of the current strike count. */
  action: StrikeAction;
  /** Epoch ms until which the user cannot post or comment (strike 2), else null. */
  mutedUntil: number | null;
  /** Epoch ms until which the user is banned (strike 3), else null. */
  bannedUntil: number | null;
  removed: boolean;
  /** When the oldest active strike stops counting, else null. */
  nextExpiryAt: number | null;
};

/** Where a user stands: derived from strike dates only, so expiry needs no cleanup job. */
export function standing(issuedAt: readonly number[], now: number): Standing {
  const active = activeStrikeTimes(issuedAt, now);
  const n = active.length;
  const action = actionForStrikeCount(n);
  const last = active[n - 1];
  const mutedUntil = action === 'mute' && last + MUTE_HOURS * HOUR > now ? last + MUTE_HOURS * HOUR : null;
  const bannedUntil = action === 'ban' && last + BAN_DAYS * DAY > now ? last + BAN_DAYS * DAY : null;
  return {
    activeStrikes: n,
    action,
    mutedUntil,
    bannedUntil,
    removed: action === 'removed',
    nextExpiryAt: n ? active[0] + STRIKE_EXPIRY_DAYS * DAY : null,
  };
}

/** True when the user may post or comment right now. */
export function canPost(s: Standing): boolean {
  return !s.removed && s.mutedUntil === null && s.bannedUntil === null;
}

/** Reports needed before a reported item is hidden until Mods review it. */
export const REPORTS_TO_HIDE = 3;
export function hiddenPendingReview(reportCount: number): boolean {
  return reportCount >= REPORTS_TO_HIDE;
}
