import {
  approximateLocation, canSendInvite, distanceMeters, exactSpotVisible, extendShare, inviteExpiresAt,
  inviteHoursLeft, inviteIsConcrete, inviteQuotaResetsAt, invitesLeft, isShareMinutes, minutesLeft, shareIsActive, spotRevealAt,
  startShare, INVITES_PER_DAY, type LocationShare,
} from '@bunk3d/core';
import type {
  CreateMeetupInput, DiscoverApi, InviteReply, JoinState, LocationShareState, MeetupDetail, MeetupSummary, MeetupVisibility,
  RadarCategory, RadarMap, RadarPin, ReceivedInvite, SentInvite, ShareTarget, SparkCard, SparkIntent, SparkPrefs, Spot,
} from '../contract';
import type { MockCtx } from './ctx';
import { SEED_CENTER, SEED_DECK, SEED_SPOTS, type SeedSpot } from './seed-discover';
import { personById } from './seed-people';

const MIN = 60_000;
const HOUR = 3_600_000;
const IST = 330 * MIN;
/** Mock only: how long the host takes to approve a join request. The real host decides. */
export const MOCK_APPROVE_AFTER_MS = 6_000;

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
function ist(ts: number) { return new Date(ts + IST); }
function hour12(d: Date) { const h = d.getUTCHours(); return `${h % 12 || 12}${d.getUTCMinutes() ? ':' + String(d.getUTCMinutes()).padStart(2, '0') : ''} ${h < 12 ? 'AM' : 'PM'}`; }
function dayLabel(ts: number, now: number) {
  const a = Math.floor((ts + IST) / 86_400_000), b = Math.floor((now + IST) / 86_400_000);
  return a === b ? 'TODAY' : a === b + 1 ? 'TOMORROW' : DAYS[ist(ts).getUTCDay()];
}
function whenLabel(startsAt: number, hours: number, now: number) {
  const s = hour12(ist(startsAt)), e = hour12(ist(startsAt + hours * HOUR));
  const start = s.slice(-2) === e.slice(-2) ? s.slice(0, -3) : s;
  return `${dayLabel(startsAt, now)} \u00b7 ${start}\u2013${e}`;
}
function shortWhen(startsAt: number, hours: number, now: number) {
  if (now >= startsAt && now < startsAt + hours * HOUR) return 'NOW';
  const s = ist(startsAt); const h = s.getUTCHours();
  return `${DAYS[s.getUTCDay()]} ${h % 12 || 12}${h < 12 ? 'A' : 'P'}`;
}
/** Next occurrence (after `now`) of a weekday at an India-time hour. */
function nextDay(now: number, dow: number, hourIst: number) {
  const base = Math.floor((now + IST) / 86_400_000) * 86_400_000 - IST + hourIst * HOUR;
  for (let i = 0; i < 8; i++) { const t = base + i * 86_400_000; if (t > now && ist(t).getUTCDay() === dow) return t; }
  return base + 7 * 86_400_000;
}

type Meetup = {
  id: string; title: string; description?: string; hostId: string; hostName: string; spotId: string; area: string; exactSpot: string;
  startsAt: number; durationHours: number; visibility: MeetupVisibility; max: number; tint: string;
  /** Approved people other than the caller. */
  goingInitials: { initials: string; tint: string }[];
  requests: Map<string, number>; me: JoinState; seed?: true;
};

type Invite = { id: string; fromId: string; plan: string; when: string; where: string; message?: string; sentAt: number; reply?: { kind: InviteReply; suggestedTime?: string }; meta: string; seed: true };
type Out = { id: string; toId: string; plan: string; when: string; sentAt: number; status: 'sent' | 'accepted' | 'suggested'; suggestedTime?: string; seed?: true };

const SHARE_TARGETS: ShareTarget[] = [
  { id: 'u_rhea', name: 'Rhea N.', initials: 'RN', tint: '#D4FF3A' },
  { id: 'u_kabir', name: 'Kabir M.', initials: 'KM', tint: '#B49CFF' },
  { id: 'squad_hack', name: 'Hack the Canteen squad (4)', initials: 'HC', tint: '#FF6B9A' },
];

