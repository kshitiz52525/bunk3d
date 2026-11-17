// Console contract: Crew HQ (CH1-CH12, E4, E5) and Ops (OP1-OP8).
// Console auth arrives in the backend phase. "Who may call" notes below say what RLS / role checks must enforce.
// NOTE: event, ticket and club-member shapes overlap the `poppin` and `crew` slices; these are console-side
// copies so the consoles do not depend on them. The backend phase should unify them.

export type Money = { paise: number }; // display with formatPaise; all amounts computed server-side

// ===================== Crew HQ =====================
export type CrewClub = { id: string; name: string; campus: string; wave: 1 | 2 | 3 | 4; leadName: string; seed: true };
export type Tone = 'plain' | 'warn' | 'ok' | 'err' | 'muted';
export type Cell = { text: string; tone: Tone };
export type DetailRow = {
  id: string; cells: Cell[]; title: string; lines: [string, string][]; actions: string[]; highlight: boolean; note?: string; seed: true;
};
export type Kpi = { label: string; value: string; sub: string };

export type CrewAlert = DetailRow;
export type CrewDashboard = {
  club: CrewClub;
  members: number; membersThisWeek: number;
  joinRequests: number; oldestRequestDays: number;
  openTasks: number; tasksDueThisWeek: number;
  /** null before the club's campus reaches wave 3 (fund balance is a wave 3 feature). */
  fundBalancePaise: number | null;
  alerts: CrewAlert[];
};

export type CrewHqRole = 'lead' | 'coordinator' | 'member';
export type MemberStatus = 'active' | 'requested' | 'removed';
export type CrewMember = {
  id: string; name: string; year: string; branch: string; role: CrewHqRole | null; joined: string | null;
  status: MemberStatus; requestedDaysAgo?: number; note?: string; seed: true;
};
export type MembersView = { members: CrewMember[]; inviteLink: { url: string; expiresInDays: number } | null };

export type Permission = { id: string; label: string; lead: 'yes' | 'no' | 'view'; coordinator: 'yes' | 'no' | 'view'; member: 'yes' | 'no' | 'view'; note: string; seed: true };
export type RolesView = { permissions: Permission[]; leads: number; maxLeads: number; coordinators: number; members: number; handoverEnabled: boolean };

export type EventCategory = 'Tech' | 'Cultural' | 'Sports' | 'Workshop' | 'Fest';
export type EventDraftInput = {
  title: string; category: EventCategory | ''; startsAtMs: number; endsAtMs: number; venue: string; capacity: number;
  rsvpDeadlineMs: number; description: string; ticketType: 'free' | 'paid'; pricePaise: number;
};
/** Buyer price breakdown, computed on the server: price + 5% platform fee + 18% GST on that fee. */
export type TicketPricing = { pricePaise: number; platformFeePaise: number; gstPaise: number; totalPaise: number };
export type ClubEvent = {
  id: string; clubId: string; title: string; category: string; startsAtMs: number; endsAtMs: number; venue: string; capacity: number;
  registered: number; waitlist: number; ticketType: 'free' | 'paid'; pricing: TicketPricing | null;
  collegeOk: 'pending' | 'approved' | 'not_needed' | 'not_requested'; status: 'draft' | 'published' | 'results_published';
  checkedIn: number; seed: boolean;
};
export type EventsView = { events: ClubEvent[]; upcoming: number; registered: number; waitlist: number; paidAllowed: boolean };
export type CreateEventResult = { ok: true; event: ClubEvent } | { ok: false; issues: { field: string; message: string }[] };

/** Scanner (CH5 / E5). */
export type ScanResultKind = 'checked_in' | 'already_used' | 'wrong_event' | 'not_registered';
export type RosterTicket = { ticketId: string; eventId: string; eventTitle: string; holder: string; checkedInAtMs: number | null; secret: string };
export type ScannerRoster = {
  event: { id: string; title: string; door: string }; /** All of the club's tickets, so a ticket for another event reads as 'Wrong event'. */ tickets: RosterTicket[]; totalRegistered: number; qrPeriodMs: number; downloadedAtMs: number;
};
export type ScanInput = { ticketId: string; scannedAtMs: number; scannerId: string };
export type ScanLogEntry = { id: string; atMs: number; holder: string | null; ticketId: string; result: ScanResultKind; scannerName: string; seed: boolean };
export type SyncScansResult = { accepted: number; duplicates: number; checkedIn: number };
export type CheckInView = {
  event: { id: string; title: string }; checkedIn: number; registered: number; rejected: number; offlineQueue: number; scanners: number; log: ScanLogEntry[];
};

