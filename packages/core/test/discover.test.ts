import { describe, expect, it } from 'vitest';
import {
  approximateLocation, canSeeLocation, canSendInvite, distanceMeters, exactSpotVisible, extendShare, inviteIsConcrete,
  inviteQuotaResetsAt, invitesLeft, isShareMinutes, minutesLeft, shareIsActive, spotRevealAt, startShare,
} from '../src';

const MIN = 60_000;
const HOUR = 3_600_000;
// 12:00 IST on 18 Nov 2026
const NOON_IST = Date.UTC(2026, 10, 18, 6, 30);

describe('daily invite limit', () => {
  it('starts at 3 and counts down', () => {
    expect(invitesLeft([], NOON_IST)).toBe(3);
    expect(invitesLeft([NOON_IST - HOUR], NOON_IST)).toBe(2);
    expect(invitesLeft([NOON_IST - 3 * HOUR, NOON_IST - 2 * HOUR, NOON_IST - HOUR], NOON_IST)).toBe(0);
    expect(canSendInvite([NOON_IST - 3 * HOUR, NOON_IST - 2 * HOUR, NOON_IST - HOUR], NOON_IST)).toBe(false);
  });
  it('never goes below zero', () => {
    expect(invitesLeft([1, 2, 3, 4, 5].map((i) => NOON_IST - i * MIN), NOON_IST)).toBe(0);
  });
  it('resets at midnight India time, not UTC', () => {
    const lateNight = Date.UTC(2026, 10, 18, 18, 0); // 23:30 IST
    const used = [lateNight - HOUR, lateNight - 2 * HOUR, lateNight - 3 * HOUR];
    expect(invitesLeft(used, lateNight)).toBe(0);
    const justAfterMidnightIst = Date.UTC(2026, 10, 18, 18, 31); // 00:01 IST next day
    expect(invitesLeft(used, justAfterMidnightIst)).toBe(3);
    expect(inviteQuotaResetsAt(lateNight)).toBe(Date.UTC(2026, 10, 18, 18, 30));
  });
  it('invites from yesterday do not count', () => {
    expect(invitesLeft([NOON_IST - 24 * HOUR], NOON_IST)).toBe(3);
  });
  it('an invite needs a plan, a place and a time', () => {
    expect(inviteIsConcrete({ plan: 'Chai run', spot: 'Third Wave', time: 'Today 5 PM' })).toBe(true);
    expect(inviteIsConcrete({ plan: 'hey' })).toBe(false);
    expect(inviteIsConcrete({ plan: 'Chai run', spot: ' ', time: 'Today 5 PM' })).toBe(false);
  });
});

describe('approximate location', () => {
  const p = { lat: 13.0629, lng: 77.587 };
  it('is within about 106 m of the real point (half a 150 m cell diagonal)', () => {
    for (let i = 0; i < 200; i++) {
      const q = { lat: p.lat + (Math.sin(i) * 0.01), lng: p.lng + (Math.cos(i * 1.7) * 0.01) };
      expect(distanceMeters(q, approximateLocation(q))).toBeLessThan(110);
    }
  });
  it('is not the exact point', () => {
    const a = approximateLocation(p);
    expect(a).not.toEqual(p);
  });
  it('gives the same answer for points a few metres apart, so it cannot be averaged back', () => {
    const a = approximateLocation({ lat: 13.06291, lng: 77.58701 });
    const b = approximateLocation({ lat: 13.06292, lng: 77.58702 });
    expect(a).toEqual(b);
  });
  it('is stable (rounding twice changes nothing)', () => {
    const a = approximateLocation(p);
    expect(approximateLocation(a)).toEqual(a);
  });
  it('rounds to about 150 m: moving 400 m changes the cell', () => {
    const far = { lat: p.lat + 0.0036, lng: p.lng };
    expect(approximateLocation(far)).not.toEqual(approximateLocation(p));
  });
});

describe('location sharing', () => {
  it('only 15, 30 and 60 minutes are allowed', () => {
    expect([15, 30, 60].every(isShareMinutes)).toBe(true);
    expect([0, 5, 20, 45, 120].some(isShareMinutes)).toBe(false);
    expect(startShare('me', ['a'], 45, NOON_IST)).toBeNull();
  });
  it('needs at least one picked person: sharing with nobody is not a share', () => {
    expect(startShare('me', [], 30, NOON_IST)).toBeNull();
  });
  it('switches off by itself', () => {
    const s = startShare('me', ['a'], 30, NOON_IST)!;
    expect(shareIsActive(s, NOON_IST + 29 * MIN)).toBe(true);
    expect(shareIsActive(s, NOON_IST + 30 * MIN)).toBe(false);
    expect(minutesLeft(s, NOON_IST + 10 * MIN)).toBe(20);
  });
  it('is never visible to people who were not picked, or after it ends', () => {
    const s = startShare('me', ['rhea', 'kabir'], 30, NOON_IST)!;
    expect(canSeeLocation('rhea', s, NOON_IST + MIN)).toBe(true);
    expect(canSeeLocation('stranger', s, NOON_IST + MIN)).toBe(false);
    expect(canSeeLocation('me', s, NOON_IST + MIN)).toBe(false);
    expect(canSeeLocation('rhea', s, NOON_IST + 31 * MIN)).toBe(false);
    expect(canSeeLocation('rhea', null, NOON_IST)).toBe(false);
  });
  it('extends by 15 minutes but never past an hour from now', () => {
    const s = startShare('me', ['a'], 60, NOON_IST)!;
    expect(extendShare(s, NOON_IST).expiresAt).toBe(NOON_IST + 60 * MIN);
    const s30 = startShare('me', ['a'], 30, NOON_IST)!;
    expect(extendShare(s30, NOON_IST).expiresAt).toBe(NOON_IST + 45 * MIN);
  });
  it('does not revive an ended share', () => {
    const s = startShare('me', ['a'], 15, NOON_IST)!;
    expect(extendShare(s, NOON_IST + 20 * MIN)).toBe(s);
  });
});

describe('meetup exact spot', () => {
  const starts = NOON_IST + 5 * HOUR;
  it('reveals 1 hour before the start', () => {
    expect(spotRevealAt(starts)).toBe(starts - HOUR);
  });
  it('approved people see it only from 1 hour before', () => {
    expect(exactSpotVisible({ isHost: false, approved: true, startsAt: starts, now: starts - 2 * HOUR })).toBe(false);
    expect(exactSpotVisible({ isHost: false, approved: true, startsAt: starts, now: starts - HOUR })).toBe(true);
    expect(exactSpotVisible({ isHost: false, approved: true, startsAt: starts, now: starts + HOUR })).toBe(true);
  });
  it('never to people who are not approved, whatever the time', () => {
    expect(exactSpotVisible({ isHost: false, approved: false, startsAt: starts, now: starts })).toBe(false);
  });
  it('the host always sees it', () => {
    expect(exactSpotVisible({ isHost: true, approved: false, startsAt: starts, now: NOON_IST })).toBe(true);
  });
});
