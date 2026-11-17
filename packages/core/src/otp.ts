/** 4 wrong codes lock the number for 10 minutes (S1: "Too many tries"). */
export const OTP_MAX_WRONG = 4;
export const OTP_LOCK_MINUTES = 10;

export type OtpAttemptState = { wrong: number; lockedUntil: number | null };

export type OtpDecision =
  | { ok: true }
  | { ok: false; reason: 'wrong'; triesLeft: number }
  | { ok: false; reason: 'locked'; retryInMinutes: number };

export function decideOtp(state: OtpAttemptState, correct: boolean, now: number): { decision: OtpDecision; next: OtpAttemptState } {
  if (state.lockedUntil !== null && now < state.lockedUntil) {
    return { decision: { ok: false, reason: 'locked', retryInMinutes: Math.ceil((state.lockedUntil - now) / 60000) }, next: state };
  }
  const base = state.lockedUntil !== null ? { wrong: 0, lockedUntil: null } : state;
  if (correct) return { decision: { ok: true }, next: { wrong: 0, lockedUntil: null } };
  const wrong = base.wrong + 1;
  if (wrong >= OTP_MAX_WRONG) {
    return {
      decision: { ok: false, reason: 'locked', retryInMinutes: OTP_LOCK_MINUTES },
      next: { wrong, lockedUntil: now + OTP_LOCK_MINUTES * 60000 },
    };
  }
  return { decision: { ok: false, reason: 'wrong', triesLeft: OTP_MAX_WRONG - wrong }, next: { wrong, lockedUntil: null } };
}
