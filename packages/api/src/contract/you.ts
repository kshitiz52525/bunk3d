// You domain: profile, settings, notices, search. Owned by the `you` feature.
// Each method says who may call it and what RLS must enforce.
export type Me = {
  id: string;
  name: string;
  initials: string;
  username: string;
  campusName: string;
  photoUri?: string;
};

/** Header badges. Counts are real unread counts, never decorative. */
export type Badges = { unreadDms: boolean; unreadNotices: number };

export type ClubTag = { id: string; name: string; role?: 'admin' | 'member' };

/** The owner's own profile (P1). Karma is private and only ever returned here. */
export type MyProfile = Me & {
  degree: string;
  dept: string;
  year: string;
  verified: boolean;
  /** Campus Mod badge and the Mod queue row on the profile. */
  isMod: boolean;
  /** Private. Returned only to the owner. Nobody is ranked by it. */
  karma: number;
  clubs: ClubTag[];
  seed?: true;
};

export type ProfileTab = 'posts' | 'notes' | 'saved';

export type ProfileItem = {
  id: string;
  /** Short tile text: ME, ANON, PYQ, NOTE, TEA. */
  tile: string;
  tileKind: 'named' | 'anon' | 'pyq' | 'note' | 'tea';
  title: string;
  meta: string;
  seed?: true;
};

/** Another student's profile (P2). Never includes phone, email, date of birth or karma. */
export type PublicProfile = {
  id: string;
  name: string;
  initials: string;
  username: string;
  degree: string;
  dept: string;
  year: string;
  bio: string;
  verified: boolean;
  clubs: ClubTag[];
  /** Named posts only. Anonymous posts never appear on a profile. */
  posts: { id: string; title: string; meta: string }[];
  notesCount: number;
  connected: boolean;
  blocked: boolean;
  /** True when this is the caller's own profile. */
  isSelf: boolean;
  seed?: true;
};

export type NotificationPrefs = {
  replies: boolean;
  dms: boolean;
  notices: boolean;
  events: boolean;
  quietHours: boolean;
  readReceipts: boolean;
};

export type Settings = {
  notifications: NotificationPrefs;
  /** 24 h clock "HH:MM". Default 22:00 to 08:00. Safety alerts still come through. */
  quietStart: string;
  quietEnd: string;
  /** Epoch ms when a requested account deletion becomes final (30-day grace), else null. */
  deletionAt: number | null;
};

export type NoticeKind = 'College' | 'Clubs';

export type Notice = {
  id: string;
  kind: NoticeKind;
  /** Short sender tile text. */
  short: string;
  from: string;
  badge: 'OFFICIAL' | 'CLUB';
  /** Epoch ms. */
  at: number;
  urgent: boolean;
  title: string;
  body: string;
  read: boolean;
  seed?: true;
};

export type SearchType = 'All' | 'Posts' | 'Notes' | 'Events' | 'Clubs';

export type SearchResult = {
  id: string;
  kind: 'post' | 'note' | 'subject' | 'event' | 'club';
  title: string;
  meta: string;
  /** Short tile text (PYQ, SUBJ, month/day for events). */
  tile: string;
  /** Root route to open. */
  href: string;
  seed?: true;
};

export type SearchResults = {
  query: string;
  notes: SearchResult[];
  posts: SearchResult[];
  events: SearchResult[];
  clubs: SearchResult[];
  notesTotal: number;
  postsTotal: number;
  eventsTotal: number;
  clubsTotal: number;
};

export interface YouApi {
  /** Authenticated. The caller's own profile basics (never exposes phone, email or date of birth). */
  me(): Promise<Me>;
  /** Authenticated. Header badge state. unreadNotices is the real count of the caller's unread notices. */
  badges(): Promise<Badges>;
  /** Authenticated. The caller's full profile incl. private karma. RLS: select own row only for karma. */
  myProfile(): Promise<MyProfile>;
  /**
   * Authenticated. The caller's own posts (incl. anonymous ones, marked ANON, visible only to them), notes
   * and saved items. RLS: author_id = auth.uid() for posts and notes; saves by user_id.
   */
  myContent(tab: ProfileTab): Promise<ProfileItem[]>;
  /**
   * Authenticated. Another student's public profile. Same campus or connected only; blocked users get "not found".
   * Never returns phone, email, date of birth, karma or anonymous posts.
   */
  userProfile(id: string): Promise<PublicProfile>;
  /** Authenticated. Settings of the caller. RLS: own row. */
  settings(): Promise<Settings>;
  updateSettings(patch: { notifications?: Partial<NotificationPrefs>; quietStart?: string; quietEnd?: string }): Promise<Settings>;
  /** Authenticated. Start the 30-day account deletion grace. */
  requestAccountDeletion(): Promise<Settings>;
  /** Authenticated. Cancel a pending deletion during the grace window. */
  cancelAccountDeletion(): Promise<Settings>;
  /** Authenticated. Notices from the caller's campus office and the clubs they follow, newest first, urgent first. */
  notices(filter?: 'All' | NoticeKind): Promise<Notice[]>;
  markNoticeRead(id: string): Promise<void>;
  markAllNoticesRead(): Promise<void>;
  /** Authenticated. Search the caller's campus. Blocked users' content is excluded; anonymous posts show no author. */
  search(query: string, type?: SearchType): Promise<SearchResults>;
}
