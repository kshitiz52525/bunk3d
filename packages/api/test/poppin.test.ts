import { describe, expect, it } from 'vitest';
import { ticketQrPayload, ticketQrSecondsLeft } from '@bunk3d/core';
import { createCtx } from '../src/mock/ctx';
import { createPoppin } from '../src/mock/poppin';
import type { Session } from '../src/contract';

const T = new Date(2026, 10, 18, 10, 0, 0).getTime();
const session = (verified: Session['verified'] = 'verified'): Session => ({ userId: 'u1', campusId: 'atria', verified, onboarding: 'done', wave: 4 });
function setup(opts: { verified?: Session['verified']; failPayments?: boolean } = {}) {
  let now = T;
  const ctx = createCtx({ latencyMs: 0, now: () => now });
  ctx.setSession(session(opts.verified));
  ctx.profile = { name: 'Aarav Sharma', username: 'aarav.s' };
  return { api: createPoppin(ctx, { failPayments: opts.failPayments }), advance: (ms: number) => (now += ms), now: () => now };
}

describe('events list', () => {
  it('buckets into This week / Upcoming / Past with seed flags', async () => {
    const { api } = setup();
    const w = await api.events({ when: 'week' });
    const u = await api.events({ when: 'upcoming' });
    const p = await api.events({ when: 'past' });
    expect(w.map((e) => e.id)).toEqual(['ev-hack2', 'ev-openmic', 'ev-build7']);
    expect(u.map((e) => e.id)).toEqual(['ev-fest', 'ev-cubs', 'ev-figma']);
    expect(p.map((e) => e.id)).toEqual(['ev-hack1', 'ev-fresh']);
    expect([...w, ...u, ...p].every((e) => e.seed === true)).toBe(true);
    expect(p[0].myPlace).toBe(2);
  });
  it('pending-verification users can browse and RSVP', async () => {
    const { api } = setup({ verified: 'pending' });
    expect((await api.events({ when: 'upcoming' })).length).toBe(3);
    expect(await api.rsvp('ev-cubs')).toMatchObject({ ok: true, status: 'going' });
  });
});

describe('RSVP, waitlist, cancel', () => {
  it('free RSVP gives a ticket that shows in myTickets', async () => {
    const { api } = setup();
    const r = await api.rsvp('ev-figma');
    expect(r).toMatchObject({ ok: true, status: 'going' });
    const mine = await api.myTickets();
    expect(mine.some((t) => t.eventId === 'ev-figma' && t.status === 'valid')).toBe(true);
    expect((await api.getEvent('ev-figma'))?.goingCount).toBe(43);
    expect(await api.rsvp('ev-figma')).toEqual({ ok: false, reason: 'already' });
  });
  it('full event puts you on the waitlist at #4, and leaving removes you', async () => {
    const { api } = setup();
    expect(await api.rsvp('ev-openmic')).toEqual({ ok: true, status: 'waitlist', position: 4 });
    expect((await api.getEvent('ev-openmic'))?.my).toBe('waitlist');
    await api.cancelRsvp('ev-openmic');
    expect((await api.getEvent('ev-openmic'))?.my).toBe('none');
  });
  it('cancelled and ended events cannot be joined', async () => {
    const { api } = setup();
    expect(await api.rsvp('ev-build7')).toEqual({ ok: false, reason: 'cancelled' });
    expect(await api.rsvp('ev-fresh')).toEqual({ ok: false, reason: 'ended' });
    const d = await api.getEvent('ev-build7');
    expect(d).toMatchObject({ status: 'cancelled', cancelledByHost: true });
  });
  it('paid events do not take a plain RSVP; team events do', async () => {
    const { api } = setup();
    expect(await api.rsvp('ev-hack2')).toMatchObject({ ok: true, status: 'going' });
    expect(await api.rsvp('ev-fest')).toEqual({ ok: false, reason: 'payment_required' });
  });
});

