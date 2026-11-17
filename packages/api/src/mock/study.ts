import { attendanceSummary, isDeadlineConfirmed, validateUpload } from '@bunk3d/core';
import type {
  AttendanceOverview, Deadline, NoteDetail, NoteSummary, StudyApi, Subject, Timetable, TimetableClass, UploadInput,
} from '../contract';
import type { MockCtx } from './ctx';
import {
  SEED_ATTENDANCE, SEED_DEADLINES, SEED_NOTES, SEED_SUBJECTS, SEED_SUBJECT_COUNTS, SEED_TIMETABLE, pagesFor, seedAgeMs, type SeedNote,
} from './seed-study';

// SEED DATA lives in seed-study.ts, flagged `seed: true`. Mock only.
type NoteRow = SeedNote & { createdAt: number; mineRow: boolean; isAnon: boolean; seed?: true };
const DAY = 86_400_000;
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDay = (ms: number) => `${new Date(ms).getDate()} ${MONTHS[new Date(ms).getMonth()]}`;

export function createStudy(ctx: MockCtx): StudyApi {
  const notes: NoteRow[] = SEED_NOTES.map((n) => ({ ...n, createdAt: ctx.now() - seedAgeMs(n.ageDays), mineRow: false, isAnon: n.author === null, seed: true }));
  const upvoted = new Set<string>();
  const saved = new Set<string>();
  const extra: Record<string, { notes: number; pyqs: number }> = {};
  const mine = new Set(SEED_SUBJECTS.filter((s) => s.mine).map((s) => s.id));
  let counter = 0;

  const subjectShort = (id: string) => SEED_SUBJECTS.find((s) => s.id === id)?.short ?? id.toUpperCase();
  const toSummary = (n: NoteRow): NoteSummary => ({
    id: n.id, subjectId: n.subjectId, subjectShort: subjectShort(n.subjectId), kind: n.kind, title: n.title, fileKind: n.fileKind, pages: n.pages,
    authorLabel: n.isAnon ? 'Anonymous' : n.mineRow ? (ctx.profile?.name ?? 'You') : (n.author ?? 'Anonymous'), isAnon: n.isAnon,
    examYear: n.examYear, examLabel: n.examLabel, unit: n.unit,
    upvotes: n.upvotes + (upvoted.has(n.id) ? 1 : 0), saves: n.saves + (saved.has(n.id) ? 1 : 0), views: n.views, createdAt: n.createdAt,
    upvoted: upvoted.has(n.id), saved: saved.has(n.id), mine: n.mineRow, ...(n.seed ? { seed: true as const } : {}),
  });
  const toSubject = (s: (typeof SEED_SUBJECTS)[number]): Subject => {
    const c = SEED_SUBJECT_COUNTS[s.id] ?? { notes: 0, pyqs: 0 };
    const e = extra[s.id] ?? { notes: 0, pyqs: 0 };
    return {
      id: s.id, code: s.code, name: s.name, short: s.short, sem: s.sem, branch: s.branch, noteCount: c.notes + e.notes, pyqCount: c.pyqs + e.pyqs,
      tint: s.tint, isMine: mine.has(s.id), seed: true,
    };
  };
  const requireVerified = () => {
    ctx.requireUser();
    if (ctx.getSession()?.verified !== 'verified') throw new Error('verify_required');
  };

  // ---- deadlines ----
  type DRow = { id: string; type: Deadline['type']; title: string; meta: string; dueAt: number; votes: number; mine: boolean; seed?: true };
  const deadlines: DRow[] = SEED_DEADLINES.map((d) => ({ id: d.id, type: d.type, title: d.title, meta: d.meta, dueAt: ctx.now() + d.inDays * DAY, votes: d.votes, mine: false, seed: true }));
  const toDeadline = (d: DRow): Deadline => ({
    id: d.id, type: d.type, title: d.title, meta: d.meta, dueAt: d.dueAt, votes: d.votes + (d.mine ? 1 : 0),
    confirmed: isDeadlineConfirmed(d.votes + (d.mine ? 1 : 0)), confirmedByMe: d.mine, ...(d.seed ? { seed: true as const } : {}),
  });

  // ---- timetable ----
  let adopted = true;
  let remindersOn = true;
  const timetable = (): Timetable => {
    const start = new Date(ctx.now());
    const monday = new Date(start.getFullYear(), start.getMonth(), start.getDate() - ((start.getDay() + 6) % 7)).getTime();
    return {
      id: SEED_TIMETABLE.id, name: SEED_TIMETABLE.name, madeBy: SEED_TIMETABLE.madeBy, adoptedBy: SEED_TIMETABLE.adoptedBy, adopted, remindersOn, seed: true,
      days: DAYS.map((label, i) => ({
        label, date: String(new Date(monday + i * DAY).getDate()).padStart(2, '0'),
        classes: SEED_TIMETABLE.plans[i % 2].map(([s, e, subject, room, tag], k): TimetableClass => ({ id: `${i}-${k}`, start: s, end: e, subject, room, ...(tag ? { tag: 'Lab' as const } : {}) })),
      })),
    };
  };

  // ---- attendance ----
  const marks = new Map<string, { subjectId: string; mark: 'present' | 'absent' }>(); // slotId -> mark
  const subjectOfClass = (subject: string) => Object.keys(SEED_ATTENDANCE).find((id) => subject.toUpperCase().startsWith(SEED_ATTENDANCE[id].name));
  const attendance = (): AttendanceOverview => {
    const now = new Date(ctx.now());
    const dow = (now.getDay() + 6) % 7; // Mon=0
    const dateKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    const classes = dow <= 5 ? timetable().days[dow].classes : [];
    const today = classes.flatMap((c) => {
      const subjectId = subjectOfClass(c.subject);
      if (!subjectId) return [];
      const slotId = `${dateKey}:${c.id}`;
      return [{ slotId, subjectId, label: `${c.subject} · ${c.start}`, mark: marks.get(slotId)?.mark ?? null }];
    });
    const subjects = Object.entries(SEED_ATTENDANCE).map(([id, s]) => {
      let a = s.a;
      let t = s.t;
      for (const m of marks.values()) {
        if (m.subjectId === id) { t += 1; if (m.mark === 'present') a += 1; }
      }
      return { id, name: s.name, ...attendanceSummary(a, t) };
    });
    const dateLabel = `${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()].toUpperCase()}`;
    return { dateLabel, today, subjects };
  };

  return {
    async home() {
      ctx.requireUser();
      await ctx.wait();
      const ds = deadlines.map(toDeadline).filter((d) => d.type === 'EXAM' && d.confirmed && d.dueAt >= ctx.now());
      const next = ds.sort((a, b) => a.dueAt - b.dueAt)[0];
      return {
        semLabel: 'Sem 5 CSE',
        mySubjects: SEED_SUBJECTS.filter((s) => mine.has(s.id)).map(toSubject),
        trending: [...notes].sort((a, b) => b.upvotes - a.upvotes).slice(0, 2).map(toSummary),
        examInDays: next ? Math.ceil((next.dueAt - ctx.now()) / DAY) : null,
      };
    },
    async subjects() { ctx.requireUser(); await ctx.wait(); return SEED_SUBJECTS.map(toSubject); },
    async setMySubject(id, on) { ctx.requireUser(); await ctx.wait(80); if (on) mine.add(id); else mine.delete(id); },
    async getSubject(id) { ctx.requireUser(); await ctx.wait(); const s = SEED_SUBJECTS.find((x) => x.id === id); return s ? toSubject(s) : null; },
    async listNotes(q) {
      ctx.requireUser();
      await ctx.wait();
      let rows = notes.filter((n) => n.subjectId === q.subjectId && n.kind === q.kind);
      if (q.unit !== undefined) rows = rows.filter((n) => n.unit === q.unit);
      if (q.examYear !== undefined) rows = rows.filter((n) => n.examYear === q.examYear);
      rows = [...rows].sort((a, b) => (q.sort === 'new' ? b.createdAt - a.createdAt : b.upvotes - a.upvotes));
      return rows.map(toSummary);
    },
    async getNote(id): Promise<NoteDetail | null> {
      ctx.requireUser();
      await ctx.wait();
      const n = notes.find((x) => x.id === id);
      if (!n) return null;
      const subj = SEED_SUBJECTS.find((s) => s.id === n.subjectId);
      return { ...toSummary(n), subjectName: subj?.name ?? n.subjectId, uploadedLabel: fmtDay(n.createdAt), previewPages: pagesFor(n.id) };
    },
    async toggleUpvote(id) {
      requireVerified();
      await ctx.wait(80);
      const n = notes.find((x) => x.id === id);
      if (!n) throw new Error('not_found');
      if (n.mineRow) throw new Error('own_note');
      if (upvoted.has(id)) upvoted.delete(id); else upvoted.add(id);
      return { upvoted: upvoted.has(id), upvotes: toSummary(n).upvotes };
    },
    async toggleSave(id) {
      ctx.requireUser();
      await ctx.wait(80);
      const n = notes.find((x) => x.id === id);
      if (!n) throw new Error('not_found');
      if (saved.has(id)) saved.delete(id); else saved.add(id);
      return { saved: saved.has(id), saves: toSummary(n).saves };
    },
    async savedNotes() { ctx.requireUser(); await ctx.wait(); return notes.filter((n) => saved.has(n.id)).map(toSummary); },
    async myUploads() { ctx.requireUser(); await ctx.wait(); return notes.filter((n) => n.mineRow).map(toSummary); },
    async upload(input: UploadInput) {
      requireVerified();
      await ctx.wait(400);
      const check = validateUpload({ title: input.title, rightsConfirmed: input.rightsConfirmed, files: input.files });
      if (!check.ok) return check;
      const id = `n-up-${++counter}`;
      const images = input.files.every((f) => f.mime.startsWith('image/'));
      notes.push({
        id, subjectId: input.subjectId, kind: input.kind, title: input.title.trim(), fileKind: images ? 'Images' : 'PDF', pages: images ? input.files.length : 1,
        author: null, examYear: input.examYear, examLabel: input.examLabel, upvotes: 0, saves: 0, views: 0, ageDays: 0,
        createdAt: ctx.now(), mineRow: true, isAnon: input.anon,
      });
      const e = (extra[input.subjectId] ??= { notes: 0, pyqs: 0 });
      if (input.kind === 'pyq') e.pyqs += 1; else e.notes += 1;
      return { ok: true as const, id };
    },

    async myTimetable() { ctx.requireUser(); await ctx.wait(); return adopted ? timetable() : null; },
    async timetables() { ctx.requireUser(); await ctx.wait(); return [timetable()]; },
    async adoptTimetable() { ctx.requireUser(); await ctx.wait(); adopted = true; return timetable(); },
    async setTimetableReminders(on) { ctx.requireUser(); await ctx.wait(80); remindersOn = on; },
    async attendance() { ctx.requireUser(); await ctx.wait(); return attendance(); },
    async markAttendance(slotId, mark) {
      ctx.requireUser();
      await ctx.wait(80);
      const today = attendance().today.find((t) => t.slotId === slotId);
      if (!today) throw new Error('not_found');
      marks.set(slotId, { subjectId: today.subjectId, mark });
      return attendance();
    },
    async deadlines() { ctx.requireUser(); await ctx.wait(); return deadlines.map(toDeadline).sort((a, b) => a.dueAt - b.dueAt); },
    async addDeadline(input) {
      requireVerified();
      await ctx.wait(150);
      const d: DRow = { id: `d-new-${++counter}`, type: input.type, title: input.title.trim(), meta: input.meta.trim(), dueAt: input.dueAt, votes: 0, mine: true };
      deadlines.push(d);
      return toDeadline(d);
    },
    async confirmDeadline(id) {
      requireVerified();
      await ctx.wait(80);
      const d = deadlines.find((x) => x.id === id);
      if (!d) throw new Error('not_found');
      d.mine = !d.mine;
      return toDeadline(d);
    },
  };
}
