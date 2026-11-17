// Tea domain contract (T1-T5, T9-T11, Tea states of S1).
// Each method says who may call it and what RLS must enforce.
import type { TeaScope, TeaVote } from '@bunk3d/core';
export type { TeaScope, TeaVote } from '@bunk3d/core';

export type PostKind = 'text' | 'photo' | 'carousel' | 'poll' | 'video';
export type FeedSort = 'hot' | 'new';
/** What the viewer sees on a post: live, or (author only) held / hidden / removed. */
export type PostStatus = 'live' | 'with_mods' | 'under_review' | 'removed';

export type Media = {
  kind: 'image' | 'video';
  /** Local or remote URI. Seed media have none and render a placeholder tile. */
  uri?: string;
  /** width / height of the original. The feed clamps to 4:5 .. 1.91:1; the viewer always shows it whole. */
  ratio: number;
  alt: string;
  /** Placeholder tint for seed media. */
  tint?: string;
  durationSec?: number;
  sizeBytes?: number;
  /** Camera filter name applied at capture ("Original" when none). */
  filter?: string;
  /** Faces blurred (anonymous photos). */
  blurred?: boolean;
  seed?: true;
};

export type PollOption = { id: string; label: string; votes: number };
export type Poll = { options: PollOption[]; total: number; myChoice: string | null; endsAt: number };

/** Named authors show name and details; anonymous authors show nothing that identifies them to students. */
export type PostAuthor =
  | { anon: true; label: 'Anonymous' }
  | { anon: false; userId: string; name: string; initials: string; tint: string; meta: string; club?: boolean; me?: boolean };

export type Post = {
  id: string;
  kind: PostKind;
  scope: TeaScope;
  /** Community posts only: the poster's college name, shown on every community post. */
  collegeName?: string;
  author: PostAuthor;
  /** Campus topic, or a community tag. */
  topic: string;
  body: string;
  media: Media[];
  poll?: Poll;
  createdAt: number;
  score: number;
  myVote: TeaVote;
  comments: number;
  saved: boolean;
  /** Collapsed for everyone at net -5 or lower ("Tap to show"). */
  collapsed: boolean;
  /** True when the caller wrote it (including anonymous posts, which only the author can tell are theirs). */
  mine: boolean;
  status: PostStatus;
  /** A club event post may link to its event. */
  eventId?: string;
  /** Live-event badge text on a photo ("LIVE · HOUR 3"). */
  badge?: string;
  seed?: true;
};

export type Comment = {
  id: string;
  postId: string;
  parentId: string | null;
  author: { kind: 'op' } | { kind: 'anon'; label: string } | { kind: 'named'; userId: string; name: string; initials: string; tint: string; meta: string };
  body: string;
  createdAt: number;
  score: number;
  myVote: TeaVote;
  seed?: true;
};

export type FeedQuery = { scope: TeaScope; sort: FeedSort; topic?: string };
export type OfficialNotice = { id: string; title: string; seed?: true };

export type StoryItem = {
  id: string;
  media: Media;
  caption?: string;
  createdAt: number;
  audience: 'campus' | 'close';
  poll?: { question?: string; options: PollOption[]; myChoice: string | null };
  /** A post shared into the story: "Tap the card to open the post". */
  sharedPostId?: string;
  seed?: true;
};
export type StoryGroup = {
  id: string;
  userId: string;
  name: string;
  firstName: string;
  initials: string;
  tint: string;
  club?: boolean;
  mine?: boolean;
  /** Every item in a group is by the same named author. Stories are never anonymous. */
  items: StoryItem[];
  seen: boolean;
  seed?: true;
};

export type Community = {
  id: string;
  name: string;
  /** Tags available when posting here, e.g. Interview exp, OA prep. */
  tags: string[];
  colleges: number;
  members: number;
  newPosts: number;
  joined: boolean;
  tint: string;
  seed?: true;
};

/** Private to the signed-in user. Nobody else's karma is ever returned. */
export type MyTeaStatus = {
  karma: number;
  accountAgeDays: number;
  strikes: number;
  anonUnlocked: boolean;
  canVote: boolean;
  canPost: boolean;
  /** Epoch ms the mute ends, or null. */
  mutedUntil: number | null;
};

/** Held and under-review posts are not notices: they come back from getFeed to their author with Post.status set. */
export type ModerationNotice =
  | { id: string; kind: 'removed'; postId: string; at: number; strike: number; rule: string; appeal: 'available' | 'pending' | 'used' }
  | { id: string; kind: 'appeal_decided'; postId: string; at: number; outcome: 'restored' | 'upheld' }
  | { id: string; kind: 'muted'; until: number; strike: number; postId?: string };

export type NewPostInput = {
  scope: TeaScope;
  topic: string;
  body: string;
  anon: boolean;
  media?: Media[];
  poll?: { options: string[]; endsInHours: number };
  /** Photo and video posts: also add to my story (never with anon, never in a community). */
  alsoStory?: boolean;
  /** Photo and video posts: skip the feed (story only). */
  storyOnly?: boolean;
  /** Close connections only (stories). */
  audience?: 'campus' | 'close';
};

