// SEED DATA for Tea. Mock only. Everything here is clearly fake campus content, flagged `seed: true`.
// The real backend replaces it. Numbers (scores, counts) are seed values, never presented as real.
import type { Community, Media, OfficialNotice, SendTarget } from '../contract';

export const SEED_OFFICIAL: OfficialNotice = { id: 'n_urgent', title: 'URGENT · Internals moved to Mon 3 Nov', seed: true };

const MIN = 60_000;
const HOUR = 60 * MIN;

/** Placeholder tile tints, standing in for photos (the sample photos are not included). */
const T = { sky: '#5CC8FF', violet: '#B49CFF', pink: '#FF6B9A', amber: '#FFB547', lime: '#D4FF3A', green: '#3DDC97' };

export const img = (alt: string, ratio: number, tint: string): Media => ({ kind: 'image', alt, ratio, tint, seed: true });

export type SeedComment = { id: string; parent?: string; by: 'op' | 'anon1' | 'anon2' | { name: string; initials: string; tint: string; meta: string }; body: string; agoMin: number; score: number };
export type SeedPost = {
  id: string;
  scope: { type: 'campus'; campusId: string } | { type: 'community'; communityId: string };
  /** 'u_seed_x' for people who are not the signed-in user; the signed-in user's seed posts use 'ME'. */
  authorId: string;
  anon?: boolean;
  name?: string; initials?: string; tint?: string; meta?: string; club?: boolean; college?: string;
  topic: string;
  body: string;
  media?: Media[];
  poll?: { options: [string, number][]; endsInH: number };
  agoMin: number;
  score: number;
  reports?: number;
  eventId?: string;
  badge?: string;
  comments?: SeedComment[];
};

const C = (id: string, by: SeedComment['by'], body: string, agoMin: number, score: number, parent?: string): SeedComment => ({ id, by, body, agoMin, score, parent });
const VP = { name: 'Vikram P.', initials: 'VP', tint: T.sky, meta: '3rd yr CSE' };

