import { describe, expect, it } from 'vitest';
import { actionForStrikeCount, activeStrikeTimes, canPost, hiddenPendingReview, modDecide, standing, STRIKE_EXPIRY_DAYS } from '../src';

const DAY = 86_400_000;
const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 10, 18);

describe('modDecide', () => {
  it('stays pending on zero or one vote', () => {
    expect(modDecide([])).toEqual({ status: 'pending', votes: 0 });
    expect(modDecide([{ modId: 'a', vote: 'remove' }])).toEqual({ status: 'pending', votes: 1 });
  });
  it('two remove votes remove and earn the author a strike', () => {
    expect(modDecide([{ modId: 'a', vote: 'remove' }, { modId: 'b', vote: 'remove' }])).toEqual({ status: 'removed', strike: true });
  });
  it('two keep votes keep with no strike', () => {
    expect(modDecide([{ modId: 'a', vote: 'keep' }, { modId: 'b', vote: 'keep' }])).toEqual({ status: 'kept', strike: false });
  });
  it('a split goes to ops', () => {
    expect(modDecide([{ modId: 'a', vote: 'remove' }, { modId: 'b', vote: 'keep' }])).toEqual({ status: 'escalated', reason: 'split' });
    expect(modDecide([{ modId: 'a', vote: 'keep' }, { modId: 'b', vote: 'remove' }])).toEqual({ status: 'escalated', reason: 'split' });
  });
  it('an escalate vote goes to ops straight away, even as the first vote', () => {
    expect(modDecide([{ modId: 'a', vote: 'escalate' }])).toEqual({ status: 'escalated', reason: 'unsure' });
    expect(modDecide([{ modId: 'a', vote: 'remove' }, { modId: 'b', vote: 'escalate' }])).toEqual({ status: 'escalated', reason: 'unsure' });
  });
  it('one mod counts once: a repeat vote does not make two matching votes', () => {
    expect(modDecide([{ modId: 'a', vote: 'remove' }, { modId: 'a', vote: 'remove' }])).toEqual({ status: 'pending', votes: 1 });
    // first vote wins
    expect(modDecide([{ modId: 'a', vote: 'remove', at: 1 }, { modId: 'a', vote: 'keep', at: 2 }, { modId: 'b', vote: 'remove', at: 3 }])).toEqual({ status: 'removed', strike: true });
  });
  it('ignores the author own vote', () => {
    expect(modDecide([{ modId: 'author', vote: 'keep' }, { modId: 'b', vote: 'remove' }], 'author')).toEqual({ status: 'pending', votes: 1 });
  });
  it('a third vote cannot overturn a decision already reached', () => {
    const r = modDecide([{ modId: 'a', vote: 'remove', at: 1 }, { modId: 'b', vote: 'remove', at: 2 }, { modId: 'c', vote: 'keep', at: 3 }]);
    expect(r).toEqual({ status: 'removed', strike: true });
    const k = modDecide([{ modId: 'a', vote: 'keep', at: 1 }, { modId: 'b', vote: 'keep', at: 2 }, { modId: 'c', vote: 'remove', at: 3 }, { modId: 'd', vote: 'escalate', at: 4 }]);
    expect(k).toEqual({ status: 'kept', strike: false });
  });
  it('reads votes in time order, not array order', () => {
    const r = modDecide([{ modId: 'c', vote: 'keep', at: 3 }, { modId: 'a', vote: 'remove', at: 1 }, { modId: 'b', vote: 'remove', at: 2 }]);
    expect(r).toEqual({ status: 'removed', strike: true });
  });
});

describe('strikes', () => {
  it('maps strike count to the action', () => {
    expect([0, 1, 2, 3, 4, 7].map(actionForStrikeCount)).toEqual(['none', 'warning', 'mute', 'ban', 'removed', 'removed']);
  });
  it('1 strike is a warning and nothing else', () => {
    const s = standing([NOW - DAY], NOW);
    expect(s).toMatchObject({ activeStrikes: 1, action: 'warning', mutedUntil: null, bannedUntil: null, removed: false });
    expect(canPost(s)).toBe(true);
  });
  it('2 strikes mute for 24 h from the latest strike, then the mute lapses', () => {
    const issued = [NOW - 10 * DAY, NOW - 2 * HOUR];
    const s = standing(issued, NOW);
    expect(s.activeStrikes).toBe(2);
    expect(s.mutedUntil).toBe(NOW - 2 * HOUR + 24 * HOUR);
    expect(canPost(s)).toBe(false);
    const later = standing(issued, NOW + 23 * HOUR);
    expect(later.mutedUntil).toBeNull();
    expect(later.activeStrikes).toBe(2);
    expect(canPost(later)).toBe(true);
  });
  it('3 strikes ban for 7 days', () => {
    const issued = [NOW - 30 * DAY, NOW - 20 * DAY, NOW - DAY];
    const s = standing(issued, NOW);
    expect(s.action).toBe('ban');
    expect(s.bannedUntil).toBe(NOW - DAY + 7 * DAY);
    expect(canPost(s)).toBe(false);
    expect(canPost(standing(issued, NOW + 7 * DAY))).toBe(true);
  });
  it('4 strikes remove the account', () => {
    const s = standing([NOW - 40 * DAY, NOW - 30 * DAY, NOW - 20 * DAY, NOW - DAY], NOW);
    expect(s.removed).toBe(true);
    expect(canPost(s)).toBe(false);
  });
  it('strikes expire after 90 days', () => {
    expect(STRIKE_EXPIRY_DAYS).toBe(90);
    expect(activeStrikeTimes([NOW - 89 * DAY], NOW)).toHaveLength(1);
    expect(activeStrikeTimes([NOW - 90 * DAY], NOW)).toHaveLength(0);
    // an old strike dropping off lowers the count
    const issued = [NOW - 95 * DAY, NOW - 10 * DAY, NOW - 5 * DAY];
    expect(standing(issued, NOW).activeStrikes).toBe(2);
    expect(standing(issued, NOW).nextExpiryAt).toBe(NOW - 10 * DAY + 90 * DAY);
  });
  it('a clean record has no expiry date', () => {
    expect(standing([], NOW)).toMatchObject({ activeStrikes: 0, action: 'none', nextExpiryAt: null });
  });
  it('hides an item from 3 reports', () => {
    expect(hiddenPendingReview(2)).toBe(false);
    expect(hiddenPendingReview(3)).toBe(true);
  });
});