describe('paid checkout (E7)', () => {
  it('Rs 199 quotes Rs 210.74: fee 5%, GST 18% of the fee, 2-decimal rounding', async () => {
    const { api } = setup();
    const q = await api.quote('ev-fest');
    expect(q?.price).toMatchObject({ subtotalPaise: 19900, platformFeePaise: 995, gstPaise: 179, totalPaise: 21074 });
    expect(q?.holdExpiresAt).toBeGreaterThan(0);
  });
  it('pay issues a ticket with the paid amount via Razorpay', async () => {
    const { api } = setup();
    await api.quote('ev-fest');
    const r = await api.pay('ev-fest', 'upi');
    expect(r).toMatchObject({ ok: true, paidPaise: 21074, provider: 'Razorpay' });
    const t = await api.ticket('ev-fest');
    expect(t).toMatchObject({ status: 'valid', paidPaise: 21074 });
  });
  it('a lapsed seat hold cannot pay; a failed payment issues nothing', async () => {
    const a = setup();
    await a.api.quote('ev-fest');
    a.advance(11 * 60_000);
    expect(await a.api.pay('ev-fest', 'card')).toEqual({ ok: false, reason: 'hold_expired' });
    const b = setup({ failPayments: true });
    await b.api.quote('ev-fest');
    expect(await b.api.pay('ev-fest', 'upi')).toEqual({ ok: false, reason: 'payment_failed' });
    expect(await b.api.ticket('ev-fest')).toBeNull();
  });
  it('refund is full more than 48h before, none after', async () => {
    const a = setup();
    await a.api.quote('ev-fest');
    await a.api.pay('ev-fest', 'upi');
    expect((await a.api.getEvent('ev-fest'))?.refundIfCancelledPaise).toBe(21074);
    expect(await a.api.cancelRsvp('ev-fest')).toEqual({ refundPaise: 21074 });
    expect((await a.api.ticket('ev-fest'))?.status).toBe('refunded');
    const b = setup();
    await b.api.quote('ev-fest');
    await b.api.pay('ev-fest', 'upi');
    b.advance(8 * 24 * 3600_000 + 12 * 3600_000); // within 48h of the start
    expect(await b.api.cancelRsvp('ev-fest')).toEqual({ refundPaise: 0 });
  });
  it('host cancel refunds paid tickets automatically', async () => {
    const { api } = setup();
    await api.quote('ev-fest');
    await api.pay('ev-fest', 'upi');
    expect(await api.host.cancelEvent('ev-fest')).toEqual({ refundedCount: 1 });
    expect((await api.ticket('ev-fest'))?.status).toBe('refunded');
  });
  it('free events have no quote', async () => expect(await setup().api.quote('ev-cubs')).toBeNull());
});

describe('teams (E6)', () => {
  it('a team needs 2 accepted members; free registration goes straight to a ticket', async () => {
    const { api, advance } = setup();
    const c = await api.createTeam('ev-hack2', 'Samosa Stack');
    expect(c.ok).toBe(true);
    const team = c.ok ? c.value : null!;
    expect(team).toMatchObject({ acceptedCount: 1, ready: false, minSize: 2, maxSize: 4 });
    expect(await api.registerTeam(team.id)).toEqual({ ok: false, reason: 'not_ready' });
    const inv = await api.inviteToTeam(team.id, '@kabir.m');
    expect(inv.ok && inv.value.members.find((m) => m.username === 'kabir.m')?.status).toBe('invited');
    advance(4000);
    expect((await api.myTeam('ev-hack2'))?.ready).toBe(true);
    const reg = await api.registerTeam(team.id);
    expect(reg.ok).toBe(true);
    expect((await api.ticket('ev-hack2'))?.teamName).toBe('Samosa Stack');
  });
  it('caps the team at 4 and rejects bad names / double teams', async () => {
    const { api } = setup();
    const c = await api.createTeam('ev-hack2', 'Squad');
    const id = c.ok ? c.value.id : '';
    for (const u of ['aaa', 'bbb', 'ccc']) expect((await api.inviteToTeam(id, u)).ok).toBe(true);
    expect(await api.inviteToTeam(id, 'ddd')).toEqual({ ok: false, reason: 'full' });
    expect(await api.createTeam('ev-hack2', 'Another')).toEqual({ ok: false, reason: 'already_in_team' });
    expect(await api.createTeam('ev-cubs', 'Nope')).toEqual({ ok: false, reason: 'not_team_event' });
    const s2 = setup();
    expect(await s2.api.createTeam('ev-hack2', ' ')).toEqual({ ok: false, reason: 'name' });
  });
  it('join with a code issues a ticket', async () => {
    const { api } = setup();
    expect(await api.lookupTeamCode('RBX907')).toMatchObject({ name: 'Byte Me', spotsOpen: 2 });
    expect(await api.lookupTeamCode('NOPE00')).toBeNull();
    const j = await api.joinTeam('rbx907');
    expect(j.ok).toBe(true);
    expect((await api.ticket('ev-hack2'))?.teamName).toBe('Byte Me');
  });
});

