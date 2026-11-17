// You domain: profile, settings, notices, search. Owned by the `you` feature; extend freely.
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

export interface YouApi {
  /** Authenticated. The caller's own profile (never exposes phone, email or date of birth). */
  me(): Promise<Me>;
  /** Authenticated. Header badge state. */
  badges(): Promise<Badges>;
}
