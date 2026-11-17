import { describe, expect, it } from 'vitest';
import { anonUnlocked, decideOtp, isAdult, parseDob, type OtpAttemptState } from '../src';

const today = new Date(Date.UTC(2026, 10, 18));

describe('age gate', () => {
  it('parses real dates only', () => {
    expect(parseDob('14 / 03 / 2005')).toEqual({ day: 14, month: 3, year: 2005 });
    expect(parseDob('31/02/2005')).toBeNull();
    expect(parseDob('hello')).toBeNull();
  });
  it('requires 18+', () => {
    expect(isAdult({ day: 18, month: 11, year: 2008 }, today)).toBe(true);
    expect(isAdult({ day: 19, month: 11, year: 2008 }, today)).toBe(false);
    expect(isAdult({ day: 14, month: 3, year: 2005 }, today)).toBe(true);
  });
});

describe('otp attempts', () => {
  const fresh: OtpAttemptState = { wrong: 0, lockedUntil: null };
  it('counts down tries and locks on the 4th wrong code', () => {
    let s = fresh;
    const seen: unknown[] = [];
    for (let i = 0; i < 4; i++) {
      const r = decideOtp(s, false, 0);
      seen.push(r.decision);
      s = r.next;
    }
    expect(seen[1]).toEqual({ ok: false, reason: 'wrong', triesLeft: 2 });
    expect(seen[3]).toEqual({ ok: false, reason: 'locked', retryInMinutes: 10 });
  });
  it('stays locked until the 10 minutes pass, then resets', () => {
    const locked = { wrong: 4, lockedUntil: 600000 };
    expect(decideOtp(locked, true, 1000).decision).toMatchObject({ ok: false, reason: 'locked' });
    expect(decideOtp(locked, true, 600001).decision).toEqual({ ok: true });
  });
});

describe('anonymous unlock', () => {
  it('needs 20 karma, 7 days and no active strike', () => {
    expect(anonUnlocked({ karma: 20, accountAgeDays: 7, activeStrike: false })).toBe(true);
    expect(anonUnlocked({ karma: 19, accountAgeDays: 7, activeStrike: false })).toBe(false);
    expect(anonUnlocked({ karma: 20, accountAgeDays: 6, activeStrike: false })).toBe(false);
    expect(anonUnlocked({ karma: 20, accountAgeDays: 7, activeStrike: true })).toBe(false);
    expect(anonUnlocked({ karma: 6, accountAgeDays: 3, activeStrike: false })).toBe(false);
  });
});
