// SEED DATA (mock only). Every row is fake and flagged `seed: true`. Counts and names are not real.
import type { NotePage } from '../contract';

export type SeedSubject = { id: string; code: string; name: string; short: string; sem: number; branch: string; tint: 'lime' | 'violet' | 'plain'; mine: boolean };
export const SEED_SUBJECTS: SeedSubject[] = [
  { id: 'dbms', code: 'CS501', name: 'Database Management Systems', short: 'DBMS', sem: 5, branch: 'CSE', tint: 'lime', mine: true },
  { id: 'os', code: 'CS502', name: 'Operating Systems', short: 'OS', sem: 5, branch: 'CSE', tint: 'violet', mine: true },
  { id: 'cn', code: 'CS503', name: 'Computer Networks', short: 'CN', sem: 5, branch: 'CSE', tint: 'plain', mine: true },
  { id: 'toc', code: 'CS504', name: 'Theory of Computation', short: 'TOC', sem: 5, branch: 'CSE', tint: 'plain', mine: true },
  { id: 'se', code: 'CS505', name: 'Software Engineering', short: 'SE', sem: 5, branch: 'CSE', tint: 'plain', mine: false },
];

const day = 86_400_000;
export type SeedNote = {
  id: string; subjectId: string; kind: 'note' | 'pyq'; title: string; fileKind: 'PDF' | 'Images'; pages: number; author: string | null;
  examYear?: number; examLabel?: string; unit?: number; upvotes: number; saves: number; views: number; ageDays: number;
};
export const SEED_NOTES: SeedNote[] = [
  { id: 'n-dbms-pyq24', subjectId: 'dbms', kind: 'pyq', title: 'End-sem 2024 · solved', fileKind: 'PDF', pages: 14, author: 'Vikram P.', examYear: 2024, examLabel: 'End-sem', upvotes: 312, saves: 540, views: 1200, ageDays: 47 },
  { id: 'n-dbms-pyq23', subjectId: 'dbms', kind: 'pyq', title: 'End-sem 2023', fileKind: 'PDF', pages: 4, author: null, examYear: 2023, examLabel: 'End-sem', upvotes: 204, saves: 388, views: 900, ageDays: 300 },
  { id: 'n-dbms-pyq24m', subjectId: 'dbms', kind: 'pyq', title: 'Mid-sem 2024 · Set B', fileKind: 'Images', pages: 3, author: 'Rhea N.', examYear: 2024, examLabel: 'Mid-sem', upvotes: 97, saves: 150, views: 400, ageDays: 120 },
  { id: 'n-dbms-pyq22', subjectId: 'dbms', kind: 'pyq', title: 'End-sem 2022', fileKind: 'PDF', pages: 4, author: 'Campus Crew', examYear: 2022, examLabel: 'End-sem', upvotes: 88, saves: 132, views: 350, ageDays: 700 },
  { id: 'n-dbms-pyq23s', subjectId: 'dbms', kind: 'pyq', title: 'Supplementary 2023', fileKind: 'PDF', pages: 4, author: null, examYear: 2023, examLabel: 'Supplementary', upvotes: 41, saves: 70, views: 200, ageDays: 260 },
  { id: 'n-dbms-u3', subjectId: 'dbms', kind: 'note', title: 'Unit 3 · Normalization (1NF → BCNF)', fileKind: 'PDF', pages: 22, author: 'Ananya P.', unit: 3, upvotes: 276, saves: 410, views: 980, ageDays: 30 },
  { id: 'n-dbms-joins', subjectId: 'dbms', kind: 'note', title: 'SQL joins with diagrams', fileKind: 'Images', pages: 8, author: null, unit: 2, upvotes: 190, saves: 302, views: 700, ageDays: 55 },
  { id: 'n-dbms-acid', subjectId: 'dbms', kind: 'note', title: 'Transactions & ACID — short notes', fileKind: 'PDF', pages: 6, author: 'Kabir M.', unit: 4, upvotes: 122, saves: 180, views: 420, ageDays: 12 },
  { id: 'n-dbms-er', subjectId: 'dbms', kind: 'note', title: 'ER diagrams practice set', fileKind: 'PDF', pages: 10, author: 'GDG Atria', unit: 1, upvotes: 64, saves: 91, views: 240, ageDays: 80 },
  { id: 'n-os-dead', subjectId: 'os', kind: 'note', title: 'OS — deadlocks, 1-page cheat', fileKind: 'Images', pages: 1, author: null, unit: 3, upvotes: 188, saves: 260, views: 640, ageDays: 6 },
  { id: 'n-os-pyq24', subjectId: 'os', kind: 'pyq', title: 'End-sem 2024', fileKind: 'PDF', pages: 5, author: 'Meera S.', examYear: 2024, examLabel: 'End-sem', upvotes: 75, saves: 110, views: 300, ageDays: 40 },
  { id: 'n-cn-u2', subjectId: 'cn', kind: 'note', title: 'Unit 2 · Data link layer', fileKind: 'PDF', pages: 18, author: 'Ishaan R.', unit: 2, upvotes: 52, saves: 70, views: 210, ageDays: 20 },
];

