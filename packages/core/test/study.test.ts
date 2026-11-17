import { describe, expect, it } from 'vitest';
import { attendanceSummary, formatMb, isDeadlineConfirmed, DEADLINE_CONFIRM_VOTES, validateUpload, MAX_FILE_BYTES } from '../src';

const MB = 1024 * 1024;
const pdf = (mb: number) => ({ name: 'a.pdf', sizeBytes: mb * MB, mime: 'application/pdf' });
const img = (mb = 1) => ({ name: 'a.jpg', sizeBytes: mb * MB, mime: 'image/jpeg' });

describe('upload rules', () => {
  const base = { title: 'End-sem 2023', rightsConfirmed: true };
  it('needs the rights checkbox', () => expect(validateUpload({ ...base, rightsConfirmed: false, files: [pdf(4)] })).toEqual({ ok: false, reason: 'rights' }));
  it('accepts a 4.2 MB pdf', () => expect(validateUpload({ ...base, files: [pdf(4.2)] })).toEqual({ ok: true }));
  it('accepts exactly 20 MB, rejects 34 MB', () => {
    expect(validateUpload({ ...base, files: [{ ...pdf(20), sizeBytes: MAX_FILE_BYTES }] }).ok).toBe(true);
    expect(validateUpload({ ...base, files: [pdf(34)] })).toMatchObject({ ok: false, reason: 'too_large' });
  });
  it('allows 10 photos, rejects 11', () => {
    expect(validateUpload({ ...base, files: Array.from({ length: 10 }, () => img()) }).ok).toBe(true);
    expect(validateUpload({ ...base, files: Array.from({ length: 11 }, () => img()) })).toMatchObject({ reason: 'too_many_photos' });
  });
  it('rejects empty title, no file, mixed and odd types', () => {
    expect(validateUpload({ ...base, title: '  ', files: [pdf(1)] })).toMatchObject({ reason: 'title' });
    expect(validateUpload({ ...base, files: [] })).toMatchObject({ reason: 'no_file' });
    expect(validateUpload({ ...base, files: [pdf(1), img()] })).toMatchObject({ reason: 'mixed' });
    expect(validateUpload({ ...base, files: [{ name: 'a.docx', sizeBytes: 10, mime: 'application/msword' }] })).toMatchObject({ reason: 'type' });
  });
  it('formats sizes', () => {
    expect(formatMb(34 * MB)).toBe('34 MB');
    expect(formatMb(4.2 * MB)).toBe('4.2 MB');
  });
});

describe('75% attendance rule', () => {
  it('matches the design worked numbers', () => {
    expect(attendanceSummary(31, 38)).toMatchObject({ pct: 82, status: 'safe', canMiss: 3 });
    expect(attendanceSummary(22, 34)).toMatchObject({ pct: 65, status: 'low', needToRecover: 14 });
    expect(attendanceSummary(25, 30)).toMatchObject({ pct: 83, canMiss: 3 });
  });
  it('exactly 75% is safe with no spare miss', () => {
    const s = attendanceSummary(3, 4);
    expect(s).toMatchObject({ status: 'warn', canMiss: 0, needToRecover: 0 });
  });
  it('recovery count really gets back to 75%', () => {
    const s = attendanceSummary(22, 34);
    expect(attendanceSummary(22 + s.needToRecover, 34 + s.needToRecover).status).not.toBe('low');
    expect(attendanceSummary(22 + s.needToRecover - 1, 34 + s.needToRecover - 1).status).toBe('low');
  });
  it('no classes is not a failure', () => expect(attendanceSummary(0, 0)).toMatchObject({ pct: 0, status: 'safe' }));
});

describe('deadline confirmation', () => {
  it('needs the threshold of upvotes', () => {
    expect(isDeadlineConfirmed(DEADLINE_CONFIRM_VOTES - 1)).toBe(false);
    expect(isDeadlineConfirmed(DEADLINE_CONFIRM_VOTES)).toBe(true);
  });
});
