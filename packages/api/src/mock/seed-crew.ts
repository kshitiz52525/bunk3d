// SEED DATA for the crew and dm mock slices. Mock only. Every record is flagged `seed: true`.
// The real backend replaces all of it. Times are offsets from "now" so the demo always looks current.
import type { ClubRole } from '@bunk3d/core';

export const H = 3600 * 1000;
export const D = 24 * H;

export type SeedClub = {
  id: string; short: string; name: string; category: string; members: number; join: 'open' | 'approval'; tint: string;
  verified: boolean; about: string; eventCount: number; adminCount: number; seed: true;
};

export const SEED_CREW_CLUBS: SeedClub[] = [
  { id: 'gdg', short: 'GDG', name: 'GDG Atria', category: 'Tech', members: 142, join: 'open', tint: '#D4FF3A', verified: true, eventCount: 9, adminCount: 4, about: 'Google Developer Group on campus. Weekly build nights, workshops and one big hackathon a semester. Beginners welcome.', seed: true },
  { id: 'ecell', short: 'E-C', name: 'E-Cell Atria', category: 'Startups', members: 98, join: 'open', tint: '#B49CFF', verified: true, eventCount: 4, adminCount: 3, about: 'The entrepreneurship cell. Startup expo, pitch nights and founder talks.', seed: true },
  { id: 'robo', short: 'RBX', name: 'Robotics Society', category: 'Tech', members: 116, join: 'approval', tint: '#B49CFF', verified: true, eventCount: 6, adminCount: 3, about: 'Build bots, enter competitions. Members are approved by the leads.', seed: true },
  { id: 'cubs', short: 'CUBS', name: 'CUBS Sports', category: 'Sports', members: 210, join: 'open', tint: '#5CC8FF', verified: true, eventCount: 7, adminCount: 4, about: 'Campus sports club: football cup, cricket nets and inter-college fixtures.', seed: true },
  { id: 'mus', short: 'MUS', name: 'Music Society', category: 'Cultural', members: 164, join: 'approval', tint: '#FF6B9A', verified: true, eventCount: 5, adminCount: 3, about: 'Jam sessions, open mics and the annual fest stage.', seed: true },
  { id: 'drm', short: 'DRM', name: 'Dramatics Club', category: 'Cultural', members: 88, join: 'open', tint: '#FFB547', verified: true, eventCount: 3, adminCount: 2, about: 'Street plays, stage plays and improv.', seed: true },
  { id: 'dsn', short: 'DSN', name: 'Design Club', category: 'Tech', members: 72, join: 'open', tint: '#D4FF3A', verified: true, eventCount: 2, adminCount: 2, about: 'Design sprints, portfolio reviews and poster jams.', seed: true },
];

/** The mock user's club standing (seed). 'me' resolves to the signed-in user. */
export const SEED_MY_CLUBS: Record<string, { state: 'joined' | 'pending'; role?: ClubRole; newCount?: number }> = {
  gdg: { state: 'joined', role: 'lead', newCount: 2 },
  ecell: { state: 'joined', role: 'member' },
  robo: { state: 'pending' },
};

export type SeedMember = { userId: string; name: string; role: ClubRole; me?: boolean };
export const SEED_CLUB_MEMBERS: Record<string, SeedMember[]> = {
  gdg: [{ userId: 'u_returning', name: 'Aarav Sharma', role: 'lead', me: true }, { userId: 'u_rhea', name: 'Rhea Nair', role: 'coordinator' }, { userId: 'u_kabir', name: 'Kabir M.', role: 'member' }, { userId: 'u_ishaan', name: 'Ishaan P.', role: 'member' }, { userId: 'u_meera', name: 'Meera T.', role: 'member' }],
  ecell: [{ userId: 'u_tanvi', name: 'Tanvi J.', role: 'lead' }, { userId: 'u_returning', name: 'Aarav Sharma', role: 'member', me: true }, { userId: 'u_sana', name: 'Sana K.', role: 'member' }],
  robo: [{ userId: 'u_vikram', name: 'Vikram P.', role: 'lead' }],
  cubs: [{ userId: 'u_arjun', name: 'Arjun S.', role: 'lead' }],
  mus: [{ userId: 'u_sana', name: 'Sana K.', role: 'member' }],
  drm: [{ userId: 'u_meera', name: 'Meera T.', role: 'lead' }],
  dsn: [{ userId: 'u_meera', name: 'Meera T.', role: 'member' }],
};

export const SEED_APPROVALS = [{ clubId: 'gdg', userId: 'u_dev', name: 'Dev S.' }, { clubId: 'gdg', userId: 'u_neha', name: 'Neha B.' }];

