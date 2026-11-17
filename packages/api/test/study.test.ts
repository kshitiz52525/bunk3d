import { describe, expect, it } from 'vitest';
import { createCtx } from '../src/mock/ctx';
import { createStudy } from '../src/mock/study';
import type { Session } from '../src/contract';

const T = new Date(2026, 10, 18, 10, 0, 0).getTime(); // a Wednesday
function setup(verified: Session['verified'] = 'verified') {
  const ctx = createCtx({ latencyMs: 0, now: () => T });
  ctx.setSession({ userId: 'u1', campusId: 'atria', verified, onboarding: 'done', wave: 4 });
  ctx.profile = { name: 'Aarav Sharma', username: 'aarav.s' };
  return createStudy(ctx);
}
const MB = 1024 * 1024;
const upload = (over = {}) => ({ title: 'End-sem 2023', kind: 'pyq' as const, subjectId: 'dbms', sem: 5, anon: false, rightsConfirmed: true, files: [{ name: 'a.pdf', sizeBytes: 4 * MB, mime: 'application/pdf' }], ...over });

describe('notes', () => {
  it('lists PYQs and notes of a subject, top first, flagged seed', async () => {
    const api = setup();
    const pyqs = await api.listNotes({ subjectId: 'dbms', kind: 'pyq', sort: 'top' });
    expect(pyqs.map((n) => n.upvotes)).toEqual([...pyqs.map((n) => n.upvotes)].sort((a, b) => b - a));
    expect(pyqs.every((n) => n.seed)).toBe(true);
    const notes = await api.listNotes({ subjectId: 'dbms', kind: 'note', sort: 'new' });
    expect(notes.every((n) => n.kind === 'note')).toBe(true);
    expect((await api.listNotes({ subjectId: 'toc', kind: 'pyq', sort: 'top' })).length).toBe(0);
  });
  it('anonymous notes never name the uploader', async () => {
    const api = setup();
    const n = (await api.listNotes({ subjectId: 'dbms', kind: 'pyq', sort: 'top' })).find((x) => x.isAnon)!;
    expect(n.authorLabel).toBe('Anonymous');
  });
  it('upvotes toggle and rank the note higher', async () => {
    const api = setup();
    const before = (await api.getNote('n-dbms-pyq22'))!.upvotes;
    expect(await api.toggleUpvote('n-dbms-pyq22')).toEqual({ upvoted: true, upvotes: before + 1 });
    expect(await api.toggleUpvote('n-dbms-pyq22')).toEqual({ upvoted: false, upvotes: before });
  });
  it('pending users cannot upvote or upload', async () => {
    const api = setup('pending');
    await expect(api.toggleUpvote('n-dbms-pyq22')).rejects.toThrow('verify_required');
    await expect(api.upload(upload())).rejects.toThrow('verify_required');
    expect((await api.home()).mySubjects.length).toBeGreaterThan(0); // reading is fine
  });
  it('save for offline toggles and lists', async () => {
    const api = setup();
    expect((await api.toggleSave('n-os-dead')).saved).toBe(true);
    expect((await api.savedNotes()).map((n) => n.id)).toEqual(['n-os-dead']);
  });
});

describe('upload', () => {
  it('requires the rights checkbox, and caps size and photos', async () => {
    const api = setup();
    expect(await api.upload(upload({ rightsConfirmed: false }))).toEqual({ ok: false, reason: 'rights' });
    expect(await api.upload(upload({ files: [{ name: 'a.pdf', sizeBytes: 34 * MB, mime: 'application/pdf' }] }))).toMatchObject({ ok: false, reason: 'too_large' });
    const photos = Array.from({ length: 11 }, () => ({ name: 'p.jpg', sizeBytes: MB, mime: 'image/jpeg' }));
    expect(await api.upload(upload({ files: photos }))).toMatchObject({ ok: false, reason: 'too_many_photos' });
  });
  it('anonymous upload stays anonymous but is still mine; counts update', async () => {
    const api = setup();
    const before = (await api.getSubject('dbms'))!.pyqCount;
    const r = await api.upload(upload({ anon: true }));
    expect(r.ok).toBe(true);
    expect((await api.getSubject('dbms'))!.pyqCount).toBe(before + 1);
    const mine = await api.myUploads();
    expect(mine[0]).toMatchObject({ mine: true, isAnon: true, authorLabel: 'Anonymous' });
    await expect(api.toggleUpvote(mine[0].id)).rejects.toThrow('own_note');
  });
});

describe('wave 2', () => {
  it('attendance uses the 75% rule and marking changes the numbers', async () => {
    const api = setup();
    const o = await api.attendance();
    expect(o.subjects.find((s) => s.id === 'cn')).toMatchObject({ pct: 65, status: 'low', needToRecover: 14 });
    expect(o.subjects.find((s) => s.id === 'dbms')).toMatchObject({ pct: 82, canMiss: 3 });
    const slot = o.today[0];
    const after = await api.markAttendance(slot.slotId, 'absent');
    expect(after.today[0].mark).toBe('absent');
    expect(after.subjects.find((s) => s.id === slot.subjectId)!.total).toBe(o.subjects.find((s) => s.id === slot.subjectId)!.total + 1);
    const again = await api.markAttendance(slot.slotId, 'present'); // changing a mark does not double count
    expect(again.subjects.find((s) => s.id === slot.subjectId)!.total).toBe(o.subjects.find((s) => s.id === slot.subjectId)!.total + 1);
  });
  it('deadlines: unconfirmed until enough upvotes, one vote each, adder starts unconfirmed', async () => {
    const api = setup();
    const list = await api.deadlines();
    const cn = list.find((d) => d.id === 'd3')!;
    expect(cn.confirmed).toBe(false);
    const on = await api.confirmDeadline('d3');
    expect(on).toMatchObject({ votes: 3, confirmedByMe: true });
    expect((await api.confirmDeadline('d3')).confirmedByMe).toBe(false);
    const added = await api.addDeadline({ type: 'EXAM', title: 'Viva', meta: 'Lab 2', dueAt: T + 86_400_000 });
    expect(added.confirmed).toBe(false);
  });
  it('exam countdown comes from a confirmed EXAM deadline', async () => expect((await setup().home()).examInDays).toBe(27));
  it('timetable: seeded, adoptable, flagged', async () => {
    const t = await setup().myTimetable();
    expect(t).toMatchObject({ name: 'CSE 5A', seed: true });
    expect(t!.days).toHaveLength(6);
  });
});