// SEED DATA lives in seed-discover.ts and seed-people.ts, flagged `seed: true`. Mock only.
export function createDiscover(ctx: MockCtx): DiscoverApi {
  const now = () => ctx.now();
  const me = () => ctx.requireUser();
  let prefs: Omit<SparkPrefs, 'eligible'> = { discoverOn: false, intents: ['Friends', 'Study'], year: 'any', scope: 'campus', priority: 'anyone', pausedUntil: null };
  const done = new Set<string>();
  const savedSpots = new Set<string>();
  const myTags = new Set<string>();
  const sentAt: number[] = [];
  let nid = 1;

  const received: Invite[] = [
    { id: 'inv_a', fromId: 'u_nikhil', plan: 'Study sesh', when: 'Tmrw 4 PM', where: 'Library L2 pods · on campus', message: 'grinding DSA, need someone to keep me honest', sentAt: now() - 7 * HOUR, meta: '3rd yr ECE · Study', seed: true },
    { id: 'inv_b', fromId: 'u_kabir', plan: 'Open mic', when: 'Thu 7 PM', where: 'Lahe Lahe, Indiranagar · 14 km', message: 'bring your guitar', sentAt: now() - 26 * HOUR, meta: '3rd yr AIML · Hangouts', seed: true },
  ];
  const sent: Out[] = [
    { id: 'out_a', toId: 'u_sana', plan: 'Chai run', when: 'Today 5 PM', sentAt: now() - 30 * HOUR, status: 'sent', seed: true },
    { id: 'out_b', toId: 'u_arjun', plan: 'Football', when: 'Sat 11 AM', sentAt: now() - 32 * HOUR, status: 'accepted', seed: true },
  ];
  // Invites sent more than a day ago do not count against today's three.

  const meetups: Meetup[] = [
    { id: 'm_chai', title: 'Chai & Code', description: 'Bring a laptop and a bug. We fix things, someone buys chai.', hostId: 'u_rhea', hostName: 'GDG Atria', spotId: 'library-l2', area: 'Library L2', exactSpot: 'Library L2, pod 4', startsAt: now() - 10 * MIN, durationHours: 2, visibility: 'campus', max: 8, tint: '#D4FF3A', goingInitials: [{ initials: 'RN', tint: '#D4FF3A' }, { initials: 'KM', tint: '#B49CFF' }, { initials: 'SK', tint: '#FF6B9A' }, { initials: 'DR', tint: '#5CC8FF' }, { initials: 'MT', tint: '#FFB547' }], requests: new Map(), me: 'none', seed: true },
    { id: 'm_five', title: 'Sunday 5-a-side', hostId: 'u_arjun', hostName: 'Arjun P.', spotId: 'turf-5', area: 'Turf 5, Yelahanka', exactSpot: 'Turf 5, Yelahanka, pitch 2', startsAt: nextDay(now(), 0, 7), durationHours: 2, visibility: 'campus', max: 10, tint: '#5CC8FF', goingInitials: [{ initials: 'AP', tint: '#5CC8FF' }, { initials: 'DR', tint: '#5CC8FF' }, { initials: 'NV', tint: '#D4FF3A' }, { initials: 'MT', tint: '#FFB547' }, { initials: 'KM', tint: '#B49CFF' }, { initials: 'SK', tint: '#FF6B9A' }, { initials: 'RN', tint: '#D4FF3A' }], requests: new Map(), me: 'none', seed: true },
    { id: 'm_sketch', title: 'Sketch & sip', hostId: 'u_sana', hostName: 'Sana K.', spotId: 'third-wave', area: 'Third Wave, Hebbal', exactSpot: 'Third Wave, Hebbal, back patio', startsAt: nextDay(now(), 5, 17), durationHours: 2, visibility: 'campus', max: 8, tint: '#FFB547', goingInitials: [{ initials: 'SK', tint: '#FF6B9A' }, { initials: 'MT', tint: '#FFB547' }, { initials: 'RN', tint: '#D4FF3A' }, { initials: 'DR', tint: '#5CC8FF' }], requests: new Map(), me: 'none', seed: true },
  ];

  const spotById = (id: string) => { const s = SEED_SPOTS.find((x) => x.id === id); if (!s) throw new Error('Not found'); return s; };
  const km = (s: SeedSpot) => distanceMeters(SEED_CENTER, s) / 1000;
  const kmText = (s: SeedSpot) => (s.onCampus || km(s) < 0.4 ? 'on campus' : `${km(s).toFixed(1)} km`);

  function joinStateOf(m: Meetup): JoinState {
    if (m.hostId === me()) return 'approved';
    if (m.me === 'pending') {
      const at = m.requests.get(me()) ?? 0;
      if (now() - at >= MOCK_APPROVE_AFTER_MS) m.me = 'approved';
    }
    return m.me;
  }
  const goingCount = (m: Meetup) => m.goingInitials.length + (m.hostId === me() ? 1 : m.me === 'approved' ? 1 : 0);
  const summary = (m: Meetup): MeetupSummary => {
    const approval = m.visibility === 'campus' ? 'open to campus' : m.visibility === 'clubs' ? 'clubs only' : 'close connections';
    return { id: m.id, title: m.title, meta: `${m.area} · ${m.hostName} · ${approval}`, when: shortWhen(m.startsAt, m.durationHours, now()), going: goingCount(m) >= 8 && m.max >= 8 ? `${goingCount(m)}/${m.max}` : `${goingCount(m)} going`, tint: m.tint, seed: m.seed };
  };
  const live = () => meetups.filter((m) => now() < m.startsAt + m.durationHours * HOUR).sort((a, b) => a.startsAt - b.startsAt);

  // Location sharing
  let ghost = true;
  let share: LocationShare | null = null;
  let approx: { lat: number; lng: number } | null = null;
  const shareState = (): LocationShareState => {
    if (share && !shareIsActive(share, now())) { share = null; approx = null; }
    return {
      ghost,
      active: share ? { personIds: [...share.personIds], names: SHARE_TARGETS.filter((t) => share!.personIds.includes(t.id)).map((t) => t.name.split(' ')[0]), expiresAt: share.expiresAt, minutesLeft: minutesLeft(share, now()) } : null,
      approx,
    };
  };
  const eligible = () => ctx.getSession()?.verified === 'verified';
  const withEligible = (): SparkPrefs => ({ ...prefs, intents: [...prefs.intents], eligible: eligible() });
  const hasDiscover = () => prefs.discoverOn && eligible();

  return {
    async sparkPrefs() { await ctx.wait(60); me(); return withEligible(); },
    async updateSparkPrefs(patch) {
      await ctx.wait(80); me();
      const next = { ...prefs, ...patch };
      if (patch.discoverOn && !eligible()) next.discoverOn = false;
      prefs = next;
      return withEligible();
    },
    async sparkDeck(intent: SparkIntent) {
      await ctx.wait(120); me();
      if (!hasDiscover() || (prefs.pausedUntil && prefs.pausedUntil > now())) return [];
      return SEED_DECK[intent].filter((c) => !done.has(c.id)).map((c): SparkCard => ({ ...c, intent }));
    },
    async sparkPass(id) { await ctx.wait(40); done.add(id); },
    async sparkConnect(id) { await ctx.wait(100); if (!hasDiscover()) throw new Error('Discover is off'); done.add(id); return { ok: true as const }; },
    async inviteQuota() { await ctx.wait(40); me(); return { left: invitesLeft(sentAt, now()), limit: INVITES_PER_DAY, resetsAt: inviteQuotaResetsAt(now()) }; },
    async inviteSpots() { await ctx.wait(60); return SEED_SPOTS.filter((s) => s.category !== 'Hangouts' || s.id === 'lahe-lahe').slice(0, 3).map((s) => ({ id: s.id, name: s.name, meta: `${kmText(s)} · ${s.busyLabel.toLowerCase()}` })); },
    async sendInvite(input) {
      await ctx.wait(150); me();
      if (!hasDiscover()) return { ok: false as const, reason: 'off' as const };
      if (!inviteIsConcrete(input)) return { ok: false as const, reason: 'not_concrete' as const };
      if (!canSendInvite(sentAt, now())) return { ok: false as const, reason: 'limit' as const };
      const t = now();
      sentAt.push(t);
      sent.unshift({ id: `out_${nid++}`, toId: input.toId, plan: input.plan, when: input.time, sentAt: t, status: 'sent' });
      return { ok: true as const, left: invitesLeft(sentAt, t), expiresAt: inviteExpiresAt(t) };
    },
    async invites() {
      await ctx.wait(100); me();
      const t = now();
      return {
        received: received.filter((i) => inviteExpiresAt(i.sentAt) > t || i.reply).map((i): ReceivedInvite => {
          const p = personById(i.fromId)!;
          return { id: i.id, fromName: p.name, initials: p.initials, tint: p.tint, meta: i.meta, plan: i.plan, when: i.when, where: i.where, message: i.message, expiresAt: inviteExpiresAt(i.sentAt), hoursLeft: inviteHoursLeft(i.sentAt, t), reply: i.reply, seed: i.seed };
        }),
        sent: sent.map((o): SentInvite => {
          const p = personById(o.toId);
          const status = o.status === 'sent' && inviteExpiresAt(o.sentAt) <= t ? 'expired' : o.status;
          return { id: o.id, toName: p?.name ?? 'Student', initials: p?.initials ?? 'ST', tint: p?.tint ?? '#26262D', plan: o.plan, when: o.when, status, suggestedTime: o.suggestedTime, seed: o.seed };
        }),
      };
    },
    async respondInvite(id, reply, suggestedTime) {
      await ctx.wait(100); me();
      const i = received.find((x) => x.id === id);
      if (!i) throw new Error('Not found');
      if (i.reply) return;
      // A decline is silent: nothing about it is ever written to the sender's side.
      i.reply = { kind: reply, suggestedTime };
    },

    async radar(category: RadarCategory = 'All'): Promise<RadarMap> {
      await ctx.wait(120); me();
      const spots: RadarPin[] = SEED_SPOTS.map((s) => ({ id: s.id, category: s.category, name: s.name.split(',')[0], lat: s.lat, lng: s.lng, tint: s.tint, kind: 'spot', seed: true }));
      const mpins: RadarPin[] = live().map((m) => { const s = spotById(m.spotId); return { id: m.id, category: 'Meetups', name: `${m.title} · ${goingCount(m)}`, lat: s.lat + 0.0004, lng: s.lng + 0.0004, tint: '#D4FF3A', kind: 'meetup', seed: m.seed }; });
      const all = [...spots, ...mpins];
      return {
        center: SEED_CENTER,
        pins: category === 'All' ? all : all.filter((p) => p.category === category),
        meetups: live().map(summary),
        you: ghost ? null : approximateLocation(SEED_CENTER),
      };
    },
    async spot(id): Promise<Spot> {
      await ctx.wait(100); me();
      const s = spotById(id);
      return {
        id: s.id, name: s.name, category: s.catLabel,
        meta: [s.catLabel, kmText(s), s.hours, s.price].filter(Boolean).join(' · '),
        priceBand: s.price, hereNow: s.hereNow, busyLabel: s.busyLabel, busyNote: s.busyNote,
        deal: s.deal ? { title: s.deal, sponsored: true } : undefined,
        tags: s.tags.map(([label, n]) => { const mine = myTags.has(`${id}:${label}`); return { label, votes: n + (mine ? 1 : 0), mine }; }),
        saved: savedSpots.has(id),
        meetups: live().filter((m) => m.spotId === id).map(summary),
        seed: true,
      };
    },
    async saveSpot(id, saved) { await ctx.wait(40); if (saved) savedSpots.add(id); else savedSpots.delete(id); },
    async voteSpotTag(id, label, on) { await ctx.wait(40); const k = `${id}:${label}`; if (on) myTags.add(k); else myTags.delete(k); },
    async createMeetup(input: CreateMeetupInput) {
      await ctx.wait(150); me();
      if (!hasDiscover()) throw new Error('Discover is off');
      const s = spotById(input.spotId);
      const id = `m_${nid++}`;
      meetups.push({ id, title: input.title.trim() || 'Meetup', hostId: me(), hostName: ctx.profile?.name ?? 'You', spotId: s.id, area: s.name, exactSpot: s.name, startsAt: input.startsAt, durationHours: input.durationHours, visibility: input.visibility, max: Math.min(30, Math.max(2, input.max)), tint: '#D4FF3A', goingInitials: [], requests: new Map(), me: 'approved' });
      return { id };
    },
    async meetup(id): Promise<MeetupDetail> {
      await ctx.wait(100); me();
      const m = meetups.find((x) => x.id === id);
      if (!m) throw new Error('Not found');
      const joinState = joinStateOf(m);
      const isHost = m.hostId === me();
      const showExact = exactSpotVisible({ isHost, approved: joinState === 'approved', startsAt: m.startsAt, now: now() });
      const who = m.visibility === 'campus' ? 'Atria students · approval' : m.visibility === 'clubs' ? 'My clubs only' : 'Close connections';
      return {
        id: m.id, title: m.title, description: m.description, hostName: m.hostName, isHost,
        whenLabel: whenLabel(m.startsAt, m.durationHours, now()), startsAt: m.startsAt, area: m.area,
        // The exact spot is only ever included when the rule allows it.
        ...(showExact ? { exactSpot: m.exactSpot } : {}),
        revealsAt: spotRevealAt(m.startsAt), who, going: goingCount(m), max: m.max, goingInitials: m.goingInitials.slice(0, 5),
        joinState, chatOpen: joinState === 'approved', seed: m.seed,
      };
    },
    async requestJoinMeetup(id) {
      await ctx.wait(100); me();
      const m = meetups.find((x) => x.id === id);
      if (!m) throw new Error('Not found');
      if (m.me === 'none' && m.hostId !== me()) { m.me = 'pending'; m.requests.set(me(), now()); }
      return { joinState: joinStateOf(m) };
    },

    async locationSharing() { await ctx.wait(40); me(); return shareState(); },
    async shareTargets() { await ctx.wait(60); return SHARE_TARGETS; },
    async setGhost(on) { await ctx.wait(40); me(); ghost = on; return shareState(); },
    async startLocationShare(input) {
      await ctx.wait(120); const u = me();
      if (!isShareMinutes(input.minutes)) return { ok: false as const, reason: 'bad_duration' as const };
      const s = startShare(u, input.personIds, input.minutes, now());
      if (!s) return { ok: false as const, reason: 'nobody' as const };
      share = s;
      // The exact device position is rounded here and never kept.
      approx = approximateLocation(input.position ?? SEED_CENTER);
      return { ok: true as const, state: shareState() };
    },
    async extendLocationShare() { await ctx.wait(60); me(); if (share) share = extendShare(share, now()); return shareState(); },
    async stopLocationShare() { await ctx.wait(60); me(); share = null; approx = null; return shareState(); },
  };
}
