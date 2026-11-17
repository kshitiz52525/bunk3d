// Discover domain contract: Spark (people) and Radar (places and meetups). Owned by the discover feature.
// Spark is not dating: it is for friends, study partners, sports and squads. Verified 18+ students only.
// Discover is OFF by default (spark_prefs.discover_on = false).
// Each method says who may call it and what RLS must enforce.

export type SparkIntent = 'Friends' | 'Study' | 'Sports' | 'Events' | 'Hangouts';
export const SPARK_INTENTS: SparkIntent[] = ['Friends', 'Study', 'Sports', 'Events', 'Hangouts'];

export type SparkPrefs = {
  /** Default false. Nobody sees the caller until this is true. */
  discoverOn: boolean;
  intents: SparkIntent[];
  year: 'any' | 'plusminus1' | 'same';
  scope: 'campus' | 'nearby';
  priority: 'anyone' | 'clubs';
  /** Epoch ms until which the caller is hidden from decks ("Pause for a week"), else null. Chats stay. */
  pausedUntil: number | null;
  /** True only for verified students aged 18 or over. When false, Discover cannot be switched on. */
  eligible: boolean;
};

export type SparkCard = {
  id: string;
  name: string;
  initials: string;
  year: string;
  branch: string;
  /** "Looking for" line. */
  prompt: string;
  common: string[];
  tint: string;
  intent: SparkIntent;
  seed?: true;
};

export type ConnectResult = { ok: true };

export type InviteQuota = { left: number; limit: number; resetsAt: number };

export const INVITE_PLANS = ['Chai run', 'Study sesh', 'Open mic', 'Football'] as const;
export const INVITE_TIMES = ['Today 5 PM', 'Tmrw 4 PM', 'Sat 11 AM'] as const;

export type InviteSpot = { id: string; name: string; meta: string };

export type SendInviteInput = {
  toId: string;
  plan: string;
  spot: string;
  time: string;
  /** Up to 140 characters. */
  message?: string;
};
export type SendInviteResult = { ok: true; left: number; expiresAt: number } | { ok: false; reason: 'limit' | 'not_concrete' | 'off' };

export type InviteReply = 'accept' | 'suggest' | 'decline';

export type ReceivedInvite = {
  id: string;
  fromName: string;
  initials: string;
  tint: string;
  meta: string;
  plan: string;
  when: string;
  where: string;
  message?: string;
  /** Epoch ms. Unanswered invites expire after 48 h. */
  expiresAt: number;
  hoursLeft: number;
  /** What the caller already did. Undefined while pending. */
  reply?: { kind: InviteReply; suggestedTime?: string };
  seed?: true;
};

export type SentInvite = {
  id: string;
  toName: string;
  initials: string;
  tint: string;
  plan: string;
  when: string;
  /**
   * What the sender may see. A decline is silent: it never shows here, the invite just stays "sent" and expires.
   */
  status: 'sent' | 'accepted' | 'suggested' | 'expired';
  suggestedTime?: string;
  seed?: true;
};

export type Invites = { received: ReceivedInvite[]; sent: SentInvite[] };

// ---- Radar --------------------------------------------------------------

export type RadarCategory = 'All' | 'Meetups' | 'Food' | 'Study' | 'Sports' | 'Hangouts';
export const RADAR_CATEGORIES: RadarCategory[] = ['All', 'Meetups', 'Food', 'Study', 'Sports', 'Hangouts'];

export type RadarPin = {
  id: string;
  category: Exclude<RadarCategory, 'All'>;
  name: string;
  /** Public places only. Never a person's position. */
  lat: number;
  lng: number;
  tint: string;
  /** Route to open. */
  kind: 'spot' | 'meetup';
  seed?: true;
};

export type MeetupVisibility = 'campus' | 'clubs' | 'close';

export type MeetupSummary = {
  id: string;
  title: string;
  /** Public area only (never the exact spot). */
  meta: string;
  /** "NOW", "SUN 7A". */
  when: string;
  going: string;
  tint: string;
  seed?: true;
};

export type RadarMap = {
  /** Map centre: the campus. */
  center: { lat: number; lng: number };
  pins: RadarPin[];
  meetups: MeetupSummary[];
  /** The caller's approximate position, only if they shared one (never exact). Null when ghost mode hides them. */
  you: { lat: number; lng: number } | null;
};

export type Spot = {
  id: string;
  name: string;
  category: string;
  /** "Cafe . 1.2 km . open till 11 PM". */
  meta: string;
  priceBand?: string;
  /** Approximate "students here now" or null when too few to show (never a precise headcount of people). */
  hereNow: number | null;
  busyLabel: string;
  busyNote: string;
  deal?: { title: string; sponsored: true };
  tags: { label: string; votes: number; mine: boolean }[];
  saved: boolean;
  meetups: MeetupSummary[];
  seed?: true;
};

export type CreateMeetupInput = {
  title: string;
  spotId: string;
  /** Epoch ms. */
  startsAt: number;
  durationHours: number;
  visibility: MeetupVisibility;
  max: number;
};

export type JoinState = 'none' | 'pending' | 'approved';

