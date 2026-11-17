// Crew domain contract (The Crew: clubs, tasks, club channels, side quests, clout).
// Mobile screens C1, C2, C4, C5, C6, C7, C8 and the web Crew HQ (C3 / CH*) both use this.
// Each method says who may call it and what RLS must enforce.
import type { ClubRole, TaskAction, TaskStatus, TakeHome } from '@bunk3d/core';
import type { Club, MembershipState } from './identity';

export type { ClubRole, TaskStatus, TaskAction };

export type ClubSummary = Club & {
  verified: boolean;
  /** The caller's membership of this club. */
  state: MembershipState;
  /** Set when state is 'joined'. */
  role?: ClubRole;
  /** Admins only: things waiting for them (pending requests, tasks to review). */
  newCount?: number;
};

export type ClubDetail = ClubSummary & {
  about: string;
  eventCount: number;
  adminCount: number;
};

/** A club post. Always named: the club plus the human who posted it. Clubs cannot post anonymously. */
export type ClubPost = {
  id: string;
  clubId: string;
  body: string;
  atMs: number;
  /** Real name of the admin who posted as the club. Never hidden. */
  postedBy: { id: string; name: string; role: ClubRole };
  event?: { id: string; title: string; dateMs: number };
  seed?: true;
};

export type ClubEventRow = { id: string; title: string; startsAtMs: number; going: number; seed?: true };

export type ClubMember = { userId: string; name: string; initials: string; role: ClubRole; joinedAtMs: number; seed?: true };
export type ClubApproval = { clubId: string; userId: string; name: string; initials: string; requestedAtMs: number; seed?: true };

export type ClubChannel = { id: string; clubId: string; name: string; /** Only club admins may post (e.g. announcements). */ adminOnly: boolean };

export type ChannelMessage = {
  id: string;
  clubId: string;
  channelId: string;
  author: { id: string; name: string; initials: string; tint: string; role?: ClubRole };
  text: string;
  atMs: number;
  mine: boolean;
  seed?: true;
};

export type ChannelView = {
  club: ClubSummary;
  channels: ClubChannel[];
  channel: ClubChannel;
  pinned?: { text: string; by: string };
  messages: ChannelMessage[];
  memberCount: number;
  onlineCount: number;
  muted: boolean;
  /** False when the caller may read but not post (admin-only channel, or not a member). */
  canPost: boolean;
};

export type TaskReward =
  | { kind: 'xp'; xp: number }
  | { kind: 'certificate' }
  | {
      kind: 'paid';
      /** Gig pay in paise, before fee. */
      payPaise: number;
      /** Computed by the API with computeTakeHome (fee and GST as separate lines). Screens only display it. */
      takeHome: TakeHome;
      /** Paid tasks link to a gig (The Hustle). */
      gigId: string;
    };

export type TaskRow = {
  id: string;
  clubId: string;
  clubShort: string;
  clubName: string;
  tint: string;
  from: string;
  title: string;
  status: TaskStatus;
  dueMs: number;
  reward: TaskReward;
  seed?: true;
};

export type TaskGroup = { key: 'this_week' | 'next_week' | 'done'; label: string; items: TaskRow[] };

export type TaskDetail = TaskRow & {
  fromRole?: string;
  shift?: string;
  reviewer: string;
  deliverables: string[];
  revisionNote?: { by: string; text: string };
  /** Proof attached on submit (file names only in the mock). */
  attachments: string[];
  /** Actions the caller may take next, from nextTaskStatus. */
  allowed: TaskAction[];
};

export type TaskFilter = 'Open' | 'Paid' | 'Done';

export type TaskInput = {
  title: string;
  assigneeId: string;
  dueMs: number;
  deliverables: string[];
  reward: { kind: 'xp'; xp: number } | { kind: 'certificate' } | { kind: 'paid'; payPaise: number };
};

export type QuestScope = 'campus' | 'inter_college';
export type Quest = { id: string; scope: QuestScope; title: string; rule: string; xp: number; endsAtMs: number; enrolled: boolean; seed?: true };
export type ActiveQuest = Quest & { daysLeft: number; progress: number; target: number; squadLabel: string; proof: string };
export type QuestBoard = { active?: ActiveQuest; open: Quest[]; note: string };

export type CloutScope = 'campus' | 'inter_college';
export type CloutRow = { rank: number; clubId: string; short: string; name: string; tint: string; xp: number; mine: boolean; seed?: true };
export type CloutBoard = { periodLabel: string; scope: CloutScope; rows: CloutRow[]; scoringNote: string; seed?: true };

