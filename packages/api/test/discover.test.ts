import { describe, expect, it } from 'vitest';
import { createCtx } from '../src/mock/ctx';
import { createDiscover, MOCK_APPROVE_AFTER_MS } from '../src/mock/discover';
import { createMockApi } from '../src/mock';
import { MOCK_CODE } from '../src/mock/seed';

const MIN = 60_000;
const HOUR = 3_600_000;
function setup(verified: 'verified' | 'pending' = 'verified') {
  let t = Date.UTC(2026, 10, 18, 6, 30); // noon IST
  const ctx = createCtx({ latencyMs: 0, now: () => t });
  ctx.setSession({ userId: 'u_returning', campusId: 'atria', verified, onboarding: 'done', wave: 4 });
  return { api: createDiscover(ctx), tick: (ms: number) => (t += ms), now: () => t };
}
const plan = (toId: string) => ({ toId, plan: 'Chai run', spot: 'Third Wave, Hebbal', time: 'Today 5 PM' });

describe('discover is off by default', () => {
  it('prefs start with discoverOn false and nothing in the deck', async () => {
    const { api } = setup();
    expect((await api.sparkPrefs()).discoverOn).toBe(false);
    expect(await api.sparkDeck('Friends')).toEqual([]);
  });
  it('cannot send an invite or create a meetup while off', async () => {
    const { api } = setup();
    expect(await api.sendInvite(plan('u_sana'))).toEqual({ ok: false, reason: 'off' });
    await expect(api.createMeetup({ title: 'x', spotId: 'library-l2', startsAt: 1, durationHours: 1, visibility: 'campus', max: 4 })).rejects.toThrow();
  });
  it('turning it on shows the deck; unverified users cannot turn it on', async () => {
    const { api } = setup();
    await api.updateSparkPrefs({ discoverOn: true });
    expect((await api.sparkDeck('Friends')).length).toBeGreaterThan(0);
    const p = setup('pending');
    const prefs = await p.api.updateSparkPrefs({ discoverOn: true });
    expect(prefs).toMatchObject({ discoverOn: false, eligible: false });
  });
  it('a paused user is hidden from decks', async () => {
    const { api, tick } = setup();
    await api.updateSparkPrefs({ discoverOn: true, pausedUntil: tick(0) + 7 * 24 * HOUR });
    expect(await api.sparkDeck('Friends')).toEqual([]);
  });
  it('a passed card does not come back', async () => {
    const { api } = setup();
    await api.updateSparkPrefs({ discoverOn: true });
    const d = await api.sparkDeck('Friends');
    await api.sparkPass(d[0].id);
    expect((await api.sparkDeck('Friends')).some((c) => c.id === d[0].id)).toBe(false);
  });
});

describe('shoot your shot', () => {
  it('3 a day, then refused', async () => {
    const { api } = setup();
    await api.updateSparkPrefs({ discoverOn: true });
    expect((await api.inviteQuota()).left).toBe(3);
    for (let i = 2; i >= 0; i--) {
      const r = await api.sendInvite(plan('u_sana'));
      expect(r).toMatchObject({ ok: true, left: i });
    }
    expect(await api.sendInvite(plan('u_sana'))).toEqual({ ok: false, reason: 'limit' });
  });
  it('quota resets the next day', async () => {
    const { api, tick } = setup();
    await api.updateSparkPrefs({ discoverOn: true });
    for (let i = 0; i < 3; i++) await api.sendInvite(plan('u_sana'));
    tick(13 * HOUR);
    expect((await api.inviteQuota()).left).toBe(3);
  });
  it('an invite must be a concrete plan', async () => {
    const { api } = setup();
    await api.updateSparkPrefs({ discoverOn: true });
    expect(await api.sendInvite({ toId: 'u_sana', plan: 'hey', spot: '', time: '' })).toEqual({ ok: false, reason: 'not_concrete' });
    expect((await api.inviteQuota()).left).toBe(3);
  });
  it('declines are silent: the sender never sees them', async () => {
    const { api } = setup();
    const before = await api.invites();
    await api.respondInvite('inv_a', 'decline');
    const after = await api.invites();
    expect(after.received.find((i) => i.id === 'inv_a')!.reply).toEqual({ kind: 'decline', suggestedTime: undefined });
    expect(after.sent).toEqual(before.sent);
    expect(JSON.stringify(after.sent)).not.toMatch(/declin/i);
  });
  it('an unanswered invite shows expired after 48 h, never "declined"', async () => {
    const { api, tick } = setup();
    await api.updateSparkPrefs({ discoverOn: true });
    await api.sendInvite(plan('u_sana'));
    tick(49 * HOUR);
    const s = (await api.invites()).sent;
    expect(s.every((o) => o.status !== ('declined' as string))).toBe(true);
    expect(s[0].status).toBe('expired');
  });
  it('invites expire after 48 h on the receiving side too', async () => {
    const { api, tick } = setup();
    expect((await api.invites()).received).toHaveLength(2);
    tick(30 * HOUR);
    expect((await api.invites()).received.map((i) => i.id)).toEqual(['inv_a']);
  });
});

