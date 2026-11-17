import {
  activeStrikeCount, formatPaise, computeTakeHome, idPhotoDeleteAtMs, ID_PHOTO_URL_TTL_SEC, mergeOfflineScans,
  priceTicket, QR_PERIOD_MS, strikeOutcome, validateEventDraft, wave3Gate,
} from '@bunk3d/core';
import type {
  ActionResult, AuditEntry, BrandReviewItem, CheckInView, ClubEvent, CrewHqPost, CrewHqRole, ClubTask, CrewAlert, CrewClub, CrewMember,
  CrewOpsApi, CrewSection, CrewSectionId, DetailRow, Escalation, OpsCampus, OpsRoleRow, OpsUser, OpsUserRow, Permission, RadarSpot,
  RosterTicket, ScanLogEntry, CrewHqTaskStatus, Tone, VerificationItem,
} from '../contract';
import type { MockCtx } from './ctx';

// ALL DATA BELOW IS SEED (seed: true). Names, counts and amounts are placeholders, never real figures.
const DAY = 86_400_000;
const HOUR = 3_600_000;

const row = (id: string, cells: string[], title: string, lines: [string, string][], actions: string[], highlight = false, note?: string): DetailRow => ({
  id,
  cells: cells.map((c): { text: string; tone: Tone } => {
    const t = ({ '!': 'warn', '+': 'ok', '-': 'err', '~': 'muted' } as const)[c.charAt(0) as '!'];
    return t ? { text: c.slice(1), tone: t } : { text: c, tone: 'plain' };
  }),
  title, lines, actions, highlight, note, seed: true,
});

