import {
  TEA_MAX_PHOTOS, TEA_MAX_POST_CHARS, anonUnlocked, applyTeaVote, isTeaCollapsed, isTeaUnderReview,
  sortTeaPosts, teaAccountAgeDays, teaAnonLabel, teaCanPost, teaCanVote, teaMuteUntil, teaSafetyCheck, teaVisibleInFeed,
  validateFeedVideo, validateStoryVideo, validateTeaDestinations, validateTeaPoll, type TeaVote,
} from '@bunk3d/core';
import type {
  Comment, Community, CreatePostResult, Media, ModerationNotice, NewPostInput, Poll, Post, PostAuthor, SendTarget, StoryGroup, StoryItem, TeaApi,
} from '../contract';
import type { MockCtx } from './ctx';
import {
  HOUR, MIN, SEED_COMMUNITIES, SEED_OFFICIAL, SEED_POSTS, SEED_SEND_TARGETS, SEED_STORIES, type SeedComment,
} from './seed-tea';

const DAY = 24 * HOUR;

type Row = {
  id: string;
  scope: Post['scope'];
  authorId: string;
  anon: boolean;
  name?: string; initials?: string; tint?: string; meta?: string; club?: boolean; college?: string;
  topic: string;
  body: string;
  media: Media[];
  pollOptions?: { id: string; label: string; votes: number }[];
  pollEndsAt?: number;
  createdAt: number;
  score: number;
  reports: number;
  removed?: boolean;
  held?: boolean;
  eventId?: string;
  badge?: string;
  seed?: true;
};
type CRow = { id: string; postId: string; parentId: string | null; authorId: string; anon: boolean; seedBy?: SeedComment['by']; body: string; createdAt: number; score: number; seed?: true };
type Notice = { id: string; postId: string; at: number; strike: number; rule: string; appeal: 'available' | 'pending' | 'used'; appealedAt?: number; decided?: 'restored' | 'upheld'; dismissed?: boolean };
type UserState = {
  votes: Map<string, TeaVote>; cvotes: Map<string, TeaVote>; saves: Set<string>; polls: Map<string, string>; spolls: Map<string, string>;
  seenStories: Set<string>; strikes: number[]; notices: Notice[]; joined: Set<string>;
};

/** SEED users: the returning demo user is an established account; any other signed-in user is a fresh account (6 karma, day 3, as in the design). Mock only. */
const SEED_USERS: Record<string, { karma: number; ageDays: number }> = { u_returning: { karma: 48, ageDays: 120 } };
const FRESH = { karma: 6, ageDays: 3 };

