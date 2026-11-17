// Poppin' domain contract (E1-E3, E6, E8 wave 1; E7 paid checkout wave 3).
// Student methods are on `PoppinApi`. Web consoles (E4 create event, E5 scanner) use `PoppinApi.host`.
//
// Money: every amount is integer paise computed by the server with @bunk3d/core (`priceTicket`, `ticketRefundPaise`).
// Screens only display what is returned.
//
// WEB WORKER (E4 / E5): use `poppin.host.*` only. Host methods never call requireUser in the mock (console auth arrives
// in the backend phase). In the backend, RLS must allow them only to staff of the hosting club / college.
//   E4 create event  -> host.createEvent(input), host.listEvents()
//   E5 scanner       -> host.checkinSnapshot(eventId) once while online, then verify each scan LOCALLY with
//                       `verifyTicketQr` from @bunk3d/core (works offline), queue { payload, scannedAtMs } records and
//                       call host.syncCheckins(eventId, records) when back online. Online fallback: host.verifyCheckin.
//   attendees list   -> host.attendees(eventId)
//   publish results  -> host.publishResults(eventId, input), which also issues certificates to the winners' profiles.
//
// NOTE: console-crew-ops.ts (Crew HQ) has its own crewCreateEvent / scannerRoster / scannerSync over its own mock state.
// Those do NOT see student tickets. Use `poppin.host.*` when check-in must work against tickets students actually hold.
import type { TicketPrice } from '@bunk3d/core';

export type PoppinCategory = 'Tech' | 'Cultural' | 'Sports' | 'Workshop' | 'Fest';
export type EventWhen = 'week' | 'upcoming' | 'past';
export type TicketKind = 'free' | 'paid';
/** Caller's relation to an event. `team_pending` = in a team that is not registered yet. */
export type MyEventState = 'none' | 'going' | 'waitlist' | 'team_pending';

export type EventSummary = {
  id: string;
  title: string;
  hostName: string;
  hostVerified: boolean;
  category: PoppinCategory;
  startsAt: number;
  endsAt: number;
  venue: string;
  /** Cover colour name resolved by the UI. */
  tint: 'lime' | 'violet' | 'sky' | 'pink' | 'grey';
  ticketKind: TicketKind;
  /** Paid events only. Base price per ticket, paise. */
  pricePaise?: number;
  capacity: number | null;
  goingCount: number;
  friendsGoing: number;
  when: EventWhen;
  status: 'open' | 'full' | 'cancelled' | 'ended';
  teamEvent: boolean;
  resultsPublished: boolean;
  my: MyEventState;
  /** Past events with published results where the caller placed: "You placed 2nd". */
  myPlace?: number;
  /** Set when `my === 'waitlist'`. */
  waitlistPosition?: number;
  seed?: true;
};

export type EventDetail = EventSummary & {
  hostClubId: string | null;
  description: string;
  rules: string;
  rsvpBy: number;
  doorsAt: number;
  /** Up to 3 initials of friends going. */
  friendInitials: string[];
  friendsLabel: string;
  /** Number waiting, when full. */
  waitlistCount: number;
  /** Paid: the refund the caller would get if they cancelled now (core `ticketRefundPaise`). */
  refundIfCancelledPaise?: number;
  myTicketId?: string;
  cancelledByHost: boolean;
};

export type EventsQuery = { when: EventWhen; category?: PoppinCategory };

export type Ticket = {
  id: string;
  eventId: string;
  eventTitle: string;
  hostName: string;
  startsAt: number;
  doorsAt: number;
  venue: string;
  holderName: string;
  teamName?: string;
  tint: EventSummary['tint'];
  status: 'valid' | 'used' | 'cancelled' | 'refunded';
  paidPaise?: number;
  /**
   * Secret the phone uses to compute the rotating QR OFFLINE with core `ticketQrPayload`. Returned to the ticket owner
   * only (RLS: holder_id = auth.uid()); the client caches the ticket so it opens without a network.
   */
  qrSecret: string;
  seed?: true;
};

export type RsvpResult =
  | { ok: true; status: 'going'; ticketId: string }
  | { ok: true; status: 'waitlist'; position: number }
  | { ok: false; reason: 'payment_required' | 'cancelled' | 'ended' | 'already' };

