import { describe, expect, it } from 'vitest';
import { createMockApi } from '../src/mock';
import { MOCK_CODE } from '../src/mock/seed';

const atria = { type: 'campus', campusId: 'atria' } as const;
async function returning() {
  const a = createMockApi({ latencyMs: 0 });
  await a.auth.verifyOtp('9876543210', MOCK_CODE, { returning: true });
  return a;
}
async function fresh() {
  const a = createMockApi({ latencyMs: 0 });
  await a.auth.verifyOtp('9876543210', MOCK_CODE, { returning: false });
  return a;
}

describe('tea feed', () => {
  it('never shows other campuses, held or collapsed-hidden posts to others; own under-review post is flagged', async () => {
    const a = await returning();
    const { posts } = await a.tea.getFeed({ scope: atria, sort: 'hot' });
    expect(posts.find((p) => p.id === 'p12')).toBeUndefined();
    expect(posts.find((p) => p.id === 'p11')?.status).toBe('under_review');
    expect(posts.every((p) => p.scope.type === 'campus')).toBe(true);
    expect(posts.find((p) => p.id === 'p10')?.collapsed).toBe(true);
  });
  it('community feed has no campus-only posts and shows college names', async () => {
    const a = await returning();
    const { posts } = await a.tea.getFeed({ scope: { type: 'community', communityId: 'placement27' }, sort: 'new' });
    expect(posts.length).toBeGreaterThan(0);
    expect(posts.every((p) => p.scope.type === 'community' && !!p.collegeName)).toBe(true);
  });
  it('anonymous posts never expose the author', async () => {
    const a = await returning();
    const { posts } = await a.tea.getFeed({ scope: atria, sort: 'new' });
    const anon = posts.find((p) => p.id === 'p1')!;
    expect(anon.author).toEqual({ anon: true, label: 'Anonymous' });
  });
});

describe('tea gates', () => {
  it('pending users read but cannot vote, post or comment', async () => {
    const a = await fresh();
    a.auth.getSession(); // new user, unverified until verification
    const r = await a.tea.vote('p1', 1);
    expect(r).toEqual({ ok: false, reason: 'not_verified' });
    const c = await a.tea.createPost({ scope: atria, topic: 'Random', body: 'hi', anon: false });
    expect(c).toEqual({ ok: false, reason: 'not_verified' });
  });
  it('voting toggles and updates score', async () => {
    const a = await returning();
    const before = (await a.tea.getPost('p2'))!.post.score;
    const r1 = await a.tea.vote('p2', 1);
    expect(r1.ok && r1.score).toBe(before + 1);
    const r2 = await a.tea.vote('p2', 1);
    expect(r2.ok && r2.myVote).toBe(0);
  });
  it('status is private and reflects anon unlock', async () => {
    const a = await returning();
    expect((await a.tea.myStatus()).anonUnlocked).toBe(true);
  });
});

describe('tea posting', () => {
  it('safety check holds anon posts pointing at a student and shows them only to the author', async () => {
    const a = await returning();
    const r = await a.tea.createPost({ scope: atria, topic: 'Rant', body: 'ask @rohit_k', anon: true });
    expect(r.ok && r.status).toBe('with_mods');
    const feed = await a.tea.getFeed({ scope: atria, sort: 'new' });
    expect(feed.posts.find((p) => p.body === 'ask @rohit_k')?.status).toBe('with_mods');
  });
  it('removal gives a strike, appeal restores once; a second strike mutes for 24 h', async () => {
    const a = await returning();
    const r1 = await a.tea.createPost({ scope: atria, topic: 'Rant', body: 'kys', anon: false });
    expect(r1.ok === false && r1.reason === 'removed' && r1.strike).toBe(1);
    const mod = await a.tea.myModeration();
    expect(mod[0]).toMatchObject({ kind: 'removed', appeal: 'available' });
    const r2 = await a.tea.createPost({ scope: atria, topic: 'Rant', body: 'kys again', anon: false });
    expect(r2.ok === false && r2.reason === 'removed' && r2.mutedUntil).toBeTruthy();
    const muted = await a.tea.createPost({ scope: atria, topic: 'Rant', body: 'hello', anon: false });
    expect(muted.ok === false && muted.reason).toBe('muted');
    expect((await a.tea.addComment('p2', { body: 'hi', anon: false })).ok).toBe(false);
    expect((await a.tea.vote('p2', 1)).ok).toBe(true);
  });
  it('anon locked for fresh accounts', async () => {
    const a = await fresh();
    expect((await a.tea.myStatus()).anonUnlocked).toBe(false);
  });
  it('requires a destination, never anon or community stories', async () => {
    const a = await returning();
    const media = [{ kind: 'image' as const, ratio: 1, alt: 'x' }];
    expect(await a.tea.createPost({ scope: atria, topic: 'Random', body: '', anon: false, media, storyOnly: false, alsoStory: false })).toMatchObject({ ok: true });
    expect(await a.tea.createPost({ scope: atria, topic: 'Random', body: 'x', anon: true, media, alsoStory: true })).toEqual({ ok: false, reason: 'anon_story' });
    expect(await a.tea.createPost({ scope: { type: 'community', communityId: 'placement27' }, topic: 'Rant', body: 'x', anon: false, media, alsoStory: true })).toEqual({ ok: false, reason: 'community_story' });
  });
  it('validates story video: 15 s and 50 MB', async () => {
    const a = await returning();
    const v = (durationSec: number, sizeBytes: number) => ({ kind: 'video' as const, ratio: 0.5625, alt: 'v', durationSec, sizeBytes });
    expect(await a.tea.createPost({ scope: atria, topic: 'Random', body: '', anon: false, media: [v(16, 1)], storyOnly: true })).toEqual({ ok: false, reason: 'video_too_long' });
    expect(await a.tea.createPost({ scope: atria, topic: 'Random', body: '', anon: false, media: [v(5, 51 * 1024 * 1024)], storyOnly: true })).toEqual({ ok: false, reason: 'video_too_big' });
    const ok = await a.tea.createPost({ scope: atria, topic: 'Random', body: '', anon: false, media: [v(15, 50 * 1024 * 1024)], storyOnly: true });
    expect(ok.ok && ok.storyId).toBeTruthy();
    const mine = (await a.tea.getStories()).find((g) => g.mine);
    expect(mine?.items[0]?.media.kind).toBe('video');
  });
  it('only your own post goes to your story', async () => {
    const a = await returning();
    expect(await a.tea.addPostToStory('p2')).toEqual({ ok: false, reason: 'not_yours' });
  });
});

describe('tea comments', () => {
  it('numbers anonymous commenters per thread', async () => {
    const a = await returning();
    const t = await a.tea.getPost('p1');
    const labels = t!.comments.filter((c) => c.author.kind === 'anon').map((c) => (c.author as { label: string }).label);
    expect(labels).toEqual(['Anon 1', 'Anon 2']);
  });
});
