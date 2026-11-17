// Crew rules (The Crew, clubs). Pure; the mock calls these now and the backend reuses them later.

export type TaskStatus = 'assigned' | 'accepted' | 'working' | 'review' | 'revision' | 'approved';
export type TaskAction = 'accept' | 'start' | 'submit' | 'approve' | 'request_revision';

export const TASK_STEPS = ['Assigned', 'Accepted', 'Working', 'Review', 'Approved'] as const;

/** Which of the five progress segments is current. A revision sends the task back to Working. */
export function taskStepIndex(s: TaskStatus): number {
  return { assigned: 0, accepted: 1, working: 2, review: 3, revision: 2, approved: 4 }[s];
}

const TRANSITIONS: Record<TaskStatus, Partial<Record<TaskAction, TaskStatus>>> = {
  assigned: { accept: 'accepted' },
  accepted: { start: 'working' },
  working: { submit: 'review' },
  review: { approve: 'approved', request_revision: 'revision' },
  revision: { submit: 'review' },
  approved: {},
};

/** Next status for an action, or null when the action is not allowed from here. */
export function nextTaskStatus(status: TaskStatus, action: TaskAction): TaskStatus | null {
  return TRANSITIONS[status][action] ?? null;
}

/** Actions only the reviewer (a club admin) may take. */
export const REVIEWER_ACTIONS: readonly TaskAction[] = ['approve', 'request_revision'];

export type ClubRole = 'lead' | 'coordinator' | 'member';
export const isClubAdmin = (r: ClubRole | undefined) => r === 'lead' || r === 'coordinator';

/** Admin-only channels (e.g. #announcements) accept posts from club admins only. */
export function canPostInChannel(i: { adminOnly: boolean; role: ClubRole | undefined }): boolean {
  return !!i.role && (!i.adminOnly || isClubAdmin(i.role));
}

export type ClubPostCheck = { ok: true } | { ok: false; reason: 'anonymous' | 'empty' | 'not_admin' };

/** Club posts are always named: a post by a club must carry the human author, and can never be anonymous. */
export function validateClubPost(i: { body: string; anonymous?: boolean; role: ClubRole | undefined }): ClubPostCheck {
  if (i.anonymous) return { ok: false, reason: 'anonymous' };
  if (!isClubAdmin(i.role)) return { ok: false, reason: 'not_admin' };
  if (!i.body.trim()) return { ok: false, reason: 'empty' };
  return { ok: true };
}

export type ClubScore = { clubId: string; xp: number; name: string };
export type RankedClub<T extends ClubScore> = T & { rank: number };

/** Clout Board ranks CLUBS only, by XP (highest first, name breaks ties). People are never ranked. */
export function rankClubs<T extends ClubScore>(clubs: readonly T[]): RankedClub<T>[] {
  return [...clubs].sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name)).map((c, i) => ({ ...c, rank: i + 1 }));
}

/** Quest progress as a whole percent, capped at 100. */
export function questPercent(done: number, target: number): number {
  return target <= 0 ? 0 : Math.min(100, Math.round((done / target) * 100));
}
