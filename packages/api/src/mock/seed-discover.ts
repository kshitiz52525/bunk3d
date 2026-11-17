// SEED DATA. Mock only. Every record is flagged `seed: true`; the real backend replaces it.
import type { RadarPin, SparkCard, SparkIntent } from '../contract';

/** Seed campus centre (Bengaluru). Placeholder coordinates for the mock, not a surveyed location. */
export const SEED_CENTER = { lat: 13.0612, lng: 77.5845 };

type SeedCard = Omit<SparkCard, 'intent'>;
export const SEED_DECK: Record<SparkIntent, SeedCard[]> = {
  Friends: [
    { id: 'u_sana', name: 'Sana K.', initials: 'SK', year: '2nd yr', branch: 'B.Des · Communication', prompt: 'people to try every darshini in Hebbal with', common: ['Music Society', 'Indie rock', '2 mutuals'], tint: '#FF6B9A', seed: true },
    { id: 'u_dev', name: 'Dev R.', initials: 'DR', year: '1st yr', branch: 'B.Tech · CSE', prompt: 'a FIFA rival who loses gracefully', common: ['CUBS Sports', 'Gaming'], tint: '#5CC8FF', seed: true },
  ],
  Study: [
    { id: 'u_nikhil', name: 'Nikhil V.', initials: 'NV', year: '3rd yr', branch: 'B.Tech · ECE', prompt: 'a DSA buddy for placement prep, 2 hrs a day', common: ['GDG Atria', 'Placement Season'], tint: '#D4FF3A', seed: true },
  ],
  Sports: [
    { id: 'u_arjun', name: 'Arjun P.', initials: 'AP', year: '2nd yr', branch: 'BBA', prompt: 'two more for 5-a-side, Sat mornings', common: ['CUBS Sports', 'Football'], tint: '#5CC8FF', seed: true },
  ],
  Events: [
    { id: 'u_meera', name: 'Meera T.', initials: 'MT', year: '2nd yr', branch: 'B.Des · Interaction', prompt: 'a squad for the Nov hackathons', common: ['Hack the Canteen', 'Design Club'], tint: '#FFB547', seed: true },
  ],
  Hangouts: [
    { id: 'u_kabir', name: 'Kabir M.', initials: 'KM', year: '3rd yr', branch: 'B.Tech · AIML', prompt: 'open mic regulars, Thursdays at Lahe Lahe', common: ['Music Society', '4 mutuals'], tint: '#B49CFF', seed: true },
  ],
};

export type SeedSpot = {
  id: string;
  name: string;
  category: RadarPin['category'];
  catLabel: string;
  lat: number;
  lng: number;
  tint: string;
  hours: string;
  price?: string;
  onCampus?: boolean;
  hereNow: number | null;
  busyLabel: string;
  busyNote: string;
  deal?: string;
  tags: [string, number][];
  seed: true;
};

export const SEED_SPOTS: SeedSpot[] = [
  { id: 'third-wave', name: 'Third Wave, Hebbal', category: 'Food', catLabel: 'Café', lat: 13.0715, lng: 77.5905, tint: '#FFB547', hours: 'open till 11 PM', price: '₹₹', hereNow: 14, busyLabel: 'Busy', busyNote: 'usually quieter after 8', deal: '15% off cold brews, weekdays 3–6 PM', tags: [['Good wifi', 31], ['Plug points', 22], ['Loud', 9], ['Group-friendly', 17]], seed: true },
  { id: 'library-l2', name: 'Library L2 pods', category: 'Study', catLabel: 'Study spot', lat: 13.0617, lng: 77.5848, tint: '#5CC8FF', hours: 'open 24×7 till 20 Nov', onCampus: true, hereNow: null, busyLabel: 'Quiet', busyNote: 'pods fill up after 6', tags: [['Good wifi', 40], ['Plug points', 35], ['Loud', 1], ['Group-friendly', 8]], seed: true },
  { id: 'turf-5', name: 'Turf 5, Yelahanka', category: 'Sports', catLabel: 'Turf', lat: 13.0868, lng: 77.5927, tint: '#3DDC97', hours: 'open 6 AM–10 PM', price: '₹₹₹', hereNow: null, busyLabel: 'Open', busyNote: 'book slots by the hour', tags: [['Floodlights', 12], ['Parking', 9], ['Group-friendly', 15]], seed: true },
  { id: 'lahe-lahe', name: 'Lahe Lahe, Indiranagar', category: 'Hangouts', catLabel: 'Hangout', lat: 12.9784, lng: 77.6408, tint: '#FF6B9A', hours: 'open till 1 AM', price: '₹₹', hereNow: null, busyLabel: 'Busy', busyNote: 'open mic on Thursdays', tags: [['Live music', 21], ['Loud', 26], ['Group-friendly', 18]], seed: true },
  { id: 'nandhini', name: 'Nandhini', category: 'Food', catLabel: 'Restaurant', lat: 13.0588, lng: 77.5817, tint: '#FFB547', hours: 'open till 10 PM', price: '₹', hereNow: null, busyLabel: 'Busy', busyNote: 'lunch rush 1 to 2', tags: [['Cheap', 33], ['Group-friendly', 14]], seed: true },
];
