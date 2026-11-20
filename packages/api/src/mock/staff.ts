import { decideOtp, type OtpAttemptState } from '@bunk3d/core';
import type { StaffApi, StaffChallenge } from '../contract';
import type { MockCtx } from './ctx';
import { MOCK_STAFF_CODE, MOCK_STAFF_PASSWORD, SEED_STAFF } from './seed-staff';

const CHALLENGE_MS = 10 * 60_000;

export function createStaff(ctx: MockCtx): StaffApi {
  const challenges = new Map<string, { staffId: string; expiresAt: number }>();
  const attempts = new Map<string, OtpAttemptState>(); // by staff id
  const passwordAttempts = new Map<string, OtpAttemptState>(); // by email
  let n = 0;
  const hint = (email: string) => email.replace(/^(.).*(@.*)$/, '$1***$2');

  return {
    async signIn({ email, password }) {
      await ctx.wait();
      const e = email.trim().toLowerCase();
      const staff = SEED_STAFF.find((s) => s.email === e);
      const state = passwordAttempts.get(e) ?? { wrong: 0, lockedUntil: null };
      const { decision, next } = decideOtp(state, !!staff && password === MOCK_STAFF_PASSWORD, ctx.now());
      passwordAttempts.set(e, next);
      if (!decision.ok) return decision.reason === 'locked' ? { ok: false, reason: 'locked', retryInMinutes: decision.retryInMinutes } : { ok: false, reason: 'invalid' };
      const challenge: StaffChallenge = { challengeId: `ch_${++n}_${Math.abs(ctx.now()) % 100000}`, emailHint: hint(e) };
      challenges.set(challenge.challengeId, { staffId: staff!.id, expiresAt: ctx.now() + CHALLENGE_MS });
      return { ok: true, challenge };
    },
    async verifyCode({ challengeId, code }) {
      await ctx.wait();
      const c = challenges.get(challengeId);
      if (!c || c.expiresAt < ctx.now()) { challenges.delete(challengeId); return { ok: false, reason: 'expired' }; }
      const state = attempts.get(c.staffId) ?? { wrong: 0, lockedUntil: null };
      const { decision, next } = decideOtp(state, code === MOCK_STAFF_CODE, ctx.now());
      attempts.set(c.staffId, next);
      if (!decision.ok) return decision.reason === 'locked' ? { ok: false, reason: 'locked', retryInMinutes: decision.retryInMinutes } : { ok: false, reason: 'wrong', triesLeft: decision.triesLeft };
      challenges.delete(challengeId); // a challenge is single use
      return { ok: true, staff: SEED_STAFF.find((s) => s.id === c.staffId)! };
    },
    async getStaff(id) {
      return SEED_STAFF.find((s) => s.id === id) ?? null;
    },
  };
}
