// DM domain contract (D1 Chats, D2 Chat, D3 Squad chat). Realtime on Supabase; the mock fires subscribe().
// Each method says who may call it and what RLS must enforce.
import type { ChatFilter, ChatKind } from '@bunk3d/core';

export type { ChatFilter, ChatKind };

export type ChatRow = {
  id: string;
  kind: ChatKind;
  name: string;
  initials: string;
  tint: string;
  lastMessage: string;
  lastAtMs: number;
  unread: number;
  /** People: active now. */
  online?: boolean;
  verified?: boolean;
  /** Squads: "SQUAD · 4". */
  tag?: string;
  /** Club channels: "#general". Listed as e.g. "GDG Atria #general". */
  channel?: string;
  clubId?: string;
  channelId?: string;
  seed?: true;
};

export type ChatList = {
  /** Locked until the caller is verified (DMs unlock after verification). */
  locked: boolean;
  rows: ChatRow[];
  /** Counts per filter, for the chips. */
  counts: Record<ChatFilter, number>;
  requestCount: number;
};

export type MessageRequest = { id: string; userId: string; name: string; initials: string; tint: string; verified: boolean; preview: string; atMs: number; seed?: true };

export type PersonHit = { userId: string; name: string; initials: string; tint: string; verified: boolean; sharesClub: boolean; seed?: true };

export type DmMessage = {
  id: string;
  mine: boolean;
  kind: 'text' | 'photo';
  text?: string;
  /** A photo sent from the Tea feed. Someone else's photo can only go to DMs, never to a story. */
  photo?: { name: string; postId?: string; mediaId?: string };
  atMs: number;
  /** When the other person read it. Only present if receipts are visible to the caller (see receiptsVisible). */
  readAtMs?: number;
  seed?: true;
};

/** What the composer should show. Mirrors messagingMode in @bunk3d/core. */
export type ComposerState = 'direct' | 'new_request' | 'request_pending' | 'request_limit' | 'cannot_send' | 'locked';

export type ChatView = {
  id: string;
  person: { userId: string; name: string; initials: string; tint: string; verified: boolean; online: boolean };
  composer: ComposerState;
  /** Set for composer 'request_limit': when the limit resets. */
  limitResetsAtMs?: number;
  messages: DmMessage[];
  /** Whether the caller can see read receipts in this chat (mutual; off if either side turned them off). */
  receiptsVisible: boolean;
  myReceiptsOn: boolean;
  muted: boolean;
  typing: boolean;
};

export type SquadView = {
  id: string;
  name: string;
  members: { userId: string; name: string; initials: string; tint: string; me: boolean }[];
  max: number;
  linkedEvent?: { id: string; title: string; whenLabel: string };
  messages: { id: string; mine: boolean; authorName: string; initials: string; tint: string; text: string; atMs: number; system?: boolean; seed?: true }[];
  poll?: { id: string; by: string; question: string; options: { id: string; label: string; votes: number }[]; myVote?: string };
  muted: boolean;
};

export type SendResult =
  | { ok: true; chatId: string; message: DmMessage; asRequest: boolean }
  | { ok: false; reason: 'cannot_send' | 'locked' | 'request_limit' | 'request_pending' | 'empty'; resetsAtMs?: number };

export type RequestQuotaView = { limit: number; sentToday: number; remaining: number; resetsAtMs: number };

export interface DmApi {
  /** Own conversations: people, squads, and the club channels the caller is in. RLS: participants only. */
  listChats(filter: ChatFilter): Promise<ChatList>;
  /** Pending message requests from strangers (people with no shared club). Recipient only. */
  listRequests(): Promise<MessageRequest[]>;
  /** Moves the request into the chat list. Recipient only. Returns the chat id. */
  acceptRequest(requestId: string): Promise<string>;
  /** Recipient only. The sender is not told. */
  ignoreRequest(requestId: string): Promise<void>;
  /** Total unread chats and requests: drives the header unread dot (the header reads this). */
  unreadCount(): Promise<number>;
  /** How many new requests the caller may still send today (limit 20 a day, resets at midnight IST). */
  requestQuota(): Promise<RequestQuotaView>;

  /** One-to-one chat. Participants only. Marks it read. */
  getChat(chatId: string): Promise<ChatView>;
  /** Finds or creates the chat with a person; strangers get a request on first message. */
  openChatWith(userId: string): Promise<{ chatId: string }>;
  sendMessage(chatId: string, text: string): Promise<SendResult>;
  /** Recipient picker for "New message" and for sharing a photo from Tea. Campus members only. */
  searchPeople(query: string): Promise<PersonHit[]>;
  /** Share a photo post from Tea into a DM. Counts against the request limit for strangers. */
  sharePhoto(userId: string, ref: { postId?: string; mediaId?: string; name?: string }): Promise<SendResult>;
  /** Off means you cannot see theirs either. */
  setReadReceipts(on: boolean): Promise<void>;
  getReadReceipts(): Promise<boolean>;
  setChatMuted(chatId: string, muted: boolean): Promise<void>;
  /** Blocking ends the chat for both sides ("Can't send"). */
  blockPerson(chatId: string): Promise<void>;

  /** Squad chat (squads come from Poppin). Members only. */
  getSquad(squadId: string): Promise<SquadView>;
  sendSquadMessage(squadId: string, text: string): Promise<void>;
  voteSquadPoll(squadId: string, pollId: string, optionId: string): Promise<void>;
  setSquadMuted(squadId: string, muted: boolean): Promise<void>;
  /** 24h invite link, members only; only verified students of the same campus can join. */
  squadInvite(squadId: string): Promise<{ url: string; expiresInHours: number }>;
  leaveSquad(squadId: string): Promise<void>;

  /** Fires on new messages, requests and reads (Supabase Realtime later). Returns an unsubscribe. */
  subscribe(fn: () => void): () => void;
}
