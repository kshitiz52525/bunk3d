// The BunkApi contract. Screens depend on this and nothing else.
// Backend phase: implement every method against Supabase; each method's comment
// says who may call it and what RLS must enforce.

export type VerifyMethod = 'email' | 'id';
export type VerifiedStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type Campus = {
  id: string;
  short: string;
  name: string;
  city: string;
  verifyMethod: VerifyMethod;
  emailDomain?: string;
  tint: string;
  /** True on mock data. The UI never presents seed values as real numbers. */
  seed?: true;
};

export type Club = {
  id: string;
  short: string;
  name: string;
  category: string;
  members: number;
  join: 'open' | 'approval';
  tint: string;
  seed?: true;
};

export type MembershipState = 'none' | 'joined' | 'pending';

export type Session = {
  userId: string;
  phone?: string;
  campusId: string | null;
  verified: VerifiedStatus;
  /** Where onboarding stands; 'done' means the user can enter the app. */
  onboarding: 'college' | 'verify' | 'profile' | 'interests' | 'clubs' | 'guidelines' | 'done';
};

export type AuthResult =
  | { ok: true; session: Session }
  | { ok: false; reason: 'wrong'; triesLeft: number }
  | { ok: false; reason: 'locked'; retryInMinutes: number };

export type CodeResult = { ok: true } | { ok: false; reason: 'wrong' };

export type ProfileInput = {
  name: string;
  username: string;
  degree: string;
  dept: string;
  year: string;
  /** "DD / MM / YYYY". Stored privately, never shown, and never stored at all for under-18s. */
  dob: string;
};

export type ProfileResult = { ok: true } | { ok: false; reason: 'underage' } | { ok: false; reason: 'invalid' };

export type OnboardingDraft = {
  profile: Partial<ProfileInput>;
  interests: string[];
  goals: string[];
  clubs: Record<string, MembershipState>;
  followNotices: boolean;
};

export type Waitlist = { college: string; count: number; target: number; seed?: true };

export interface BunkApi {
  auth: {
    /** Public. Rate-limited server side. */
    sendOtp(phone: string): Promise<{ ok: true }>;
    /** Public. 4 wrong codes lock the number for 10 minutes. */
    verifyOtp(phone: string, code: string, opts: { returning: boolean }): Promise<AuthResult>;
    signInWithGoogle(opts: { returning: boolean }): Promise<AuthResult>;
    getSession(): Session | null;
    subscribe(fn: () => void): () => void;
    signOut(): Promise<void>;
  };
  campuses: {
    /** Public. Only live campuses. */
    listLive(query: string): Promise<Campus[]>;
    /** Authenticated. Sets the user's campus. */
    select(campusId: string): Promise<void>;
    /** Authenticated. Adds the user to the waitlist for a college that is not live. */
    requestWaitlist(collegeName: string): Promise<Waitlist>;
  };
  verification: {
    sendEmailCode(localPart: string): Promise<{ ok: true }>;
    verifyEmailCode(code: string): Promise<CodeResult>;
    /** ID photos are readable by Bunk3d staff only and deleted 30 days after review. */
    submitId(): Promise<{ ok: true }>;
  };
  onboarding: {
    getDraft(): Promise<OnboardingDraft>;
    isUsernameFree(username: string): Promise<boolean>;
    /** Under 18: everything entered is deleted and { reason: 'underage' } is returned. */
    saveProfile(input: ProfileInput): Promise<ProfileResult>;
    saveInterests(interests: string[], goals: string[]): Promise<void>;
    listClubs(): Promise<Club[]>;
    setClubMembership(clubId: string, joined: boolean): Promise<MembershipState>;
    setFollowNotices(follow: boolean): Promise<void>;
    acceptGuidelines(): Promise<void>;
  };
}
