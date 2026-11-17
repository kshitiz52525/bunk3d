// Study domain contract (N1-N4 wave 1, K1-K3 wave 2).
// RLS summary: everything is scoped to the caller's campus. A note's uploader is never returned when it is anonymous
// (the server nulls it, the client cannot unmask it). Attendance rows are visible to their owner only.
import type { AttendanceSummary, DeadlineType } from '@bunk3d/core';

export type NoteKind = 'note' | 'pyq';
export type NoteFileKind = 'PDF' | 'Images';

export type Subject = {
  id: string;
  code: string; // "CS501"
  name: string; // "Database Management Systems"
  short: string; // "DBMS"
  sem: number;
  branch: string; // "CSE"
  noteCount: number;
  pyqCount: number;
  /** Tile colour token name resolved by the UI. */
  tint: 'lime' | 'violet' | 'plain';
  isMine: boolean;
  seed?: true;
};

export type NoteSummary = {
  id: string;
  subjectId: string;
  subjectShort: string;
  kind: NoteKind;
  title: string;
  fileKind: NoteFileKind;
  /** Pages (PDF) or photos (Images). */
  pages: number;
  /** "Vikram P." or "Anonymous". Anonymous uploads never expose the uploader. */
  authorLabel: string;
  isAnon: boolean;
  /** PYQs only. */
  examYear?: number;
  examLabel?: string; // "End-sem"
  unit?: number;
  upvotes: number;
  saves: number;
  views: number;
  createdAt: number;
  upvoted: boolean;
  saved: boolean;
  mine: boolean;
  seed?: true;
};

export type NotePage = { heading?: string; lines: string[]; solution?: string };

export type NoteDetail = NoteSummary & {
  subjectName: string;
  uploadedLabel: string; // "2 Oct"
  /** Rendered preview pages (the viewer streams the rest). Cached by the client for offline reading. */
  previewPages: NotePage[];
};

export type StudyHome = {
  /** "Sem 5 CSE" */
  semLabel: string;
  mySubjects: Subject[];
  trending: NoteSummary[];
  /** Days to the nearest confirmed EXAM deadline of the caller's section, or null when none is confirmed. */
  examInDays: number | null;
};

export type NoteQuery = { subjectId: string; kind: NoteKind; sort: 'top' | 'new'; unit?: number; examYear?: number };

export type UploadInput = {
  title: string;
  kind: NoteKind;
  subjectId: string;
  sem: number;
  examYear?: number;
  examLabel?: string;
  anon: boolean;
  /** The checkbox: "This is my own work or a past paper — not a copyrighted textbook." Must be true. */
  rightsConfirmed: boolean;
  files: { name: string; sizeBytes: number; mime: string }[];
};
export type UploadResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'rights' | 'no_file' | 'title' | 'too_large' | 'too_many_photos' | 'mixed' | 'type'; sizeBytes?: number };

// ---- Wave 2 ----
export type TimetableClass = { id: string; start: string; end: string; subject: string; room: string; tag?: 'Lab' };
export type Timetable = {
  id: string;
  name: string; // "CSE 5A"
  madeBy: string; // "Vikram P."
  adoptedBy: number;
  adopted: boolean;
  /** Index 0 = Monday .. 5 = Saturday. */
  days: { label: string; date: string; classes: TimetableClass[] }[];
  remindersOn: boolean;
  seed?: true;
};

export type AttendanceSubject = { id: string; name: string } & AttendanceSummary;
export type AttendanceToday = { slotId: string; subjectId: string; label: string; mark: 'present' | 'absent' | null };
export type AttendanceOverview = { dateLabel: string; today: AttendanceToday[]; subjects: AttendanceSubject[] };

export type Deadline = {
  id: string;
  type: DeadlineType;
  title: string;
  meta: string;
  dueAt: number;
  votes: number;
  /** Server decides from the vote count (core `isDeadlineConfirmed`). Unconfirmed ones render dashed. */
  confirmed: boolean;
  confirmedByMe: boolean;
  seed?: true;
};
export type DeadlineInput = { type: DeadlineType; title: string; meta: string; dueAt: number };

export interface StudyApi {
  /** Signed-in (pending-verification users may read). Subjects of the caller's campus + section, trending notes. */
  home(): Promise<StudyHome>;
  /** Signed-in. Subjects of the caller's campus. */
  subjects(): Promise<Subject[]>;
  /** Signed-in. Edit "My subjects". Writes only the caller's own selection. */
  setMySubject(subjectId: string, mine: boolean): Promise<void>;
  getSubject(subjectId: string): Promise<Subject | null>;
  /** Signed-in, same campus. Excludes removed / reported-hidden notes. */
  listNotes(q: NoteQuery): Promise<NoteSummary[]>;
  getNote(noteId: string): Promise<NoteDetail | null>;
  /** Verified users only. One upvote per user per note (toggle); the uploader's own note is rejected. */
  toggleUpvote(noteId: string): Promise<{ upvoted: boolean; upvotes: number }>;
  /** Signed-in. Saves are per user; the client stores the file for offline reading. */
  toggleSave(noteId: string): Promise<{ saved: boolean; saves: number }>;
  /** Signed-in. The caller's saved notes (also what Profile > My notes / Saved reads). */
  savedNotes(): Promise<NoteSummary[]>;
  /** Signed-in. The caller's own uploads. */
  myUploads(): Promise<NoteSummary[]>;
  /** Verified users only. Server re-validates with core `validateUpload`; `rights_confirmed` is stored. */
  upload(input: UploadInput): Promise<UploadResult>;

  /** Wave 2. Signed-in. The section timetable the caller adopted, or null. */
  myTimetable(): Promise<Timetable | null>;
  /** Wave 2. Signed-in. Timetables for the caller's campus and branch. */
  timetables(): Promise<Timetable[]>;
  adoptTimetable(id: string): Promise<Timetable>;
  setTimetableReminders(on: boolean): Promise<void>;
  /** Wave 2. Owner only (RLS: user_id = auth.uid()). Percentages computed with core `attendanceSummary`. */
  attendance(): Promise<AttendanceOverview>;
  markAttendance(slotId: string, mark: 'present' | 'absent'): Promise<AttendanceOverview>;
  /** Wave 2. Signed-in, same campus + section. */
  deadlines(): Promise<Deadline[]>;
  /** Wave 2. Verified users only. Adds an unconfirmed deadline (the adder counts as the first vote). */
  addDeadline(input: DeadlineInput): Promise<Deadline>;
  /** Wave 2. Verified users only. Toggle; one vote per user per deadline. */
  confirmDeadline(id: string): Promise<Deadline>;
}