export type Quote = {
  eventId: string;
  eventTitle: string;
  startsAt: number;
  venue: string;
  hostName: string;
  hostVerified: boolean;
  /** pricePaise, qty, subtotalPaise, platformFeePaise (5%), gstPaise (18% of the fee), totalPaise. */
  price: TicketPrice;
  /** Seat hold ends at this time (ms). */
  holdExpiresAt: number;
};
export type PayMethod = 'upi' | 'card' | 'netbanking';
export type PayResult =
  | { ok: true; ticketId: string; paymentRef: string; paidPaise: number; provider: 'Razorpay' }
  | { ok: false; reason: 'payment_failed' | 'hold_expired' | 'sold_out' };

export type TeamMember = { initials: string; username: string; name: string; status: 'captain' | 'accepted' | 'invited'; isMe: boolean };
export type Team = {
  id: string;
  eventId: string;
  name: string;
  code: string;
  captainIsMe: boolean;
  members: TeamMember[];
  /** Accepted members including the captain. */
  acceptedCount: number;
  minSize: number;
  maxSize: number;
  /** core `teamReady(acceptedCount)`. */
  ready: boolean;
  registered: boolean;
};
export type TeamPreview = { name: string; captainName: string; memberCount: number; maxSize: number; spotsOpen: number };
export type TeamResult<T> = { ok: true; value: T } | { ok: false; reason: 'name' | 'full' | 'unknown_user' | 'no_code' | 'already_in_team' | 'not_team_event' | 'not_captain' | 'payment_required' };

export type Placement = { place: number; teamName: string; membersLabel: string; project?: string };
export type EventResults = {
  eventId: string;
  eventTitle: string;
  hostName: string;
  published: boolean;
  myPlacement?: { place: number; teamName: string; ofTeams: number; project?: string };
  podium: Placement[];
  certificate?: { title: string; signedBy: string; verifyCode: string; addedToProfile: boolean };
  myRating: number | null;
};

export type Certificate = { id: string; eventId: string; eventTitle: string; title: string; issuedBy: string; verifyCode: string; issuedAt: number; seed?: true };

// ---- Host (web) ----
export type HostEventInput = {
  title: string;
  category: PoppinCategory;
  description: string;
  rules?: string;
  venue: string;
  startsAt: number;
  endsAt: number;
  doorsAt?: number;
  rsvpBy?: number;
  capacity: number | null;
  ticketKind: TicketKind;
  /** Required when paid, > 0 paise. */
  pricePaise?: number;
  teamEvent: boolean;
  hostClubId?: string;
};
export type HostCreateEventResult = { ok: true; id: string } | { ok: false; reason: 'title' | 'time' | 'price' | 'capacity' };

export type Attendee = {
  ticketId: string;
  name: string;
  initials: string;
  teamName?: string;
  status: 'going' | 'checked_in' | 'cancelled';
  checkedInAt?: number;
};
export type HostEvent = EventSummary & { attendeeCount: number; checkedInCount: number; waitlistCount: number };

export type CheckinSnapshot = {
  eventId: string;
  takenAtMs: number;
  /** Everything the scanner needs to verify offline. Staff only. */
  tickets: { ticketId: string; secret: string; holderName: string; teamName?: string; checkedIn: boolean }[];
};
export type CheckinResult =
  | { ok: true; ticketId: string; holderName: string; teamName?: string }
  | { ok: false; reason: 'malformed' | 'unknown_ticket' | 'bad_signature' | 'expired' | 'wrong_event' | 'already_checked_in' | 'cancelled'; ticketId?: string; expiredMinutes?: number; holderName?: string };
export type OfflineCheckin = { payload: string; scannedAtMs: number };

export type ResultsInput = {
  placements: { place: number; teamName: string; membersLabel: string; ticketIds: string[]; project?: string }[];
  ofTeams: number;
  /** Issue a certificate to every ticket in the placements. */
  certificateTitle?: string;
  signedBy?: string;
};

