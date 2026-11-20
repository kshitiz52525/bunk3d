import { describe, expect, it } from 'vitest';
import { createMockApi } from '../src/mock';
import { MOCK_STAFF_CODE, MOCK_STAFF_PASSWORD, SEED_STAFF } from '../src/mock/seed-staff';

const api = () => createMockApi({ latencyMs: 0 });
const login = { email: 'ops@seed.example', password: MOCK_STAFF_PASSWORD };

describe('staff sign-in', () => {
  it('has one seeded account per role', () => {
    expect(new Set(SEED_STAFF.map((s) => s.role)).size).toBe(SEED_STAFF.length);
  });
  it('password then code signs in, and the challenge is single use', async () => {
    const a = api();
    const r = await a.staff.signIn(login);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.challenge.emailHint).toBe('o***@seed.example');
    const v = await a.staff.verifyCode({ challengeId: r.challenge.challengeId, code: MOCK_STAFF_CODE });
    expect(v.ok && v.staff.role).toBe('ops');
    expect(await a.staff.verifyCode({ challengeId: r.challenge.challengeId, code: MOCK_STAFF_CODE })).toEqual({ ok: false, reason: 'expired' });
  });
  it('does not say whether an email exists', async () => {
    const a = api();
    expect(await a.staff.signIn({ email: 'nobody@seed.example', password: 'x' })).toEqual({ ok: false, reason: 'invalid' });
    expect(await a.staff.signIn({ email: login.email, password: 'wrong' })).toEqual({ ok: false, reason: 'invalid' });
  });
  it('locks after 4 wrong passwords and after 4 wrong codes', async () => {
    const a = api();
    let last;
    for (let i = 0; i < 4; i++) last = await a.staff.signIn({ email: login.email, password: 'bad' });
    expect(last).toMatchObject({ ok: false, reason: 'locked' });
    const b = api();
    const r = await b.staff.signIn(login);
    if (!r.ok) throw new Error('sign in failed');
    let v;
    for (let i = 0; i < 4; i++) v = await b.staff.verifyCode({ challengeId: r.challenge.challengeId, code: '000000' });
    expect(v).toMatchObject({ ok: false, reason: 'locked' });
  });
  it('expires a challenge after 10 minutes', async () => {
    let t = 1_000_000;
    const a = createMockApi({ latencyMs: 0, now: () => t });
    const r = await a.staff.signIn(login);
    if (!r.ok) throw new Error('sign in failed');
    t += 11 * 60_000;
    expect(await a.staff.verifyCode({ challengeId: r.challenge.challengeId, code: MOCK_STAFF_CODE })).toEqual({ ok: false, reason: 'expired' });
  });
});
