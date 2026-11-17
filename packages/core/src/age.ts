export type Dob = { day: number; month: number; year: number };

/** Parses "DD / MM / YYYY" (spaces optional). Returns null if not a real calendar date. */
export function parseDob(input: string): Dob | null {
  const m = input.replace(/\s/g, '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  if (year < 1900) return null;
  return { day, month, year };
}

/** 18+ only. Exactly 18 today counts as an adult. */
export function isAdult(dob: Dob, today: Date): boolean {
  let age = today.getUTCFullYear() - dob.year;
  const before =
    today.getUTCMonth() + 1 < dob.month || (today.getUTCMonth() + 1 === dob.month && today.getUTCDate() < dob.day);
  if (before) age -= 1;
  return age >= 18;
}