export const SEED_POSTS: SeedPost[] = [
  { id: 'p1', scope: { type: 'campus', campusId: 'atria' }, authorId: 'u_seed_a', anon: true, topic: 'Academics', agoMin: 12,
    body: 'DBMS internal had a question from a chapter that literally isn’t in our syllabus. Am I the only one?', score: 241,
    comments: [
      C('c1', 'anon1', 'Unit 5 normalization. Sir said “not important” in class lol', 9, 86),
      C('c2', 'op', 'exactly. we should all mail the HOD', 6, 31, 'c1'),
      C('c3', VP, 'Class rep here. Raising it with the dept tomorrow, will update.', 5, 54),
      C('c4', 'anon2', 'PYQ from 2023 had the same thing. Check The Notes.', 2, 12),
    ] },
  { id: 'p2', scope: { type: 'campus', campusId: 'atria' }, authorId: 'u_seed_k', name: 'Kabir M.', initials: 'KM', tint: T.sky, meta: '4th yr · Mech', topic: 'Hostel & PG', agoMin: 120,
    body: 'sunset from the hostel terrace hits different after a 6-hour lab', media: [img('City skyline at sunset from a hostel terrace', 0.8, T.amber)], score: 76,
    comments: [C('c5', 'anon1', 'terrace gang', 90, 4)] },
  { id: 'p3', scope: { type: 'campus', campusId: 'atria' }, authorId: 'u_seed_r', name: 'Rhea Nair', initials: 'RN', tint: T.violet, meta: '2nd yr · CS & AI', topic: 'Canteen', agoMin: 40,
    body: 'Settling this forever: best samosa on campus?', poll: { options: [['Block A canteen', 520], ['Food court', 292]], endsInH: 3 }, score: 118,
    comments: [C('c6', 'anon1', 'Block A, no debate', 30, 22), C('c7', VP, 'food court has the chutney though', 25, 9)] },
  { id: 'p4', scope: { type: 'campus', campusId: 'atria' }, authorId: 'u_seed_gdg', name: 'GDG Atria', initials: 'GDG', tint: T.lime, meta: 'Club', club: true, topic: 'Events', agoMin: 300,
    body: 'Fest night recap. Swipe for the turf final and Hack the Canteen, hours 1–3',
    media: [img('Band on stage under lime, violet and pink beams', 0.8, T.violet), img('Night turf final under floodlights', 0.8, T.green), img('Hack the Canteen teams at laptops', 0.8, T.amber)], score: 412, eventId: 'seed-event' },
  { id: 'p5', scope: { type: 'campus', campusId: 'atria' }, authorId: 'u_seed_i', name: 'Ishaan P.', initials: 'IP', tint: T.pink, meta: '3rd yr · ECE', topic: 'Canteen', agoMin: 360,
    body: '₹15 samosa supremacy. Block A canteen, I’m sorry I ever doubted you', media: [img('Three samosas on a steel plate with chutneys and chai', 1, T.amber)], score: 64,
    comments: [C('c8', 'anon1', 'told you', 340, 6)] },
  { id: 'p6', scope: { type: 'campus', campusId: 'atria' }, authorId: 'u_seed_b', anon: true, topic: 'Random', agoMin: 420,
    body: 'whoever keeps booking library pod 4 for “group study” and then sleeping in it, I see you', score: 98,
    comments: [C('c9', 'anon1', 'pod 4 is cursed', 400, 14)] },
  { id: 'p7', scope: { type: 'campus', campusId: 'atria' }, authorId: 'u_seed_m', name: 'Meera T.', initials: 'MT', tint: T.amber, meta: '2nd yr · B.Des', topic: 'Events', agoMin: 480,
    body: 'hour 3 and nobody has slept', media: [img('Teams coding at laptops under string lights at Hack the Canteen', 1.91, T.violet)], badge: 'LIVE · HOUR 3', eventId: 'seed-event', score: 57 },
  { id: 'p8', scope: { type: 'campus', campusId: 'atria' }, authorId: 'u_seed_s', name: 'Sana K.', initials: 'SK', tint: T.pink, meta: '2nd yr · B.Des', topic: 'Random', agoMin: 540,
    body: 'Block C in the rain is a whole mood', media: [img('Rainy evening outside Block C, a student with a lime umbrella', 0.5625, T.sky)], score: 133 },
  { id: 'p9', scope: { type: 'campus', campusId: 'atria' }, authorId: 'u_seed_v', name: 'Dev S.', initials: 'DS', tint: T.green, meta: '1st yr · CSE', topic: 'Random', agoMin: 600,
    body: 'Clip from the hostel corridor cricket final. Nobody was harmed, one window was.', media: [{ kind: 'video', alt: 'Corridor cricket clip', ratio: 0.5625, tint: T.green, durationSec: 12, seed: true }], score: 45 },
  { id: 'p10', scope: { type: 'campus', campusId: 'atria' }, authorId: 'u_seed_w', anon: true, topic: 'Rant', agoMin: 700,
    body: 'Hot take: the 8 AM lab is a hostile act and everyone knows it.', score: -7 },
  // The signed-in user's own seed post, hidden from others until Mods decide (3 reports).
  { id: 'p11', scope: { type: 'campus', campusId: 'atria' }, authorId: 'ME', name: 'You', initials: '', tint: T.lime, meta: '', topic: 'Rant', agoMin: 200, reports: 3,
    body: 'Mess food rating this week, and I have thoughts.', score: 3 },
  // Another campus: never appears on Atria's feed.
  { id: 'p12', scope: { type: 'campus', campusId: 'christ' }, authorId: 'u_seed_z', name: 'Zoya A.', initials: 'ZA', tint: T.violet, meta: '2nd yr', topic: 'Canteen', agoMin: 60,
    body: 'Christ campus only: the new coffee kiosk is open.', score: 20 },
  // Communities, cross-college: each shows the poster's college name.
  { id: 'p13', scope: { type: 'community', communityId: 'placement27' }, authorId: 'u_seed_c1', name: 'Ishita K.', initials: 'IK', tint: T.pink, meta: '', college: 'PES University', topic: 'Interview exp', agoMin: 60,
    body: 'Razorpay SDE intern loop: 1 OA (2 DSA, 1 SQL), 2 tech rounds, no HR. Asked LRU cache + a system design lite on UPI retries.', score: 412,
    comments: [C('c10', 'anon1', 'which OA platform?', 50, 8)] },
  { id: 'p14', scope: { type: 'community', communityId: 'placement27' }, authorId: 'u_seed_c2', anon: true, college: 'Verified student', topic: 'OA prep', agoMin: 180,
    body: 'Is anyone else’s college not letting 7.0 CGPA folks sit for dream companies? Asking for a friend (me).', score: 230 },
  { id: 'p15', scope: { type: 'community', communityId: 'blrpg' }, authorId: 'u_seed_c3', name: 'Tanvi J.', initials: 'TJ', tint: T.green, meta: '', college: 'Christ University', topic: 'Rooms', agoMin: 90,
    body: 'Two-sharing rooms near Koramangala, fully furnished, no brokerage. Ask me anything.', score: 51 },
];

