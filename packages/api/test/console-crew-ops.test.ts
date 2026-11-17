import { describe, expect, it } from 'vitest';
import { qrToken } from '@bunk3d/core';
import { createCrewOps } from '../src/mock/console-crew-ops';
import { createCtx } from '../src/mock/ctx';

const api = () => createCrewOps(createCtx({ latencyMs: 0 }));
const draft = (o = {}) => ({ title: 'T', category: 'Tech' as const, startsAtMs: Date.now() + 1e8, endsAtMs: Date.now() + 2e8, venue: 'V', capacity: 10, rsvpDeadlineMs: Date.now() + 5e7, description: '', ticketType: 'free' as const, pricePaise: 0, ...o });

describe('events', () => {
  it('prices a paid ticket on the server (Rs 199 -> Rs 210.74)', async () => {
    const a = api();
    expect((await a.crewPriceTicket(19900)).totalPaise).toBe(21074);
    const r = await a.crewCreateEvent('c', draft({ ticketType: 'paid', pricePaise: 19900 }));
    expect(r.ok && r.event.pricing?.totalPaise).toBe(21074);
  });
  it('rejects bad drafts with issues', async () => {
    const r = await api().crewCreateEvent('c', draft({ title: '' }));
    expect(r.ok).toBe(false);
  });
});

describe('scanner sync', () => {
  it('earliest wins, repeats are duplicates, unknown tickets ignored', async () => {
    const a = api();
    const r = await a.scannerSync('ev-3', [
      { ticketId: 'SEED-002', scannedAtMs: 2, scannerId: 'x' }, { ticketId: 'SEED-002', scannedAtMs: 1, scannerId: 'y' },
      { ticketId: 'SEED-001', scannedAtMs: 3, scannerId: 'x' }, { ticketId: 'NOPE', scannedAtMs: 3, scannerId: 'x' },
    ]);
    expect(r).toMatchObject({ accepted: 1, duplicates: 2, checkedIn: 2 });
  });
  it('roster secrets verify a current QR', async () => {
    const roster = await api().scannerRoster('ev-3');
    const t = roster.tickets[1]!;
    expect(qrToken(t.ticketId, t.secret, Date.now())).toContain(t.ticketId);
  });
});

describe('ops', () => {
  it('rejecting an ID needs a reason; decision sets the 30-day delete date', async () => {
    const a = api();
    await expect(a.opsDecideVerification('v1', 'reject')).rejects.toThrow();
    const v = await a.opsDecideVerification('v1', 'approve');
    expect(v.deleteAtMs! - v.decidedAtMs!).toBe(30 * 86_400_000);
  });
  it('anon lookup needs a reason and is logged', async () => {
    const a = api();
    await expect(a.opsAnonLookup('x1', ' ')).rejects.toThrow();
    const r = await a.opsAnonLookup('x1', 'report threat');
    expect((await a.opsAuditLog())[0]!.id).toBe(r.auditId);
  });
  it('wave 3 stays closed until the gate is open (thresholds unset keep it closed)', async () => {
    const a = api();
    await a.opsSetSignoff('c1', 'ca', true);
    expect((await a.opsSetWave('c1', 3, true)).ok).toBe(false);
  });
  it('strikes follow the ladder and the audit log only grows', async () => {
    const a = api();
    const before = (await a.opsAuditLog()).length;
    const u = await a.opsAddStrike('u1');
    expect(u.activeStrikes).toBe(3);
    expect(u.outcome).toBe('ban_7d');
    expect((await a.opsAuditLog()).length).toBe(before + 1);
  });
});

describe('crew HQ', () => {
  it('approving a join request makes the person an active member', async () => {
    const a = api();
    await a.crewDecideJoin('c', 'm1', 'approve');
    expect((await a.crewMembers('c')).members.find((m) => m.id === 'm1')?.status).toBe('active');
  });
  it('CH11 and CH12 are locked preview below wave 4; CH9 open at wave 3', async () => {
    const a = api();
    expect((await a.crewSection('c', 'collabs')).locked).toBe(true);
    expect((await a.crewSection('c', 'gigs')).locked).toBe(false);
  });
  it('club gig take-home uses the 2.5% club rate plus GST on the fee', async () => {
    const g = (await api().crewSection('c', 'gigs')).rows[1]!;
    expect(g.lines[1]![1]).toContain('₹776.40');
  });
});