export type MeetupDetail = {
  id: string;
  title: string;
  description?: string;
  hostName: string;
  isHost: boolean;
  /** "TODAY . 6-8 PM". */
  whenLabel: string;
  startsAt: number;
  /** The public area. Always safe to show. */
  area: string;
  /** The exact spot. Set only for the host and approved people, and only from 1 hour before the start. */
  exactSpot?: string;
  /** Epoch ms when the exact spot is revealed to approved people. */
  revealsAt: number;
  who: string;
  going: number;
  max: number;
  goingInitials: { initials: string; tint: string }[];
  joinState: JoinState;
  /** Group chat opens once approved. */
  chatOpen: boolean;
  seed?: true;
};

export type LocationShareState = {
  /** Ghost mode. On by default for everyone: invisible on Radar. */
  ghost: boolean;
  active: null | { personIds: string[]; names: string[]; expiresAt: number; minutesLeft: number };
  /** Rounded approximate point the picked people see (about 150 m), or null when nothing is shared. */
  approx: { lat: number; lng: number } | null;
};

export type ShareTarget = { id: string; name: string; initials: string; tint: string };

export type StartShareResult = { ok: true; state: LocationShareState } | { ok: false; reason: 'nobody' | 'bad_duration' };

export interface DiscoverApi {
  /** Authenticated. The caller's Spark prefs (row is created with discover_on = false). RLS: own row. */
  sparkPrefs(): Promise<SparkPrefs>;
  /**
   * Authenticated. Update prefs. Turning discoverOn on requires verified 18+ (eligible); otherwise it stays off.
   * RLS: own row; the 18+ and verified checks are enforced server-side.
   */
  updateSparkPrefs(patch: Partial<Omit<SparkPrefs, 'eligible'>>): Promise<SparkPrefs>;
  /**
   * Authenticated, discover_on only. Deck for an intent: verified 18+ students on the caller's campus who are
   * also on, not paused, not blocked either way. Returns [] when the caller has Discover off.
   */
  sparkDeck(intent: SparkIntent): Promise<SparkCard[]>;
  /** Authenticated. Pass on a card; it does not come back. Silent. */
  sparkPass(cardId: string): Promise<void>;
  /** Authenticated. Send a connect request. Does not use up a daily invite. */
  sparkConnect(cardId: string): Promise<ConnectResult>;
  /** Authenticated. Invites left today (3 a day, resets at midnight IST). RLS: counted from spark_invites sent by the caller. */
  inviteQuota(): Promise<InviteQuota>;
  /** Authenticated. Public spots to pick from for an invite (from Radar). */
  inviteSpots(): Promise<InviteSpot[]>;
  /**
   * Authenticated, discover_on only. Send a "shoot your shot" invite. It must be a concrete plan (what, where, when);
   * 3 a day. The receiver sees the plan first and decides; no read receipts.
   */
  sendInvite(input: SendInviteInput): Promise<SendInviteResult>;
  /** Authenticated. Received (to the caller) and sent (by the caller). Declines never show on the sender's side. */
  invites(): Promise<Invites>;
  /** Authenticated, receiver only. Accept (opens a chat), suggest another time, or decline (silent). */
  respondInvite(id: string, reply: InviteReply, suggestedTime?: string): Promise<void>;

  /** Authenticated. Radar: campus pins and live meetups, filtered by category. Places only; no people. */
  radar(category?: RadarCategory): Promise<RadarMap>;
  /** Authenticated. A spot with its tags, deal and meetups. */
  spot(id: string): Promise<Spot>;
  /** Authenticated. Save or unsave a spot for the caller. RLS: own saves. */
  saveSpot(id: string, saved: boolean): Promise<void>;
  /** Authenticated. Vote (or unvote) a vibe tag on a spot; one vote per user per tag. */
  voteSpotTag(id: string, label: string, on: boolean): Promise<void>;
  /** Authenticated, discover_on. Post a meetup at a public spot. Exact location shows only to approved people, 1 hr before. */
  createMeetup(input: CreateMeetupInput): Promise<{ id: string }>;
  /**
   * Authenticated. Meetup detail. `exactSpot` is returned only to the host and approved people, and only from
   * 1 hour before the start; everyone else gets the public area. RLS/RPC must enforce this server-side.
   */
  meetup(id: string): Promise<MeetupDetail>;
  /** Authenticated. Ask to join. The host approves; the exact spot follows approval. */
  requestJoinMeetup(id: string): Promise<{ joinState: JoinState }>;

  /** Authenticated. Ghost mode and any running share. A share that has run out is reported as not active. */
  locationSharing(): Promise<LocationShareState>;
  /** Authenticated. People the caller can share with (connections and squads). */
  shareTargets(): Promise<ShareTarget[]>;
  /** Authenticated. Ghost mode on or off. Default on. */
  setGhost(on: boolean): Promise<LocationShareState>;
  /**
   * Authenticated. Share approximate (about 150 m) location with the picked people for 15, 30 or 60 minutes.
   * `position` is the device position; the API rounds it and never stores or returns the exact point.
   * It switches off by itself. RLS: only listed people may read it, only while expires_at is in the future.
   */
  startLocationShare(input: { personIds: string[]; minutes: number; position?: { lat: number; lng: number } }): Promise<StartShareResult>;
  /** Authenticated. Add 15 minutes (never beyond an hour from now). */
  extendLocationShare(): Promise<LocationShareState>;
  /** Authenticated. Stop sharing now. */
  stopLocationShare(): Promise<LocationShareState>;
}
