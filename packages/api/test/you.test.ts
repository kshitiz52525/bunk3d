import { describe, expect, it } from 'vitest';
import { createCtx } from '../src/mock/ctx';
import { createYou } from '../src/mock/you';

function setup() {
  const ctx = createCtx({ latencyMs: 0, now: () => Date.UTC(2026, 10, 18) });
  ctx.profile = { name: 'Aarav Sharma', username: 'aarav.builds', degree: 'B.Tech', dept: 'CSE', year: '3rd' };
  ctx.setSession({ userId: 'u_returning', campusId: 'atria', verified: 'verified', onboarding: 'done', wave: 4 });
  return createYou(ctx);
}

describe('you', () => {
  it('me() and badges() still work for the shell header', async () => {
    const api = setup();
    expect(await api.me()).toMatchObject({ initials: 'AS', username: 'aarav.builds', campusName: 'Atria University' });
    expect(await api.badges()).toEqual({ unreadDms: false, unreadNotices: 4 });
  });
  it('badge count follows real reads', async () => {
    const api = setup();
    await api.markNoticeRead('n_a');
    expect((await api.badges()).unreadNotices).toBe(3);
    await api.markAllNoticesRead();
    expect((await api.badges()).unreadNotices).toBe(0);
  });
  it('notices: urgent first among unread, read ones sink, filters work', async () => {
    const api = setup();
    const all = await api.notices();
    expect(all[0]).toMatchObject({ id: 'n_a', urgent: true, badge: 'OFFICIAL' });
    expect((await api.notices('Clubs')).every((n) => n.kind === 'Clubs')).toBe(true);
    await api.markNoticeRead('n_a');
    expect((await api.notices()).at(-1)!.id).toBe('n_a');
  });
  it('karma only comes back on the owner profile, never on another profile', async () => {
    const api = setup();
    expect((await api.myProfile()).karma).toBe(142);
    const other = await api.userProfile('u_rhea');
    expect(JSON.stringify(other)).not.toMatch(/karma|phone|email|dob/i);
    expect(other.isSelf).toBe(false);
  });
  it('another profile shows named posts only', async () => {
    const api = setup();
    const p = await api.userProfile('u_rhea');
    expect(p.posts.length).toBeGreaterThan(0);
    await expect(api.userProfile('nobody')).rejects.toThrow();
  });
  it('anonymous posts are marked ANON in the owner view only', async () => {
    const api = setup();
    expect((await api.myContent('posts')).some((i) => i.tileKind === 'anon')).toBe(true);
  });
  it('settings default: quiet hours 10 PM to 8 AM, read receipts off', async () => {
    const api = setup();
    const s = await api.settings();
    expect(s).toMatchObject({ quietStart: '22:00', quietEnd: '08:00', notifications: { quietHours: true, readReceipts: false, replies: true } });
    const n = await api.updateSettings({ notifications: { replies: false } });
    expect(n.notifications.replies).toBe(false);
    expect(n.notifications.dms).toBe(true);
  });
  it('account deletion has a 30-day grace and can be cancelled', async () => {
    const api = setup();
    const d = await api.requestAccountDeletion();
    expect(d.deletionAt).toBe(Date.UTC(2026, 10, 18) + 30 * 86_400_000);
    expect((await api.cancelAccountDeletion()).deletionAt).toBeNull();
  });
  it('search finds across kinds and counts what matched', async () => {
    const api = setup();
    const r = await api.search('dbms');
    expect(r.notes.length).toBe(2);
    expect(r.posts.length).toBe(1);
    expect(r.events.length).toBe(1);
    expect(r.notesTotal).toBe(2);
    const none = await api.search('zzzz');
    expect(none.notesTotal + none.postsTotal + none.eventsTotal + none.clubsTotal).toBe(0);
    expect((await api.search('tech', 'Clubs')).clubs.length).toBeGreaterThan(0);
    expect((await api.search('dbms', 'Posts')).notes).toEqual([]);
  });
});