export function createCrewOps(ctx: MockCtx): CrewOpsApi {
  const club: CrewClub = { id: 'club-seed-1', name: 'SEED Club One', campus: 'SEED Campus A', wave: 3, leadName: 'Seed Lead', seed: true };

  // ---------- audit log (append-only) ----------
  const audit: AuditEntry[] = [
    { id: 'au-1', atMs: ctx.now() - 3 * HOUR, actor: 'seed-ops-1', action: 'anon_lookup post#SEED-1', reason: 'report SEED-1 threat', seed: true },
    { id: 'au-2', atMs: ctx.now() - 4 * HOUR, actor: 'mods(2)', action: 'remove post#SEED-2', reason: 'rule 2 naming', seed: true },
    { id: 'au-3', atMs: ctx.now() - 5 * HOUR, actor: 'seed-owner', action: 'role_assign campus_mod', reason: 'trained (seed)', seed: true },
  ];
  let auditN = 4;
  const log = (actor: string, action: string, reason: string): string => {
    const id = `au-${auditN++}`;
    audit.unshift({ id, atMs: ctx.now(), actor, action, reason, seed: false });
    return id;
  };
  const ok = (message: string, action: string, actor = 'console-user'): ActionResult => ({ message, auditId: log(actor, action, message) });

  // ---------- Crew: members ----------
  let members: CrewMember[] = [
    { id: 'm1', name: 'Seed Applicant A', year: '2nd', branch: 'ECE', role: null, joined: null, status: 'requested', requestedDaysAgo: 2, note: 'Seed request note', seed: true },
    { id: 'm2', name: 'Seed Lead', year: '3rd', branch: 'CSE', role: 'lead', joined: 'Aug 2025', status: 'active', seed: true },
    { id: 'm3', name: 'Seed Member B', year: '2nd', branch: 'CSE', role: 'coordinator', joined: 'Sep 2025', status: 'active', seed: true },
    { id: 'm4', name: 'Seed Member C', year: '3rd', branch: 'AIML', role: 'member', joined: 'Jan 2026', status: 'active', seed: true },
    { id: 'm5', name: 'Seed Applicant D', year: '1st', branch: 'CSE', role: null, joined: null, status: 'requested', requestedDaysAgo: 1, seed: true },
  ];

  // ---------- Crew: permissions ----------
  const permissions: Permission[] = [
    { id: 'p1', label: 'Create events', lead: 'yes', coordinator: 'yes', member: 'no', note: 'Paid events: lead only', seed: true },
    { id: 'p2', label: 'Approve join requests', lead: 'yes', coordinator: 'yes', member: 'no', note: '', seed: true },
    { id: 'p3', label: 'Post as club', lead: 'yes', coordinator: 'yes', member: 'no', note: 'Campus notices: lead only', seed: true },
    { id: 'p4', label: 'See club fund', lead: 'yes', coordinator: 'view', member: 'no', note: 'Coordinator sees the balance only', seed: true },
    { id: 'p5', label: 'Hand over admin', lead: 'yes', coordinator: 'no', member: 'no', note: 'Needs college verification from wave 4. The new lead is only active once the college confirms them.', seed: true },
  ];

  // ---------- Crew: events ----------
  const t0 = ctx.now();
  const events: ClubEvent[] = [
    { id: 'ev-1', clubId: club.id, title: 'SEED Hack Night', category: 'Tech', startsAtMs: t0 + 5 * DAY, endsAtMs: t0 + 6 * DAY, venue: 'SEED Seminar Hall', capacity: 200, registered: 120, waitlist: 8, ticketType: 'paid', pricing: priceTicket({ pricePaise: 19900, qty: 1 }), collegeOk: 'pending', status: 'published', checkedIn: 0, seed: true },
    { id: 'ev-2', clubId: club.id, title: 'SEED Workshop', category: 'Workshop', startsAtMs: t0 + 8 * DAY, endsAtMs: t0 + 8 * DAY + 3 * HOUR, venue: 'SEED Lab', capacity: 80, registered: 60, waitlist: 5, ticketType: 'free', pricing: null, collegeOk: 'approved', status: 'published', checkedIn: 0, seed: true },
    { id: 'ev-3', clubId: club.id, title: 'SEED Results Night', category: 'Fest', startsAtMs: t0 - 2 * DAY, endsAtMs: t0 - 2 * DAY + 4 * HOUR, venue: 'SEED Amphitheatre', capacity: 300, registered: 90, waitlist: 0, ticketType: 'free', pricing: null, collegeOk: 'not_needed', status: 'published', checkedIn: 3, seed: true },
  ];
  let evSeq = 10;

  // ---------- Scanner state ----------
  const tickets: Omit<RosterTicket, 'eventTitle'>[] = [
    { ticketId: 'SEED-001', eventId: 'ev-3', holder: 'Seed Attendee One', checkedInAtMs: t0 - 2 * DAY, secret: 'seed-secret-1' },
    { ticketId: 'SEED-002', eventId: 'ev-3', holder: 'Seed Attendee Two', checkedInAtMs: null, secret: 'seed-secret-2' },
    { ticketId: 'SEED-003', eventId: 'ev-3', holder: 'Seed Attendee Three', checkedInAtMs: null, secret: 'seed-secret-3' },
    { ticketId: 'SEED-101', eventId: 'ev-1', holder: 'Seed Attendee Four', checkedInAtMs: null, secret: 'seed-secret-4' },
    { ticketId: 'SEED-201', eventId: 'ev-2', holder: 'Seed Attendee Five', checkedInAtMs: null, secret: 'seed-secret-5' },
  ];
  const scanLog: ScanLogEntry[] = [
    { id: 'sl-1', atMs: t0 - 2 * DAY, holder: 'Seed Attendee One', ticketId: 'SEED-001', result: 'checked_in', scannerName: 'Seed Scanner', seed: true },
  ];
  let scanSeq = 2;

  // ---------- Tasks, posts ----------
  const tasks: ClubTask[] = [
    { id: 't1', title: 'Book the seminar hall', meta: 'Seed Lead · due Fri', tag: '+60 XP', paid: false, status: 'todo', seed: true },
    { id: 't2', title: 'Run-of-show', meta: 'unassigned', tag: '+80 XP', paid: false, status: 'todo', seed: true },
    { id: 't3', title: 'Score-keeping, day 1', meta: 'Seed Member C', tag: 'Certificate', paid: false, status: 'in_progress', seed: true },
    { id: 't4', title: 'Help desk', meta: 'Seed Member B', tag: formatPaise(80_000), paid: true, status: 'in_progress', seed: true },
    { id: 't5', title: 'Design event posters', meta: 'Seed Member B · submitted', tag: formatPaise(100_000), paid: true, status: 'review', seed: true },
    { id: 't6', title: 'Workshop slides', meta: 'Seed Lead · done', tag: '+80 XP', paid: false, status: 'done', seed: true },
  ];
  const taskPaise: Record<string, number> = { t4: 80_000, t5: 100_000 };
  const posts: CrewHqPost[] = [
    { id: 'po1', title: 'Team lock closes Friday', where: 'Members chat · pinned', when: 'Today', reads: 'seed', audience: 'Members only', pinned: true, scheduled: false, seed: true },
    { id: 'po2', title: 'Workshop is live', where: 'Club page', when: 'Yesterday', reads: 'seed', audience: 'Public club page', pinned: false, scheduled: false, seed: true },
    { id: 'po3', title: 'Results night Sunday', where: 'Campus notice', when: 'Scheduled', reads: '-', audience: 'All students on campus', pinned: false, scheduled: true, needs: 'Lead approval', seed: true },
  ];
  let postSeq = 10;

  // ---------- CH8-CH12 sections (seed rows; money via core) ----------
  const clubGig = (pay: number) => computeTakeHome({ payPaise: pay, kind: 'club', lifetimeEarnedPaise: 5_000_00 });
  const sections: Record<CrewSectionId, Omit<CrewSection, 'locked' | 'lockMessage'>> = {
    quests: {
      id: 'quests', code: 'CH8', wave: 2, title: 'Quests', description: 'Enroll squads, set scoring and proof rules, review entries. Clubs are ranked, never people.', primary: '+ Create quest',
      kpis: [{ label: 'ACTIVE', value: '2', sub: 'seed' }, { label: 'ENTRIES TO REVIEW', value: '4', sub: 'seed' }, { label: 'CLUB XP', value: '4,820', sub: 'seed' }, { label: 'INTER-COLLEGE', value: 'seed', sub: 'clubs ranked, never people' }],
      cols: ['QUEST', 'PROOF', 'STATUS', 'REWARD'],
      rows: [
        row('q1', ['Seed meetup quest', '15 check-ins + photo', '!9 / 15', '+500 XP'], 'Seed meetup quest', [['Ends', 'In 2 days'], ['Squad', '4 members']], ['Submit milestone'], true),
        row('q2', ['Seed notes drop', 'Verified uploads', '~Not enrolled', '+300 XP'], 'Seed notes drop', [['Ends', 'seed date']], ['Enroll squad']),
        row('q3', ['Seed clean-up drive', 'Geotagged before/after', '~Not enrolled', '+800 XP'], 'Seed clean-up drive', [['Scope', 'Inter-college']], ['Enroll squad']),
      ],
    },
    gigs: {
      id: 'gigs', code: 'CH9', wave: 3, title: 'Club gigs', description: 'Paid roles for club events, funded from the club fund or a brand campaign. Funds are checked before publishing.', primary: '+ New gig',
      kpis: [{ label: 'LIVE GIGS', value: '3', sub: 'seed' }, { label: 'APPLICANTS', value: '17', sub: 'seed' }, { label: 'COMMITTED', value: formatPaise(260_000), sub: 'held in escrow' }, { label: 'STUDENT FEE', value: '2.5%', sub: 'club-gig rate' }],
      cols: ['GIG', 'FUNDED BY', 'PAY', 'APPLICANTS', 'STATUS'],
      rows: [
        row('g1', ['Seed poster design', 'Club fund', formatPaise(100_000), '5', '+Assigned'], 'Seed poster design', [['Escrow', `${formatPaise(100_000)} held`], ['Student takes home', `${formatPaise(clubGig(100_000).takeHomePaise)} after 2.5% fee and GST on the fee`]], ['Open work']),
        row('g2', ['Seed help desk x6', 'Club fund', `${formatPaise(80_000)} each`, '9', '!2 slots left'], 'Seed help desk', [['Slots', '4 of 6 filled'], ['Each student takes home', `${formatPaise(clubGig(80_000).takeHomePaise)} after 2.5% fee and GST on the fee`]], ['Review applicants', 'Close gig'], true),
        row('g3', ['Seed stall crew', 'Brand campaign', formatPaise(60_000), '3', '~Draft'], 'Seed stall crew', [['Funds check', 'Waiting on brand']], ['Publish']),
      ],
    },
    funds: {
      id: 'funds', code: 'CH10', wave: 3, title: 'Club funds', description: 'Money in and out, pending settlements, statements. View only. Finance releases payments.', primary: 'Download statement',
      kpis: [{ label: 'BALANCE', value: formatPaise(1_840_000), sub: 'available (seed)' }, { label: 'HELD', value: formatPaise(685_000), sub: 'escrow for gigs' }, { label: 'IN THIS MONTH', value: formatPaise(3_890_000), sub: 'tickets + brand' }, { label: 'OUT THIS MONTH', value: formatPaise(1_260_000), sub: 'gig payouts' }],
      cols: ['DATE', 'ENTRY', 'TYPE', 'AMOUNT', 'STATE'],
      rows: [
        row('f1', ['seed', 'Seed ticket sales', 'In', `+${formatPaise(3_681_400)}`, '+Settled'], 'Ticket sales', [['Gross', formatPaise(3_681_400)], ['Buyer fees', 'Paid by buyers']], ['View entries']),
        row('f2', ['seed', 'Seed poster payout', 'Out', `-${formatPaise(100_000)}`, '!Pending'], 'Gig payout', [['Hold', '7 days']], ['View gig']),
        row('f3', ['seed', 'Seed brand deposit', 'In', `+${formatPaise(210_000)}`, '+Settled'], 'Brand payment', [['MoU', 'SEED-MOU-1']], ['View MoU']),
      ],
    },
    collabs: {
      id: 'collabs', code: 'CH11', wave: 4, title: 'Brand collab inbox', description: 'Offers from brands, proposals you sent, negotiation, deliverables, MoU status, payout split.', primary: '+ Send proposal',
      kpis: [{ label: 'OFFERS', value: '3', sub: 'seed' }, { label: 'NEGOTIATING', value: '2', sub: 'seed' }, { label: 'MOU SIGNED', value: '1', sub: 'seed' }, { label: 'VALUE', value: 'seed', sub: 'open offers' }],
      cols: ['BRAND', 'ASK', 'OFFER', 'STATUS'],
      rows: [
        row('c1', ['SEED Brand A', 'Ambassadors + stall', formatPaise(4_200_000), '!Negotiating'], 'SEED Brand A', [['Brand verified', 'Yes (seed)'], ['College MoU needed', 'Yes']], ['Reply', 'Accept offer'], true),
        row('c2', ['SEED Brand B', 'Sampling day', formatPaise(2_500_000), '~New offer'], 'SEED Brand B', [['Brand verified', 'Yes (seed)']], ['Reply', 'Decline']),
        row('c3', ['SEED Brand C', 'Workshop sponsor', formatPaise(1_500_000), '+MoU signed'], 'SEED Brand C', [['Signed by', 'Club, college, brand']], ['View MoU']),
      ],
    },
    letters: {
      id: 'letters', code: 'CH12', wave: 4, title: 'Letter requests to college', description: 'Request OD letters, venue permission or sponsorship letters. Track status.', primary: '+ New request',
      kpis: [{ label: 'OPEN', value: '2', sub: 'seed' }, { label: 'ISSUED', value: '14', sub: 'seed' }, { label: 'AVG TIME', value: 'seed', sub: '' }, { label: 'REJECTED', value: '1', sub: 'seed' }],
      cols: ['LETTER', 'FOR', 'REQUESTED', 'STATUS'],
      rows: [
        row('l1', ['OD letter', 'SEED Hack Night', 'seed', '!With Dean office'], 'OD letter', [['Signatory', 'Dean of Students']], ['Nudge', 'Withdraw'], true),
        row('l2', ['Venue permission', 'SEED Seminar Hall', 'seed', '~Submitted'], 'Venue permission', [['Conflicts', 'None found']], ['Withdraw']),
        row('l3', ['Sponsorship letter', 'SEED Brand A', 'seed', '+Issued'], 'Sponsorship letter', [['Signed', 'Registrar']], ['Download PDF']),
      ],
    },
  };
  const lockMsg: Record<number, string> = { 4: `Wave 4 feature. ${club.campus} is in wave ${club.wave}. Shown as a preview; it goes live when the campus reaches wave 4.` };

  // ---------- Ops seed ----------
  const verifications: VerificationItem[] = [
    { id: 'v1', student: 'Seed Student A', campus: 'SEED Campus A', method: 'Student ID', waitingHours: 19, nameMatches: true, collegeMatches: true, dobYear: 2005, decidedAtMs: null, decision: null, deleteAtMs: null, seed: true },
    { id: 'v2', student: 'Seed Student B', campus: 'SEED Campus B', method: 'Student ID', waitingHours: 6, nameMatches: true, collegeMatches: true, dobYear: 2004, decidedAtMs: null, decision: null, deleteAtMs: null, seed: true },
    { id: 'v3', student: 'Seed Student C', campus: 'SEED Campus A', method: 'ID (no college email)', waitingHours: 2, nameMatches: false, collegeMatches: true, dobYear: 2006, decidedAtMs: null, decision: null, deleteAtMs: null, seed: true },
  ];
  const escalations: Escalation[] = [
    { id: 'x1', kind: 'split_vote', label: 'Anon post', preview: 'seed: post that may name a person', source: 'Split vote · SEED Campus A', votes: 'Remove 1 · Keep 1', dueInHours: 6, actions: ['Remove', 'Keep'], resolved: null, campus: 'SEED Campus A', seed: true },
    { id: 'x2', kind: 'ai_severe', label: 'Comment', preview: 'seed: threat comment', source: 'AI severe · blocked', votes: '-', dueInHours: 0, actions: ['Ban', 'Escalate legal'], resolved: null, campus: 'SEED Campus B', seed: true },
    { id: 'x3', kind: 'appeal', label: 'Appeal', preview: 'seed: removed note', source: 'Author appeal', votes: 'Removed 2-0', dueInHours: 60, actions: ['Uphold', 'Restore'], resolved: null, campus: 'SEED Campus A', seed: true },
  ];
  const users: OpsUser[] = [
    { id: 'u1', handle: '@seed.user.one', campus: 'SEED Campus A', strikeDatesMs: [t0 - 20 * DAY, t0 - 5 * DAY], status: 'Muted (seed)', seed: true },
    { id: 'u2', handle: '@seed.user.two', campus: 'SEED Campus B', strikeDatesMs: [t0 - 60 * DAY, t0 - 30 * DAY, t0 - 2 * DAY], status: '7-day ban (seed)', seed: true },
    { id: 'u3', handle: '@seed.user.three', campus: 'SEED Campus A', strikeDatesMs: [t0 - 120 * DAY], status: 'Clear (strike expired)', seed: true },
  ];
  const toUserRow = (u: OpsUser): OpsUserRow => {
    const n = activeStrikeCount(u.strikeDatesMs, ctx.now());
    return { ...u, activeStrikes: n, outcome: strikeOutcome(n) };
  };
  const campusBase = (c: Omit<OpsCampus, 'gateResult'>): OpsCampus => ({ ...c, gateResult: wave3Gate({ ...c.gate }) });
  let campuses: OpsCampus[] = [
    campusBase({ id: 'c1', name: 'SEED Campus A', status: 'Live', domain: 'campus-a.example', verified: 1200, waves: { 1: true, 2: true, 3: false, 4: false }, mods: { have: 11, of: 15 }, noticeAccount: 'Office of Students (seed)', seededNotes: 200,
      gate: { day7RetentionPct: 30, weeklyActives: 1000, legalSignoff: true, caSignoff: false, minDay7RetentionPct: null, minWeeklyActives: null }, seed: true }),
    campusBase({ id: 'c2', name: 'SEED Campus B', status: 'Live', domain: null, verified: 600, waves: { 1: true, 2: false, 3: false, 4: false }, mods: { have: 6, of: 15 }, noticeAccount: 'not agreed', seededNotes: 100,
      gate: { day7RetentionPct: 20, weeklyActives: 300, legalSignoff: false, caSignoff: false, minDay7RetentionPct: null, minWeeklyActives: null }, seed: true }),
  ];
  let roles: OpsRoleRow[] = [
    { id: 'r1', person: 'Seed Person A', role: 'Campus Mod', scope: 'campus: SEED Campus A', grantedBy: 'seed-owner · trained', seed: true },
    { id: 'r2', person: 'Seed Person A', role: 'Club admin', scope: 'club: SEED Club One', grantedBy: 'College HQ verified', seed: true },
    { id: 'r3', person: 'Seed Person B', role: 'College admin · signatory', scope: 'campus: SEED Campus A', grantedBy: 'ops · documents checked', seed: true },
    { id: 'r4', person: 'Seed Person C', role: 'Brand owner', scope: 'brand: SEED Brand A', grantedBy: 'OP7 verified', seed: true },
  ];
  let roleSeq = 10;
  let spots: RadarSpot[] = [
    { id: 's1', name: 'SEED Canteen', category: 'Chai & cafes', hours: '7 AM - 9 PM', crowdOverride: 'Auto (check-ins)', photos: 3, seed: true },
    { id: 's2', name: 'SEED Quad', category: 'Hangouts', hours: '6 AM - 10 PM', crowdOverride: 'Auto (check-ins)', photos: 1, seed: true },
  ];
  let spotSeq = 10;
  const brands: BrandReviewItem[] = [
    { id: 'b1', item: 'SEED Brand A · sampling week', type: 'Campaign', policyCheck: 'Category allowed · age-appropriate', funding: 'Held by partner (seed)', decisions: ['Approve', 'Request changes', 'Reject'], decided: null, seed: true },
    { id: 'b2', item: 'SEED Fantasy Co · ambassadors', type: 'Campaign', policyCheck: 'Betting / fantasy gaming: not allowed', funding: '-', decisions: ['Reject'], decided: null, seed: true },
    { id: 'b3', item: 'SEED Startup', type: 'Brand verification', policyCheck: 'GST + incorporation docs uploaded', funding: '-', decisions: ['Verify brand'], decided: null, seed: true },
  ];

  const withEvent = (id: string) => {
    const e = events.find((x) => x.id === id);
    if (!e) throw new Error('Event not found');
    return e;
  };

  return {
    // ================= Crew HQ =================
    async crewClubs() { await ctx.wait(); return [club]; },
    async crewDashboard(clubId) {
      await ctx.wait();
      const requested = members.filter((m) => m.status === 'requested');
      const alerts: CrewAlert[] = [
        row('al1', ['!Approval', `${events[0]!.title} venue needs college OK`, '2 days left', 'Request'], 'Venue approval pending',
          [['Event', events[0]!.title], ['Venue', events[0]!.venue], ['College status', 'Not requested']], ['Request approval', 'Snooze'], true, 'Club acceptance is not college permission'),
        row('al2', ['Requests', `${requested.length} students want to join`, 'oldest ' + Math.max(0, ...requested.map((m) => m.requestedDaysAgo ?? 0)) + 'd', 'Review'], `${requested.length} join requests`, [['Auto-approve', 'Off']], ['Review all']),
        row('al3', ['Tasks', 'A task is waiting review', 'today', 'Review'], 'Task in review', [['Task', tasks.find((t) => t.status === 'review')?.title ?? '-']], ['Open review']),
      ];
      return {
        club: { ...club, id: clubId }, members: members.filter((m) => m.status === 'active').length, membersThisWeek: 0,
        joinRequests: requested.length, oldestRequestDays: Math.max(0, ...requested.map((m) => m.requestedDaysAgo ?? 0)),
        openTasks: tasks.filter((t) => t.status !== 'done').length, tasksDueThisWeek: 0,
        fundBalancePaise: club.wave >= 3 ? 1_840_000 : null, alerts,
      };
    },
    async crewMembers() { await ctx.wait(); return { members: members.filter((m) => m.status !== 'removed').map((m) => ({ ...m })), inviteLink: { url: 'https://bunk3d.example/join/seed-invite', expiresInDays: 7 } }; },
    async crewDecideJoin(_c, id, decision) {
      await ctx.wait();
      const m = members.find((x) => x.id === id);
      if (!m || m.status !== 'requested') throw new Error('No such request');
      members = decision === 'approve'
        ? members.map((x) => (x.id === id ? { ...x, status: 'active' as const, role: 'member' as const, joined: 'this month' } : x))
        : members.map((x) => (x.id === id ? { ...x, status: 'removed' as const } : x));
      return ok(`${decision === 'approve' ? 'Approved' : 'Declined'} ${m.name}.`, `join_${decision}`);
    },
    async crewChangeRole(_c, id, role: CrewHqRole) {
      await ctx.wait();
      members = members.map((x) => (x.id === id ? { ...x, role } : x));
      return ok('Role changed.', 'role_change');
    },
    async crewRemoveMember(_c, id) {
      await ctx.wait();
      members = members.map((x) => (x.id === id ? { ...x, status: 'removed' as const } : x));
      return ok('Member removed.', 'member_remove');
    },
    async crewRoles() {
      await ctx.wait();
      const a = members.filter((m) => m.status === 'active');
      return { permissions: permissions.map((p) => ({ ...p })), leads: a.filter((m) => m.role === 'lead').length, maxLeads: 3, coordinators: a.filter((m) => m.role === 'coordinator').length, members: a.filter((m) => m.role === 'member').length, handoverEnabled: club.wave >= 4 };
    },
    async crewSetPermission(_c, pid, who, value) {
      await ctx.wait();
      const p = permissions.find((x) => x.id === pid);
      if (!p) throw new Error('Unknown permission');
      p[who] = value;
      return ok(`Updated "${p.label}".`, 'permission_set');
    },
    async crewEvents() {
      await ctx.wait();
      const up = events.filter((e) => e.endsAtMs > ctx.now());
      return { events: events.map((e) => ({ ...e })), upcoming: up.length, registered: events.reduce((n, e) => n + e.registered, 0), waitlist: events.reduce((n, e) => n + e.waitlist, 0), paidAllowed: club.wave >= 3 };
    },
    async crewPriceTicket(pricePaise) {
      await ctx.wait(40);
      const p = priceTicket({ pricePaise, qty: 1 });
      return { pricePaise: p.pricePaise, platformFeePaise: p.platformFeePaise, gstPaise: p.gstPaise, totalPaise: p.totalPaise };
    },
    async crewCreateEvent(clubId, d) {
      await ctx.wait();
      const issues = validateEventDraft({ ...d, category: d.category }, { paidAllowed: club.wave >= 3 });
      if (issues.length) return { ok: false, issues };
      const p = d.ticketType === 'paid' ? priceTicket({ pricePaise: d.pricePaise, qty: 1 }) : null;
      const event: ClubEvent = {
        id: `ev-${evSeq++}`, clubId, title: d.title.trim(), category: d.category, startsAtMs: d.startsAtMs, endsAtMs: d.endsAtMs, venue: d.venue.trim(), capacity: d.capacity,
        registered: 0, waitlist: 0, ticketType: d.ticketType, pricing: p ? { pricePaise: p.pricePaise, platformFeePaise: p.platformFeePaise, gstPaise: p.gstPaise, totalPaise: p.totalPaise } : null,
        collegeOk: 'not_requested', status: 'published', checkedIn: 0, seed: false,
      };
      events.unshift(event);
      log('console-user', 'event_create', event.title);
      return { ok: true, event };
    },
    async crewPublishResults(_c, eventId) {
      await ctx.wait();
      const e = withEvent(eventId);
      e.status = 'results_published';
      return ok(`Results published for ${e.title}. They now appear on attendees' profiles.`, 'results_publish');
    },
    async crewCheckIn(_c, eventId): Promise<CheckInView> {
      await ctx.wait();
      const e = withEvent(eventId);
      const mine = tickets.filter((t) => t.eventId === eventId);
      const log_ = scanLog.filter((l) => mine.some((t) => t.ticketId === l.ticketId) || l.result === 'wrong_event' || l.result === 'not_registered');
      return {
        event: { id: e.id, title: e.title }, checkedIn: mine.filter((t) => t.checkedInAtMs !== null).length, registered: e.registered,
        rejected: log_.filter((l) => l.result !== 'checked_in').length, offlineQueue: 0, scanners: new Set(scanLog.map((l) => l.scannerName)).size, log: log_.slice().sort((a, b) => b.atMs - a.atMs),
      };
    },
    async scannerRoster(eventId) {
      await ctx.wait();
      const e = withEvent(eventId);
      return { event: { id: e.id, title: e.title, door: 'Main door' }, tickets: tickets.map((t) => ({ ...t, eventTitle: withEvent(t.eventId).title })), totalRegistered: e.registered, qrPeriodMs: QR_PERIOD_MS, downloadedAtMs: ctx.now() };
    },
    async scannerSync(eventId, scans) {
      await ctx.wait();
      const e = withEvent(eventId);
      const already = new Set(tickets.filter((t) => t.eventId === eventId && t.checkedInAtMs !== null).map((t) => t.ticketId));
      const known = scans.filter((s) => tickets.some((t) => t.ticketId === s.ticketId && t.eventId === eventId));
      const { accepted, duplicates } = mergeOfflineScans(already, known);
      for (const s of accepted) {
        const t = tickets.find((x) => x.ticketId === s.ticketId)!;
        t.checkedInAtMs = s.scannedAtMs;
        scanLog.push({ id: `sl-${scanSeq++}`, atMs: s.scannedAtMs, holder: t.holder, ticketId: t.ticketId, result: 'checked_in', scannerName: s.scannerId, seed: false });
      }
      for (const s of duplicates) scanLog.push({ id: `sl-${scanSeq++}`, atMs: s.scannedAtMs, holder: null, ticketId: s.ticketId, result: 'already_used', scannerName: s.scannerId, seed: false });
      e.checkedIn = tickets.filter((t) => t.eventId === eventId && t.checkedInAtMs !== null).length;
      return { accepted: accepted.length, duplicates: duplicates.length, checkedIn: e.checkedIn };
    },
    async crewTasks() {
      await ctx.wait();
      const paid = tasks.filter((t) => t.paid && t.status !== 'done');
      return { tasks: tasks.map((t) => ({ ...t })), open: tasks.filter((t) => t.status !== 'done').length, inReview: tasks.filter((t) => t.status === 'review').length, paid: paid.length, committedPaise: paid.reduce((n, t) => n + (taskPaise[t.id] ?? 0), 0), doneThisMonth: tasks.filter((t) => t.status === 'done').length };
    },
    async crewMoveTask(_c, id, status: CrewHqTaskStatus) {
      await ctx.wait();
      const t = tasks.find((x) => x.id === id);
      if (!t) throw new Error('No such task');
      t.status = status;
      log('console-user', 'task_move', `${t.title} -> ${status}`);
      return { ...t };
    },
    async crewPosts() { await ctx.wait(); return { posts: posts.map((p) => ({ ...p })), pinned: posts.filter((p) => p.pinned).length, scheduled: posts.filter((p) => p.scheduled).length }; },
    async crewCreatePost(_c, input) {
      await ctx.wait();
      if (!input.title.trim()) throw new Error('Add a title');
      const where = { members_chat: 'Members chat', club_page: 'Club page', campus_notice: 'Campus notice' }[input.where];
      const p: CrewHqPost = { id: `po${postSeq++}`, title: input.title.trim(), where, when: input.schedule === 'now' ? 'Just now' : 'Scheduled', reads: '-', audience: input.where === 'members_chat' ? 'Members only' : input.where === 'club_page' ? 'Public club page' : 'All students on campus', pinned: false, scheduled: input.schedule === 'later', needs: input.where === 'campus_notice' ? 'Lead approval' : undefined, seed: true };
      posts.unshift(p);
      log('console-user', 'club_post', p.title);
      return { ...p };
    },
    async crewSetPinned(_c, id, pinned) {
      await ctx.wait();
      const p = posts.find((x) => x.id === id);
      if (!p) throw new Error('No such post');
      p.pinned = pinned;
      return { ...p };
    },
    async crewSection(_c, id) {
      await ctx.wait();
      const s = sections[id];
      const locked = club.wave < s.wave;
      return { ...s, locked, lockMessage: locked ? lockMsg[s.wave] ?? `Wave ${s.wave} feature. ${club.campus} is in wave ${club.wave}.` : null };
    },
    async crewRunAction(_c, rowId, action) {
      await ctx.wait();
      return ok(`${action} saved and written to the audit log.`, `crew_action ${rowId}`);
    },

    // ================= Ops =================
    async opsVerifications() { await ctx.wait(); return verifications.map((v) => ({ ...v })); },
    async opsIdPhoto(id) {
      await ctx.wait();
      log('ops-staff', 'id_photo_view', id);
      // Mock has no image; backend returns a signed URL that expires in ID_PHOTO_URL_TTL_SEC.
      return { verificationId: id, signedUrl: null, expiresInSec: ID_PHOTO_URL_TTL_SEC };
    },
    async opsDecideVerification(id, decision, reason) {
      await ctx.wait();
      const v = verifications.find((x) => x.id === id);
      if (!v) throw new Error('No such verification');
      if (decision === 'reject' && !reason?.trim()) throw new Error('A reason is required to reject');
      v.decision = decision === 'approve' ? 'approved' : 'rejected';
      v.decidedAtMs = ctx.now();
      v.deleteAtMs = idPhotoDeleteAtMs(v.decidedAtMs);
      log('ops-staff', `verification_${decision}`, reason ?? v.id);
      return { ...v };
    },
    async opsEscalations() { await ctx.wait(); return escalations.map((e) => ({ ...e })); },
    async opsResolveEscalation(id, action) {
      await ctx.wait();
      const e = escalations.find((x) => x.id === id);
      if (!e) throw new Error('No such item');
      e.resolved = action;
      log('ops-staff', `escalation_${action.toLowerCase().replace(/\s+/g, '_')}`, e.id);
      return { ...e };
    },
    async opsAnonLookup(id, reason) {
      await ctx.wait();
      if (!reason.trim()) throw new Error('A reason is required');
      const auditId = log('ops-staff', `anon_lookup ${id}`, reason.trim());
      return { escalationId: id, reveal: 'Seed author (placeholder). Real lookups arrive with the backend.', auditId };
    },
    async opsUsers() { await ctx.wait(); return users.map(toUserRow); },
    async opsAddStrike(id) {
      await ctx.wait();
      const u = users.find((x) => x.id === id);
      if (!u) throw new Error('No such user');
      u.strikeDatesMs = [...u.strikeDatesMs, ctx.now()];
      const r = toUserRow(u);
      u.status = ({ warning: 'Warning', mute_24h: 'Muted 24h', ban_7d: '7-day ban', removed: 'Removed' } as const)[r.outcome ?? 'warning'];
      log('ops-staff', 'strike_add', u.handle);
      return toUserRow(u);
    },
    async opsLiftMute(id) {
      await ctx.wait();
      const u = users.find((x) => x.id === id);
      if (!u) throw new Error('No such user');
      u.status = 'Mute lifted';
      log('ops-staff', 'mute_lift', u.handle);
      return toUserRow(u);
    },
    async opsPermanentBan(id) {
      await ctx.wait();
      const u = users.find((x) => x.id === id);
      if (!u) throw new Error('No such user');
      u.status = 'Permanently banned';
      log('ops-staff', 'permanent_ban', u.handle);
      return toUserRow(u);
    },
    async opsCampuses() { await ctx.wait(); return campuses.map((c) => ({ ...c })); },
    async opsSetWave(id, wave, on) {
      await ctx.wait();
      const c = campuses.find((x) => x.id === id);
      if (!c) throw new Error('No such campus');
      if (wave === 3 && on && !c.gateResult.open) return { ok: false, reason: 'The wave 3 gate is not open. Every check has to pass.' };
      const next = campusBase({ ...c, waves: { ...c.waves, [wave]: on } });
      campuses = campuses.map((x) => (x.id === id ? next : x));
      log('ops-staff', `wave_${wave}_${on ? 'on' : 'off'}`, c.name);
      return { ok: true, campus: next };
    },
    async opsSetSignoff(id, kind, value) {
      await ctx.wait();
      const c = campuses.find((x) => x.id === id);
      if (!c) throw new Error('No such campus');
      const next = campusBase({ ...c, gate: { ...c.gate, [kind === 'legal' ? 'legalSignoff' : 'caSignoff']: value } });
      campuses = campuses.map((x) => (x.id === id ? next : x));
      log('ops-staff', `signoff_${kind}_${value ? 'yes' : 'no'}`, c.name);
      return next;
    },
    async opsAssignCampusMod(id) {
      await ctx.wait();
      const c = campuses.find((x) => x.id === id);
      if (!c) throw new Error('No such campus');
      const next = { ...c, mods: { ...c.mods, have: Math.min(c.mods.of, c.mods.have + 1) } };
      campuses = campuses.map((x) => (x.id === id ? next : x));
      log('ops-staff', 'role_assign campus_mod', c.name);
      return next;
    },
    async opsRoles() { await ctx.wait(); return roles.map((r) => ({ ...r })); },
    async opsAssignRole(input) {
      await ctx.wait();
      if (!input.person.trim() || !input.role.trim() || !input.scope.trim()) throw new Error('Fill in person, role and scope');
      const r: OpsRoleRow = { id: `r${roleSeq++}`, ...input, grantedBy: 'ops-staff', seed: true };
      roles = [...roles, r];
      log('ops-staff', `role_assign ${input.role}`, input.person);
      return r;
    },
    async opsRevokeRole(id) {
      await ctx.wait();
      const r = roles.find((x) => x.id === id);
      roles = roles.filter((x) => x.id !== id);
      log('ops-staff', 'role_revoke', r ? `${r.person} ${r.role}` : id);
    },
    async opsSpots() { await ctx.wait(); return spots.map((s) => ({ ...s })); },
    async opsSaveSpot(spot) {
      await ctx.wait();
      if (!spot.name.trim()) throw new Error('Add a name');
      const s: RadarSpot = { ...spot, id: spot.id ?? `s${spotSeq++}`, seed: true };
      spots = spot.id ? spots.map((x) => (x.id === spot.id ? s : x)) : [...spots, s];
      log('ops-staff', 'spot_save', s.name);
      return s;
    },
    async opsBrandReview() { await ctx.wait(); return brands.map((b) => ({ ...b })); },
    async opsDecideBrand(id, decision) {
      await ctx.wait();
      const b = brands.find((x) => x.id === id);
      if (!b) throw new Error('No such item');
      b.decided = decision;
      log('ops-staff', `brand_${decision.toLowerCase().replace(/\s+/g, '_')}`, b.item);
      return { ...b };
    },
    async opsAuditLog() { await ctx.wait(); return audit.map((a) => ({ ...a })); },
  };
}
