// SEED DATA. Mock only. Every record is flagged `seed: true`; the real backend replaces it.
import type { ProfileItem, ProfileTab, SearchResult } from '../contract';

export const SEED_KARMA = 142;
export const SEED_MY_CLUBS = [{ id: 'gdg', name: 'GDG Atria', role: 'admin' as const }, { id: 'ecell', name: 'E-Cell' }];

export type SeedNotice = {
  id: string; kind: 'College' | 'Clubs'; short: string; from: string; badge: 'OFFICIAL' | 'CLUB'; ageMin: number; urgent: boolean; title: string; body: string;
};
export const SEED_NOTICES: SeedNotice[] = [
  { id: 'n_a', kind: 'College', short: 'AU', from: 'Atria Office of Students', badge: 'OFFICIAL', ageMin: 20, urgent: true, title: 'Internals moved to Mon 3 Nov', body: 'All Sem 5 internal assessments shift by one week. Revised timetable attached (PDF).' },
  { id: 'n_b', kind: 'Clubs', short: 'GDG', from: 'GDG Atria', badge: 'CLUB', ageMin: 60, urgent: false, title: 'Hack the Canteen: mentors confirmed', body: 'Razorpay and Zomato engineers mentoring from 9 PM. RSVP closes Thursday.' },
  { id: 'n_c', kind: 'College', short: 'AU', from: 'Atria Library', badge: 'OFFICIAL', ageMin: 24 * 60, urgent: false, title: 'Library open 24×7 till 20 Nov', body: 'Exam season hours. Bring your ID after 10 PM.' },
  { id: 'n_d', kind: 'Clubs', short: 'CUBS', from: 'CUBS Sports', badge: 'CLUB', ageMin: 2 * 24 * 60, urgent: false, title: 'Football cup team registrations open', body: '7-a-side, 8 Nov. Captains register by 5 Nov.' },
];

export const SEED_MY_ITEMS: Record<ProfileTab, ProfileItem[]> = {
  posts: [
    { id: 'p1', tile: 'ME', tileKind: 'named', title: 'Anyone up for a 2 AM Maggi run?', meta: 'Named · ▲ 64 · 22 replies', seed: true },
    { id: 'p2', tile: 'ANON', tileKind: 'anon', title: 'Placement cell needs to stop sending 9 PM mails', meta: 'Anonymous — only you see this here · ▲ 188', seed: true },
    { id: 'p3', tile: 'ME', tileKind: 'named', title: 'GDG build night photos are up', meta: 'Named · ▲ 31', seed: true },
  ],
  notes: [
    { id: 'n1', tile: 'PYQ', tileKind: 'pyq', title: 'DBMS end-sem 2023', meta: '▲ 204 · 388 saves', seed: true },
    { id: 'n2', tile: 'NOTE', tileKind: 'note', title: 'CN — subnetting in 1 page', meta: '▲ 77 · 120 saves', seed: true },
  ],
  saved: [
    { id: 's1', tile: 'PYQ', tileKind: 'pyq', title: 'DBMS end-sem 2024 · solved', meta: 'Saved offline', seed: true },
    { id: 's2', tile: 'TEA', tileKind: 'tea', title: 'Best samosa on campus? (poll)', meta: 'Post · Rhea Nair', seed: true },
  ],
};

export const SEED_PUBLIC_POSTS: Record<string, { id: string; title: string; meta: string }[]> = {
  u_rhea: [
    { id: 'rp1', title: 'Settling this forever: best samosa on campus?', meta: '#Canteen · 40m · ▲ 118' },
    { id: 'rp2', title: 'ML reading group, Thursdays 5 PM, library room 3. Bring nothing but curiosity.', meta: '#Academics · 3d · ▲ 72' },
  ],
};

export type SearchDoc = Omit<SearchResult, 'seed'> & { text: string };
export const SEARCH_DOCS: SearchDoc[] = [
  { id: 'note_dbms24', kind: 'note', tile: 'PYQ', title: 'DBMS end-sem 2024 · solved', meta: '▲ 312 · 540 saves', href: '/note/note_dbms24', text: 'dbms end-sem 2024 solved pyq' },
  { id: 'subj_dbms', kind: 'subject', tile: 'SUBJ', title: 'CS501 · DBMS', meta: '42 notes · 9 PYQs', href: '/subject/subj_dbms', text: 'cs501 dbms database' },
  { id: 'note_cn', kind: 'note', tile: 'NOTE', title: 'CN — subnetting in 1 page', meta: '▲ 77 · 120 saves', href: '/note/note_cn', text: 'cn subnetting networks note' },
  { id: 'post_dbms', kind: 'post', tile: 'POST', title: 'DBMS internal had a question from a chapter that isn’t in our syllabus…', meta: 'Anonymous · 12m', href: '/post/post_dbms', text: 'dbms internal question chapter syllabus' },
  { id: 'post_samosa', kind: 'post', tile: 'POST', title: 'Settling this forever: best samosa on campus?', meta: 'Rhea Nair · 40m', href: '/post/post_samosa', text: 'samosa canteen best campus' },
  { id: 'event_dbms', kind: 'event', tile: 'NOV 05', title: 'DBMS doubt-clearing session', meta: 'GDG Atria · Seminar Hall 2', href: '/event/event_dbms', text: 'dbms doubt clearing session gdg seminar' },
  { id: 'club_gdg', kind: 'club', tile: 'GDG', title: 'GDG Atria', meta: 'Tech', href: '/club/gdg', text: 'gdg atria tech google developer' },
  { id: 'club_robo', kind: 'club', tile: 'RBX', title: 'Robotics Society', meta: 'Tech', href: '/club/robo', text: 'robotics society tech' },
  { id: 'club_ecell', kind: 'club', tile: 'E-C', title: 'E-Cell Atria', meta: 'Startups', href: '/club/ecell', text: 'ecell e-cell atria startups tech' },
  { id: 'club_cubs', kind: 'club', tile: 'CUBS', title: 'CUBS Sports', meta: 'Sports', href: '/club/cubs', text: 'cubs sports football' },
];
