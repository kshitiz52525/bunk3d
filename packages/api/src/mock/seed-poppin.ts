// SEED DATA (mock only). Fake events, hosts, counts and people, all flagged `seed: true` by the mock.
// Times are offsets from "today 00:00" so the This week / Upcoming / Past buckets always have content.
import type { EventSummary, PoppinCategory } from '../contract';

export type SeedEvent = {
  id: string; title: string; hostName: string; category: PoppinCategory; startDay: number; startHour: number; endDay: number; endHour: number;
  venue: string; tint: EventSummary['tint']; paidPaise?: number; capacity: number | null; going: number; friends: number; friendNames: string[];
  team: boolean; description: string; rules: string; waitlist: number; cancelled?: boolean; results?: boolean; rsvpDays: number;
};

export const SEED_EVENTS: SeedEvent[] = [
  {
    id: 'ev-hack2', title: 'Hack the Canteen 2.0', hostName: 'GDG Atria', category: 'Tech', startDay: 2, startHour: 18, endDay: 3, endHour: 6, venue: 'Tech Lab 2',
    tint: 'lime', capacity: 120, going: 86, friends: 3, friendNames: ['Rhea', 'Kabir', 'Vikram'], team: true, waitlist: 0, rsvpDays: 1,
    description: 'Teams of 2–4 build anything that fixes campus life. Mentors from 9 PM, judging at 5 AM. Bring your laptop and college ID.',
    rules: 'Rules · code of conduct · no outside food after midnight',
  },
  {
    id: 'ev-openmic', title: 'Open Mic Night', hostName: 'Music Society', category: 'Cultural', startDay: 3, startHour: 19, endDay: 3, endHour: 22, venue: 'Amphitheatre',
    tint: 'violet', capacity: 80, going: 80, friends: 0, friendNames: [], team: false, waitlist: 3, rsvpDays: 2,
    description: 'Three minutes on stage. Sing, read, joke, play. Sign up at the door for a slot.', rules: 'Keep it kind. No amplified music after 10 PM.',
  },
  {
    id: 'ev-build7', title: 'Build Night #7', hostName: 'GDG Atria', category: 'Tech', startDay: 4, startHour: 17, endDay: 4, endHour: 21, venue: 'Tech Lab 1',
    tint: 'sky', capacity: 60, going: 30, friends: 0, friendNames: [], team: false, waitlist: 0, cancelled: true, rsvpDays: 3,
    description: 'Weekly build night.', rules: 'Bring a laptop.',
  },
  {
    id: 'ev-fest', title: 'Atria Fest — Night 1', hostName: 'Cultural Committee', category: 'Fest', startDay: 9, startHour: 17, endDay: 9, endHour: 23, venue: 'Central Quad',
    tint: 'violet', paidPaise: 19900, capacity: 500, going: 210, friends: 0, friendNames: [], team: false, waitlist: 0, rsvpDays: 7,
    description: 'The first night of Atria Fest. Live acts, food stalls and the main stage.', rules: 'College ID at the gate. No outside food or drink.',
  },
  {
    id: 'ev-cubs', title: 'CUBS 7-a-side Football Cup', hostName: 'CUBS Sports', category: 'Sports', startDay: 10, startHour: 16, endDay: 10, endHour: 20, venue: 'Main Grounds',
    tint: 'sky', capacity: 200, going: 140, friends: 0, friendNames: [], team: false, waitlist: 0, rsvpDays: 8,
    description: 'Knockout football cup. Turn up to play or cheer.', rules: 'Studs allowed. Fair play.',
  },
  {
    id: 'ev-figma', title: 'Figma for Beginners', hostName: 'Design Club', category: 'Workshop', startDay: 14, startHour: 15, endDay: 14, endHour: 17, venue: 'Seminar Hall 1',
    tint: 'pink', capacity: 60, going: 42, friends: 0, friendNames: [], team: false, waitlist: 0, rsvpDays: 12,
    description: 'Learn frames, auto layout and components in two hours. Bring a laptop.', rules: 'Free Figma account required.',
  },
  {
    id: 'ev-hack1', title: 'Hack the Canteen', hostName: 'GDG Atria', category: 'Tech', startDay: -9, startHour: 18, endDay: -8, endHour: 6, venue: 'Tech Lab 2',
    tint: 'lime', capacity: 120, going: 120, friends: 0, friendNames: [], team: true, waitlist: 0, results: true, rsvpDays: -10,
    description: 'A 12-hour hackathon to fix campus life.', rules: 'Rules · code of conduct',
  },
  {
    id: 'ev-fresh', title: 'Freshers’ Night 2026', hostName: 'Cultural Committee', category: 'Fest', startDay: -20, startHour: 19, endDay: -20, endHour: 23, venue: 'Central Quad',
    tint: 'grey', capacity: null, going: 1200, friends: 0, friendNames: [], team: false, waitlist: 0, rsvpDays: -21,
    description: 'Welcome night for the new batch.', rules: '',
  },
];

export const SEED_NAMES = ['Rhea Nair', 'Kabir Mehta', 'Vikram Patil', 'Ananya Pillai', 'Ishaan Rao', 'Meera Shah'];
