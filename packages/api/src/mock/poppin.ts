import { priceTicket, teamHasRoom, teamReady, ticketQrPayload, ticketRefundPaise, verifyTicketQr, parseTicketQr, TEAM_MAX, TEAM_MIN } from '@bunk3d/core';
import type {
  Attendee, Certificate, CheckinResult, EventDetail, EventResults, EventSummary, EventWhen, OfflineCheckin, PayMethod, PoppinApi, Quote, Team,
  TeamMember, TeamResult, Ticket,
} from '../contract';
import type { MockCtx } from './ctx';
import { SEED_EVENTS, SEED_NAMES } from './seed-poppin';

// SEED DATA lives in seed-poppin.ts, flagged `seed: true`. Mock only.
const DAY = 86_400_000;
const HOUR = 3_600_000;
const HOLD_MS = 10 * 60_000;

type Ev = {
  id: string; title: string; hostName: string; category: EventSummary['category']; startsAt: number; endsAt: number; doorsAt: number; rsvpBy: number; venue: string;
  tint: EventSummary['tint']; pricePaise?: number; capacity: number | null; baseGoing: number; friends: number; friendNames: string[]; team: boolean;
  description: string; rules: string; waitlistBase: number; cancelled: boolean; resultsPublished: boolean; hostClubId: string | null; seed?: true;
};
type Tk = { id: string; eventId: string; holderName: string; mine: boolean; teamName?: string; secret: string; status: Ticket['status']; paidPaise?: number; checkedInAt?: number };
type TeamRow = { id: string; eventId: string; name: string; code: string; captainUsername: string; registered: boolean; members: { username: string; name: string; status: 'captain' | 'accepted' | 'invited'; invitedAt: number; me: boolean }[] };
type ResultRow = { placements: { place: number; teamName: string; membersLabel: string; ticketIds: string[]; project?: string }[]; ofTeams: number; certificateTitle?: string; signedBy?: string; verifyCode: string };