export type ClubFilter = 'All' | 'Tech' | 'Cultural' | 'Sports' | 'Social';

export type PostAsClubResult = { ok: true; post: ClubPost } | { ok: false; reason: 'not_admin' | 'empty' };
export type SendChannelResult = { ok: true; message: ChannelMessage } | { ok: false; reason: 'not_member' | 'admin_only' | 'empty' | 'unverified' };

export interface CrewApi {
  // ---- C1 / C2: clubs (any signed-in student; clubs are campus-scoped by RLS) ----
  /** Own clubs (with role / pending state) and the discoverable clubs of the campus. */
  listClubs(filter: ClubFilter): Promise<{ mine: ClubSummary[]; discover: ClubSummary[]; openTaskCount: number }>;
  /** Campus members only. */
  getClub(clubId: string): Promise<ClubDetail>;
  /** Open clubs join at once ('joined'); approval clubs go 'pending'. Verified students only. */
  joinClub(clubId: string): Promise<MembershipState>;
  /** Leave a club or withdraw a pending request. */
  leaveClub(clubId: string): Promise<MembershipState>;
  /** Public to campus members. Newest first. */
  listClubPosts(clubId: string): Promise<ClubPost[]>;
  listClubEvents(clubId: string): Promise<ClubEventRow[]>;
  /** Campus members. Names and roles only, never phone / email / DOB. */
  listClubMembers(clubId: string): Promise<ClubMember[]>;

  // ---- C4 / C5: tasks (assignee reads and acts on own tasks; club admins read their club's) ----
  /** Own tasks grouped by due date. RLS: assignee only. */
  listMyTasks(filter: TaskFilter): Promise<TaskGroup[]>;
  /** RLS: assignee, or an admin of the task's club. */
  getTask(taskId: string): Promise<TaskDetail>;
  /** Assignee only. Moves the task along assigned -> accepted -> working -> review. Returns the new detail. */
  advanceTask(taskId: string, action: 'accept' | 'start' | 'submit', proof?: { attachmentName?: string }): Promise<TaskDetail>;
  /** Assignee only. Sends a question to the reviewer. */
  askTaskQuestion(taskId: string, text: string): Promise<{ ok: true }>;

  // ---- C6 / C7: side quests and clout (wave 2) ----
  /** Quests enrol squads and score clubs, never individual people. */
  listQuests(): Promise<QuestBoard>;
  enrollQuest(questId: string): Promise<{ enrolled: boolean }>;
  submitQuestMilestone(questId: string): Promise<{ ok: boolean }>;
  /** Ranks CLUBS only. */
  cloutBoard(scope: CloutScope): Promise<CloutBoard>;

  // ---- C8: club chat (members read and post; admin-only channels accept admin posts only) ----
  listChannels(clubId: string): Promise<ClubChannel[]>;
  getChannel(clubId: string, channelId: string): Promise<ChannelView>;
  /** Members only, verified only. Admin-only channels: admins only. */
  sendChannelMessage(clubId: string, channelId: string, text: string): Promise<SendChannelResult>;
  setChannelMuted(clubId: string, muted: boolean): Promise<void>;
  /** Fires when a club channel changes (new message, read). Returns an unsubscribe. */
  subscribe(fn: () => void): () => void;

  // ---- Crew HQ (web, C3 / CH*): club admins only. RLS: caller's role in club_members is lead or coordinator. ----
  adminListMembers(clubId: string): Promise<ClubMember[]>;
  /** Only a lead can change roles. */
  adminSetMemberRole(clubId: string, userId: string, role: ClubRole): Promise<void>;
  adminRemoveMember(clubId: string, userId: string): Promise<void>;
  /** Join requests for approval clubs. */
  adminListApprovals(clubId: string): Promise<ClubApproval[]>;
  adminDecideApproval(clubId: string, userId: string, approve: boolean): Promise<void>;
  adminListTasks(clubId: string): Promise<TaskDetail[]>;
  /** Paid tasks create a linked gig. The fee is computed server side at assignment. */
  adminCreateTask(clubId: string, input: TaskInput): Promise<TaskDetail>;
  /** Reviewer decision on a task in review. */
  adminReviewTask(taskId: string, decision: 'approve' | 'request_revision', note?: string): Promise<TaskDetail>;
  adminCreateChannel(clubId: string, name: string, adminOnly: boolean): Promise<ClubChannel>;
  adminPinMessage(clubId: string, channelId: string, text: string): Promise<void>;
  /** Posts as the club, always with the admin's real name. There is no anonymous option. */
  adminPostAsClub(clubId: string, input: { body: string; eventId?: string }): Promise<PostAsClubResult>;
}
