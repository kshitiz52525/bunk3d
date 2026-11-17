import { describe, expect, it } from 'vitest';
import { createMockApi } from '../src/mock';
import { MOCK_CODE } from '../src/mock/seed';

const api = () => createMockApi({ latencyMs: 0 });

describe('mock auth', () => {
  it('locks after 4 wrong codes', async () => {
    const a = api();
    const r = [];
    for (let i = 0; i < 4; i++) r.push(await a.auth.verifyOtp('9876543210', '000000', { returning: false }));
    expect(r[1]).toEqual({ ok: false, reason: 'wrong', triesLeft: 2 });
    expect(r[3]).toEqual({ ok: false, reason: 'locked', retryInMinutes: 10 });
    expect(a.auth.getSession()).toBeNull();
  });
  it('new user lands on college step; returning user goes straight in', async () => {
    const n = api();
    const rn = await n.auth.verifyOtp('9876543210', MOCK_CODE, { returning: false });
    expect(rn.ok && rn.session.onboarding).toBe('college');
    const r = api();
    const rr = await r.auth.verifyOtp('9876543210', MOCK_CODE, { returning: true });
    expect(rr.ok && rr.session.onboarding).toBe('done');
  });
});

describe('mock onboarding', () => {
  it('under 18 deletes what was entered and does not advance', async () => {
    const a = api();
    await a.auth.signInWithGoogle({ returning: false });
    const res = await a.onboarding.saveProfile({ name: 'A', username: 'a1', degree: 'B.Tech', dept: 'CSE', year: '1st', dob: '01 / 01 / 2015' });
    expect(res).toEqual({ ok: false, reason: 'underage' });
    expect((await a.onboarding.getDraft()).profile).toEqual({});
    expect(a.auth.getSession()?.onboarding).toBe('college');
  });
  it('never keeps the date of birth for adults either', async () => {
    const a = api();
    await a.auth.signInWithGoogle({ returning: false });
    await a.onboarding.saveProfile({ name: 'A', username: 'a1', degree: 'B.Tech', dept: 'CSE', year: '3rd', dob: '14 / 03 / 2005' });
    expect(JSON.stringify(await a.onboarding.getDraft())).not.toContain('2005');
  });
  it('approval clubs go pending, open clubs join', async () => {
    const a = api();
    expect(await a.onboarding.setClubMembership('robo', true)).toBe('pending');
    expect(await a.onboarding.setClubMembership('gdg', true)).toBe('joined');
    expect(await a.onboarding.setClubMembership('gdg', false)).toBe('none');
  });
});
