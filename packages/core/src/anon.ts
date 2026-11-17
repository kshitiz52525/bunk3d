export const ANON_MIN_KARMA = 20;
export const ANON_MIN_ACCOUNT_DAYS = 7;

export type AnonInput = { karma: number; accountAgeDays: number; activeStrike: boolean };

/** Anonymous posting: 20 karma, a 7-day-old account and no active strike. */
export function anonUnlocked(i: AnonInput): boolean {
  return i.karma >= ANON_MIN_KARMA && i.accountAgeDays >= ANON_MIN_ACCOUNT_DAYS && !i.activeStrike;
}