export interface PoppinHostApi {
  /** Staff of the hosting club / college. Events the console may manage. */
  listEvents(): Promise<HostEvent[]>;
  getEvent(eventId: string): Promise<EventDetail | null>;
  /** Staff. Paid needs pricePaise > 0; free ignores it. */
  createEvent(input: HostEventInput): Promise<HostCreateEventResult>;
  /** Staff. Cancelling refunds every paid ticket in full automatically and notifies attendees. */
  cancelEvent(eventId: string): Promise<{ refundedCount: number }>;
  /** Staff. RLS: staff of the host only; shows names, never phone/email/DOB. */
  attendees(eventId: string): Promise<Attendee[]>;
  /** Staff. Download once online; verify offline with core `verifyTicketQr({ payload, secretOf, nowMs })`. */
  checkinSnapshot(eventId: string): Promise<CheckinSnapshot>;
  /** Staff. Online check-in (the `verify_checkin` function). Marks the ticket used. */
  verifyCheckin(eventId: string, payload: string, nowMs?: number): Promise<CheckinResult>;
  /** Staff. Replays scans captured offline, judged at `scannedAtMs`. Idempotent: a repeat is `already_checked_in`. */
  syncCheckins(eventId: string, records: OfflineCheckin[]): Promise<CheckinResult[]>;
  /** Staff. Publishes results (shown in Poppin' > Past) and issues certificates to students' profiles. */
  publishResults(eventId: string, input: ResultsInput): Promise<{ ok: true; certificatesIssued: number } | { ok: false; reason: 'not_ended' | 'invalid' }>;
}

export interface PoppinApi {
  /** Public to signed-in users of the campus, including pending-verification users. */
  events(q: EventsQuery): Promise<EventSummary[]>;
  getEvent(eventId: string): Promise<EventDetail | null>;
  /**
   * Signed-in; pending-verification users MAY RSVP to public events. Free events only: paid returns `payment_required`
   * (go to checkout). Full events join the waitlist (a freed spot is held 2 hours, core WAITLIST_HOLD_MS).
   * Team events also accept a plain RSVP (individual ticket); a registered team replaces it with a team ticket.
   */
  rsvp(eventId: string): Promise<RsvpResult>;
  /** Cancel RSVP / leave waitlist. Paid: returns the refund from core `ticketRefundPaise` (full until 48h before). */
  cancelRsvp(eventId: string): Promise<{ refundPaise: number }>;

  /** Caller's ticket for an event. RLS: holder only. */
  ticket(eventId: string): Promise<Ticket | null>;
  /** Everything for Profile > Tickets (You worker). Newest event first. RLS: holder only. */
  myTickets(): Promise<Ticket[]>;
  /** For Profile (You worker): certificates issued to the caller. */
  myCertificates(): Promise<Certificate[]>;

  /** Wave 3. Prices the ticket with core `priceTicket` and holds a seat (10 minutes). Paid events only. */
  quote(eventId: string): Promise<Quote | null>;
  /** Wave 3. Razorpay order + capture in the backend; the mock simulates success. Never charges twice for one event. */
  pay(eventId: string, method: PayMethod): Promise<PayResult>;

  /** Team events. Free events skip checkout: `registerTeam` goes straight to a ticket. */
  myTeam(eventId: string): Promise<Team | null>;
  createTeam(eventId: string, name: string): Promise<TeamResult<Team>>;
  /** Captain only. Max 4 members (core TEAM_MAX). */
  inviteToTeam(teamId: string, username: string): Promise<TeamResult<Team>>;
  lookupTeamCode(code: string): Promise<TeamPreview | null>;
  /** Join with a code. On a free event this issues the ticket immediately. */
  joinTeam(code: string): Promise<TeamResult<{ ticketId: string }>>;
  /** Captain only. Needs >= 2 accepted members (core `teamReady`). Free: issues tickets; paid: `payment_required`. */
  registerTeam(teamId: string): Promise<{ ok: true; ticketId: string } | { ok: false; reason: 'not_ready' | 'payment_required' | 'not_captain' }>;

  /** Host-published results only. */
  results(eventId: string): Promise<EventResults | null>;
  rateEvent(eventId: string, stars: number): Promise<void>;

  host: PoppinHostApi;
}
