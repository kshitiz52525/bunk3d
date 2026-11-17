import type { YouApi } from '../contract';
import type { MockCtx } from './ctx';

// SEED DATA. Mock only. The returning-user seed profile is flagged by living in ctx.profile.
export function createYou(ctx: MockCtx): YouApi {
  return {
    async me() {
      await ctx.wait(60);
      const p = ctx.profile;
      const name = p?.name ?? 'Student';
      const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
      return { id: ctx.requireUser(), name, initials, username: p?.username ?? 'student', campusName: 'Atria University', photoUri: p?.photoUri };
    },
    async badges() {
      return { unreadDms: false, unreadNotices: 0 };
    },
  };
}
