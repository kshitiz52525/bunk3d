import { describe, expect, it } from 'vitest';
import { createCtx } from '../src/mock/ctx';
import { createSafety } from '../src/mock/safety';
import { createMockApi } from '../src/mock';
import { MOCK_CODE } from '../src/mock/seed';

const DAY = 86_400_000;
function setup(userId = 'u_returning', strikes: Record<string, number[]> = {}) {
  let t = Date.UTC(2026, 10, 18, 6, 30);
  const ctx = createCtx({ latencyMs: 0, now: () => t });
  ctx.setSession({ userId, campusId: 'atria', verified: 'verified', onboarding: 'done', wave: 4 });
  return { ctx, strikes, api: createSafety(ctx, { strikes }), tick: (ms: number) => (t += ms), now: () => t };
}

describe('reports', () => {
  it('lands in the mod queue and merges repeat reports on one target', async () => {
    const { api } = setup();
    const before = (await api.modQueue()).waiting;
    await api.report({ targetKind: 'post', targetId: 'p_x', reason: 'harassment' });
    const q1 = await api.modQueue();
    expect(q1.waiting).toBe(before + 1);
    await api.report({ targetKind: 'post', targetId: 'p_x', reason: 'spam' });
    const q2 = await api.modQueue();
    expect(q2.waiting).toBe(before + 1);
    const item = q2.items.find((i) => i.reportCount === 2)!;
    expect(item).toBeTruthy();
    const c = await api.modCase(item.id);
    expect(c.reasons.map((r) => r.reason).sort()).toEqual(['harassment', 'spam']);
  });
  it('hides the item at 3 reports', async () => {
    const { api } = setup();
    const r1 = await api.report({ targetKind: 'post', targetId: 'p_h', reason: 'hate' });
    expect(r1.hiddenPendingReview).toBe(false);
    await api.report({ targetKind: 'post', targetId: 'p_h', reason: 'hate' });
    const r3 = await api.report({ targetKind: 'post', targetId: 'p_h', reason: 'hate' });
    expect(r3.hiddenPendingReview).toBe(true);
    expect(await api.isHiddenPendingReview('post', 'p_h')).toBe(true);
    expect(await api.isHiddenPendingReview('post', 'other')).toBe(false);
  });
  it('never exposes who reported', async () => {
    const { api } = setup();
    await api.report({ targetKind: 'post', targetId: 'p_r', reason: 'spam', note: 'secret' });
    const q = await api.modQueue();
    expect(JSON.stringify(q)).not.toContain('u_returning');
    expect(JSON.stringify(q)).not.toContain('secret');
  });
  it('can also block', async () => {
    const { api } = setup();
    const before = (await api.blockedUsers()).length;
    await api.report({ targetKind: 'user', targetId: 'u_rhea', reason: 'harassment', alsoBlock: true });
    const b = await api.blockedUsers();
    expect(b.length).toBe(before + 1);
    expect(b.some((u) => u.id === 'u_rhea')).toBe(true);
    await api.unblockUser('u_rhea');
    expect((await api.blockedUsers()).some((u) => u.id === 'u_rhea')).toBe(false);
  });
});

describe('mod queue', () => {
  it('never shows the Mod their own posts', async () => {
    const { api } = setup('u_returning');
    const q = await api.modQueue();
    expect(q.items.find((i) => i.excerpt.includes('signed-in Mod'))).toBeUndefined();
    await expect(api.modCase('case_own')).rejects.toThrow();
    await expect(api.modVote('case_own', 'remove')).rejects.toThrow();
  });
  it('never exposes who posted', async () => {
    const { api } = setup();
    const q = await api.modQueue();
    const json = JSON.stringify(q);
    expect(json).not.toMatch(/seed_author|authorId/);
    expect(q.items.every((i) => i.authorLabel === 'Anonymous' || i.authorLabel === 'A student')).toBe(true);
  });
  it('is oldest first', async () => {
    const { api } = setup();
    const q = await api.modQueue();
    const t = q.items.map((i) => i.reportedAt);
    expect(t).toEqual([...t].sort((a, b) => a - b));
    expect(q.oldestMinutes).toBe(38);
  });
  it('only mods can read it', async () => {
    const { api } = setup('someone_else');
    await expect(api.modQueue()).rejects.toThrow();
    expect(await api.modStatus()).toEqual({ isMod: false, waiting: 0 });
  });
  it('two matching remove votes remove the post and strike the author', async () => {
    const strikes: Record<string, number[]> = {};
    const { api } = setup('u_returning', strikes);
    // case_1 already has one remove vote from another Mod.
    const r = await api.modVote('case_1', 'remove');
    expect(r.outcome).toBe('removed');
    expect(strikes.seed_author_1).toHaveLength(1);
    expect((await api.modQueue()).items.some((i) => i.id === 'case_1')).toBe(false);
  });
  it('a split vote goes to ops, with no strike', async () => {
    const strikes: Record<string, number[]> = {};
    const { api } = setup('u_returning', strikes);
    const r = await api.modVote('case_1', 'keep');
    expect(r.outcome).toBe('escalated');
    expect(r.title).toContain('Split');
    expect(strikes.seed_author_1).toBeUndefined();
    expect((await api.modQueue()).items.some((i) => i.id === 'case_1')).toBe(false);
  });
  it('escalate goes to ops', async () => {
    const { api } = setup();
    expect((await api.modVote('case_3', 'escalate')).outcome).toBe('escalated');
  });
  it('a first vote is pending and cannot be repeated into a decision', async () => {
    const { api } = setup();
    expect((await api.modVote('case_3', 'remove')).outcome).toBe('pending');
    expect((await api.modVote('case_3', 'remove')).outcome).toBe('pending');
    expect((await api.modQueue()).items.find((i) => i.id === 'case_3')!.myVote).toBe('remove');
  });
  it('AI-held items are not open for votes yet', async () => {
    const { api } = setup();
    await expect(api.modVote('case_2', 'remove')).rejects.toThrow();
  });
});

describe('standing', () => {
  it('is clean by default', async () => {
    const { api } = setup();
    expect(await api.myStanding()).toMatchObject({ activeStrikes: 0, action: 'none', mutedUntil: null, canPost: true });
  });
  it('2 active strikes mute for 24 h; old strikes expire after 90 days', async () => {
    const { ctx } = setup();
    const t0 = ctx.now();
    const api = createSafety(ctx, { strikes: { u_returning: [t0 - 100 * DAY, t0 - 5 * DAY, t0 - 3_600_000] } });
    const s = await api.myStanding();
    expect(s.activeStrikes).toBe(2);
    expect(s.action).toBe('mute');
    expect(s.mutedUntil).toBe(t0 - 3_600_000 + DAY);
    expect(s.canPost).toBe(false);
  });
  it('is exposed on the mock API root', async () => {
    const a = createMockApi({ latencyMs: 0 });
    await a.auth.verifyOtp('9876543210', MOCK_CODE, { returning: true });
    expect(await a.safety.myStanding()).toMatchObject({ activeStrikes: 0 });
    expect((await a.safety.modStatus()).isMod).toBe(true);
  });
});