export const SEED_COMMUNITIES: Omit<Community, 'joined' | 'newPosts'>[] = [
  { id: 'placement27', name: 'Placement Season 2027', tags: ['Interview exp', 'OA prep', 'Offers', 'Referrals', 'Rant'], colleges: 14, members: 5200, tint: T.lime, seed: true },
  { id: 'blrpg', name: 'Bengaluru PG Life', tags: ['Rooms', 'Food', 'Roommates', 'Rant'], colleges: 9, members: 2300, tint: T.violet, seed: true },
  { id: 'hackers', name: 'Hackathon Hub', tags: ['Teams', 'Ideas', 'Wins', 'Rant'], colleges: 11, members: 3100, tint: T.pink, seed: true },
];

export type SeedStory = { id: string; userId: string; name: string; first: string; initials: string; tint: string; club?: boolean; items: { id: string; media: Media; caption?: string; agoMin: number; audience?: 'campus' | 'close'; poll?: [string, string, number][]; question?: string; sharedPostId?: string }[]; seen?: boolean };
export const SEED_STORIES: SeedStory[] = [
  { id: 'g_rhea', userId: 'u_seed_r', name: 'Rhea Nair', first: 'Rhea', initials: 'RN', tint: T.violet, items: [
    { id: 's1', media: img('Block C in the rain', 0.5625, T.sky), caption: 'monsoon said attendance optional', agoMin: 22 },
    { id: 's2', media: img('Group at a late night table', 0.5625, T.violet), agoMin: 9, question: 'all-nighter?', poll: [['yes', 'yes, sleep is a myth', 61], ['no', 'no, 8 hrs or bust', 39]] },
  ] },
  { id: 'g_gdg', userId: 'u_seed_gdg', name: 'GDG Atria', first: 'GDG', initials: 'GDG', tint: T.lime, club: true, items: [
    { id: 's3', media: img('Hack the Canteen teams', 0.5625, T.amber), caption: '@gdg.atria · all-nighter?', agoMin: 60 },
  ] },
  { id: 'g_kabir', userId: 'u_seed_k', name: 'Kabir M.', first: 'Kabir', initials: 'KM', tint: T.sky, items: [
    { id: 's4', media: img('Hostel terrace at sunset', 0.5625, T.amber), sharedPostId: 'p2', audience: 'close', agoMin: 40 },
  ] },
  { id: 'g_cubs', userId: 'u_seed_cubs', name: 'CUBS', first: 'CUBS', initials: 'CB', tint: T.sky, club: true, seen: true, items: [
    { id: 's5', media: img('Samosas on a steel plate', 0.5625, T.amber), caption: '₹15. unreal.', agoMin: 300 },
  ] },
];

export const SEED_SEND_TARGETS: SendTarget[] = [
  { id: 't_rhea', name: 'Rhea Nair', meta: 'DM', initials: 'RN', tint: T.violet, seed: true },
  { id: 't_htc', name: 'Hack the Canteen squad', meta: 'Squad · 4', initials: 'HTC', tint: T.lime, group: true, seed: true },
  { id: 't_gdg', name: 'GDG Atria · #general', meta: 'Club chat', initials: 'GDG', tint: T.lime, group: true, seed: true },
  { id: 't_tanvi', name: 'Tanvi J.', meta: 'DM', initials: 'TJ', tint: T.green, seed: true },
];

export { MIN, HOUR };