export const SEED_CLUB_EVENTS: Record<string, { id: string; title: string; inDays: number; going: number }[]> = {
  gdg: [{ id: 'hack-canteen', title: 'Hack the Canteen', inDays: 8, going: 86 }, { id: 'build-night-7', title: 'Build Night #7', inDays: 16, going: 22 }],
  ecell: [{ id: 'startup-expo', title: 'Startup Expo', inDays: 6, going: 140 }],
};

export const SEED_CLUB_POSTS: Record<string, { id: string; body: string; agoH: number; by: string; byRole: ClubRole; event?: string }[]> = {
  gdg: [
    { id: 'p1', body: 'Hack the Canteen is 70% full. Teams of 2–4, RSVP closes Thursday. Mentors from Razorpay + Zomato confirmed.', agoH: 1, by: 'Aarav', byRole: 'lead', event: 'hack-canteen' },
    { id: 'p2', body: 'Recording + slides from the Flutter session are up in The Notes.', agoH: 48, by: 'Rhea', byRole: 'coordinator' },
  ],
};

export type SeedTask = {
  id: string; clubId: string; from: string; title: string; status: 'assigned' | 'accepted' | 'working' | 'review' | 'revision' | 'approved';
  dueInDays: number; reward: { kind: 'xp'; xp: number } | { kind: 'certificate' } | { kind: 'paid'; payPaise: number; gigId: string };
  reviewer: string; deliverables: string[]; shift?: string; revisionNote?: { by: string; text: string }; seed: true;
};
export const SEED_TASKS: SeedTask[] = [
  { id: 'task-posters', clubId: 'gdg', from: 'Rhea', title: 'Design Hack the Canteen posters', status: 'revision', dueInDays: 4, reward: { kind: 'xp', xp: 120 }, reviewer: 'Rhea N. · design lead', deliverables: ['Poster A3 + Instagram size', 'Source file'], revisionNote: { by: 'Rhea', text: 'add the RSVP deadline and resize for Instagram. Then resubmit.' }, seed: true },
  { id: 'task-expo', clubId: 'ecell', from: 'Tanvi J.', title: 'Staff the startup expo help desk', status: 'working', dueInDays: 2, reward: { kind: 'paid', payPaise: 80_000, gigId: 'gig-expo-desk' }, reviewer: 'Tanvi J. · events lead', shift: '10 AM – 4 PM', deliverables: ['Check-in 9:45 AM at Hall B', '4 photos of the desk', 'Visitor count sheet'], seed: true },
  { id: 'task-football', clubId: 'cubs', from: 'Arjun', title: 'Score-keeping, football cup day 1', status: 'accepted', dueInDays: 9, reward: { kind: 'certificate' }, reviewer: 'Arjun S. · sports lead', deliverables: ['Score sheet for every match'], seed: true },
  { id: 'task-build-photos', clubId: 'gdg', from: 'Rhea', title: 'Photograph Build Night #7', status: 'assigned', dueInDays: 10, reward: { kind: 'xp', xp: 60 }, reviewer: 'Rhea N. · design lead', deliverables: ['10 edited photos'], seed: true },
  { id: 'task-slides', clubId: 'gdg', from: 'Rhea', title: 'Flutter workshop slides', status: 'approved', dueInDays: -31, reward: { kind: 'xp', xp: 80 }, reviewer: 'Rhea N. · design lead', deliverables: ['Slides PDF'], seed: true },
];
/** Seed: lifetime earnings of the mock user, so the first-Rs-1,000 waiver is already used up. */
export const SEED_LIFETIME_EARNED_PAISE = 150_000;

export const SEED_QUESTS = {
  active: { id: 'q-chai', scope: 'campus' as const, title: 'Host a Chai & Code meetup', rule: 'Bring 15+ students. Proof: check-ins + 1 photo.', xp: 500, endsInDays: 2, progress: 9, target: 15, squadLabel: 'Squad: GDG Atria (4)', seed: true as const },
  open: [
    { id: 'q-pyq', scope: 'campus' as const, title: 'Notes drop: 30 PYQs in a week', rule: 'Upload verified PYQs for any subject', xp: 300, endsInDays: 17, seed: true as const },
    { id: 'q-clean', scope: 'inter_college' as const, title: 'Clean-up drive · Bengaluru', rule: '20 members, before/after photos, geotagged', xp: 800, endsInDays: 27, seed: true as const },
  ],
  note: 'Quests score clubs, never individual people.',
};