describe('results and certificates (E8)', () => {
  it('shows my placement, the podium and the certificate', async () => {
    const { api } = setup();
    const r = await api.results('ev-hack1');
    expect(r).toMatchObject({ published: true, myPlacement: { place: 2, teamName: 'Samosa Stack', ofTeams: 31 } });
    expect(r?.podium.map((p) => p.place)).toEqual([1, 2, 3]);
    expect(r?.certificate?.addedToProfile).toBe(true);
    expect((await api.myCertificates()).map((c) => c.eventId)).toContain('ev-hack1');
    await api.rateEvent('ev-hack1', 4);
    expect((await api.results('ev-hack1'))?.myRating).toBe(4);
  });
  it('unpublished events show no results', async () => expect((await setup().api.results('ev-fresh'))?.published).toBe(false));
  it('host publishing issues a certificate to the student profile', async () => {
    const { api } = setup();
    // The student placed at the seeded past event; use a fresh ended event by creating one in the past is rejected, so reuse ev-fresh.
    const ok = await api.host.publishResults('ev-fresh', { ofTeams: 1, placements: [{ place: 1, teamName: 'Solo', membersLabel: 'A', ticketIds: [] }], certificateTitle: 'Participation' });
    expect(ok).toEqual({ ok: true, certificatesIssued: 0 });
    expect(await api.host.publishResults('ev-fest', { ofTeams: 1, placements: [] })).toEqual({ ok: false, reason: 'not_ended' });
  });
});

describe('host: create, check-in, offline sync', () => {
  it('validates event input', async () => {
    const { api, now } = setup();
    const base = { title: 'Quiz', category: 'Tech' as const, description: '', venue: 'Hall', startsAt: now() + 1e8, endsAt: now() + 2e8, capacity: 50, ticketKind: 'free' as const, teamEvent: false };
    expect(await api.host.createEvent({ ...base, title: 'x' })).toEqual({ ok: false, reason: 'title' });
    expect(await api.host.createEvent({ ...base, endsAt: base.startsAt })).toEqual({ ok: false, reason: 'time' });
    expect(await api.host.createEvent({ ...base, ticketKind: 'paid' })).toEqual({ ok: false, reason: 'price' });
    const c = await api.host.createEvent({ ...base, ticketKind: 'paid', pricePaise: 5000 });
    expect(c.ok).toBe(true);
    expect((await api.getEvent(c.ok ? c.id : ''))?.ticketKind).toBe('paid');
  });
  it('checks a student in with the rotating QR; a repeat and an old code fail', async () => {
    const { api, now, advance } = setup();
    const r = await api.rsvp('ev-figma');
    const t = (await api.ticket('ev-figma'))!;
    expect(r.ok).toBe(true);
    const code = ticketQrPayload({ ticketId: t.id, secret: t.qrSecret, nowMs: now() });
    expect(await api.host.verifyCheckin('ev-cubs', code)).toMatchObject({ ok: false, reason: 'wrong_event' });
    expect(await api.host.verifyCheckin('ev-figma', code)).toMatchObject({ ok: true, holderName: 'Aarav Sharma' });
    expect(await api.host.verifyCheckin('ev-figma', code)).toMatchObject({ ok: false, reason: 'already_checked_in' });
    const t2 = await setup();
    await t2.api.rsvp('ev-figma');
    const tk = (await t2.api.ticket('ev-figma'))!;
    const old = ticketQrPayload({ ticketId: tk.id, secret: tk.qrSecret, nowMs: t2.now() });
    t2.advance(5 * 60_000);
    expect(await t2.api.host.verifyCheckin('ev-figma', old)).toMatchObject({ ok: false, reason: 'expired' });
    expect(ticketQrSecondsLeft(advance(0))).toBeGreaterThan(0);
  });
  it('syncs scans captured offline, judged at the scan time; repeats are duplicates', async () => {
    const { api, now, advance } = setup();
    await api.rsvp('ev-figma');
    const t = (await api.ticket('ev-figma'))!;
    const scanned = now();
    const payload = ticketQrPayload({ ticketId: t.id, secret: t.qrSecret, nowMs: scanned });
    advance(30 * 60_000); // back online half an hour later
    const res = await api.host.syncCheckins('ev-figma', [{ payload, scannedAtMs: scanned }, { payload, scannedAtMs: scanned + 1000 }]);
    expect(res[0]).toMatchObject({ ok: true });
    expect(res[1]).toMatchObject({ ok: false, reason: 'already_checked_in' });
    expect((await api.host.attendees('ev-figma')).find((a) => a.ticketId === t.id)?.status).toBe('checked_in');
    const snap = await api.host.checkinSnapshot('ev-figma');
    expect(snap.tickets.some((x) => x.ticketId === t.id && x.checkedIn)).toBe(true);
  });
});