// Counts shown on subject tiles (fake). The mock also adds any notes uploaded in this session.
export const SEED_SUBJECT_COUNTS: Record<string, { notes: number; pyqs: number }> = {
  dbms: { notes: 42, pyqs: 9 }, os: { notes: 31, pyqs: 7 }, cn: { notes: 18, pyqs: 6 }, toc: { notes: 12, pyqs: 5 }, se: { notes: 9, pyqs: 3 },
};
export const seedAgeMs = (d: number) => d * day;

const generic: NotePage = { heading: 'Preview', lines: ['Placeholder page. This is seed content, not a real upload.', 'Save it offline to read it without a connection.'] };
export const SEED_DBMS_PYQ_PAGES: NotePage[] = [
  {
    heading: 'ATRIA UNIVERSITY · B.TECH SEM 5 — CS501 Database Management Systems — End Semester 2024',
    lines: ['Q1. (a) Define BCNF. Decompose R(A,B,C,D) with F = {A→B, B→C}. [8]', 'Q2. Explain ACID with an example of a bank transfer. [6]', 'Q3. Write SQL to find the second-highest salary. [4]'],
    solution: 'Solution: R1(A,B), R2(B,C), R3(A,D) — lossless, dependency-preserving.',
  },
];
export const pagesFor = (id: string): NotePage[] => (id === 'n-dbms-pyq24' ? SEED_DBMS_PYQ_PAGES : [generic]);

// Timetable, attendance and deadlines (fake).
export const SEED_TIMETABLE = {
  id: 'tt-cse-5a', name: 'CSE 5A', madeBy: 'Vikram P.', adoptedBy: 54,
  plans: [
    [['9:00', '9:55', 'DBMS', 'Room 304 · Prof. Rao', ''], ['10:00', '10:55', 'OS', 'Room 304 · Prof. Iyer', ''], ['11:15', '1:00', 'CN Lab', 'Lab 2 · Batch B', 'Lab'], ['2:00', '2:55', 'TOC', 'Room 210', '']],
    [['9:00', '10:55', 'DBMS Lab', 'Lab 4 · Batch B', 'Lab'], ['11:15', '12:10', 'CN', 'Room 304', ''], ['2:00', '2:55', 'OS', 'Room 304', '']],
  ] as [string, string, string, string, string][][],
};
export const SEED_ATTENDANCE: Record<string, { name: string; a: number; t: number }> = {
  dbms: { name: 'DBMS', a: 31, t: 38 }, os: { name: 'OS', a: 27, t: 36 }, cn: { name: 'CN', a: 22, t: 34 }, toc: { name: 'TOC', a: 25, t: 30 },
};
export const SEED_DEADLINES = [
  { id: 'd1', type: 'ASSIGNMENT', title: 'OS Assignment 3 — scheduling', meta: 'Upload on LMS · 11:59 PM', inDays: 1, votes: 23 },
  { id: 'd2', type: 'INTERNAL', title: 'Internals moved — all subjects', meta: 'Official notice · 9:00 AM', inDays: 6, votes: 61 },
  { id: 'd3', type: 'ASSIGNMENT', title: 'CN lab record submission', meta: 'Lab 2 · Prof. Desai', inDays: 8, votes: 2 },
  { id: 'd4', type: 'FEES', title: 'Exam fee last date', meta: 'Accounts office · late fee ₹500 after', inDays: 13, votes: 34 },
  { id: 'd5', type: 'EXAM', title: 'End-sem begins', meta: 'Timetable PDF in Notices', inDays: 27, votes: 48 },
] as const;