export type CrewHqTaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type ClubTask = { id: string; title: string; meta: string; tag: string; paid: boolean; status: CrewHqTaskStatus; seed: true };
export type TasksView = { tasks: ClubTask[]; open: number; inReview: number; paid: number; committedPaise: number; doneThisMonth: number };

export type CrewHqPost = { id: string; title: string; where: string; when: string; reads: string; audience: string; pinned: boolean; scheduled: boolean; needs?: string; seed: true };
export type PostsView = { posts: CrewHqPost[]; pinned: number; scheduled: number };
export type CrewHqPostInput = { title: string; where: 'members_chat' | 'club_page' | 'campus_notice'; schedule: 'now' | 'later' };

/** CH8-CH12: same table + detail pattern. Locked when the club's campus wave is too low; rows are then a labelled preview. */
export type CrewSectionId = 'quests' | 'gigs' | 'funds' | 'collabs' | 'letters';
export type CrewSection = {
  id: CrewSectionId; code: string; wave: 2 | 3 | 4; title: string; description: string; primary: string;
  locked: boolean; lockMessage: string | null; kpis: Kpi[]; cols: string[]; rows: DetailRow[];
};

export type ActionResult = { message: string; auditId: string };

// ===================== Ops =====================
export type VerificationItem = {
  id: string; student: string; campus: string; method: 'Student ID' | 'ID (no college email)'; waitingHours: number;
  nameMatches: boolean; collegeMatches: boolean; dobYear: number; decidedAtMs: number | null; decision: 'approved' | 'rejected' | null;
  /** When the ID image is auto-deleted (30 days after decision). null until decided. */
  deleteAtMs: number | null; seed: true;
};
/** ID photos: only Ops staff may call. Returns a short-lived signed URL; never cached or logged. */
export type IdPhotoAccess = { verificationId: string; signedUrl: string | null; expiresInSec: number };

export type EscalationKind = 'split_vote' | 'ai_severe' | 'appeal';
export type Escalation = {
  id: string; kind: EscalationKind; label: string; preview: string; source: string; votes: string; dueInHours: number | null;
  actions: string[]; resolved: string | null; campus: string; seed: true;
};
export type AnonLookupResult = { escalationId: string; reveal: string; auditId: string };

export type OpsUser = { id: string; handle: string; campus: string; strikeDatesMs: number[]; status: string; seed: true };
export type OpsUserRow = OpsUser & { activeStrikes: number; outcome: 'warning' | 'mute_24h' | 'ban_7d' | 'removed' | null };

export type GateCheckKey = 'retention' | 'actives' | 'legal' | 'ca';
export type OpsCampus = {
  id: string; name: string; status: string; domain: string | null; verified: number; waves: { 1: boolean; 2: boolean; 3: boolean; 4: boolean };
  mods: { have: number; of: number }; noticeAccount: string; seededNotes: number;
  gate: {
    day7RetentionPct: number; weeklyActives: number; legalSignoff: boolean; caSignoff: boolean;
    /** Owner decision pending: null keeps wave 3 closed. */
    minDay7RetentionPct: number | null; minWeeklyActives: number | null;
  };
  gateResult: { open: boolean; checks: { key: GateCheckKey; ok: boolean; note?: string }[] };
  seed: true;
};

export type OpsRoleRow = { id: string; person: string; role: string; scope: string; grantedBy: string; seed: true };
export type RadarSpot = { id: string; name: string; category: string; hours: string; crowdOverride: string; photos: number; seed: true };
export type BrandReviewItem = { id: string; item: string; type: string; policyCheck: string; funding: string; decisions: string[]; decided: string | null; seed: true };
export type AuditEntry = { id: string; atMs: number; actor: string; action: string; reason: string; seed: boolean };

