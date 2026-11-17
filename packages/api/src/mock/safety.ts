import { hiddenPendingReview, modDecide, standing as coreStanding, canPost, type ModVote } from '@bunk3d/core';
import type {
  BlockedUser, ModCase, ModQueue, ModQueueItem, ModVoteKind, ModVoteResult, MyStanding, ReportInput, ReportReason,
  ReportTargetKind, SafetyApi,
} from '../contract';
import { REPORT_REASONS } from '../contract';
import type { MockCtx } from './ctx';
import { personById } from './seed-people';
import { RULES, SEED_CASES, SEED_MODS_ON, type SeedCase } from './seed-safety';

const label = (r: ReportReason) => REPORT_REASONS.find((x) => x.id === r)!.label;
const HEADLINE: Record<ReportReason, string> = {
  harassment: 'Harassment', hate: 'Hate', naming: 'Naming someone', sexual: 'Sexual content', self_harm: 'Self-harm',
  spam: 'Spam', misinfo: 'Misinformation', other: 'Reported',
};
const RULE_FOR: Partial<Record<ReportReason, string>> = { hate: 'hate', naming: 'naming', harassment: 'harassment' };
const KIND_WORD: Record<ReportTargetKind, string> = {
  post: 'post', comment: 'comment', note: 'note', story: 'story', user: 'profile', dm: 'message', event: 'event',
  club: 'club', meetup: 'meetup', invite: 'invite', gig: 'gig', listing: 'listing',
};

type Case = SeedCase & { reportedAt: number; votes: (ModVote & { vote: ModVoteKind })[]; state: 'open' | 'decided' | 'ops'; placeholder?: boolean };

export type SafetyMockOptions = {
  /** Test hook: active strikes per user (epoch ms of each strike). The mock appends to it when a removal is decided. */
  strikes?: Record<string, number[]>;
};

