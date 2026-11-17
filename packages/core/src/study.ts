// Study rules: upload limits, the 75% attendance rule, deadline confirmation. Pure, no I/O.

export const MAX_FILE_BYTES = 20 * 1024 * 1024; // one file, 20 MB
export const UPLOAD_MAX_PHOTOS = 10; // or up to 10 photos
export const MAX_TITLE = 80;

export type UploadFile = { name: string; sizeBytes: number; mime: string };
export type UploadCheck =
  | { ok: true }
  | { ok: false; reason: 'rights' | 'no_file' | 'title' | 'too_large' | 'too_many_photos' | 'mixed' | 'type'; sizeBytes?: number };

const isImage = (f: UploadFile) => f.mime.startsWith('image/');

/** Notes and PYQs: the rights checkbox is required; one PDF up to 20 MB, or up to 10 photos (each up to 20 MB). */
export function validateUpload(i: { title: string; rightsConfirmed: boolean; files: UploadFile[] }): UploadCheck {
  if (!i.rightsConfirmed) return { ok: false, reason: 'rights' };
  const t = i.title.trim();
  if (t.length === 0 || t.length > MAX_TITLE) return { ok: false, reason: 'title' };
  if (i.files.length === 0) return { ok: false, reason: 'no_file' };
  const images = i.files.filter(isImage);
  if (images.length > 0 && images.length !== i.files.length) return { ok: false, reason: 'mixed' };
  if (images.length === 0) {
    if (i.files.length > 1 || i.files[0].mime !== 'application/pdf') return { ok: false, reason: 'type' };
  }
  if (images.length > UPLOAD_MAX_PHOTOS) return { ok: false, reason: 'too_many_photos' };
  const big = i.files.find((f) => f.sizeBytes > MAX_FILE_BYTES);
  if (big) return { ok: false, reason: 'too_large', sizeBytes: big.sizeBytes };
  return { ok: true };
}

/** "34 MB" style, for the file-size message. Display only. */
export function formatMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10} MB`;
}

// ---- Attendance (personal tracker, not the college register) ----
export const ATTENDANCE_MIN_PCT = 75;

export type AttendanceStatus = 'safe' | 'warn' | 'low';
export type AttendanceSummary = {
  attended: number;
  total: number;
  /** Rounded to a whole percent. 0 when no classes are logged. */
  pct: number;
  status: AttendanceStatus;
  /** Classes the student can still miss and stay at or above 75%. 0 when below. */
  canMiss: number;
  /** Consecutive classes to attend to get back to 75%. 0 when already at or above. */
  needToRecover: number;
};

/** attended/total >= 3/4 is the 75% rule. Integer maths only, so exactly 75% counts as safe. */
export function attendanceSummary(attended: number, total: number): AttendanceSummary {
  if (total <= 0) return { attended, total: 0, pct: 0, status: 'safe', canMiss: 0, needToRecover: 0 };
  const ok = 4 * attended >= 3 * total;
  const canMiss = ok ? Math.floor((4 * attended - 3 * total) / 3) : 0;
  // Attending n more: 4(a+n) >= 3(t+n)  =>  n >= 3t - 4a
  const needToRecover = ok ? 0 : 3 * total - 4 * attended;
  return {
    attended,
    total,
    pct: Math.round((attended / total) * 100),
    status: !ok ? 'low' : canMiss <= 1 ? 'warn' : 'safe',
    canMiss,
    needToRecover,
  };
}

// ---- Deadlines: added by classmates, confirmed by upvotes ----
/** PLACEHOLDER: the owner has not fixed how many upvotes confirm a deadline. Change here only. */
export const DEADLINE_CONFIRM_VOTES = 5;
export const isDeadlineConfirmed = (votes: number) => votes >= DEADLINE_CONFIRM_VOTES;

export const DEADLINE_TYPES = ['ASSIGNMENT', 'INTERNAL', 'EXAM', 'FEES'] as const;
export type DeadlineType = (typeof DEADLINE_TYPES)[number];
