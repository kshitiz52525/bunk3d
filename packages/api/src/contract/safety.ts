// Safety domain contract: reports, blocks, strikes standing, and the Campus Mod queue.
// Each method says who may call it and what RLS must enforce (see identity.ts for the style).
// Pure rules (mod_decide, strikes) live in @bunk3d/core.

export const REPORT_REASONS = [
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'hate', label: 'Hate' },
  { id: 'naming', label: 'Naming or doxxing someone' },
  { id: 'sexual', label: 'Sexual content' },
  { id: 'self_harm', label: 'Self-harm' },
  { id: 'spam', label: 'Spam' },
  { id: 'misinfo', label: 'Misinformation' },
  { id: 'other', label: 'Something else' },
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number]['id'];

/** What can be reported. Other domains push to `/report?targetKind=...&targetId=...`. */
export type ReportTargetKind = 'post' | 'comment' | 'note' | 'story' | 'user' | 'dm' | 'event' | 'club' | 'meetup' | 'invite' | 'gig' | 'listing';

export type ReportInput = {
  targetKind: ReportTargetKind;
  targetId: string;
  reason: ReportReason;
  note?: string;
  /** Also block the author. The person reported is never told who reported. */
  alsoBlock?: boolean;
};

export type ReportResult = { ok: true; reportId: string; hiddenPendingReview: boolean };

/** Where the current user stands on strikes. Strikes expire after 90 days. */
export type MyStanding = {
  activeStrikes: number;
  action: 'none' | 'warning' | 'mute' | 'ban' | 'removed';
  /** Epoch ms. Set while a 24 h mute (strike 2) is running; the user cannot post or comment. */
  mutedUntil: number | null;
  /** Epoch ms. Set while a 7-day ban (strike 3) is running. */
  bannedUntil: number | null;
  removed: boolean;
  /** True when the user may post or comment right now. */
  canPost: boolean;
  /** Epoch ms when the oldest active strike stops counting. */
  nextExpiryAt: number | null;
};

export type BlockedUser = { id: string; name: string; initials: string; seed?: true };

export type ModStatus = {
  /** True when the signed-in user is a Campus Mod. */
  isMod: boolean;
  waiting: number;
};

export type ModVoteKind = 'keep' | 'remove' | 'escalate';

export type ModQueueItem = {
  id: string;
  /** "Naming someone", "Spam", "AI hold - harassment (medium)". */
  headline: string;
  reportCount: number;
  /** Epoch ms of the oldest report. */
  reportedAt: number;
  excerpt: string;
  targetKind: ReportTargetKind;
  /** Mods never see who posted; this is only "Anonymous" or "A student". */
  authorLabel: 'Anonymous' | 'A student';
  source: 'reports' | 'ai';
  votesSoFar: { remove: number; keep: number };
  /** Items held by the automated check are not live yet and take no votes until the check is cleared. */
  notLiveYet: boolean;
  myVote?: ModVoteKind;
};

export type ModQueue = {
  waiting: number;
  /** Minutes the oldest waiting item has been in the queue. */
  oldestMinutes: number | null;
  modsOn: number;
  items: ModQueueItem[];
  seed?: true;
};

export type ModCase = ModQueueItem & {
  position: { index: number; total: number };
  /** Reason tallies, e.g. Naming 2, Harassment 1. */
  reasons: { reason: ReportReason; label: string; count: number }[];
  /** "as students see it" context line, e.g. "1h · #Random". Never includes the author. */
  context: string;
  rule?: { n: string; text: string };
};

export type ModVoteResult = {
  outcome: 'pending' | 'removed' | 'kept' | 'escalated';
  title: string;
  body: string;
};

export interface SafetyApi {
  /**
   * Authenticated. File a report. The author is never told who reported (the reporter id is stored only in
   * `reports`, readable by Mods as a count, never as an identity). Three reports hide the item until Mods review it.
   * RLS: insert allowed only with reporter_id = auth.uid(); no select for anyone except ops.
   */
  report(input: ReportInput): Promise<ReportResult>;
  /** Authenticated. Block a user: they never see you and you never see them. RLS: blocks.blocker_id = auth.uid(). */
  blockUser(userId: string): Promise<void>;
  unblockUser(userId: string): Promise<void>;
  /** Authenticated. Only the caller's own blocks. */
  blockedUsers(): Promise<BlockedUser[]>;
  /**
   * Authenticated. The caller's own strike standing (active strike count and mute/ban until).
   * Other domains (Tea, DMs) call this before letting a muted or banned user post or comment.
   * RLS: strikes rows are readable only by their owner and ops.
   */
  myStanding(): Promise<MyStanding>;
  /** Authenticated. True when a reported item is hidden pending Mod review (3 reports). Used by feeds to hide it. */
  isHiddenPendingReview(targetKind: ReportTargetKind, targetId: string): Promise<boolean>;

  /** Authenticated. Whether the caller is a Campus Mod, and how many items wait. Everyone else gets isMod false. */
  modStatus(): Promise<ModStatus>;
  /**
   * Campus Mods only (RLS: role = campus_mod on the same campus). Oldest first. Never includes items the caller
   * authored and never exposes author identity.
   */
  modQueue(): Promise<ModQueue>;
  /** Campus Mods only. One case with the caller's position in the queue. Throws for the caller's own posts. */
  modCase(id: string): Promise<ModCase>;
  /**
   * Campus Mods only. Cast a vote: two matching votes decide (mod_decide), a split or an escalate goes to
   * Bunk3d ops. A removal gives the author a strike. One vote per Mod; the caller cannot vote on their own post.
   */
  modVote(id: string, vote: ModVoteKind): Promise<ModVoteResult>;
}