export function createTea(ctx: MockCtx): TeaApi {
  const { wait, now } = ctx;
  const t0 = now();
  const users = new Map<string, UserState>();
  const stateOf = (uid: string): UserState => {
    let s = users.get(uid);
    if (!s) {
      s = { votes: new Map(), cvotes: new Map(), saves: new Set(), polls: new Map(), spolls: new Map(), seenStories: new Set(), strikes: [], notices: [], joined: new Set(uid === 'u_returning' ? ['placement27', 'blrpg'] : []) };
      users.set(uid, s);
    }
    return s;
  };

  let seq = 0;
  const posts: Row[] = SEED_POSTS.map((p) => ({
    id: p.id, scope: p.scope, authorId: p.authorId === 'ME' ? 'u_returning' : p.authorId, anon: !!p.anon, name: p.name, initials: p.initials, tint: p.tint, meta: p.meta, club: p.club, college: p.college,
    topic: p.topic, body: p.body, media: p.media ?? [], createdAt: t0 - p.agoMin * MIN, score: p.score, reports: p.reports ?? 0, eventId: p.eventId, badge: p.badge, seed: true as const,
    ...(p.poll ? { pollOptions: p.poll.options.map(([label, votes], i) => ({ id: `o${i}`, label, votes })), pollEndsAt: t0 + p.poll.endsInH * HOUR } : {}),
  }));
  const comments: CRow[] = SEED_POSTS.flatMap((p) =>
    (p.comments ?? []).map((c) => ({
      id: c.id, postId: p.id, parentId: c.parent ?? null, authorId: c.by === 'op' ? p.authorId : typeof c.by === 'string' ? `u_seed_${c.by}` : `u_seed_${c.by.initials}`,
      anon: typeof c.by === 'string' && c.by !== 'op', seedBy: c.by, body: c.body, createdAt: t0 - c.agoMin * MIN, score: c.score, seed: true as const,
    })),
  );
  const stories = SEED_STORIES.map((g) => ({ ...g, items: g.items.map((i) => ({ ...i, createdAt: t0 - i.agoMin * MIN })) }));
  const myStoryItems: { uid: string; item: StoryItem }[] = [];
  const storyReplies: { itemId: string; text: string; by: string }[] = [];
  const sentPhotos: { postId: string; index: number; targetId: string; by: string }[] = [];
  void storyReplies;
  void sentPhotos;

  const sess = () => ctx.getSession();
  const uid = () => ctx.requireUser();
  const baseUser = (u: string) => SEED_USERS[u] ?? FRESH;
  const createdAtOf = (u: string) => t0 - baseUser(u).ageDays * DAY;
  const mutedUntil = (u: string) => teaMuteUntil(stateOf(u).strikes, now());
  const gate = (u: string) => ({ verified: sess()?.verified ?? 'unverified', mutedUntil: mutedUntil(u) });
  const initialsOf = () => (ctx.profile?.name ?? 'You').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const activeStrike = (u: string) => stateOf(u).strikes.some((t) => now() - t < 90 * DAY);
  const anonOk = (u: string) => anonUnlocked({ karma: baseUser(u).karma, accountAgeDays: teaAccountAgeDays(createdAtOf(u), now()), activeStrike: activeStrike(u) });

  const pollOf = (r: Row, u: string): Poll | undefined =>
    r.pollOptions && r.pollEndsAt
      ? { options: r.pollOptions.map((o) => ({ ...o })), total: r.pollOptions.reduce((a, o) => a + o.votes, 0), myChoice: stateOf(u).polls.get(r.id) ?? null, endsAt: r.pollEndsAt }
      : undefined;

  const commentCount = (id: string) => comments.filter((c) => c.postId === id).length;
  const authorOf = (r: Row, u: string): PostAuthor =>
    r.anon
      ? { anon: true, label: 'Anonymous' }
      : r.authorId === u
        ? { anon: false, userId: u, name: ctx.profile?.name ?? 'You', initials: initialsOf(), tint: '#D4FF3A', meta: [ctx.profile?.year, ctx.profile?.dept].filter(Boolean).join(' · '), me: true }
        : { anon: false, userId: r.authorId, name: r.name ?? 'Student', initials: r.initials ?? '', tint: r.tint ?? '#B49CFF', meta: r.meta ?? '', club: r.club };

  const status = (r: Row): Post['status'] => (r.removed ? 'removed' : r.held ? 'with_mods' : isTeaUnderReview(r.reports) ? 'under_review' : 'live');

  const toPost = (r: Row, u: string): Post => {
    const poll = pollOf(r, u);
    const kind: Post['kind'] = poll ? 'poll' : r.media.length > 1 ? 'carousel' : r.media[0]?.kind === 'video' ? 'video' : r.media.length ? 'photo' : 'text';
    return {
      id: r.id, kind, scope: r.scope, collegeName: r.scope.type === 'community' ? r.college ?? 'Verified student' : undefined,
      author: authorOf(r, u), topic: r.topic, body: r.body, media: r.media, poll, createdAt: r.createdAt, score: r.score, myVote: stateOf(u).votes.get(r.id) ?? 0,
      comments: commentCount(r.id), saved: stateOf(u).saves.has(r.id), collapsed: isTeaCollapsed(r.score), mine: r.authorId === u, status: status(r),
      eventId: r.eventId, badge: r.badge, seed: r.seed,
    };
  };

  /** Rows the caller may see: live posts, plus their own held or hidden posts. Removed posts are never listed. */
  const visible = (r: Row, u: string) => {
    if (r.createdAt > now() || r.removed) return false;
    return status(r) === 'live' || r.authorId === u;
  };
  const inMyCampus = (scope: Post['scope']) => scope.type === 'community' || scope.campusId === sess()?.campusId;

  const communityRow = (c: (typeof SEED_COMMUNITIES)[number], u: string): Community => ({
    ...c, joined: stateOf(u).joined.has(c.id),
    newPosts: posts.filter((p) => p.scope.type === 'community' && p.scope.communityId === c.id && !p.removed && !p.held && now() - p.createdAt < DAY).length,
  });

  const newNotice = (u: string, postId: string, rule: string): Notice => {
    const st = stateOf(u);
    st.strikes.push(now());
    const n: Notice = { id: `nt${++seq}`, postId, at: now(), strike: st.strikes.length, rule, appeal: 'available' };
    st.notices.push(n);
    return n;
  };

  const addStoryItems = (u: string, media: Media[], caption: string, audience: 'campus' | 'close'): string => {
    let last = '';
    for (const m of media) {
      last = `my_s${++seq}`;
      myStoryItems.push({ uid: u, item: { id: last, media: m, caption: caption || undefined, createdAt: now(), audience } });
    }
    return last;
  };

  const api: TeaApi = {
    async getFeed(q) {
      await wait();
      const u = uid();
      let rows = posts.filter((r) => teaVisibleInFeed(r, q.scope) && visible(r, u));
      if (q.scope.type === 'campus' && q.scope.campusId !== sess()?.campusId) rows = [];
      if (q.scope.type === 'community' && !stateOf(u).joined.has(q.scope.communityId)) rows = [];
      if (q.topic && q.topic !== 'All') rows = rows.filter((r) => r.topic === q.topic);
      // Held and under-review posts are for their author only and are not ranked.
      const ranked = sortTeaPosts(rows.filter((r) => status(r) === 'live'), q.sort, now());
      const mine = rows.filter((r) => status(r) !== 'live');
      return {
        posts: [...mine, ...ranked].map((r) => toPost(r, u)),
        official: q.scope.type === 'campus' ? SEED_OFFICIAL : null,
        fetchedAt: now(),
      };
    },
    async countNewSince(q, since) {
      await wait(40);
      const u = uid();
      return posts.filter((r) => teaVisibleInFeed(r, q.scope) && inMyCampus(r.scope) && status(r) === 'live' && r.authorId !== u && r.createdAt > since && r.createdAt <= now() && (!q.topic || q.topic === 'All' || r.topic === q.topic)).length;
    },

    async getStories() {
      await wait();
      const u = uid();
      const st = stateOf(u);
      const live = (t: number) => now() - t < DAY;
      const groups: StoryGroup[] = stories
        .map((g): StoryGroup => ({
          id: g.id, userId: g.userId, name: g.name, firstName: g.first, initials: g.initials, tint: g.tint, club: g.club,
          items: g.items.filter((i) => live(i.createdAt)).map((i): StoryItem => ({
            id: i.id, media: i.media, caption: i.caption, createdAt: i.createdAt, audience: i.audience ?? 'campus', sharedPostId: i.sharedPostId,
            poll: i.poll ? { question: i.question, options: i.poll.map(([id, label, votes]) => ({ id, label, votes })), myChoice: st.spolls.get(i.id) ?? null } : undefined, seed: true,
          })),
          seen: !!g.seen || st.seenStories.has(g.id), seed: true,
        }))
        .filter((g) => g.items.length > 0);
      const mine = myStoryItems.filter((m) => m.uid === u && live(m.item.createdAt)).map((m) => m.item);
      const own: StoryGroup[] = mine.length
        ? [{ id: `g_me_${u}`, userId: u, name: 'Your story', firstName: 'You', initials: initialsOf(), tint: '#D4FF3A', mine: true, items: mine, seen: true }]
        : [];
      return [...own, ...groups.sort((a, b) => Number(a.seen) - Number(b.seen))];
    },
    async markStorySeen(id) { stateOf(uid()).seenStories.add(id); },
    async replyToStory(itemId, text) {
      await wait(80);
      const u = uid();
      if (!teaCanVote(gate(u)).ok) return { ok: false, reason: 'not_verified' };
      if (!teaCanPost(gate(u), now()).ok) return { ok: false, reason: 'muted' };
      storyReplies.push({ itemId, text, by: u });
      return { ok: true };
    },
    async voteStoryPoll(itemId, optionId) {
      await wait(60);
      const u = uid();
      if (!teaCanVote(gate(u)).ok) return { ok: false };
      const st = stateOf(u);
      if (st.spolls.has(itemId)) return { ok: false };
      st.spolls.set(itemId, optionId);
      for (const g of stories) for (const i of g.items) if (i.id === itemId && i.poll) { const o = i.poll.find((x) => x[0] === optionId); if (o) o[2] += 1; }
      return { ok: true };
    },

    async getPost(id) {
      await wait();
      const u = uid();
      const r = posts.find((p) => p.id === id);
      if (!r || !visible(r, u) || !inMyCampus(r.scope)) return null;
      const rows = comments.filter((c) => c.postId === id).sort((a, b) => a.createdAt - b.createdAt);
      const anonOrder: string[] = [];
      for (const c of rows) if (c.anon && c.authorId !== r.authorId && !anonOrder.includes(c.authorId)) anonOrder.push(c.authorId);
      const out: Comment[] = rows.map((c) => {
        const named = typeof c.seedBy === 'object' ? c.seedBy : null;
        const author: Comment['author'] =
          c.authorId === r.authorId ? { kind: 'op' }
          : c.anon ? { kind: 'anon', label: teaAnonLabel(anonOrder, c.authorId) }
          : named ? { kind: 'named', userId: c.authorId, name: named.name, initials: named.initials, tint: named.tint, meta: named.meta }
          : { kind: 'named', userId: c.authorId, name: ctx.profile?.name ?? 'You', initials: initialsOf(), tint: '#D4FF3A', meta: '' };
        return { id: c.id, postId: id, parentId: c.parentId, author, body: c.body, createdAt: c.createdAt, score: c.score, myVote: stateOf(u).cvotes.get(c.id) ?? 0, seed: c.seed };
      });
      return { post: toPost(r, u), comments: out };
    },
    async vote(postId, value) {
      await wait(60);
      const u = uid();
      if (!teaCanVote(gate(u)).ok) return { ok: false, reason: 'not_verified' };
      const r = posts.find((p) => p.id === postId);
      if (!r) return { ok: false, reason: 'not_verified' };
      const st = stateOf(u);
      const { vote, delta } = applyTeaVote(st.votes.get(postId) ?? 0, value);
      st.votes.set(postId, vote);
      r.score += delta;
      return { ok: true, score: r.score, myVote: vote };
    },
    async votePoll(postId, optionId) {
      await wait(60);
      const u = uid();
      if (!teaCanVote(gate(u)).ok) return { ok: false, reason: 'not_verified' };
      const r = posts.find((p) => p.id === postId);
      if (!r?.pollOptions || !r.pollEndsAt || r.pollEndsAt <= now()) return { ok: false, reason: 'ended' };
      const st = stateOf(u);
      if (!st.polls.has(postId)) {
        const o = r.pollOptions.find((x) => x.id === optionId);
        if (o) { o.votes += 1; st.polls.set(postId, optionId); }
      }
      return { ok: true, poll: pollOf(r, u)! };
    },
    async voteComment(commentId, value) {
      await wait(40);
      const u = uid();
      const c = comments.find((x) => x.id === commentId);
      if (!c || !teaCanVote(gate(u)).ok) return { ok: false, score: c?.score ?? 0, myVote: 0 };
      const st = stateOf(u);
      const { vote, delta } = applyTeaVote(st.cvotes.get(commentId) ?? 0, value);
      st.cvotes.set(commentId, vote);
      c.score += delta;
      return { ok: true, score: c.score, myVote: vote };
    },
    async addComment(postId, input) {
      await wait();
      const u = uid();
      const g = teaCanPost(gate(u), now());
      if (!g.ok) return g.reason === 'muted' ? { ok: false, reason: 'muted', mutedUntil: mutedUntil(u) ?? undefined } : { ok: false, reason: 'not_verified' };
      const body = input.body.trim();
      if (!body) return { ok: false, reason: 'empty' };
      if (input.anon && !anonOk(u)) return { ok: false, reason: 'anon_locked' };
      const row: CRow = { id: `c_${++seq}`, postId, parentId: input.parentId ?? null, authorId: u, anon: input.anon, body: body.slice(0, TEA_MAX_POST_CHARS), createdAt: now(), score: 0 };
      comments.push(row);
      const full = await api.getPost(postId);
      const comment = full?.comments.find((c) => c.id === row.id);
      if (!comment) return { ok: false, reason: 'empty' };
      return { ok: true, comment };
    },
    async toggleSave(postId) {
      const st = stateOf(uid());
      if (st.saves.has(postId)) { st.saves.delete(postId); return false; }
      st.saves.add(postId);
      return true;
    },

    async createPost(input: NewPostInput): Promise<CreatePostResult> {
      await wait(250);
      const u = uid();
      const st = stateOf(u);
      const g = teaCanPost(gate(u), now());
      if (!g.ok) return g.reason === 'muted' ? { ok: false, reason: 'muted', mutedUntil: mutedUntil(u) ?? undefined } : { ok: false, reason: 'not_verified' };
      if (input.anon && !anonOk(u)) return { ok: false, reason: 'anon_locked' };
      const body = input.body.trim().slice(0, TEA_MAX_POST_CHARS);
      const media = input.media ?? [];
      if (media.length > TEA_MAX_PHOTOS) return { ok: false, reason: 'too_many_photos' };
      if (!body && media.length === 0) return { ok: false, reason: 'empty' };
      if (input.poll && !validateTeaPoll(input.poll.options)) return { ok: false, reason: 'bad_poll' };
      const toStory = !!input.storyOnly || !!input.alsoStory;
      const toFeed = !input.storyOnly;
      const d = validateTeaDestinations({ feed: toFeed, story: toStory }, { anon: input.anon, community: input.scope.type === 'community' });
      if (!d.ok) return { ok: false, reason: d.reason === 'none' ? 'no_destination' : d.reason };
      for (const m of media) {
        if (m.kind !== 'video' || m.durationSec === undefined || m.sizeBytes === undefined) continue;
        const v = { durationSec: m.durationSec, sizeBytes: m.sizeBytes };
        const checks = [toStory ? validateStoryVideo(v) : null, toFeed ? validateFeedVideo(v) : null];
        const bad = checks.find((c) => c && !c.ok);
        if (bad && !bad.ok) return { ok: false, reason: bad.reason === 'too_long' ? 'video_too_long' : 'video_too_big' };
      }
      if (input.scope.type === 'campus' && input.scope.campusId !== sess()?.campusId) return { ok: false, reason: 'not_verified' };
      if (input.scope.type === 'community' && !st.joined.has(input.scope.communityId)) return { ok: false, reason: 'not_verified' };

      const verdict = teaSafetyCheck({ text: body, anon: input.anon });
      const id = `p_${++seq}`;
      const row: Row = {
        id, scope: input.scope, authorId: u, anon: input.anon, topic: input.topic, body,
        media: media.map((m) => ({ ...m, blurred: input.anon ? (m.blurred ?? true) : m.blurred })),
        createdAt: now(), score: 0, reports: 0, held: verdict.verdict === 'hold',
        ...(input.scope.type === 'community' ? { college: 'Atria University' } : {}),
        ...(input.poll ? { pollOptions: input.poll.options.map((s) => s.trim()).filter(Boolean).map((label, i) => ({ id: `o${i}`, label, votes: 0 })), pollEndsAt: now() + input.poll.endsInHours * HOUR } : {}),
      };
      if (verdict.verdict === 'block') {
        row.removed = true;
        posts.push(row);
        const n = newNotice(u, id, verdict.rule);
        return { ok: false, reason: 'removed', rule: verdict.rule, strike: n.strike, noticeId: n.id, mutedUntil: mutedUntil(u) };
      }
      let storyId: string | undefined;
      if (toStory) storyId = addStoryItems(u, media, body, input.audience ?? 'campus');
      if (toFeed) posts.push(row);
      return { ok: true, post: toFeed ? toPost(row, u) : null, storyId, status: verdict.verdict === 'hold' ? 'with_mods' : 'live' };
    },
    async appealRemoval(noticeId) {
      await wait(100);
      const n = stateOf(uid()).notices.find((x) => x.id === noticeId);
      if (n && n.appeal === 'available') { n.appeal = 'pending'; n.appealedAt = now(); }
    },
    async editHeldPost(postId, body) {
      await wait(100);
      const u = uid();
      const r = posts.find((p) => p.id === postId);
      if (!r || r.authorId !== u || !r.held) return { ok: false };
      const t = body.trim().slice(0, TEA_MAX_POST_CHARS);
      if (!t) return { ok: false };
      r.body = t;
      r.held = teaSafetyCheck({ text: t, anon: r.anon }).verdict !== 'pass';
      return { ok: true };
    },
    async addPostToStory(postId) {
      await wait(150);
      const u = uid();
      const r = posts.find((p) => p.id === postId);
      if (!r || r.authorId !== u) return { ok: false, reason: 'not_yours' };
      if (r.anon) return { ok: false, reason: 'anon' };
      return { ok: true, storyId: addStoryItems(u, r.media, r.body, 'campus') };
    },
    async sendPhoto(postId, index, targetId) {
      await wait(120);
      sentPhotos.push({ postId, index, targetId, by: uid() });
      return { ok: true };
    },
    async listSendTargets(): Promise<SendTarget[]> { await wait(); return SEED_SEND_TARGETS; },

    async myStatus() {
      await wait(60);
      const u = uid();
      const b = baseUser(u);
      const active = stateOf(u).strikes.filter((t) => now() - t < 90 * DAY).length;
      return {
        karma: b.karma, accountAgeDays: teaAccountAgeDays(createdAtOf(u), now()), strikes: active, anonUnlocked: anonOk(u),
        canVote: teaCanVote(gate(u)).ok, canPost: teaCanPost(gate(u), now()).ok, mutedUntil: mutedUntil(u),
      };
    },
    async myModeration() {
      await wait(60);
      const u = uid();
      const st = stateOf(u);
      const out: ModerationNotice[] = [];
      for (const n of st.notices) {
        if (n.dismissed) continue;
        // Mock ops: the first appeal is restored (post goes live, strike removed); later ones are upheld.
        if (n.appeal === 'pending' && n.appealedAt !== undefined && now() - n.appealedAt >= 2500 && !n.decided) {
          const restored = !st.notices.some((o) => o !== n && o.decided === 'restored');
          n.decided = restored ? 'restored' : 'upheld';
          n.appeal = 'used';
          if (restored) {
            const r = posts.find((p) => p.id === n.postId);
            if (r) r.removed = false;
            const oldest = Math.min(...st.strikes);
            st.strikes.splice(st.strikes.indexOf(oldest), 1);
          }
        }
        if (n.decided) out.push({ id: n.id, kind: 'appeal_decided', postId: n.postId, at: n.at, outcome: n.decided });
        else out.push({ id: n.id, kind: 'removed', postId: n.postId, at: n.at, strike: n.strike, rule: n.rule, appeal: n.appeal });
      }
      const mu = mutedUntil(u);
      if (mu) out.push({ id: 'muted', kind: 'muted', until: mu, strike: st.strikes.length });
      return out;
    },
    async dismissNotice(id) {
      const n = stateOf(uid()).notices.find((x) => x.id === id);
      if (n) n.dismissed = true;
    },

    async listCommunities() {
      await wait();
      const u = uid();
      const all = SEED_COMMUNITIES.map((c) => communityRow(c, u));
      return { joined: all.filter((c) => c.joined), discover: all.filter((c) => !c.joined) };
    },
    async getCommunity(id) {
      await wait(60);
      const c = SEED_COMMUNITIES.find((x) => x.id === id);
      return c ? communityRow(c, uid()) : null;
    },
    async setCommunityMembership(id, joined) {
      await wait(80);
      const u = uid();
      if (!teaCanVote(gate(u)).ok) return null;
      const st = stateOf(u);
      if (joined) st.joined.add(id); else st.joined.delete(id);
      const c = SEED_COMMUNITIES.find((x) => x.id === id);
      return c ? communityRow(c, u) : null;
    },
  };
  return api;
}
