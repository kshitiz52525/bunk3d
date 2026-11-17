import { canPostInChannel, computeTakeHome, isClubAdmin, nextTaskStatus, questPercent, rankClubs, validateClubPost, type ClubRole, type TaskAction } from '@bunk3d/core';
import type {
  ActiveQuest, ChannelMessage, ChannelView, ClubApproval, ClubChannel, ClubDetail, ClubEventRow, ClubFilter, ClubMember, ClubPost, ClubSummary,
  CloutBoard, CloutScope, CrewApi, MembershipState, Quest, QuestBoard, SendChannelResult, TaskDetail, TaskFilter, TaskGroup, TaskInput, TaskRow,
} from '../contract';
import type { MockCtx } from './ctx';
import { getStore } from './crew-dm-store';
import {
  D, H, SEED_APPROVALS, SEED_CLOUT, SEED_CLUB_EVENTS, SEED_CLUB_MEMBERS, SEED_CLUB_POSTS, SEED_CREW_CLUBS, SEED_LIFETIME_EARNED_PAISE,
  SEED_MY_CLUBS, SEED_QUESTS, SEED_SCORING_NOTE, SEED_TASKS, initialsOf, tintFor,
} from './seed-crew';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ONLINE_SEED: Record<string, number> = { gdg: 9 }; // seed

type RewardRaw = (typeof SEED_TASKS)[number]['reward'];
type TaskRec = Omit<TaskDetail, 'allowed' | 'reward'> & { assigneeId: string; rewardRaw: RewardRaw };

