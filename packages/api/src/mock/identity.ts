import { decideOtp, isAdult, parseDob, type OtpAttemptState } from '@bunk3d/core';
import type { IdentityApi, MembershipState, OnboardingDraft, Session, Waitlist } from '../contract';
import type { MockCtx } from './ctx';
import { MOCK_CODE, SEED_CAMPUSES, SEED_CLUBS } from './seed';

const emptyDraft = (): OnboardingDraft => ({ profile: {}, interests: [], goals: [], clubs: {}, followNotices: true });
const TAKEN = new Set(['admin', 'bunk3d', 'aarav.taken']);

export function createIdentity(ctx: MockCtx): IdentityApi {
  const { wait, now, wave } = ctx;
  const patch = ctx.patchSession;
  const set = ctx.setSession;
  let draft = emptyDraft();
  let attempts: OtpAttemptState = { wrong: 0, lockedUntil: null };
  let emailWrong = 0;
  let waitlistCount = 0;

  const returningSession = (phone?: string): Session => {
    // SEED profile for the mock returning user.
    ctx.profile = { name: 'Aarav Sharma', username: 'aarav.builds', degree: 'B.Tech', dept: 'CSE', year: '3rd' };
    return { userId: 'u_returning', phone, campusId: 'atria', verified: 'verified', onboarding: 'done', wave };
  };
  const newSession = (phone?: string): Session => ({ userId: 'u_new', phone, campusId: null, verified: 'unverified', onboarding: 'college', wave });

  return {
    auth: {
      async sendOtp() { await wait(); return { ok: true }; },
      async verifyOtp(phone, code, o) {
        await wait();
        const { decision, next } = decideOtp(attempts, code === MOCK_CODE, now());
        attempts = next;
        if (!decision.ok) return decision;
        draft = emptyDraft();
        const s = o.returning ? returningSession(phone) : newSession(phone);
        set(s);
        return { ok: true, session: s };
      },
      async signInWithGoogle(o) {
        await wait();
        draft = emptyDraft();
        const s = o.returning ? returningSession() : newSession();
        set(s);
        return { ok: true, session: s };
      },
      getSession: ctx.getSession,
      subscribe: ctx.subscribe,
      async signOut() { set(null); draft = emptyDraft(); },
    },
    campuses: {
      async listLive(q) {
        await wait();
        const s = q.trim().toLowerCase();
        return SEED_CAMPUSES.filter((c) => c.name.toLowerCase().includes(s));
      },
      async select(id) { await wait(); patch({ campusId: id, onboarding: 'verify' }); },
      async requestWaitlist(college): Promise<Waitlist> {
        await wait();
        waitlistCount += 1;
        // The waitlist total is real per-college data in the backend. In the mock it only counts this session's requests.
        return { college, count: waitlistCount, target: 25, seed: true };
      },
    },
    verification: {
      async sendEmailCode() { await wait(); emailWrong = 0; return { ok: true }; },
      async verifyEmailCode(code) {
        await wait();
        if (code === MOCK_CODE) { patch({ verified: 'verified', onboarding: 'profile' }); return { ok: true }; }
        emailWrong += 1;
        return { ok: false, reason: 'wrong' };
      },
      async submitId() { await wait(); patch({ verified: 'pending', onboarding: 'profile' }); return { ok: true }; },
    },
    onboarding: {
      async getDraft() { return structuredClone(draft); },
      async isUsernameFree(u) { await wait(80); return !TAKEN.has(u.toLowerCase()); },
      async saveProfile(input) {
        await wait();
        const dob = parseDob(input.dob);
        if (!dob || !input.name.trim() || !input.username.trim()) return { ok: false, reason: 'invalid' };
        if (!isAdult(dob, new Date(now()))) {
          draft = emptyDraft(); // delete what was entered
          return { ok: false, reason: 'underage' };
        }
        const { dob: _private, ...rest } = input; // dob is never kept in the draft
        draft.profile = rest;
        ctx.profile = { name: input.name, username: input.username, degree: input.degree, dept: input.dept, year: input.year };
        patch({ onboarding: 'interests' });
        return { ok: true };
      },
      async saveInterests(interests, goals) {
        await wait();
        draft.interests = interests;
        draft.goals = goals;
        patch({ onboarding: 'clubs' });
      },
      async listClubs() { await wait(); return SEED_CLUBS; },
      async setClubMembership(id, joined): Promise<MembershipState> {
        await wait(80);
        const club = SEED_CLUBS.find((c) => c.id === id);
        const state: MembershipState = !joined ? 'none' : club?.join === 'approval' ? 'pending' : 'joined';
        draft.clubs = { ...draft.clubs, [id]: state };
        return state;
      },
      async setFollowNotices(f) { draft.followNotices = f; },
      async acceptGuidelines() { await wait(); patch({ onboarding: 'done', wave }); },
    },
  };
}