export type CreatePostResult =
  | { ok: true; post: Post | null; storyId?: string; /** 'with_mods' when the safety check held it. */ status: 'live' | 'with_mods' }
  | { ok: false; reason: 'not_verified' | 'muted' | 'anon_locked' | 'empty' | 'bad_poll' | 'no_destination' | 'anon_story' | 'community_story' | 'too_many_photos'; mutedUntil?: number }
  | { ok: false; reason: 'removed'; rule: string; strike: number; noticeId: string; mutedUntil: number | null }
  | { ok: false; reason: 'video_too_long' | 'video_too_big' };

export type CommentResult =
  | { ok: true; comment: Comment }
  | { ok: false; reason: 'not_verified' | 'muted' | 'anon_locked' | 'empty'; mutedUntil?: number };

export type SendTarget = { id: string; name: string; meta: string; initials: string; tint: string; group?: boolean; seed?: true };

export interface TeaApi {
  /** Signed-in, any verification state (pending users read only). RLS: campus feed rows only for members of that campus; community feed rows for community members; never posts held, hidden or removed unless the caller is the author. Excludes campus-only posts from communities. */
  getFeed(q: FeedQuery): Promise<{ posts: Post[]; official: OfficialNotice | null; fetchedAt: number }>;
  /** Same caller rules. Count of live posts newer than `since` (epoch ms) for the new-posts pill. */
  countNewSince(q: Pick<FeedQuery, 'scope' | 'topic'>, since: number): Promise<number>;
  /** Signed-in. RLS: campus stories visible to the campus; 'close' stories only to close connections. Expire after 24 h. */
  getStories(): Promise<StoryGroup[]>;
  /** Marks a group seen for the caller only. */
  markStorySeen(groupId: string): Promise<void>;
  /** Reply or reaction to a story. Goes to the author's DMs once DMs are wired. Verified callers only. */
  replyToStory(itemId: string, text: string): Promise<{ ok: true } | { ok: false; reason: 'not_verified' | 'muted' }>;
  /** Vote on a story poll. Verified callers only. */
  voteStoryPoll(itemId: string, optionId: string): Promise<{ ok: boolean }>;

  /** Signed-in. RLS as getFeed. Returns the comment thread with anonymous labels computed per thread. */
  getPost(id: string): Promise<{ post: Post; comments: Comment[] } | null>;
  /** Verified only. Caller may vote on any live post; own vote only. Server returns the new score. */
  vote(postId: string, value: TeaVote): Promise<{ ok: true; score: number; myVote: TeaVote } | { ok: false; reason: 'not_verified' }>;
  votePoll(postId: string, optionId: string): Promise<{ ok: true; poll: Poll } | { ok: false; reason: 'not_verified' | 'ended' }>;
  voteComment(commentId: string, value: TeaVote): Promise<{ ok: boolean; score: number; myVote: TeaVote }>;
  /** Verified and not muted. Anonymous replies need anonUnlocked. */
  addComment(postId: string, input: { body: string; anon: boolean; parentId?: string }): Promise<CommentResult>;
  toggleSave(postId: string): Promise<boolean>;

  /** Verified and not muted. Runs the safety check: pass = live, hold = with Campus Mods (author only sees it), block = removed with a strike. Anonymous needs anonUnlocked. Validates media (story video max 15 s and 50 MB). */
  createPost(input: NewPostInput): Promise<CreatePostResult>;
  /** Appeal a removal once. Decided by Bunk3d ops; the result arrives as an appeal_decided notice. */
  appealRemoval(noticeId: string): Promise<void>;
  /** Author only: edit a post held with the Mods. */
  editHeldPost(postId: string, body: string): Promise<{ ok: boolean }>;
  /** Author only: add my own post's photo to my story. Never someone else's post. */
  addPostToStory(postId: string): Promise<{ ok: true; storyId: string } | { ok: false; reason: 'not_yours' | 'anon' }>;
  /** Send a photo to a chat. Allowed for any post (the only way to share someone else's photo). Goes to the DM domain later. */
  sendPhoto(postId: string, mediaIndex: number, targetId: string): Promise<{ ok: true }>;
  listSendTargets(): Promise<SendTarget[]>;

  /** The caller's own status only: karma is private. Gates and mute come from here. */
  myStatus(): Promise<MyTeaStatus>;
  /** The caller's own moderation notices only (removed, appeal decided, muted). */
  myModeration(): Promise<ModerationNotice[]>;
  dismissNotice(noticeId: string): Promise<void>;

  /** Signed-in. Community list: joined first, then discover. RLS: communities are readable by any verified user across colleges. */
  listCommunities(): Promise<{ joined: Community[]; discover: Community[] }>;
  getCommunity(id: string): Promise<Community | null>;
  /** Verified only. */
  setCommunityMembership(id: string, joined: boolean): Promise<Community | null>;
}
