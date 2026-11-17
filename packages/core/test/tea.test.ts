import { describe, expect, it } from 'vitest';
import {
  teaAccountAgeDays, STORY_VIDEO_MAX_BYTES, teaAnonLabel, anonUnlocked, applyTeaVote, canAddToStory, teaCanPost, teaCanVote, teaHotRank,
  isTeaCollapsed, isTeaUnderReview, teaMuteUntil, teaSafetyCheck, sortTeaPosts, validateTeaDestinations, validateTeaPoll, validateStoryVideo, teaVisibleInFeed,
} from '../src';

const H = 3_600_000;
describe('votes', () => {
  it('toggles and switches', () => {
    expect(applyTeaVote(0, 1)).toEqual({ vote: 1, delta: 1 });
    expect(applyTeaVote(1, 1)).toEqual({ vote: 0, delta: -1 });
    expect(applyTeaVote(1, -1)).toEqual({ vote: -1, delta: -2 });
    expect(applyTeaVote(-1, 1)).toEqual({ vote: 1, delta: 2 });
  });
});
describe('collapse and review', () => {
  it('collapses at net -5', () => {
    expect(isTeaCollapsed(-4)).toBe(false);
    expect(isTeaCollapsed(-5)).toBe(true);
  });
  it('hides at 3 reports', () => {
    expect(isTeaUnderReview(2)).toBe(false);
    expect(isTeaUnderReview(3)).toBe(true);
  });
});
describe('sorting', () => {
  const now = 100 * H;
  it('new is newest first', () => {
    const r = sortTeaPosts([{ id: 'a', score: 9, createdAt: now - 5 * H }, { id: 'b', score: 0, createdAt: now - H }], 'new', now);
    expect(r.map((p) => p.id)).toEqual(['b', 'a']);
  });
  it('hot decays with age', () => {
    expect(teaHotRank(50, now - H, now)).toBeGreaterThan(teaHotRank(50, now - 30 * H, now));
    const r = sortTeaPosts([{ id: 'old', score: 60, createdAt: now - 48 * H }, { id: 'fresh', score: 40, createdAt: now - H }], 'hot', now);
    expect(r[0]!.id).toBe('fresh');
  });
});
describe('gates', () => {
  it('pending users cannot vote or post', () => {
    expect(teaCanVote({ verified: 'pending', mutedUntil: null })).toEqual({ ok: false, reason: 'not_verified' });
    expect(teaCanPost({ verified: 'pending', mutedUntil: null }, 0)).toEqual({ ok: false, reason: 'not_verified' });
  });
  it('muted users can vote but not post or comment', () => {
    const g = { verified: 'verified' as const, mutedUntil: 10 * H };
    expect(teaCanVote(g).ok).toBe(true);
    expect(teaCanPost(g, 5 * H)).toEqual({ ok: false, reason: 'muted' });
    expect(teaCanPost(g, 11 * H).ok).toBe(true);
  });
  it('anon uses karma, age and no strike', () => {
    expect(anonUnlocked({ karma: 6, accountAgeDays: 3, activeStrike: false })).toBe(false);
    expect(anonUnlocked({ karma: 20, accountAgeDays: 7, activeStrike: false })).toBe(true);
    expect(teaAccountAgeDays(0, 3.5 * 86_400_000)).toBe(3);
  });
});
describe('strikes and mute', () => {
  it('one strike does not mute, two do for 24h', () => {
    expect(teaMuteUntil([0], H)).toBeNull();
    expect(teaMuteUntil([0, 2 * H], 3 * H)).toBe(26 * H);
    expect(teaMuteUntil([0, 2 * H], 27 * H)).toBeNull();
  });
  it('strikes expire after 90 days', () => {
    expect(teaMuteUntil([0, 1], 91 * 86_400_000)).toBeNull();
  });
});
describe('safety check', () => {
  it('passes normal text', () => expect(teaSafetyCheck({ text: 'best samosa on campus?', anon: true })).toEqual({ verdict: 'pass' }));
  it('holds anon posts that point at a student', () => {
    expect(teaSafetyCheck({ text: 'ask @rohit_k about it', anon: true })).toEqual({ verdict: 'hold', rule: 'naming_student' });
    expect(teaSafetyCheck({ text: 'ask @rohit_k about it', anon: false })).toEqual({ verdict: 'pass' });
  });
  it('blocks abuse', () => expect(teaSafetyCheck({ text: 'kys', anon: false })).toEqual({ verdict: 'block', rule: 'abuse' }));
});
describe('story video', () => {
  it('max 15 s and 50 MB', () => {
    expect(validateStoryVideo({ durationSec: 15, sizeBytes: STORY_VIDEO_MAX_BYTES })).toEqual({ ok: true });
    expect(validateStoryVideo({ durationSec: 15.1, sizeBytes: 1 })).toEqual({ ok: false, reason: 'too_long' });
    expect(validateStoryVideo({ durationSec: 5, sizeBytes: STORY_VIDEO_MAX_BYTES + 1 })).toEqual({ ok: false, reason: 'too_big' });
  });
});
describe('destinations', () => {
  it('needs at least one; stories never anonymous or in a community', () => {
    expect(validateTeaDestinations({ feed: false, story: false }, { anon: false, community: false })).toEqual({ ok: false, reason: 'none' });
    expect(validateTeaDestinations({ feed: true, story: true }, { anon: true, community: false })).toEqual({ ok: false, reason: 'anon_story' });
    expect(validateTeaDestinations({ feed: true, story: true }, { anon: false, community: true })).toEqual({ ok: false, reason: 'community_story' });
    expect(validateTeaDestinations({ feed: true, story: true }, { anon: false, community: false })).toEqual({ ok: true });
  });
  it('only your own post can go to your story', () => {
    expect(canAddToStory({ authorId: 'u1', me: 'u1', anon: false })).toBe(true);
    expect(canAddToStory({ authorId: 'u2', me: 'u1', anon: false })).toBe(false);
    expect(canAddToStory({ authorId: 'u1', me: 'u1', anon: true })).toBe(false);
  });
});
describe('scopes', () => {
  it('campus-only posts never appear in a community', () => {
    const campusPost = { scope: { type: 'campus', campusId: 'atria' } as const };
    expect(teaVisibleInFeed(campusPost, { type: 'community', communityId: 'c1' })).toBe(false);
    expect(teaVisibleInFeed(campusPost, { type: 'campus', campusId: 'atria' })).toBe(true);
    expect(teaVisibleInFeed(campusPost, { type: 'campus', campusId: 'christ' })).toBe(false);
    expect(teaVisibleInFeed({ scope: { type: 'community', communityId: 'c1' } }, { type: 'campus', campusId: 'atria' })).toBe(false);
  });
});
describe('anon labels and polls', () => {
  it('numbers anon commenters in order', () => {
    expect(teaAnonLabel(['a', 'b'], 'b')).toBe('Anon 2');
    expect(teaAnonLabel(['a', 'b'], 'c')).toBe('Anon 3');
  });
  it('polls need 2 to 4 distinct options', () => {
    expect(validateTeaPoll(['a', ''])).toBe(false);
    expect(validateTeaPoll(['a', 'A'])).toBe(false);
    expect(validateTeaPoll(['a', 'b', 'c', 'd'])).toBe(true);
    expect(validateTeaPoll(['a', 'b', 'c', 'd', 'e'])).toBe(false);
  });
});