describe('location sharing', () => {
  it('ghost mode is on by default and nothing is shared', async () => {
    const { api } = setup();
    expect(await api.locationSharing()).toEqual({ ghost: true, active: null, approx: null });
    expect((await api.radar()).you).toBeNull();
  });
  it('requires picked people and a valid duration', async () => {
    const { api } = setup();
    expect(await api.startLocationShare({ personIds: [], minutes: 30 })).toEqual({ ok: false, reason: 'nobody' });
    expect(await api.startLocationShare({ personIds: ['u_rhea'], minutes: 45 })).toEqual({ ok: false, reason: 'bad_duration' });
  });
  it('shares only an approximate point, never the exact one', async () => {
    const { api } = setup();
    const exact = { lat: 13.06291, lng: 77.58701 };
    const r = await api.startLocationShare({ personIds: ['u_rhea'], minutes: 30, position: exact });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.approx).not.toEqual(exact);
    expect(JSON.stringify(r.state)).not.toContain('13.06291');
    expect(r.state.active!.names).toEqual(['Rhea']);
  });
  it('switches off by itself', async () => {
    const { api, tick } = setup();
    await api.startLocationShare({ personIds: ['u_rhea'], minutes: 15 });
    tick(14 * MIN);
    expect((await api.locationSharing()).active).not.toBeNull();
    tick(2 * MIN);
    expect(await api.locationSharing()).toMatchObject({ active: null, approx: null });
  });
  it('can be extended by 15 min and stopped', async () => {
    const { api } = setup();
    await api.startLocationShare({ personIds: ['u_rhea'], minutes: 30 });
    expect((await api.extendLocationShare()).active!.minutesLeft).toBe(45);
    expect((await api.stopLocationShare()).active).toBeNull();
  });
  it('turning ghost off does not start a share', async () => {
    const { api } = setup();
    const s = await api.setGhost(false);
    expect(s.active).toBeNull();
  });
});

describe('meetups', () => {
  it('shows the exact spot only to approved people, and only 1 hour before', async () => {
    const { api, tick, now } = setup();
    const list = await api.radar();
    expect(list.meetups.length).toBeGreaterThan(0);
    // Sunday five-a-side: far in the future.
    const before = await api.meetup('m_five');
    expect(before.exactSpot).toBeUndefined();
    expect(JSON.stringify(before)).not.toContain('pitch 2');
    await api.requestJoinMeetup('m_five');
    expect((await api.meetup('m_five')).joinState).toBe('pending');
    tick(MOCK_APPROVE_AFTER_MS + 1);
    const approved = await api.meetup('m_five');
    expect(approved.joinState).toBe('approved');
    // approved, but still more than an hour before the start: no exact spot yet
    expect(approved.exactSpot).toBeUndefined();
    tick(approved.revealsAt - now() - MIN);
    expect((await api.meetup('m_five')).exactSpot).toBeUndefined(); // 1 minute early
    tick(2 * MIN);
    expect((await api.meetup('m_five')).exactSpot).toBe('Turf 5, Yelahanka, pitch 2');
  });
  it('reveals once approved and inside the hour', async () => {
    const { api, tick } = setup();
    // Chai & Code is live now.
    expect((await api.meetup('m_chai')).exactSpot).toBeUndefined(); // not approved yet
    await api.requestJoinMeetup('m_chai');
    tick(MOCK_APPROVE_AFTER_MS + 1);
    const d = await api.meetup('m_chai');
    expect(d.exactSpot).toBe('Library L2, pod 4');
    expect(d.chatOpen).toBe(true);
  });
  it('the host always sees the exact spot', async () => {
    const { api, tick } = setup();
    await api.updateSparkPrefs({ discoverOn: true });
    const { id } = await api.createMeetup({ title: 'Test', spotId: 'library-l2', startsAt: tick(0) + 48 * HOUR, durationHours: 2, visibility: 'campus', max: 6 });
    const d = await api.meetup(id);
    expect(d.isHost).toBe(true);
    expect(d.exactSpot).toBeTruthy();
    expect(d.going).toBe(1); // the host
  });
  it('radar returns places and meetups only, no people positions', async () => {
    const { api } = setup();
    const r = await api.radar('Food');
    expect(r.pins.every((p) => p.category === 'Food')).toBe(true);
    expect(Object.keys(r)).toEqual(['center', 'pins', 'meetups', 'you']);
  });
  it('spot tags can be voted', async () => {
    const { api } = setup();
    const before = (await api.spot('third-wave')).tags.find((t) => t.label === 'Good wifi')!.votes;
    await api.voteSpotTag('third-wave', 'Good wifi', true);
    const after = (await api.spot('third-wave')).tags.find((t) => t.label === 'Good wifi')!;
    expect(after).toMatchObject({ votes: before + 1, mine: true });
  });
});

describe('on the mock API root', () => {
  it('is wired for a signed-in user', async () => {
    const a = createMockApi({ latencyMs: 0 });
    await a.auth.verifyOtp('9876543210', MOCK_CODE, { returning: true });
    expect((await a.discover.sparkPrefs()).discoverOn).toBe(false);
  });
});
