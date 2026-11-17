import { CHAT_FILTERS, chatMatchesFilter, messagingMode, receiptsVisible, requestQuota, type ChatFilter } from '@bunk3d/core';
import type { ChatList, ChatRow, ChatView, ComposerState, DmApi, DmMessage, MessageRequest, PersonHit, SendResult, SquadView } from '../contract';
import type { MockCtx } from './ctx';
import { getStore } from './crew-dm-store';
import { D, SEED_CREW_CLUBS, initialsOf, tintFor } from './seed-crew';
import { SEED_DM_CHATS, SEED_PEOPLE, SEED_REQUESTS, SEED_SQUAD, SEED_STRANGERS, personMeta, type SeedPerson } from './seed-dm';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Msg = DmMessage & { rawReadAtMs?: number };
type Chat = { userId: string; msgs: Msg[]; unread: number; accepted: boolean; requestPending: boolean; blocked: boolean; blockedByThem: boolean; muted: boolean; typing: boolean };

// SEED DATA lives in seed-dm.ts and seed-crew.ts (flagged seed: true). Mock only.
export function createDm(ctx: MockCtx): DmApi {
  const { wait } = ctx;
  const store = getStore(ctx);
  const people = new Map<string, SeedPerson>([...SEED_PEOPLE, ...SEED_STRANGERS].map((p) => [p.userId, p]));
  const personOf = (id: string) => {
    const p = people.get(id);
    if (!p) throw new Error('Person not found');
    return p;
  };
  const verified = () => ctx.getSession()?.verified === 'verified';
  let myReceiptsOn = true;
  const requestSentAt: number[] = [];
  const chats = new Map<string, Chat>();
  const chatId = (userId: string) => `dm-${userId}`;
  const now = ctx.now();
  let mid = 0;
  const newMsg = (m: Omit<Msg, 'id'>): Msg => ({ id: `m${++mid}`, ...m });

  for (const s of SEED_DM_CHATS) {
    chats.set(chatId(s.userId), {
      userId: s.userId, unread: s.unread, accepted: true, requestPending: false, blocked: false, blockedByThem: !!s.blockedByThem, muted: false, typing: false,
      msgs: s.msgs.map((m) => newMsg({ mine: m.mine, kind: m.photo ? 'photo' : 'text', text: m.text, photo: m.photo ? { name: m.photo } : undefined, atMs: now - m.agoMin * 60_000, rawReadAtMs: m.read ? now - (m.agoMin - 1) * 60_000 : undefined, seed: true })),
    });
  }
  type Req = MessageRequest & { text: string };
  const requests: Req[] = SEED_REQUESTS.map((r) => {
    const p = personOf(r.userId);
    return { id: `rq-${r.userId}`, userId: r.userId, name: p.name, ...personMeta(p), verified: p.verified, preview: r.preview, text: r.text, atMs: now - r.agoMin * 60_000, seed: true as const };
  });

  const quota = () => requestQuota(requestSentAt, ctx.now());
  const modeFor = (c: Chat, p: SeedPerson) =>
    messagingMode({ senderVerified: verified(), blocked: c.blocked, blockedByThem: c.blockedByThem, sharesClub: p.sharesClub, accepted: c.accepted, requestPending: c.requestPending, quota: quota() });
  const ensureChat = (userId: string): Chat => {
    const p = personOf(userId);
    let c = chats.get(chatId(userId));
    if (!c) {
      c = { userId, msgs: [], unread: 0, accepted: p.sharesClub, requestPending: false, blocked: false, blockedByThem: false, muted: false, typing: false };
      chats.set(chatId(userId), c);
    }
    return c;
  };
  const chatOf = (id: string) => {
    const c = chats.get(id);
    if (!c) throw new Error('Chat not found');
    return c;
  };

  const preview = (m: Msg | undefined) => (!m ? '' : m.kind === 'photo' ? (m.mine ? 'You sent a photo' : 'Sent a photo') : `${m.mine ? 'You: ' : ''}${m.text}`);

  /** Realtime-style: an online person answers a direct message after a short typing indicator. */
  const simulateReply = (c: Chat, p: SeedPerson) => {
    if (!p.online || !c.accepted) return;
    const t1 = setTimeout(() => { c.typing = true; store.emit(); }, 700);
    const t2 = setTimeout(() => {
      c.typing = false;
      c.msgs.forEach((m) => { if (m.mine && !m.rawReadAtMs) m.rawReadAtMs = ctx.now(); });
      c.msgs.push(newMsg({ mine: false, kind: 'text', text: p.replies[c.msgs.length % p.replies.length], atMs: ctx.now(), seed: true }));
      c.unread += 1;
      store.emit();
    }, 2400);
    (t1 as { unref?: () => void }).unref?.();
    (t2 as { unref?: () => void }).unref?.();
  };

  const post = (userId: string, content: Pick<Msg, 'kind' | 'text' | 'photo'>): SendResult => {
    const c = ensureChat(userId);
    const p = personOf(userId);
    const mode = modeFor(c, p);
    if (mode.mode === 'locked') return { ok: false, reason: 'locked' };
    if (mode.mode === 'cannot_send') return { ok: false, reason: 'cannot_send' };
    if (mode.mode === 'request_pending') return { ok: false, reason: 'request_pending' };
    if (mode.mode === 'request_limit') return { ok: false, reason: 'request_limit', resetsAtMs: mode.resetsAtMs };
    const asRequest = mode.mode === 'new_request';
    if (asRequest) { requestSentAt.push(ctx.now()); c.requestPending = true; }
    const message = newMsg({ mine: true, atMs: ctx.now(), ...content });
    c.msgs.push(message);
    store.emit();
    if (!asRequest) simulateReply(c, p);
    return { ok: true, chatId: chatId(userId), message: { ...message, readAtMs: undefined }, asRequest };
  };

  // ---- list building ----
  const clubRows = (): ChatRow[] =>
    [...store.follows].flatMap((f) => {
      const [clubId, channelId] = f.split(':');
      const club = SEED_CREW_CLUBS.find((c) => c.id === clubId);
      const ch = store.channels.get(clubId)?.find((c) => c.id === channelId);
      if (!club || !ch || store.membership.get(clubId)?.state !== 'joined') return [];
      const last = [...ch.msgs].sort((a, b) => b.atMs - a.atMs)[0];
      if (!last) return [];
      const admin = last.role === 'lead' || last.role === 'coordinator';
      const first = last.mine ? 'You' : last.who.split(' ')[0];
      return [{ id: `club-${clubId}-${channelId}`, kind: 'club' as const, name: club.name, initials: club.short, tint: club.tint, channel: `#${ch.name}`, lastMessage: `${first}${admin && !last.mine ? ' (admin)' : ''}: ${last.text}`, lastAtMs: last.atMs, unread: ch.unread, clubId, channelId, seed: true as const }];
    });
  const squadRow = (): ChatRow[] => {
    if (!squad) return [];
    const last = squad.msgs[squad.msgs.length - 1];
    return [{ id: squad.id, kind: 'squad', name: squad.name, initials: 'HTC', tint: '#D4FF3A', tag: `SQUAD · ${squad.members.length + 1}`, lastMessage: last.system ? last.text : `${last.mine ? 'You' : last.authorName.split(' ')[0]}: ${last.text}`, lastAtMs: last.atMs, unread: squadUnread, seed: true }];
  };
  const personRows = (): ChatRow[] =>
    [...chats.values()].filter((c) => c.msgs.length > 0).map((c) => {
      const p = personOf(c.userId);
      const last = c.msgs[c.msgs.length - 1];
      return { id: chatId(c.userId), kind: 'person' as const, name: p.name, ...personMeta(p), lastMessage: preview(last), lastAtMs: last.atMs, unread: c.unread, online: p.online, verified: p.verified, seed: true as const };
    });

  // ---- squad ----
  type SquadMsg = SquadView['messages'][number];
  let squad: { id: string; name: string; members: string[]; msgs: SquadMsg[]; poll: NonNullable<SquadView['poll']>; muted: boolean } | null = {
    id: SEED_SQUAD.id, name: SEED_SQUAD.name, members: [...SEED_SQUAD.members], muted: false,
    msgs: SEED_SQUAD.msgs.map((m, i) => {
      const sys = m.who === 'system';
      const p = sys ? null : personOf(m.who);
      return { id: `sm${i}`, mine: false, authorName: p?.name ?? '', initials: p ? initialsOf(p.name) : '', tint: p ? tintFor(p.userId) : '', text: m.text, atMs: now - m.agoMin * 60_000, system: sys || undefined, seed: true as const };
    }),
    poll: { ...SEED_SQUAD.poll, options: SEED_SQUAD.poll.options.map((o) => ({ ...o })) },
  };
  let squadUnread = 0;
  const squadOf = (id: string) => {
    if (!squad || squad.id !== id) throw new Error('Squad not found');
    return squad;
  };

  const countUnread = () => [...chats.values()].filter((c) => c.unread > 0).length + clubRows().filter((r) => r.unread > 0).length + (squadUnread > 0 ? 1 : 0) + requests.length;

  return {
    async listChats(filter: ChatFilter): Promise<ChatList> {
      await wait();
      if (!verified()) return { locked: true, rows: [], counts: Object.fromEntries(CHAT_FILTERS.map((f) => [f, 0])) as ChatList['counts'], requestCount: 0 };
      const all = [...personRows(), ...squadRow(), ...clubRows()].sort((a, b) => b.lastAtMs - a.lastAtMs);
      const counts = Object.fromEntries(CHAT_FILTERS.map((f) => [f, all.filter((r) => chatMatchesFilter(r, f)).length])) as ChatList['counts'];
      return { locked: false, rows: all.filter((r) => chatMatchesFilter(r, filter)), counts, requestCount: requests.length };
    },
    async listRequests() {
      await wait();
      if (!verified()) return [];
      return requests.map(({ text: _t, ...r }) => r);
    },
    async acceptRequest(requestId) {
      await wait();
      const i = requests.findIndex((r) => r.id === requestId);
      if (i < 0) throw new Error('Request not found');
      const [r] = requests.splice(i, 1);
      const c = ensureChat(r.userId);
      c.accepted = true;
      c.msgs.push(newMsg({ mine: false, kind: 'text', text: r.text, atMs: r.atMs, seed: true }));
      c.unread = 1;
      store.emit();
      return chatId(r.userId);
    },
    async ignoreRequest(requestId) {
      await wait();
      const i = requests.findIndex((r) => r.id === requestId);
      if (i >= 0) { requests.splice(i, 1); store.emit(); }
    },
    async unreadCount() {
      return verified() ? countUnread() : 0;
    },
    async requestQuota() {
      await wait(30);
      const q = quota();
      return { limit: q.limit, sentToday: q.sentToday, remaining: q.remaining, resetsAtMs: q.resetsAtMs };
    },

    async getChat(id): Promise<ChatView> {
      await wait();
      const c = chatOf(id);
      const p = personOf(c.userId);
      if (c.unread) { c.unread = 0; store.emit(); }
      const mode = modeFor(c, p);
      const visible = receiptsVisible({ myReceiptsOn, theirReceiptsOn: p.receiptsOn, accepted: c.accepted });
      return {
        id,
        person: { userId: p.userId, name: p.name, ...personMeta(p), verified: p.verified, online: p.online },
        composer: mode.mode as ComposerState,
        limitResetsAtMs: mode.mode === 'request_limit' ? mode.resetsAtMs : undefined,
        messages: c.msgs.map(({ rawReadAtMs, ...m }) => ({ ...m, readAtMs: visible && m.mine ? rawReadAtMs : undefined })),
        receiptsVisible: visible,
        myReceiptsOn,
        muted: c.muted,
        typing: c.typing,
      };
    },
    async openChatWith(userId) {
      await wait(60);
      ensureChat(userId);
      return { chatId: chatId(userId) };
    },
    async sendMessage(id, text) {
      await wait(60);
      const c = chatOf(id);
      if (!text.trim()) return { ok: false, reason: 'empty' };
      return post(c.userId, { kind: 'text', text: text.trim() });
    },
    async searchPeople(query): Promise<PersonHit[]> {
      await wait(60);
      const q = query.trim().toLowerCase();
      return [...people.values()]
        .filter((p) => (q ? p.name.toLowerCase().includes(q) : p.sharesClub && p.userId !== 'u_ananya'))
        .slice(0, 30)
        .map((p) => ({ userId: p.userId, name: p.name, ...personMeta(p), verified: p.verified, sharesClub: p.sharesClub, seed: true as const }));
    },
    async sharePhoto(userId, ref) {
      await wait(60);
      personOf(userId);
      return post(userId, { kind: 'photo', photo: { ...ref, name: ref.name ?? 'Photo' } });
    },
    async setReadReceipts(on) { await wait(30); myReceiptsOn = on; store.emit(); },
    async getReadReceipts() { return myReceiptsOn; },
    async setChatMuted(id, muted) { await wait(30); chatOf(id).muted = muted; store.emit(); },
    async blockPerson(id) { await wait(60); chatOf(id).blocked = true; store.emit(); },

    async getSquad(id): Promise<SquadView> {
      await wait();
      const s = squadOf(id);
      if (squadUnread) { squadUnread = 0; store.emit(); }
      const ev = new Date(ctx.now() + SEED_SQUAD.eventInDays * D);
      return {
        id: s.id, name: s.name, max: SEED_SQUAD.max, muted: s.muted,
        members: [{ userId: ctx.getSession()?.userId ?? 'me', name: ctx.profile?.name ?? 'You', initials: initialsOf(ctx.profile?.name ?? 'You'), tint: '#D4FF3A', me: true }, ...s.members.map((m) => ({ userId: m, name: personOf(m).name, ...personMeta(personOf(m)), me: false }))],
        linkedEvent: { id: SEED_SQUAD.eventId, title: SEED_SQUAD.eventTitle, whenLabel: `${DAYS[ev.getDay()]} ${ev.getDate()} ${MONTHS[ev.getMonth()]}` },
        messages: s.msgs,
        poll: { ...s.poll, options: s.poll.options.map((o) => ({ ...o })) },
        };
    },
    async sendSquadMessage(id, text) {
      await wait(60);
      const s = squadOf(id);
      if (!verified()) throw new Error('DMs unlock after verification.');
      if (!text.trim()) return;
      s.msgs.push({ id: store.nextId('sm'), mine: true, authorName: ctx.profile?.name ?? 'You', initials: '', tint: '', text: text.trim(), atMs: ctx.now() });
      store.emit();
    },
    async voteSquadPoll(id, pollId, optionId) {
      await wait(60);
      const s = squadOf(id);
      if (s.poll.id !== pollId) throw new Error('Poll not found');
      if (s.poll.myVote === optionId) return;
      s.poll.options.forEach((o) => { if (o.id === s.poll.myVote) o.votes -= 1; if (o.id === optionId) o.votes += 1; });
      s.poll.myVote = optionId;
      store.emit();
    },
    async setSquadMuted(id, muted) { await wait(30); squadOf(id).muted = muted; store.emit(); },
    async squadInvite(id) { await wait(30); squadOf(id); return { url: `bunk3d://squad/${id}?invite=mock`, expiresInHours: 24 }; },
    async leaveSquad(id) { await wait(60); squadOf(id); squad = null; store.emit(); },

    subscribe: store.subscribe,
  };
}