// SEED DATA lives in seed-safety.ts, flagged `seed: true`. Mock only.
export function createSafety(ctx: MockCtx, opts: SafetyMockOptions = {}): SafetyApi {
  const strikes = opts.strikes ?? {};
  const cases: Case[] = SEED_CASES.map((c) => ({
    ...c,
    reportedAt: ctx.now() - c.ageMin * 60_000,
    votes: c.votes.map((v, i) => ({ ...v, at: ctx.now() - 5 * 60_000 + i })),
    state: 'open' as const,
  }));
  const reportCounts = new Map<string, number>();
  const blocked = new Map<string, BlockedUser>([
    ['seed_blocked_1', { id: 'seed_blocked_1', name: 'Blocked student', initials: 'BS', seed: true }],
    ['seed_blocked_2', { id: 'seed_blocked_2', name: 'Blocked student', initials: 'BS', seed: true }],
  ]);
  let nextId = 1;

  const me = () => ctx.requireUser();
  const isMod = () => me() === 'u_returning'; // SEED: the returning mock user is a Campus Mod.
  const key = (k: string, id: string) => `${k}:${id}`;
  const visible = () => cases.filter((c) => c.state === 'open' && c.authorId !== me()).sort((a, b) => a.reportedAt - b.reportedAt);
  const requireMod = () => { if (!isMod()) throw new Error('Campus Mods only'); };

  const totalReports = (c: Case) => Object.values(c.reasons).reduce((a, b) => a + (b ?? 0), 0);
  const toItem = (c: Case): ModQueueItem => {
    const myVote = c.votes.find((v) => v.modId === me())?.vote;
    return {
      id: c.id,
      headline: c.source === 'ai' ? c.headline : `${c.headline} · ${totalReports(c)} ${totalReports(c) === 1 ? 'report' : 'reports'}`,
      reportCount: totalReports(c),
      reportedAt: c.reportedAt,
      excerpt: c.excerpt,
      targetKind: c.targetKind,
      // Mods never see who posted, so even named posts show no name.
      authorLabel: c.anon ? 'Anonymous' : 'A student',
      source: c.source,
      votesSoFar: { remove: c.votes.filter((v) => v.vote === 'remove').length, keep: c.votes.filter((v) => v.vote === 'keep').length },
      notLiveYet: !!c.notLiveYet,
      myVote,
    };
  };

  return {
    async report(input: ReportInput) {
      await ctx.wait(120);
      me();
      const k = key(input.targetKind, input.targetId);
      const n = (reportCounts.get(k) ?? 0) + 1;
      reportCounts.set(k, n);
      let c = cases.find((x) => key(x.targetKind, x.targetId) === k && x.state === 'open');
      if (c) {
        c.reasons[input.reason] = (c.reasons[input.reason] ?? 0) + 1;
      } else {
        c = {
          id: `case_r${nextId++}`,
          headline: HEADLINE[input.reason],
          excerpt: `A reported ${KIND_WORD[input.targetKind]}. The content shows here once the backend is connected.`,
          targetKind: input.targetKind, targetId: input.targetId, authorId: 'unknown_author', anon: false, source: 'reports',
          reasons: { [input.reason]: 1 }, context: `${KIND_WORD[input.targetKind]} · as students see it`, ageMin: 0,
          votes: [], seed: true, reportedAt: ctx.now(), state: 'open', placeholder: true,
        };
        cases.push(c);
      }
      if (input.alsoBlock) {
        if (input.targetKind === 'user') {
          const p = personById(input.targetId);
          blocked.set(input.targetId, { id: input.targetId, name: p?.name ?? 'Student', initials: p?.initials ?? 'ST' });
        } else {
          const id = `author:${k}`;
          blocked.set(id, { id, name: `Author of a reported ${KIND_WORD[input.targetKind]}`, initials: 'AU' });
        }
      }
      // The reporter's identity is never stored on the case or returned to anyone.
      return { ok: true as const, reportId: `rep_${nextId++}`, hiddenPendingReview: hiddenPendingReview(n) };
    },
    async blockUser(userId) {
      await ctx.wait(60);
      me();
      const p = personById(userId);
      blocked.set(userId, { id: userId, name: p?.name ?? 'Student', initials: p?.initials ?? 'ST' });
    },
    async unblockUser(userId) {
      await ctx.wait(60);
      blocked.delete(userId);
    },
    async blockedUsers() {
      await ctx.wait(60);
      return [...blocked.values()];
    },
    async myStanding(): Promise<MyStanding> {
      await ctx.wait(40);
      const s = coreStanding(strikes[me()] ?? [], ctx.now());
      return { activeStrikes: s.activeStrikes, action: s.action, mutedUntil: s.mutedUntil, bannedUntil: s.bannedUntil, removed: s.removed, canPost: canPost(s), nextExpiryAt: s.nextExpiryAt };
    },
    async isHiddenPendingReview(kind, id) {
      await ctx.wait(30);
      return hiddenPendingReview(reportCounts.get(key(kind, id)) ?? 0);
    },
    async modStatus() {
      await ctx.wait(40);
      return { isMod: isMod(), waiting: isMod() ? visible().length : 0 };
    },
    async modQueue(): Promise<ModQueue> {
      await ctx.wait(100);
      requireMod();
      const v = visible();
      return {
        waiting: v.length,
        oldestMinutes: v.length ? Math.max(0, Math.round((ctx.now() - v[0].reportedAt) / 60_000)) : null,
        modsOn: SEED_MODS_ON,
        items: v.map(toItem),
        seed: true,
      };
    },
    async modCase(id): Promise<ModCase> {
      await ctx.wait(80);
      requireMod();
      const v = visible();
      const idx = v.findIndex((c) => c.id === id);
      if (idx < 0) throw new Error('Not found'); // includes the caller's own posts: they never appear.
      const c = v[idx];
      const top = (Object.entries(c.reasons) as [ReportReason, number][]).sort((a, b) => b[1] - a[1]);
      const ruleKey = top.map(([r]) => RULE_FOR[r]).find(Boolean);
      return {
        ...toItem(c),
        position: { index: idx + 1, total: v.length },
        reasons: top.map(([reason, count]) => ({ reason, label: label(reason), count })),
        context: c.context,
        rule: ruleKey ? RULES[ruleKey] : undefined,
      };
    },
    async modVote(id, vote): Promise<ModVoteResult> {
      await ctx.wait(120);
      requireMod();
      const c = cases.find((x) => x.id === id && x.state === 'open' && x.authorId !== me());
      if (!c) throw new Error('Not found');
      if (c.notLiveYet) throw new Error('Held by the automated check; not open for votes yet');
      if (!c.votes.some((v) => v.modId === me())) c.votes.push({ modId: me(), vote, at: ctx.now() });
      const out = modDecide(c.votes, c.authorId);
      if (out.status === 'removed') {
        c.state = 'decided';
        (strikes[c.authorId] ??= []).push(ctx.now());
        return { outcome: 'removed', title: 'Removed — 2 of 2 Mods agreed', body: 'Author gets a strike and can appeal once to ops. The post disappears for everyone.' };
      }
      if (out.status === 'kept') {
        c.state = 'decided';
        return { outcome: 'kept', title: 'Kept — 2 of 2 Mods agreed', body: 'The post stays up and the reports are closed.' };
      }
      if (out.status === 'escalated') {
        c.state = 'ops';
        return out.reason === 'split'
          ? { outcome: 'escalated', title: 'Split vote (1 remove, 1 keep)', body: 'Sent to Bunk3d ops for a final call within 24 hours.' }
          : { outcome: 'escalated', title: 'Escalated to ops', body: 'Stays hidden until ops decides. Thanks for flagging.' };
      }
      return { outcome: 'pending', title: 'Vote recorded', body: 'Waiting for a second Mod. Two matching votes decide; a split goes to Bunk3d ops.' };
    },
  };
}
