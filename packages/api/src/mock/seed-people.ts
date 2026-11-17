// SEED DATA. Mock only. People the Discover, You and Safety mocks refer to. Every record is flagged `seed: true`.
export type SeedPerson = {
  id: string;
  name: string;
  initials: string;
  tint: string;
  year: string;
  dept: string;
  degree: string;
  username: string;
  bio: string;
  clubs: { id: string; name: string; role?: 'admin' | 'member' }[];
  seed: true;
};

export const SEED_PEOPLE: SeedPerson[] = [
  { id: 'u_rhea', name: 'Rhea Nair', initials: 'RN', tint: '#D4FF3A', year: '2nd yr', dept: 'CS & AI', degree: 'B.Tech', username: 'rhea.builds', bio: 'badminton at 6, ML papers at midnight', clubs: [{ id: 'gdg', name: 'GDG Atria', role: 'admin' }, { id: 'cubs', name: 'CUBS Sports' }], seed: true },
  { id: 'u_kabir', name: 'Kabir M.', initials: 'KM', tint: '#B49CFF', year: '3rd yr', dept: 'AIML', degree: 'B.Tech', username: 'kabir.m', bio: 'open mic regular', clubs: [{ id: 'music', name: 'Music Society' }], seed: true },
  { id: 'u_sana', name: 'Sana K.', initials: 'SK', tint: '#FF6B9A', year: '2nd yr', dept: 'Communication', degree: 'B.Des', username: 'sana.k', bio: 'darshini hunter', clubs: [{ id: 'music', name: 'Music Society' }], seed: true },
  { id: 'u_dev', name: 'Dev R.', initials: 'DR', tint: '#5CC8FF', year: '1st yr', dept: 'CSE', degree: 'B.Tech', username: 'dev.r', bio: 'FIFA, gracefully losing', clubs: [{ id: 'cubs', name: 'CUBS Sports' }], seed: true },
  { id: 'u_nikhil', name: 'Nikhil V.', initials: 'NV', tint: '#D4FF3A', year: '3rd yr', dept: 'ECE', degree: 'B.Tech', username: 'nikhil.v', bio: 'placement prep, one problem a day', clubs: [{ id: 'gdg', name: 'GDG Atria' }], seed: true },
  { id: 'u_arjun', name: 'Arjun P.', initials: 'AP', tint: '#5CC8FF', year: '2nd yr', dept: 'BBA', degree: 'BBA', username: 'arjun.p', bio: 'five-a-side, Saturday mornings', clubs: [{ id: 'cubs', name: 'CUBS Sports' }], seed: true },
  { id: 'u_meera', name: 'Meera T.', initials: 'MT', tint: '#FFB547', year: '2nd yr', dept: 'Interaction', degree: 'B.Des', username: 'meera.t', bio: 'hackathon squads', clubs: [{ id: 'design', name: 'Design Club' }], seed: true },
];

export const personById = (id: string) => SEED_PEOPLE.find((p) => p.id === id);