// SEED DATA lives in seed-crew.ts (flagged seed: true). Mock only.
export function createCrew(ctx: MockCtx): CrewApi {
  const { wait } = ctx;
  const store = getStore(ctx);
  const clubs = SEED_CREW_CLUBS.map((c) => ({ ...c }));
  const clubById = (id: string) => {
    const c = clubs.find((x) => x.id === id);
    if (!c) throw new Error('Club not found');
    return c;
  };
  const meId = () => ctx.getSession()?.userId ?? 'u_console';
  const meName = () => ctx.profile?.name ?? 'Club admin';
  const verified = () => ctx.getSession()?.verified === 'verified';

  // ---- members, approvals, posts, events ----
  const members = new Map<string, ClubMember[]>();
  const membersOf = (clubId: string): ClubMember[] => {
    let m = members.get(clubId);
    if (!m) {
      m = (SEED_CLUB_MEMBERS[clubId] ?? []).map((s, i) => ({ userId: s.me ? meId() : s.userId, name: s.me ? meName() : s.name, initials: initialsOf(s.me ? meName() : s.name), role: s.role, joinedAtMs: ctx.now() - (i + 1) * 20 * D, seed: true as const }));
      members.set(clubId, m);
    }
    return m;
  };
  const approvals: ClubApproval[] = SEED_APPROVALS.map((a) => ({ ...a, initials: initialsOf(a.name), requestedAtMs: ctx.now() - 5 * H, seed: true as const }));
  const events = (clubId: string): ClubEventRow[] => (SEED_CLUB_EVENTS[clubId] ?? []).map((e) => ({ id: e.id, title: e.title, startsAtMs: ctx.now() + e.inDays * D, going: e.going, seed: true as const }));
  const posts = new Map<string, ClubPost[]>();
  const postsOf = (clubId: string): ClubPost[] => {
    let p = posts.get(clubId);
    if (!p) {
      p = (SEED_CLUB_POSTS[clubId] ?? []).map((s) => {
        const ev = s.event ? events(clubId).find((e) => e.id === s.event) : undefined;
        return { id: s.id, clubId, body: s.body, atMs: ctx.now() - s.agoH * H, postedBy: { id: `u_${s.by.toLowerCase()}`, name: s.by, role: s.byRole }, event: ev && { id: ev.id, title: ev.title, dateMs: ev.startsAtMs }, seed: true as const };
      });
      posts.set(clubId, p);
    }
    return p;
  };

  const myRole = (clubId: string): ClubRole | undefined => {
    const m = store.membership.get(clubId);
    return m?.state === 'joined' ? m.role : undefined;
  };
  const summary = (clubId: string): ClubSummary => {
    const c = clubById(clubId);
    const m = store.membership.get(clubId);
    const { about: _a, eventCount: _e, adminCount: _ad, ...rest } = c;
    return { ...rest, state: m?.state ?? 'none', role: m?.state === 'joined' ? m.role : undefined, newCount: m?.state === 'joined' && isClubAdmin(m.role) ? SEED_MY_CLUBS[clubId]?.newCount : undefined };
  };

  // ---- tasks ----
  const tasks: TaskRec[] = SEED_TASKS.map((t) => {
    const c = clubById(t.clubId);
    return {
      id: t.id, clubId: t.clubId, clubShort: c.short, clubName: c.name, tint: c.tint, from: t.from, title: t.title, status: t.status,
      dueMs: ctx.now() + t.dueInDays * D, reviewer: t.reviewer, deliverables: t.deliverables, shift: t.shift, revisionNote: t.revisionNote,
      attachments: [], assigneeId: 'me', rewardRaw: t.reward, seed: true as const,
    };
  });
  const rewardOf = (r: RewardRaw): TaskRow['reward'] =>
    r.kind === 'paid'
      ? { kind: 'paid', payPaise: r.payPaise, gigId: r.gigId, takeHome: computeTakeHome({ payPaise: r.payPaise, kind: 'club', lifetimeEarnedPaise: SEED_LIFETIME_EARNED_PAISE }) }
      : r;
  const detail = (t: TaskRec): TaskDetail => {
    const { assigneeId: _a, rewardRaw, ...rest } = t;
    const allowed = (['accept', 'start', 'submit'] as TaskAction[]).filter((a) => nextTaskStatus(t.status, a));
    return { ...rest, reward: rewardOf(rewardRaw), allowed };
  };
  const taskById = (id: string) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) throw new Error('Task not found');
    return t;
  };
  const row = (t: TaskDetail): TaskRow => ({ id: t.id, clubId: t.clubId, clubShort: t.clubShort, clubName: t.clubName, tint: t.tint, from: t.from, title: t.title, status: t.status, dueMs: t.dueMs, reward: t.reward, seed: t.seed });

  // ---- quests ----
  const enrolled = new Set<string>();
  const questOf = (q: { id: string; scope: Quest['scope']; title: string; rule: string; xp: number; endsInDays: number }): Quest => ({
    id: q.id, scope: q.scope, title: q.title, rule: q.rule, xp: q.xp, endsAtMs: ctx.now() + q.endsInDays * D, enrolled: enrolled.has(q.id), seed: true,
  });

  const asMessage = (clubId: string, channelId: string, m: ReturnType<typeof getChannelRec>['msgs'][number]): ChannelMessage => ({
    id: m.id, clubId, channelId, author: { id: m.authorId, name: m.who, initials: initialsOf(m.who), tint: tintFor(m.authorId), role: m.role }, text: m.text, atMs: m.atMs, mine: m.mine, seed: m.seed,
  });
  const getChannelRec = (clubId: string, channelId: string) => {
    const c = store.channels.get(clubId)?.find((x) => x.id === channelId);
    if (!c) throw new Error('Channel not found');
    return c;
  };

  return {
    async listClubs(filter: ClubFilter) {
      await wait();
      const all = clubs.map((c) => summary(c.id));
      const mine = all.filter((c) => c.state !== 'none');
      const discover = all.filter((c) => c.state !== 'joined' && (filter === 'All' || c.category === filter));
      const openTaskCount = tasks.filter((t) => t.status !== 'approved').length;
      return { mine, discover, openTaskCount };
    },
    async getClub(clubId): Promise<ClubDetail> {
      await wait();
      const c = clubById(clubId);
      return { ...summary(clubId), about: c.about, eventCount: c.eventCount, adminCount: c.adminCount };
    },
    async joinClub(clubId): Promise<MembershipState> {
      await wait();
      const c = clubById(clubId);
      const cur = store.membership.get(clubId);
      if (cur) return cur.state;
      if (c.join === 'approval') { store.membership.set(clubId, { state: 'pending' }); store.emit(); return 'pending'; }
      store.membership.set(clubId, { state: 'joined', role: 'member' });
      c.members += 1;
      store.follows.add(`${clubId}:general`);
      store.emit();
      return 'joined';
    },
    async leaveClub(clubId): Promise<MembershipState> {
      await wait();
      const c = clubById(clubId);
      if (store.membership.get(clubId)?.state === 'joined') c.members = Math.max(0, c.members - 1);
      store.membership.delete(clubId);
      [...store.follows].filter((f) => f.startsWith(`${clubId}:`)).forEach((f) => store.follows.delete(f));
      store.emit();
      return 'none';
    },
    async listClubPosts(clubId) {
      await wait();
      return [...postsOf(clubId)].sort((a, b) => b.atMs - a.atMs);
    },
    async listClubEvents(clubId) { await wait(); return events(clubId); },
    async listClubMembers(clubId) { await wait(); return [...membersOf(clubId)]; },

    async listMyTasks(filter: TaskFilter): Promise<TaskGroup[]> {
      await wait();
      const now = ctx.now();
      const rows = tasks.map((t) => row(detail(t)));
      const shown = rows.filter((t) => (filter === 'Open' ? t.status !== 'approved' : filter === 'Paid' ? t.reward.kind === 'paid' : t.status === 'approved'));
      const groups: TaskGroup[] = [
        { key: 'this_week', label: 'DUE THIS WEEK', items: shown.filter((t) => t.status !== 'approved' && t.dueMs - now < 7 * D) },
        { key: 'next_week', label: 'NEXT WEEK', items: shown.filter((t) => t.status !== 'approved' && t.dueMs - now >= 7 * D) },
        { key: 'done', label: 'DONE', items: shown.filter((t) => t.status === 'approved') },
      ];
      return groups.filter((g) => g.items.length);
    },
    async getTask(taskId) { await wait(); return detail(taskById(taskId)); },
    async advanceTask(taskId, action, proof) {
      await wait();
      const t = taskById(taskId);
      const next = nextTaskStatus(t.status, action);
      if (!next) throw new Error('That step is not available for this task.');
      t.status = next;
      if (action === 'submit') {
        t.revisionNote = undefined;
        if (proof?.attachmentName) t.attachments = [...t.attachments, proof.attachmentName];
      }
      store.emit();
      return detail(t);
    },
    async askTaskQuestion(taskId, text) {
      await wait();
      taskById(taskId);
      if (!text.trim()) throw new Error('Write your question first.');
      return { ok: true };
    },

    async listQuests(): Promise<QuestBoard> {
      await wait();
      const a = SEED_QUESTS.active;
      const active: ActiveQuest = { ...questOf(a), enrolled: true, daysLeft: a.endsInDays, progress: a.progress, target: a.target, squadLabel: a.squadLabel, proof: a.rule };
      return { active, open: SEED_QUESTS.open.map(questOf), note: SEED_QUESTS.note };
    },
    async enrollQuest(questId) {
      await wait();
      if (!SEED_QUESTS.open.some((q) => q.id === questId)) throw new Error('Quest not found');
      if (enrolled.has(questId)) enrolled.delete(questId); else enrolled.add(questId);
      return { enrolled: enrolled.has(questId) };
    },
    async submitQuestMilestone(questId) {
      await wait();
      const a = SEED_QUESTS.active;
      return { ok: questId === a.id && questPercent(a.progress, a.target) >= 100 };
    },
    async cloutBoard(scope: CloutScope): Promise<CloutBoard> {
      await wait();
      const d = new Date(ctx.now());
      const ranked = rankClubs(SEED_CLOUT[scope].map((c) => ({ ...c })));
      return {
        periodLabel: `${MONTHS[d.getMonth()]} · week ${Math.ceil(d.getDate() / 7)}`,
        scope,
        rows: ranked.map((c) => ({ rank: c.rank, clubId: c.clubId, short: c.short, name: c.name, tint: c.tint, xp: c.xp, mine: store.membership.get(c.clubId)?.state === 'joined', seed: true as const })),
        scoringNote: SEED_SCORING_NOTE,
        seed: true,
      };
    },

    async listChannels(clubId): Promise<ClubChannel[]> {
      await wait();
      return (store.channels.get(clubId) ?? []).map((c) => ({ id: c.id, clubId, name: c.name, adminOnly: c.adminOnly }));
    },
    async getChannel(clubId, channelId): Promise<ChannelView> {
      await wait();
      const rec = getChannelRec(clubId, channelId);
      if (rec.unread) { rec.unread = 0; store.emit(); }
      const role = myRole(clubId);
      return {
        club: summary(clubId),
        channels: (store.channels.get(clubId) ?? []).map((c) => ({ id: c.id, clubId, name: c.name, adminOnly: c.adminOnly })),
        channel: { id: rec.id, clubId, name: rec.name, adminOnly: rec.adminOnly },
        pinned: rec.pinned,
        messages: [...rec.msgs].sort((a, b) => a.atMs - b.atMs).map((m) => asMessage(clubId, channelId, m)),
        memberCount: clubById(clubId).members,
        onlineCount: ONLINE_SEED[clubId] ?? 0,
        muted: store.muted.has(clubId),
        canPost: canPostInChannel({ adminOnly: rec.adminOnly, role }),
      };
    },
    async sendChannelMessage(clubId, channelId, text): Promise<SendChannelResult> {
      await wait(60);
      const rec = getChannelRec(clubId, channelId);
      const role = myRole(clubId);
      if (!verified()) return { ok: false, reason: 'unverified' };
      if (!role) return { ok: false, reason: 'not_member' };
      if (!canPostInChannel({ adminOnly: rec.adminOnly, role })) return { ok: false, reason: 'admin_only' };
      if (!text.trim()) return { ok: false, reason: 'empty' };
      const m = { id: store.nextId('cm'), authorId: meId(), who: meName(), role, text: text.trim(), atMs: ctx.now(), mine: true };
      rec.msgs.push(m);
      store.follows.add(`${clubId}:${channelId}`);
      store.emit();
      return { ok: true, message: asMessage(clubId, channelId, m) };
    },
    async setChannelMuted(clubId, muted) {
      await wait(60);
      if (muted) store.muted.add(clubId); else store.muted.delete(clubId);
      store.emit();
    },
    subscribe: store.subscribe,

    // ---- Crew HQ (web). No requireUser: console auth arrives in the backend phase. ----
    async adminListMembers(clubId) { await wait(); return [...membersOf(clubId)]; },
    async adminSetMemberRole(clubId, userId, role) {
      await wait();
      const m = membersOf(clubId).find((x) => x.userId === userId);
      if (!m) throw new Error('Member not found');
      m.role = role;
    },
    async adminRemoveMember(clubId, userId) {
      await wait();
      const list = membersOf(clubId);
      const i = list.findIndex((x) => x.userId === userId);
      if (i >= 0) { list.splice(i, 1); clubById(clubId).members = Math.max(0, clubById(clubId).members - 1); }
    },
    async adminListApprovals(clubId) { await wait(); return approvals.filter((a) => a.clubId === clubId); },
    async adminDecideApproval(clubId, userId, approve) {
      await wait();
      const i = approvals.findIndex((a) => a.clubId === clubId && a.userId === userId);
      if (i < 0) return;
      const [a] = approvals.splice(i, 1);
      if (approve) {
        membersOf(clubId).push({ userId: a.userId, name: a.name, initials: a.initials, role: 'member', joinedAtMs: ctx.now() });
        clubById(clubId).members += 1;
      }
    },
    async adminListTasks(clubId) { await wait(); return tasks.filter((t) => t.clubId === clubId).map(detail); },
    async adminCreateTask(clubId, input: TaskInput) {
      await wait();
      const c = clubById(clubId);
      const raw = input.reward.kind === 'paid' ? { kind: 'paid' as const, payPaise: input.reward.payPaise, gigId: `gig-${store.nextId('t')}` } : input.reward;
      const t: TaskRec = {
        id: store.nextId('task'), clubId, clubShort: c.short, clubName: c.name, tint: c.tint, from: meName(), title: input.title, status: 'assigned' as const,
        dueMs: input.dueMs, reviewer: meName(), deliverables: input.deliverables, attachments: [] as string[], assigneeId: input.assigneeId, rewardRaw: raw,
      };
      tasks.push(t);
      store.emit();
      return detail(t);
    },
    async adminReviewTask(taskId, decision, note) {
      await wait();
      const t = taskById(taskId);
      const next = nextTaskStatus(t.status, decision);
      if (!next) throw new Error('This task is not in review.');
      t.status = next;
      t.revisionNote = decision === 'request_revision' && note ? { by: meName(), text: note } : undefined;
      store.emit();
      return detail(t);
    },
    async adminCreateChannel(clubId, name, adminOnly) {
      await wait();
      clubById(clubId);
      const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (!id) throw new Error('Name the channel');
      const list = store.channels.get(clubId) ?? [];
      if (list.some((c) => c.id === id)) throw new Error('That channel exists');
      list.push({ id, name: id, adminOnly, unread: 0, msgs: [] });
      store.channels.set(clubId, list);
      store.emit();
      return { id, clubId, name: id, adminOnly };
    },
    async adminPinMessage(clubId, channelId, text) {
      await wait();
      getChannelRec(clubId, channelId).pinned = { text, by: `ADMIN · ${meName().toUpperCase()}` };
      store.emit();
    },
    async adminPostAsClub(clubId, input) {
      await wait();
      clubById(clubId);
      const signedIn = ctx.getSession();
      const role: ClubRole | undefined = signedIn ? myRole(clubId) : 'lead';
      const check = validateClubPost({ body: input.body, role });
      if (!check.ok) return { ok: false, reason: check.reason === 'empty' ? 'empty' : 'not_admin' };
      const ev = input.eventId ? events(clubId).find((e) => e.id === input.eventId) : undefined;
      const post: ClubPost = {
        id: store.nextId('post'), clubId, body: input.body.trim(), atMs: ctx.now(),
        postedBy: { id: meId(), name: meName(), role: role ?? 'lead' }, event: ev && { id: ev.id, title: ev.title, dateMs: ev.startsAtMs },
      };
      postsOf(clubId).unshift(post);
      return { ok: true, post };
    },
  };
}