export interface CrewOpsApi {
  // ---- Crew HQ. Callers: club lead / coordinator of that club (permission per CH3). RLS: club_id scoped; fund fields lead only. ----
  crewClubs(): Promise<CrewClub[]>;
  crewDashboard(clubId: string): Promise<CrewDashboard>;
  /** Lead or coordinator. Writes audit_log. */
  crewMembers(clubId: string): Promise<MembersView>;
  crewDecideJoin(clubId: string, memberId: string, decision: 'approve' | 'decline'): Promise<ActionResult>;
  crewChangeRole(clubId: string, memberId: string, role: CrewHqRole): Promise<ActionResult>;
  crewRemoveMember(clubId: string, memberId: string): Promise<ActionResult>;
  crewRoles(clubId: string): Promise<RolesView>;
  /** Lead only. */
  crewSetPermission(clubId: string, permissionId: string, who: 'coordinator' | 'member', value: 'yes' | 'no' | 'view'): Promise<ActionResult>;
  crewEvents(clubId: string): Promise<EventsView>;
  /** Lead (paid) or lead/coordinator (free). Server validates, computes ticket pricing, and rejects paid before wave 3. */
  crewCreateEvent(clubId: string, draft: EventDraftInput): Promise<CreateEventResult>;
  /** Pricing preview for the create form (server computed). */
  crewPriceTicket(pricePaise: number): Promise<TicketPricing>;
  /** Host publishes results; they then appear on attendees' profiles. Lead only. */
  crewPublishResults(clubId: string, eventId: string): Promise<ActionResult>;
  crewCheckIn(clubId: string, eventId: string): Promise<CheckInView>;
  /** Scanner volunteers (signed in with a scanner link). RLS: only tickets of that event; secrets never reach other clients. */
  scannerRoster(eventId: string): Promise<ScannerRoster>;
  /** Syncs scans made online or offline. Earliest scan per ticket wins; repeats are duplicates. */
  scannerSync(eventId: string, scans: ScanInput[]): Promise<SyncScansResult>;
  crewTasks(clubId: string): Promise<TasksView>;
  crewMoveTask(clubId: string, taskId: string, status: CrewHqTaskStatus): Promise<ClubTask>;
  crewPosts(clubId: string): Promise<PostsView>;
  /** Campus notices need lead approval. */
  crewCreatePost(clubId: string, input: CrewHqPostInput): Promise<CrewHqPost>;
  crewSetPinned(clubId: string, postId: string, pinned: boolean): Promise<CrewHqPost>;
  crewSection(clubId: string, section: CrewSectionId): Promise<CrewSection>;
  /** Generic row action for CH8-CH12 and CH1 alerts. Always writes audit_log. */
  crewRunAction(clubId: string, rowId: string, action: string): Promise<ActionResult>;

  // ---- Ops. Callers: Bunk3d ops staff only (role ops_mod / ops_admin, 2FA). Every write appends audit_log. ----
  opsVerifications(): Promise<VerificationItem[]>;
  opsIdPhoto(verificationId: string): Promise<IdPhotoAccess>;
  opsDecideVerification(id: string, decision: 'approve' | 'reject', reason?: string): Promise<VerificationItem>;
  opsEscalations(): Promise<Escalation[]>;
  opsResolveEscalation(id: string, action: string): Promise<Escalation>;
  /** Reason is required. Staff only; the lookup itself is logged. Never callable by mods, clubs or colleges. */
  opsAnonLookup(escalationId: string, reason: string): Promise<AnonLookupResult>;
  opsUsers(): Promise<OpsUserRow[]>;
  opsAddStrike(userId: string): Promise<OpsUserRow>;
  opsLiftMute(userId: string): Promise<OpsUserRow>;
  opsPermanentBan(userId: string): Promise<OpsUserRow>;
  opsCampuses(): Promise<OpsCampus[]>;
  /** Turning wave 3 on is refused unless the gate is open. */
  opsSetWave(campusId: string, wave: 1 | 2 | 3 | 4, on: boolean): Promise<{ ok: true; campus: OpsCampus } | { ok: false; reason: string }>;
  opsSetSignoff(campusId: string, kind: 'legal' | 'ca', value: boolean): Promise<OpsCampus>;
  opsAssignCampusMod(campusId: string): Promise<OpsCampus>;
  opsRoles(): Promise<OpsRoleRow[]>;
  opsAssignRole(input: { person: string; role: string; scope: string }): Promise<OpsRoleRow>;
  opsRevokeRole(id: string): Promise<void>;
  opsSpots(): Promise<RadarSpot[]>;
  opsSaveSpot(spot: Omit<RadarSpot, 'seed' | 'id'> & { id?: string }): Promise<RadarSpot>;
  opsBrandReview(): Promise<BrandReviewItem[]>;
  opsDecideBrand(id: string, decision: string): Promise<BrandReviewItem>;
  /** Append-only: there is deliberately no update or delete method. */
  opsAuditLog(): Promise<AuditEntry[]>;
}
