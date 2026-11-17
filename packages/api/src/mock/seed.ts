// SEED DATA. Mock only. Every record is flagged `seed: true` and the real backend replaces it.
import type { Campus, Club } from '../contract';

export const SEED_CAMPUSES: Campus[] = [
  { id: 'atria', short: 'AU', name: 'Atria University', city: 'Bengaluru', verifyMethod: 'email', emailDomain: 'atriauniversity.edu.in', tint: '#D4FF3A', seed: true },
  { id: 'christ', short: 'CU', name: 'Christ University', city: 'Bengaluru', verifyMethod: 'id', tint: '#B49CFF', seed: true },
];

export const SEED_CLUBS: Club[] = [
  { id: 'gdg', short: 'GDG', name: 'GDG Atria', category: 'Tech', members: 142, join: 'open', tint: '#D4FF3A', seed: true },
  { id: 'robo', short: 'RBX', name: 'Robotics Society', category: 'Tech', members: 116, join: 'approval', tint: '#B49CFF', seed: true },
  { id: 'ecell', short: 'E-C', name: 'E-Cell Atria', category: 'Startups', members: 98, join: 'open', tint: '#FF6B9A', seed: true },
  { id: 'cubs', short: 'CUBS', name: 'CUBS Sports', category: 'Sports', members: 210, join: 'open', tint: '#5CC8FF', seed: true },
];

/** Mock-only: the one code the mock accepts for both phone and email verification. */
export const MOCK_CODE = '123456';
/** Mock-only: a phone that already has an account, for the returning-user path. */
export const MOCK_RETURNING_PHONE_SUFFIX = '0000';
