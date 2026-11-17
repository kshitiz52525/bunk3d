import { describe, expect, it } from 'vitest';
import {
  DM_REQUESTS_PER_DAY, canPostInChannel, chatMatchesFilter, clubChannelLabel, istDayStart, messagingMode, nextTaskStatus,
  questPercent, rankClubs, receiptsVisible, requestQuota, taskStepIndex, validateClubPost,
} from '../src';

const noon = Date.UTC(2026, 10, 18, 6, 30); // 12:00 IST
const quota = (n: number, now = noon) => requestQuota(Array.from({ length: n }, () => now - 1000), now);

describe('DM request limit', () => {
  it('allows 20 new requests a day, then blocks', () => {
    expect(DM_REQUESTS_PER_DAY).toBe(20);
    expect(quota(19)).toMatchObject({ remaining: 1, allowed: true });
    expect(quota(20)).toMatchObject({ remaining: 0, allowed: false });
  });
  it('resets at midnight IST', () => {
    const sent = Array.from({ length: 20 }, () => noon);
    const justAfter = istDayStart(noon) + 24 * 3600 * 1000 + 60_000;
    expect(requestQuota(sent, noon).allowed).toBe(false);
    expect(requestQuota(sent, justAfter).allowed).toBe(true);
    expect(requestQuota(sent, noon).resetsAtMs).toBe(istDayStart(noon) + 24 * 3600 * 1000);
  });
});

describe('messaging mode', () => {
  const base = { senderVerified: true, blocked: false, blockedByThem: false, sharesClub: false, accepted: false, requestPending: false, quota: quota(0) };
  it('locks DMs until verified', () => expect(messagingMode({ ...base, senderVerified: false, sharesClub: true })).toEqual({ mode: 'locked' }));
  it('blocked either way cannot send', () => {
    expect(messagingMode({ ...base, blocked: true }).mode).toBe('cannot_send');
    expect(messagingMode({ ...base, blockedByThem: true, sharesClub: true }).mode).toBe('cannot_send');
  });
  it('a shared club means a direct chat; a stranger means a request', () => {
    expect(messagingMode({ ...base, sharesClub: true }).mode).toBe('direct');
    expect(messagingMode({ ...base }).mode).toBe('new_request');
    expect(messagingMode({ ...base, requestPending: true }).mode).toBe('request_pending');
  });
  it('the request limit stops strangers only, never existing chats', () => {
    expect(messagingMode({ ...base, quota: quota(20) }).mode).toBe('request_limit');
    expect(messagingMode({ ...base, quota: quota(20), accepted: true }).mode).toBe('direct');
    expect(messagingMode({ ...base, quota: quota(20), sharesClub: true }).mode).toBe('direct');
  });
});

describe('read receipts', () => {
  it('are mutual: either side off hides them', () => {
    expect(receiptsVisible({ myReceiptsOn: true, theirReceiptsOn: true, accepted: true })).toBe(true);
    expect(receiptsVisible({ myReceiptsOn: false, theirReceiptsOn: true, accepted: true })).toBe(false);
    expect(receiptsVisible({ myReceiptsOn: true, theirReceiptsOn: false, accepted: true })).toBe(false);
  });
  it('a stranger cannot see reads until the request is accepted', () => {
    expect(receiptsVisible({ myReceiptsOn: true, theirReceiptsOn: true, accepted: false })).toBe(false);
  });
});

describe('chat filters', () => {
  it('filters by kind and unread', () => {
    expect(chatMatchesFilter({ kind: 'club', unread: 0 }, 'Clubs')).toBe(true);
    expect(chatMatchesFilter({ kind: 'club', unread: 0 }, 'People')).toBe(false);
    expect(chatMatchesFilter({ kind: 'person', unread: 0 }, 'Unread')).toBe(false);
    expect(chatMatchesFilter({ kind: 'squad', unread: 3 }, 'Unread')).toBe(true);
  });
  it('labels club channels', () => expect(clubChannelLabel('GDG Atria', 'general')).toBe('GDG Atria #general'));
});

describe('club rules', () => {
  it('club posts are never anonymous and only admins can post as the club', () => {
    expect(validateClubPost({ body: 'hi', anonymous: true, role: 'lead' })).toEqual({ ok: false, reason: 'anonymous' });
    expect(validateClubPost({ body: 'hi', role: 'member' })).toEqual({ ok: false, reason: 'not_admin' });
    expect(validateClubPost({ body: '  ', role: 'lead' })).toEqual({ ok: false, reason: 'empty' });
    expect(validateClubPost({ body: 'hi', role: 'coordinator' })).toEqual({ ok: true });
  });
  it('announcement channels are admin only', () => {
    expect(canPostInChannel({ adminOnly: true, role: 'member' })).toBe(false);
    expect(canPostInChannel({ adminOnly: true, role: 'lead' })).toBe(true);
    expect(canPostInChannel({ adminOnly: false, role: 'member' })).toBe(true);
    expect(canPostInChannel({ adminOnly: false, role: undefined })).toBe(false);
  });
  it('ranks clubs by xp, name breaks ties', () => {
    const r = rankClubs([{ clubId: 'b', name: 'B', xp: 10 }, { clubId: 'a', name: 'A', xp: 10 }, { clubId: 'c', name: 'C', xp: 50 }]);
    expect(r.map((x) => [x.clubId, x.rank])).toEqual([['c', 1], ['a', 2], ['b', 3]]);
  });
  it('quest percent is capped', () => {
    expect(questPercent(9, 15)).toBe(60);
    expect(questPercent(20, 15)).toBe(100);
    expect(questPercent(1, 0)).toBe(0);
  });
});

describe('task flow', () => {
  it('walks assigned to approved, with a revision loop', () => {
    expect(nextTaskStatus('assigned', 'accept')).toBe('accepted');
    expect(nextTaskStatus('accepted', 'start')).toBe('working');
    expect(nextTaskStatus('working', 'submit')).toBe('review');
    expect(nextTaskStatus('review', 'request_revision')).toBe('revision');
    expect(nextTaskStatus('revision', 'submit')).toBe('review');
    expect(nextTaskStatus('review', 'approve')).toBe('approved');
  });
  it('refuses skips', () => {
    expect(nextTaskStatus('assigned', 'approve')).toBeNull();
    expect(nextTaskStatus('working', 'approve')).toBeNull();
    expect(nextTaskStatus('approved', 'submit')).toBeNull();
    expect(taskStepIndex('revision')).toBe(2);
  });
});
