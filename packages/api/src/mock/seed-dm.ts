// SEED DATA for the dm mock slice. Mock only. Every record is flagged `seed: true`.
import { initialsOf, tintFor } from './seed-crew';

export type SeedPerson = { userId: string; name: string; verified: boolean; online: boolean; sharesClub: boolean; receiptsOn: boolean; replies: string[]; seed: true };

const mk = (userId: string, name: string, o: Partial<SeedPerson> = {}): SeedPerson => ({ userId, name, verified: true, online: false, sharesClub: true, receiptsOn: true, replies: ['haha yes', 'send it over', 'ok sounds good'], seed: true, ...o });

export const SEED_PEOPLE: SeedPerson[] = [
  mk('u_rhea', 'Rhea Nair', { online: true, replies: ['yesss let’s do it', 'send it over', 'haha ok'] }),
  mk('u_kabir', 'Kabir M.'),
  mk('u_vikram', 'Vikram P.'),
  mk('u_tanvi', 'Tanvi J.'),
  mk('u_ishaan', 'Ishaan P.'),
  mk('u_meera', 'Meera T.'),
  mk('u_sana', 'Sana K.'),
  mk('u_arjun', 'Arjun S.'),
  // Strangers: no shared club, so a first message is a request.
  mk('u_dev', 'Dev S.', { sharesClub: false }),
  mk('u_neha', 'Neha B.', { sharesClub: false }),
  // Blocked the mock user: the chat shows "Can't send".
  mk('u_ananya', 'Ananya R.', { sharesClub: true }),
];

const FIRST = ['Aditya', 'Bhavna', 'Chirag', 'Divya', 'Esha', 'Farhan', 'Gauri', 'Harsh', 'Isha', 'Jatin', 'Kavya', 'Lakshya', 'Mohit', 'Nidhi', 'Omkar', 'Pooja', 'Qasim', 'Riya', 'Siddharth', 'Tara', 'Uday', 'Varun', 'Yash', 'Zoya'];
/** 24 more strangers so the 20-a-day request limit can be reached in the mock. */
export const SEED_STRANGERS: SeedPerson[] = FIRST.map((f, i) => mk(`u_s${String(i + 1).padStart(2, '0')}`, `${f} ${String.fromCharCode(65 + (i % 26))}.`, { sharesClub: false }));

export const SEED_REQUESTS = [
  { userId: 'u_dev', preview: '“hey, saw your DBMS notes — can I ask a doubt?”', text: 'hey, saw your DBMS notes — can I ask a doubt?', agoMin: 25 },
  { userId: 'u_neha', preview: '“hi! are you in 3rd year CSE?”', text: 'hi! are you in 3rd year CSE?', agoMin: 120 },
];

type SeedMsg = { mine: boolean; text?: string; photo?: string; agoMin: number; read?: boolean };
export const SEED_DM_CHATS: { userId: string; unread: number; blockedByThem?: boolean; msgs: SeedMsg[] }[] = [
  { userId: 'u_rhea', unread: 2, msgs: [
    { mine: false, text: 'saw your name on the Hack the Canteen list', agoMin: 50 },
    { mine: true, text: 'yesss. I have a canteen-queue idea', agoMin: 40, read: true },
    { mine: true, photo: 'sketch.jpg', agoMin: 39, read: true },
    { mine: false, text: 'wait you’re in Hack the Canteen too?? team?', agoMin: 2 },
  ] },
  { userId: 'u_kabir', unread: 0, msgs: [{ mine: true, text: 'sending the OS cheat sheet tonight', agoMin: 60, read: true }] },
  { userId: 'u_vikram', unread: 0, msgs: [{ mine: false, photo: 'photo.jpg', agoMin: 1500 }] },
  { userId: 'u_tanvi', unread: 0, msgs: [{ mine: false, text: 'lol same', agoMin: 3000 }] },
  { userId: 'u_ananya', unread: 0, blockedByThem: true, msgs: [{ mine: false, text: 'ok see you at the fest', agoMin: 9000 }] },
];

export const SEED_SQUAD = {
  id: 'sq-htc', name: 'Hack the Canteen squad', max: 8, eventId: 'hack-canteen', eventTitle: 'Hack the Canteen', eventInDays: 8,
  members: ['u_ishaan', 'u_meera', 'u_kabir'], seed: true as const,
  msgs: [
    { who: 'system', text: 'Meera joined via invite link', agoMin: 200 },
    { who: 'u_ishaan', text: 'I’ll take the API. Meera on Figma?', agoMin: 120 },
    { who: 'u_meera', text: 'yes, first screens by Thu night', agoMin: 90 },
    { who: 'u_kabir', text: 'who’s bringing the extension board', agoMin: 20 },
  ],
  poll: { id: 'poll-1', by: 'Kabir', question: 'Build night?', options: [{ id: 'a', label: 'Thu · library 8 PM', votes: 2 }, { id: 'b', label: 'Fri · Kabir’s PG', votes: 1 }] },
};

export const personMeta = (p: { userId: string; name: string }) => ({ initials: initialsOf(p.name), tint: tintFor(p.userId) });