export function createPoppin(ctx: MockCtx, opts: { failPayments?: boolean } = {}): PoppinApi {
  const sod = new Date(ctx.now());
  const today0 = new Date(sod.getFullYear(), sod.getMonth(), sod.getDate()).getTime();
  let n = 0;
  const id = (p: string) => `${p}-${++n}`;

  const events: Ev[] = SEED_EVENTS.map((s) => ({
    id: s.id, title: s.title, hostName: s.hostName, category: s.category, startsAt: today0 + s.startDay * DAY + s.startHour * HOUR, endsAt: today0 + s.endDay * DAY + s.endHour * HOUR,
    doorsAt: today0 + s.startDay * DAY + (s.startHour - 0.5) * HOUR, rsvpBy: today0 + (s.startDay - 1) * DAY, venue: s.venue, tint: s.tint, pricePaise: s.paidPaise, capacity: s.capacity,
    baseGoing: s.going, friends: s.friends, friendNames: s.friendNames, team: s.team, description: s.description, rules: s.rules, waitlistBase: s.waitlist, cancelled: !!s.cancelled,
    resultsPublished: !!s.results, hostClubId: null, seed: true,
  }));
  const tickets: Tk[] = [];
  // Fake attendees so the scanner and attendee list have rows. Seed.
  for (const e of events) {
    if (e.cancelled) continue;
    SEED_NAMES.forEach((name, i) => tickets.push({ id: `tk-${e.id}-s${i}`, eventId: e.id, holderName: name, mine: false, secret: `seed-secret-${e.id}-${i}`, status: 'valid' }));
  }
  // The signed-in user's seeded history: used a ticket at the past hackathon, held one for the event that was cancelled.
  tickets.push({ id: 'tk-hack1-me', eventId: 'ev-hack1', holderName: '', mine: true, teamName: 'Samosa Stack', secret: 'seed-secret-me-hack1', status: 'used', checkedInAt: today0 - 9 * DAY + 18.5 * HOUR });
  tickets.push({ id: 'tk-build7-me', eventId: 'ev-build7', holderName: '', mine: true, secret: 'seed-secret-me-build7', status: 'cancelled' });

  const results = new Map<string, ResultRow>();
  results.set('ev-hack1', {
    placements: [
      { place: 1, teamName: 'Byte Me', membersLabel: 'Rhea N. +2', ticketIds: [] },
      { place: 2, teamName: 'Samosa Stack', membersLabel: '%ME% +1', ticketIds: ['tk-hack1-me'], project: 'QueueLess canteen pre-order' },
      { place: 3, teamName: 'Null Pointers', membersLabel: 'Kabir M. +3', ticketIds: [] },
    ],
    ofTeams: 31, certificateTitle: 'Certificate of merit', signedBy: 'GDG Atria', verifyCode: 'GDG-31-0207',
  });
  const certificates: Certificate[] = [];
  const ratings = new Map<string, number>();
  const waitlisted = new Set<string>();
  const holds = new Map<string, number>();
  const teams: TeamRow[] = [
    { id: 'team-byte', eventId: 'ev-hack2', name: 'Byte Me', code: 'RBX907', captainUsername: 'rhea.n', registered: false, members: [
      { username: 'rhea.n', name: 'Rhea Nair', status: 'captain', invitedAt: 0, me: false }, { username: 'vikram.p', name: 'Vikram Patil', status: 'accepted', invitedAt: 0, me: false },
    ] },
    { id: 'team-samosa', eventId: 'ev-hack1', name: 'Samosa Stack', code: 'SMSA42', captainUsername: '@me', registered: true, members: [
      { username: '@me', name: '', status: 'captain', invitedAt: 0, me: true }, { username: 'kabir.m', name: 'Kabir Mehta', status: 'accepted', invitedAt: 0, me: false },
    ] },
  ];
  const certForSeed = () => {
    if (!certificates.some((c) => c.id === 'cert-hack1')) {
      const r = results.get('ev-hack1')!;
      certificates.push({ id: 'cert-hack1', eventId: 'ev-hack1', eventTitle: 'Hack the Canteen', title: r.certificateTitle!, issuedBy: r.signedBy!, verifyCode: r.verifyCode, issuedAt: today0 - 8 * DAY + 12 * HOUR, seed: true });
    }
  };
  certForSeed();

  const myName = () => ctx.profile?.name ?? 'You';
  const myUser = () => (ctx.profile?.username ? `@${ctx.profile.username.replace(/^@/, '')}` : '@me');
  const myTicket = (eventId: string) => tickets.find((t) => t.eventId === eventId && t.mine);
  const holderName = (t: Tk) => (t.mine ? myName() : t.holderName);
  const ev = (eventId: string) => events.find((e) => e.id === eventId);
  // Seeded base counts already include the seeded past ticket; add the user's own live tickets.
  const goingCount = (e: Ev) => e.baseGoing + tickets.filter((t) => t.eventId === e.id && t.mine && t.id !== 'tk-hack1-me' && (t.status === 'valid' || t.status === 'used')).length;
  const whenOf = (e: Ev): EventWhen => (e.endsAt < ctx.now() ? 'past' : e.startsAt < ctx.now() + 7 * DAY ? 'week' : 'upcoming');
  const placeOf = (e: Ev): number | undefined => {
    const r = results.get(e.id);
    const mine = myTicket(e.id);
    return r && mine ? r.placements.find((p) => p.ticketIds.includes(mine.id))?.place : undefined;
  };

  const refreshTeams = () => {
    for (const t of teams) for (const m of t.members) if (m.status === 'invited' && ctx.now() - m.invitedAt >= 3000) m.status = 'accepted';
  };
  const teamOf = (e: Ev) => teams.find((t) => t.eventId === e.id && t.members.some((m) => m.me));

  const summary = (e: Ev): EventSummary => {
    const going = goingCount(e);
    const when = whenOf(e);
    const mine = myTicket(e.id);
    const status: EventSummary['status'] = e.cancelled ? 'cancelled' : when === 'past' ? 'ended' : e.capacity !== null && going >= e.capacity ? 'full' : 'open';
    const my: EventSummary['my'] = mine && (mine.status === 'valid' || mine.status === 'used') ? 'going' : waitlisted.has(e.id) ? 'waitlist' : teamOf(e) && !teamOf(e)!.registered ? 'team_pending' : 'none';
    return {
      id: e.id, title: e.title, hostName: e.hostName, hostVerified: true, category: e.category, startsAt: e.startsAt, endsAt: e.endsAt, venue: e.venue, tint: e.tint,
      ticketKind: e.pricePaise ? 'paid' : 'free', ...(e.pricePaise ? { pricePaise: e.pricePaise } : {}), capacity: e.capacity, goingCount: going, friendsGoing: e.friends, when, status,
      teamEvent: e.team, resultsPublished: e.resultsPublished, my, ...(placeOf(e) ? { myPlace: placeOf(e) } : {}),
      ...(my === 'waitlist' ? { waitlistPosition: e.waitlistBase + 1 } : {}), ...(e.seed ? { seed: true as const } : {}),
    };
  };
  const detail = (e: Ev): EventDetail => {
    const mine = myTicket(e.id);
    const names = e.friendNames;
    const friendsLabel = names.length === 0 ? '' : names.length === 1 ? `${names[0]} is going` : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} are going`;
    return {
      ...summary(e), hostClubId: e.hostClubId, description: e.description, rules: e.rules, rsvpBy: e.rsvpBy, doorsAt: e.doorsAt,
      friendInitials: names.map((x) => x.slice(0, 1) + (SEED_NAMES.find((f) => f.startsWith(x))?.split(' ')[1]?.[0] ?? '')), friendsLabel,
      waitlistCount: e.waitlistBase + (waitlisted.has(e.id) ? 1 : 0), cancelledByHost: e.cancelled,
      ...(mine && mine.paidPaise ? { refundIfCancelledPaise: ticketRefundPaise({ totalPaise: mine.paidPaise, eventStartMs: e.startsAt, nowMs: ctx.now(), hostCancelled: e.cancelled }) } : {}),
      ...(mine ? { myTicketId: mine.id } : {}),
    };
  };
  const toTicket = (t: Tk): Ticket => {
    const e = ev(t.eventId)!;
    return {
      id: t.id, eventId: e.id, eventTitle: e.title, hostName: e.hostName, startsAt: e.startsAt, doorsAt: e.doorsAt, venue: e.venue, holderName: holderName(t), teamName: t.teamName, tint: e.tint,
      status: t.status, ...(t.paidPaise ? { paidPaise: t.paidPaise } : {}), qrSecret: t.secret, ...(e.seed ? { seed: true as const } : {}),
    };
  };
  const issue = (e: Ev, extra: Partial<Tk> = {}): Tk => {
    const old = myTicket(e.id);
    if (old) tickets.splice(tickets.indexOf(old), 1);
    const t: Tk = { id: id('tk'), eventId: e.id, holderName: '', mine: true, secret: `sec-${e.id}-${n}-${ctx.now() % 100000}`, status: 'valid', ...extra };
    tickets.push(t);
    return t;
  };
  const toTeam = (t: TeamRow): Team => {
    refreshTeams();
    const members: TeamMember[] = t.members.map((m) => ({
      initials: m.me ? myName().split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() : (m.name || m.username).replace(/[^a-zA-Z ]/g, ' ').trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase(),
      username: m.me ? myUser().slice(1) : m.username, name: m.me ? myName() : m.name || m.username, status: m.status, isMe: m.me,
    }));
    const accepted = t.members.filter((m) => m.status !== 'invited').length;
    return { id: t.id, eventId: t.eventId, name: t.name, code: t.code, captainIsMe: t.members.some((m) => m.me && m.status === 'captain'), members, acceptedCount: accepted, minSize: TEAM_MIN, maxSize: TEAM_MAX, ready: teamReady(accepted), registered: t.registered };
  };
  const placementLabel = (s: string) => s.replace('%ME%', myName().split(' ')[0] + ' ' + (myName().split(' ')[1]?.[0] ? myName().split(' ')[1][0] + '.' : ''));

  const buildResults = (e: Ev): EventResults => {
    const r = results.get(e.id);
    if (!r || !e.resultsPublished) return { eventId: e.id, eventTitle: e.title, hostName: e.hostName, published: false, podium: [], myRating: ratings.get(e.id) ?? null };
    const mine = myTicket(e.id);
    const mp = mine ? r.placements.find((p) => p.ticketIds.includes(mine.id)) : undefined;
    return {
      eventId: e.id, eventTitle: e.title, hostName: e.hostName, published: true,
      ...(mp ? { myPlacement: { place: mp.place, teamName: mp.teamName, ofTeams: r.ofTeams, project: mp.project } } : {}),
      podium: r.placements.slice().sort((a, b) => a.place - b.place).map((p) => ({ place: p.place, teamName: p.teamName, membersLabel: placementLabel(p.membersLabel), project: p.project })),
      ...(mp && r.certificateTitle ? { certificate: { title: r.certificateTitle, signedBy: r.signedBy ?? e.hostName, verifyCode: r.verifyCode, addedToProfile: true } } : {}),
      myRating: ratings.get(e.id) ?? null,
    };
  };

  const checkin = (e: Ev, payload: string, nowMs: number): CheckinResult => {
    const p = parseTicketQr(payload);
    if (!p) return { ok: false, reason: 'malformed' };
    const t = tickets.find((x) => x.id === p.ticketId);
    if (!t) return { ok: false, reason: 'unknown_ticket', ticketId: p.ticketId };
    if (t.eventId !== e.id) return { ok: false, reason: 'wrong_event', ticketId: t.id, holderName: holderName(t) };
    const q = verifyTicketQr({ payload, secretOf: (tid) => tickets.find((x) => x.id === tid)?.secret, nowMs });
    if (!q.ok) return { ok: false, reason: q.reason, ticketId: t.id, ...(q.expiredMinutes ? { expiredMinutes: q.expiredMinutes } : {}) };
    if (t.status === 'cancelled' || t.status === 'refunded') return { ok: false, reason: 'cancelled', ticketId: t.id, holderName: holderName(t) };
    if (t.status === 'used') return { ok: false, reason: 'already_checked_in', ticketId: t.id, holderName: holderName(t) };
    t.status = 'used';
    t.checkedInAt = nowMs;
    return { ok: true, ticketId: t.id, holderName: holderName(t), teamName: t.teamName };
  };

  const api: PoppinApi = {
    async events(q) {
      ctx.requireUser();
      await ctx.wait();
      return events.filter((e) => whenOf(e) === q.when && (!q.category || e.category === q.category)).sort((a, b) => (q.when === 'past' ? b.startsAt - a.startsAt : a.startsAt - b.startsAt)).map(summary);
    },
    async getEvent(eventId) { ctx.requireUser(); await ctx.wait(); const e = ev(eventId); return e ? detail(e) : null; },
    async rsvp(eventId) {
      ctx.requireUser();
      await ctx.wait();
      const e = ev(eventId);
      if (!e) throw new Error('not_found');
      if (e.cancelled) return { ok: false, reason: 'cancelled' };
      if (whenOf(e) === 'past') return { ok: false, reason: 'ended' };
      const mine = myTicket(eventId);
      if (waitlisted.has(eventId) || (mine && mine.status === 'valid')) return { ok: false, reason: 'already' };
      if (e.pricePaise) return { ok: false, reason: 'payment_required' };
      if (e.capacity !== null && goingCount(e) >= e.capacity) { waitlisted.add(eventId); return { ok: true, status: 'waitlist', position: e.waitlistBase + 1 }; }
      return { ok: true, status: 'going', ticketId: issue(e).id };
    },
    async cancelRsvp(eventId) {
      ctx.requireUser();
      await ctx.wait();
      const e = ev(eventId);
      if (!e) throw new Error('not_found');
      waitlisted.delete(eventId);
      const t = myTicket(eventId);
      if (!t || t.status !== 'valid') return { refundPaise: 0 };
      const refund = t.paidPaise ? ticketRefundPaise({ totalPaise: t.paidPaise, eventStartMs: e.startsAt, nowMs: ctx.now(), hostCancelled: e.cancelled }) : 0;
      t.status = refund > 0 ? 'refunded' : 'cancelled';
      return { refundPaise: refund };
    },
    async ticket(eventId) { ctx.requireUser(); await ctx.wait(); const t = myTicket(eventId); return t ? toTicket(t) : null; },
    async myTickets() {
      ctx.requireUser();
      await ctx.wait();
      return tickets.filter((t) => t.mine).map(toTicket).sort((a, b) => b.startsAt - a.startsAt);
    },
    async myCertificates() { ctx.requireUser(); await ctx.wait(); return [...certificates].sort((a, b) => b.issuedAt - a.issuedAt); },

    async quote(eventId): Promise<Quote | null> {
      ctx.requireUser();
      await ctx.wait();
      const e = ev(eventId);
      if (!e || !e.pricePaise || e.cancelled) return null;
      const holdExpiresAt = ctx.now() + HOLD_MS;
      holds.set(eventId, holdExpiresAt);
      return { eventId, eventTitle: e.title, startsAt: e.startsAt, venue: e.venue, hostName: e.hostName, hostVerified: true, price: priceTicket({ pricePaise: e.pricePaise, qty: 1 }), holdExpiresAt };
    },
    async pay(eventId, _method: PayMethod) {
      ctx.requireUser();
      await ctx.wait(700);
      const e = ev(eventId);
      if (!e || !e.pricePaise) throw new Error('not_found');
      const hold = holds.get(eventId);
      if (!hold || hold < ctx.now()) return { ok: false, reason: 'hold_expired' };
      if (opts.failPayments) return { ok: false, reason: 'payment_failed' };
      const existing = myTicket(eventId);
      if (existing && existing.status === 'valid') return { ok: true, ticketId: existing.id, paymentRef: `pay_${existing.id}`, paidPaise: existing.paidPaise ?? 0, provider: 'Razorpay' };
      const total = priceTicket({ pricePaise: e.pricePaise, qty: 1 }).totalPaise;
      const t = issue(e, { paidPaise: total });
      holds.delete(eventId);
      return { ok: true, ticketId: t.id, paymentRef: `pay_${t.id}`, paidPaise: total, provider: 'Razorpay' };
    },

    async myTeam(eventId) { ctx.requireUser(); await ctx.wait(); const e = ev(eventId); const t = e && teamOf(e); return t ? toTeam(t) : null; },
    async createTeam(eventId, name): Promise<TeamResult<Team>> {
      ctx.requireUser();
      await ctx.wait();
      const e = ev(eventId);
      if (!e || !e.team) return { ok: false, reason: 'not_team_event' };
      const nm = name.trim();
      if (nm.length < 2 || nm.length > 30) return { ok: false, reason: 'name' };
      if (teamOf(e)) return { ok: false, reason: 'already_in_team' };
      const letters = nm.replace(/[^a-zA-Z]/g, '').toUpperCase().padEnd(4, 'X').slice(0, 4);
      const t: TeamRow = { id: id('team'), eventId, name: nm, code: `${letters}${String(10 + (n % 90))}`, captainUsername: myUser(), registered: false, members: [{ username: myUser(), name: '', status: 'captain', invitedAt: 0, me: true }] };
      teams.push(t);
      return { ok: true, value: toTeam(t) };
    },
    async inviteToTeam(teamId, username): Promise<TeamResult<Team>> {
      ctx.requireUser();
      await ctx.wait(120);
      const t = teams.find((x) => x.id === teamId);
      if (!t) return { ok: false, reason: 'no_code' };
      if (!t.members.some((m) => m.me && m.status === 'captain')) return { ok: false, reason: 'not_captain' };
      const u = username.replace(/^@/, '').trim().toLowerCase();
      if (!/^[a-z0-9._]{3,20}$/.test(u) || t.members.some((m) => m.username === u) || u === myUser().slice(1).toLowerCase()) return { ok: false, reason: 'unknown_user' };
      if (!teamHasRoom(t.members.length)) return { ok: false, reason: 'full' };
      t.members.push({ username: u, name: u, status: 'invited', invitedAt: ctx.now(), me: false });
      return { ok: true, value: toTeam(t) };
    },
    async lookupTeamCode(code) {
      ctx.requireUser();
      await ctx.wait(120);
      const t = teams.find((x) => x.code === code.trim().toUpperCase() && !x.members.some((m) => m.me));
      if (!t) return null;
      return { name: t.name, captainName: t.members.find((m) => m.status === 'captain')?.name || 'Captain', memberCount: t.members.length, maxSize: TEAM_MAX, spotsOpen: TEAM_MAX - t.members.length };
    },
    async joinTeam(code): Promise<TeamResult<{ ticketId: string }>> {
      ctx.requireUser();
      await ctx.wait();
      const t = teams.find((x) => x.code === code.trim().toUpperCase());
      if (!t) return { ok: false, reason: 'no_code' };
      const e = ev(t.eventId)!;
      if (teamOf(e)) return { ok: false, reason: 'already_in_team' };
      if (!teamHasRoom(t.members.length)) return { ok: false, reason: 'full' };
      if (e.pricePaise) return { ok: false, reason: 'payment_required' };
      t.members.push({ username: myUser(), name: '', status: 'accepted', invitedAt: 0, me: true });
      return { ok: true, value: { ticketId: issue(e, { teamName: t.name }).id } };
    },
    async registerTeam(teamId) {
      ctx.requireUser();
      await ctx.wait();
      const t = teams.find((x) => x.id === teamId);
      if (!t) throw new Error('not_found');
      if (!t.members.some((m) => m.me && m.status === 'captain')) return { ok: false, reason: 'not_captain' };
      if (!toTeam(t).ready) return { ok: false, reason: 'not_ready' };
      const e = ev(t.eventId)!;
      if (e.pricePaise) return { ok: false, reason: 'payment_required' };
      t.registered = true;
      return { ok: true, ticketId: issue(e, { teamName: t.name }).id };
    },

    async results(eventId) { ctx.requireUser(); await ctx.wait(); const e = ev(eventId); return e ? buildResults(e) : null; },
    async rateEvent(eventId, stars) { ctx.requireUser(); await ctx.wait(80); if (stars >= 1 && stars <= 5) ratings.set(eventId, Math.round(stars)); },

    host: {
      async listEvents() {
        await ctx.wait();
        return events.map((e) => ({ ...summary(e), attendeeCount: goingCount(e), checkedInCount: tickets.filter((t) => t.eventId === e.id && t.status === 'used').length, waitlistCount: e.waitlistBase + (waitlisted.has(e.id) ? 1 : 0) }));
      },
      async getEvent(eventId) { await ctx.wait(); const e = ev(eventId); return e ? detail(e) : null; },
      async createEvent(i) {
        await ctx.wait(300);
        if (i.title.trim().length < 3) return { ok: false, reason: 'title' };
        if (i.endsAt <= i.startsAt) return { ok: false, reason: 'time' };
        if (i.ticketKind === 'paid' && !(i.pricePaise && i.pricePaise > 0)) return { ok: false, reason: 'price' };
        if (i.capacity !== null && i.capacity < 1) return { ok: false, reason: 'capacity' };
        const e: Ev = {
          id: id('ev'), title: i.title.trim(), hostName: 'Your club', category: i.category, startsAt: i.startsAt, endsAt: i.endsAt, doorsAt: i.doorsAt ?? i.startsAt - HOUR / 2,
          rsvpBy: i.rsvpBy ?? i.startsAt, venue: i.venue, tint: 'lime', pricePaise: i.ticketKind === 'paid' ? i.pricePaise : undefined, capacity: i.capacity, baseGoing: 0, friends: 0,
          friendNames: [], team: i.teamEvent, description: i.description, rules: i.rules ?? '', waitlistBase: 0, cancelled: false, resultsPublished: false, hostClubId: i.hostClubId ?? null,
        };
        events.push(e);
        return { ok: true, id: e.id };
      },
      async cancelEvent(eventId) {
        await ctx.wait(200);
        const e = ev(eventId);
        if (!e) throw new Error('not_found');
        e.cancelled = true;
        let refunded = 0;
        for (const t of tickets) {
          if (t.eventId !== eventId || t.status !== 'valid') continue;
          if (t.paidPaise) { t.status = 'refunded'; refunded += 1; } else t.status = 'cancelled';
        }
        waitlisted.delete(eventId);
        return { refundedCount: refunded };
      },
      async attendees(eventId): Promise<Attendee[]> {
        await ctx.wait();
        return tickets.filter((t) => t.eventId === eventId).map((t) => ({
          ticketId: t.id, name: holderName(t), initials: holderName(t).split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase(), teamName: t.teamName,
          status: t.status === 'used' ? 'checked_in' : t.status === 'valid' ? 'going' : 'cancelled', checkedInAt: t.checkedInAt,
        }));
      },
      async checkinSnapshot(eventId) {
        await ctx.wait();
        return {
          eventId, takenAtMs: ctx.now(),
          tickets: tickets.filter((t) => t.eventId === eventId && (t.status === 'valid' || t.status === 'used')).map((t) => ({ ticketId: t.id, secret: t.secret, holderName: holderName(t), teamName: t.teamName, checkedIn: t.status === 'used' })),
        };
      },
      async verifyCheckin(eventId, payload, nowMs) {
        await ctx.wait(100);
        const e = ev(eventId);
        if (!e) throw new Error('not_found');
        return checkin(e, payload, nowMs ?? ctx.now());
      },
      async syncCheckins(eventId, records: OfflineCheckin[]) {
        await ctx.wait(200);
        const e = ev(eventId);
        if (!e) throw new Error('not_found');
        return [...records].sort((a, b) => a.scannedAtMs - b.scannedAtMs).map((r) => checkin(e, r.payload, r.scannedAtMs));
      },
      async publishResults(eventId, input) {
        await ctx.wait(300);
        const e = ev(eventId);
        if (!e) throw new Error('not_found');
        if (whenOf(e) !== 'past' && !e.cancelled) return { ok: false, reason: 'not_ended' };
        if (input.placements.length === 0 || input.ofTeams < input.placements.length) return { ok: false, reason: 'invalid' };
        const code = `${e.hostName.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()}-${input.ofTeams}-${String(1000 + n)}`;
        results.set(eventId, { placements: input.placements, ofTeams: input.ofTeams, certificateTitle: input.certificateTitle, signedBy: input.signedBy, verifyCode: code });
        e.resultsPublished = true;
        let issued = 0;
        if (input.certificateTitle) {
          for (const p of input.placements) for (const tid of p.ticketIds) {
            issued += 1;
            const t = tickets.find((x) => x.id === tid);
            if (t?.mine && !certificates.some((c) => c.eventId === eventId)) {
              certificates.push({ id: id('cert'), eventId, eventTitle: e.title, title: input.certificateTitle, issuedBy: input.signedBy ?? e.hostName, verifyCode: code, issuedAt: ctx.now() });
            }
          }
        }
        return { ok: true, certificatesIssued: issued };
      },
    },
  };
  return api;
}
