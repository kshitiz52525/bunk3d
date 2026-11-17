import { describe, expect, it } from 'vitest';
import { createMockApi } from '../src/mock';
import { MOCK_CODE } from '../src/mock/seed';

async function signedIn() {
  const a = createMockApi({ latencyMs: 0 });
  await a.auth.verifyOtp('9876540000', MOCK_CODE, { returning: true });
  return a;
}
async function unverified() {
  const a = createMockApi({ latencyMs: 0 });
  await a.auth.verifyOtp('9876543210', MOCK_CODE, { returning: false });
  return a;
}

describe('crew: clubs', () => {
  it('lists my clubs with role and discoverable clubs, filtered by category', async () => {
    const a = await signedIn();
    const r = await a.crew.listClubs('All');
    expect(r.mine.map((c) => [c.id, c.state, c.role])).toEqual([['gdg', 'joined', 'lead'], ['ecell', 'joined', 'member'], ['robo', 'pending', undefined]]);
    expect(r.mine.every((c) => c.seed)).toBe(true);
    const sports = await a.crew.listClubs('Sports');
    expect(sports.discover.map((c) => c.id)).toEqual(['cubs']);
    expect((await a.crew.listClubs('Social')).discover).toEqual([]);
  });
  it('open clubs join at once, approval clubs go pending, leaving works', async () => {
    const a = await signedIn();
    expect(await a.crew.joinClub('cubs')).toBe('joined');
    expect(await a.crew.joinClub('mus')).toBe('pending');
    expect(await a.crew.leaveClub('mus')).toBe('none');
    expect((await a.crew.getClub('cubs')).state).toBe('joined');
  });
  it('club posts are always named', async () => {
    const a = await signedIn();
    const posts = await a.crew.listClubPosts('gdg');
    expect(posts.length).toBeGreaterThan(0);
    for (const p of posts) expect(p.postedBy.name).toBeTruthy();
    const r = await a.crew.adminPostAsClub('gdg', { body: 'Venue is Hall B', eventId: 'hack-canteen' });
    expect(r.ok && r.post.postedBy.name).toBe('Aarav Sharma');
    expect(await a.crew.adminPostAsClub('gdg', { body: '  ' })).toEqual({ ok: false, reason: 'empty' });
    // a plain member of E-Cell cannot post as the club
    expect(await a.crew.adminPostAsClub('ecell', { body: 'hi' })).toEqual({ ok: false, reason: 'not_admin' });
  });
});

describe('crew: tasks', () => {
  it('groups my tasks and filters', async () => {
    const a = await signedIn();
    const open = await a.crew.listMyTasks('Open');
    expect(open.map((g) => g.key)).toEqual(['this_week', 'next_week']);
    expect((await a.crew.listMyTasks('Paid')).flatMap((g) => g.items).map((t) => t.id)).toEqual(['task-expo']);
    expect((await a.crew.listMyTasks('Done'))[0].key).toBe('done');
  });
  it('paid tasks show take-home from computeTakeHome with fee and GST separate (Rs 800 -> Rs 776.40)', async () => {
    const a = await signedIn();
    const t = await a.crew.getTask('task-expo');
    expect(t.reward.kind).toBe('paid');
    if (t.reward.kind !== 'paid') return;
    expect(t.reward.takeHome).toMatchObject({ payPaise: 80000, feePaise: 2000, gstPaise: 360, takeHomePaise: 77640, feeRateBp: 250 });
    expect(t.reward.gigId).toBeTruthy();
  });
  it('walks accept -> start -> submit and refuses skipping', async () => {
    const a = await signedIn();
    expect((await a.crew.getTask('task-build-photos')).allowed).toEqual(['accept']);
    await expect(a.crew.advanceTask('task-build-photos', 'submit')).rejects.toThrow();
    expect((await a.crew.advanceTask('task-build-photos', 'accept')).status).toBe('accepted');
    expect((await a.crew.advanceTask('task-build-photos', 'start')).status).toBe('working');
    const done = await a.crew.advanceTask('task-build-photos', 'submit', { attachmentName: 'x.zip' });
    expect(done.status).toBe('review');
    expect(done.attachments).toEqual(['x.zip']);
  });
  it('revision loop: admin asks for changes, the student resubmits', async () => {
    const a = await signedIn();
    const t = await a.crew.getTask('task-posters');
    expect(t.status).toBe('revision');
    expect(t.revisionNote?.by).toBe('Rhea');
    const r = await a.crew.advanceTask('task-posters', 'submit');
    expect(r.status).toBe('review');
    expect(r.revisionNote).toBeUndefined();
    expect((await a.crew.adminReviewTask('task-posters', 'request_revision', 'resize')).revisionNote?.text).toBe('resize');
  });
});

describe('crew: quests and clout', () => {
  it('clout ranks clubs only, sorted by xp', async () => {
    const a = await signedIn();
    const b = await a.crew.cloutBoard('campus');
    expect(b.rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(b.rows[0].name).toBe('GDG Atria');
    expect(b.rows.find((r) => r.clubId === 'ecell')?.mine).toBe(true);
    for (const r of b.rows) expect(Object.keys(r)).not.toContain('userId');
    expect((await a.crew.cloutBoard('inter_college')).rows[0].name).toBe('IEEE RVCE');
  });
  it('enrols a squad in a quest and toggles', async () => {
    const a = await signedIn();
    expect((await a.crew.enrollQuest('q-pyq')).enrolled).toBe(true);
    expect((await a.crew.listQuests()).open.find((q) => q.id === 'q-pyq')?.enrolled).toBe(true);
    expect((await a.crew.enrollQuest('q-pyq')).enrolled).toBe(false);
    expect((await a.crew.submitQuestMilestone('q-chai')).ok).toBe(false); // 9 / 15
  });
});

describe('crew: club chat', () => {
  it('members post; announcements are admin only; non members cannot post', async () => {
    const a = await signedIn();
    const sent = await a.crew.sendChannelMessage('ecell', 'general', 'hello');
    expect(sent.ok).toBe(true);
    expect(await a.crew.sendChannelMessage('ecell', 'announcements', 'hi')).toEqual({ ok: false, reason: 'admin_only' });
    expect((await a.crew.sendChannelMessage('gdg', 'announcements', 'Results Sunday')).ok).toBe(true);
    expect(await a.crew.sendChannelMessage('cubs', 'general', 'hi')).toEqual({ ok: false, reason: 'not_member' });
    const v = await a.crew.getChannel('ecell', 'announcements');
    expect(v.canPost).toBe(false);
  });
  it('fires subscribers and reflects the message in DMs under Clubs', async () => {
    const a = await signedIn();
    let n = 0;
    const off = a.crew.subscribe(() => n++);
    await a.crew.sendChannelMessage('gdg', 'general', 'new msg');
    off();
    expect(n).toBeGreaterThan(0);
    const clubs = await a.dm.listChats('Clubs');
    const row = clubs.rows.find((r) => r.clubId === 'gdg');
    expect(row?.channel).toBe('#general');
    expect(row?.lastMessage).toBe('You: new msg');
  });
  it('unverified users cannot post', async () => {
    const a = await unverified();
    expect((await a.crew.sendChannelMessage('gdg', 'general', 'x')).ok).toBe(false);
  });
});