export const SEED_CLOUT: Record<'campus' | 'inter_college', { clubId: string; short: string; name: string; tint: string; xp: number }[]> = {
  campus: [
    { clubId: 'gdg', short: 'GDG', name: 'GDG Atria', tint: '#D4FF3A', xp: 4820 },
    { clubId: 'cubs', short: 'CUBS', name: 'CUBS Sports', tint: '#5CC8FF', xp: 4410 },
    { clubId: 'mus', short: 'MUS', name: 'Music Society', tint: '#FF6B9A', xp: 3960 },
    { clubId: 'ecell', short: 'E-C', name: 'E-Cell Atria', tint: '#B49CFF', xp: 3120 },
    { clubId: 'robo', short: 'RBX', name: 'Robotics Society', tint: '#B49CFF', xp: 2880 },
    { clubId: 'drm', short: 'DRM', name: 'Dramatics Club', tint: '#FFB547', xp: 2050 },
    { clubId: 'dsn', short: 'DSN', name: 'Design Club', tint: '#D4FF3A', xp: 1730 },
  ],
  inter_college: [
    { clubId: 'x-rvce', short: 'RVC', name: 'IEEE RVCE', tint: '#5CC8FF', xp: 9410 },
    { clubId: 'gdg', short: 'GDG', name: 'GDG Atria', tint: '#D4FF3A', xp: 8920 },
    { clubId: 'x-pes', short: 'PES', name: 'PES Tech Club', tint: '#FF6B9A', xp: 8100 },
    { clubId: 'x-christ-ec', short: 'CE', name: 'Christ E-Cell', tint: '#B49CFF', xp: 6980 },
    { clubId: 'x-bms', short: 'BMS', name: 'BMS Robotics', tint: '#5CC8FF', xp: 6210 },
    { clubId: 'ecell', short: 'E-C', name: 'Atria E-Cell', tint: '#B49CFF', xp: 5400 },
    { clubId: 'x-dsu', short: 'DSU', name: 'Dayananda Music', tint: '#FF6B9A', xp: 4900 },
  ],
};
export const SEED_SCORING_NOTE = 'Clubs earn XP from approved club tasks and completed Side Quests. Only clubs are ranked.';

export type SeedChannel = { id: string; name: string; adminOnly: boolean; pinned?: { text: string; by: string }; msgs: { who: string; role?: ClubRole; text: string; agoMin: number }[]; unread: number };
export const SEED_CHANNELS: Record<string, SeedChannel[]> = {
  gdg: [
    { id: 'general', name: 'general', adminOnly: false, pinned: { text: 'Hack the Canteen team lock closes Fri 6 PM. Solo? Drop your skills in #find-a-team.', by: 'ADMIN · RHEA N.' }, unread: 5, msgs: [
      { who: 'Kabir M.', text: 'anyone has the Flutter workshop recording?', agoMin: 90 },
      { who: 'Rhea N.', role: 'coordinator', text: 'Uploaded to the club page, Media tab', agoMin: 60 },
      { who: 'Sana K.', text: 'lifesaver fr', agoMin: 40 },
      { who: 'Rhea N.', role: 'coordinator', text: 'team lock closes Fri 6 PM', agoMin: 12 },
    ] },
    { id: 'find-a-team', name: 'find-a-team', adminOnly: false, unread: 0, msgs: [
      { who: 'Ishaan P.', text: 'backend dev, need a designer + 1 for Hack the Canteen', agoMin: 300 },
      { who: 'Meera T.', text: 'designer here, DM me', agoMin: 280 },
    ] },
    { id: 'announcements', name: 'announcements', adminOnly: true, unread: 0, msgs: [{ who: 'Rhea N.', role: 'coordinator', text: 'Only admins can post here. Results go live Sunday.', agoMin: 1500 }] },
  ],
  ecell: [
    { id: 'general', name: 'general', adminOnly: false, unread: 0, msgs: [{ who: 'Sana K.', text: 'who is on the expo desk Thursday?', agoMin: 600 }] },
    { id: 'announcements', name: 'announcements', adminOnly: true, unread: 1, msgs: [{ who: 'Tanvi J.', role: 'lead', text: 'expo help-desk shifts are up', agoMin: 180 }] },
  ],
  robo: [{ id: 'general', name: 'general', adminOnly: false, unread: 0, msgs: [] }],
  cubs: [
    { id: 'general', name: 'general', adminOnly: false, unread: 0, msgs: [] },
    { id: 'football-cup', name: 'football-cup', adminOnly: false, unread: 0, msgs: [{ who: 'Arjun S.', role: 'lead', text: 'draws go up Saturday morning', agoMin: 4000 }] },
  ],
  mus: [{ id: 'general', name: 'general', adminOnly: false, unread: 0, msgs: [] }],
  drm: [{ id: 'general', name: 'general', adminOnly: false, unread: 0, msgs: [] }],
  dsn: [{ id: 'general', name: 'general', adminOnly: false, unread: 0, msgs: [] }],
};
/** Channels the mock user follows, shown in DMs under Clubs ("GDG Atria #general"). */
export const SEED_FOLLOWED_CHANNELS = ['gdg:general', 'ecell:announcements'];

export const TINTS = ['#D4FF3A', '#B49CFF', '#FF6B9A', '#5CC8FF', '#FFB547', '#3DDC97'];
export const tintFor = (id: string) => TINTS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];
export const initialsOf = (name: string) => name.replace(/\./g, '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
