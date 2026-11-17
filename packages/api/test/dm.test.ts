import { describe, expect, it, vi } from 'vitest';
import { createMockApi } from '../src/mock';
import { MOCK_CODE } from '../src/mock/seed';

async function signedIn() {
  const a = createMockApi({ latencyMs: 0 });
  await a.auth.verifyOtp('9876540000', MOCK_CODE, { returning: true });
  return a;
}

describe('dm: chat list', () => {
  it('filters All / Unread / People / Squads / Clubs with counts', async () => {
    const a = await signedIn();
    const all = await a.dm.listChats('All');
    expect(all.locked).toBe(false);
    expect(all.counts.All).toBe(all.rows.length);
    expect((await a.dm.listChats('Squads')).rows.map((r) => r.name)).toEqual(['Hack the Canteen squad']);
    const clubs = await a.dm.listChats('Clubs');
    expect(clubs.rows.map((r) => `${r.name} ${r.channel}`)).toEqual(['GDG Atria #general', 'E-Cell Atria #announcements']);
    expect((await a.dm.listChats('Unread')).rows.every((r) => r.unread > 0)).toBe(true);
    expect((await a.dm.listChats('People')).rows.every((r) => r.kind === 'person')).toBe(true);
    expect(all.requestCount).toBe(2);
  });
  it('DMs unlock only after verification', async () => {
    const a = createMockApi({ latencyMs: 0 });
    await a.auth.verifyOtp('9876543210', MOCK_CODE, { returning: false });
    expect((await a.dm.listChats('All')).locked).toBe(true);
    expect(await a.dm.unreadCount()).toBe(0);
    const { chatId } = await a.dm.openChatWith('u_rhea');
    expect(await a.dm.sendMessage(chatId, 'hi')).toMatchObject({ ok: false, reason: 'locked' });
  });
  it('unreadCount counts unread chats and requests; reading clears', async () => {
    const a = await signedIn();
    const before = await a.dm.unreadCount();
    expect(before).toBeGreaterThan(2);
    await a.dm.getChat('dm-u_rhea');
    expect(await a.dm.unreadCount()).toBe(before - 1);
  });
});

describe('dm: message requests', () => {
  it('accept moves a stranger into the chat list, ignore drops it', async () => {
    const a = await signedIn();
    const reqs = await a.dm.listRequests();
    expect(reqs.map((r) => r.name)).toEqual(['Dev S.', 'Neha B.']);
    const id = await a.dm.acceptRequest(reqs[0].id);
    const chat = await a.dm.getChat(id);
    expect(chat.messages[0].text).toContain('DBMS');
    expect(chat.composer).toBe('direct');
    await a.dm.ignoreRequest(reqs[1].id);
    expect(await a.dm.listRequests()).toEqual([]);
  });
  it('a first message to a stranger is a request and only one can be sent until accepted', async () => {
    const a = await signedIn();
    const { chatId } = await a.dm.openChatWith('u_s01');
    expect((await a.dm.getChat(chatId)).composer).toBe('new_request');
    const r = await a.dm.sendMessage(chatId, 'hey');
    expect(r).toMatchObject({ ok: true, asRequest: true });
    expect((await a.dm.getChat(chatId)).composer).toBe('request_pending');
    expect(await a.dm.sendMessage(chatId, 'again')).toMatchObject({ ok: false, reason: 'request_pending' });
  });
  it('20 requests a day, then Request limit hit; existing chats still work', async () => {
    const a = await signedIn();
    for (let i = 1; i <= 20; i++) {
      const { chatId } = await a.dm.openChatWith(`u_s${String(i).padStart(2, '0')}`);
      expect((await a.dm.sendMessage(chatId, 'hi')).ok).toBe(true);
    }
    expect((await a.dm.requestQuota()).remaining).toBe(0);
    const { chatId } = await a.dm.openChatWith('u_s21');
    const blocked = await a.dm.sendMessage(chatId, 'hi');
    expect(blocked).toMatchObject({ ok: false, reason: 'request_limit' });
    expect((await a.dm.getChat(chatId)).composer).toBe('request_limit');
    expect((await a.dm.sendMessage('dm-u_kabir', 'still works')).ok).toBe(true);
  });
});

describe('dm: read receipts and blocking', () => {
  it('shows read only when both sides have receipts on; turning yours off hides theirs', async () => {
    const a = await signedIn();
    const on = await a.dm.getChat('dm-u_rhea');
    expect(on.receiptsVisible).toBe(true);
    expect(on.messages.some((m) => m.mine && m.readAtMs)).toBe(true);
    await a.dm.setReadReceipts(false);
    const off = await a.dm.getChat('dm-u_rhea');
    expect(off.receiptsVisible).toBe(false);
    expect(off.messages.some((m) => m.readAtMs)).toBe(false);
  });
  it('cannot send to someone who blocked you, or after you block', async () => {
    const a = await signedIn();
    expect((await a.dm.getChat('dm-u_ananya')).composer).toBe('cannot_send');
    expect(await a.dm.sendMessage('dm-u_ananya', 'hi')).toMatchObject({ ok: false, reason: 'cannot_send' });
    await a.dm.blockPerson('dm-u_kabir');
    expect(await a.dm.sendMessage('dm-u_kabir', 'hi')).toMatchObject({ ok: false, reason: 'cannot_send' });
  });
  it('an online person replies in realtime and the subscriber fires', async () => {
    vi.useFakeTimers();
    try {
      const a = createMockApi({ latencyMs: 0 });
      // Mock calls wait on setTimeout, so under fake timers every awaited call needs the clock nudged.
      const run = async <T,>(p: Promise<T>) => { await vi.advanceTimersByTimeAsync(5); return p; };
      await run(a.auth.verifyOtp('9876540000', MOCK_CODE, { returning: true }));
      let fired = 0;
      a.dm.subscribe(() => fired++);
      await run(a.dm.sendMessage('dm-u_rhea', 'hello'));
      await vi.advanceTimersByTimeAsync(3000); // typing indicator at 700ms, reply at 2400ms
      const c = await run(a.dm.getChat('dm-u_rhea'));
      expect(fired).toBeGreaterThan(1);
      expect(c.messages.at(-1)?.mine).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('dm: sharing photos from Tea', () => {
  it('finds recipients and sends a photo into the chat', async () => {
    const a = await signedIn();
    expect((await a.dm.searchPeople('')).every((p) => p.sharesClub)).toBe(true);
    expect((await a.dm.searchPeople('dev')).map((p) => p.name)).toContain('Dev S.');
    const r = await a.dm.sharePhoto('u_kabir', { postId: 'p1', mediaId: 'm1' });
    expect(r.ok && r.message.photo).toMatchObject({ postId: 'p1', mediaId: 'm1' });
    const stranger = await a.dm.sharePhoto('u_s05', { postId: 'p1' });
    expect(stranger).toMatchObject({ ok: true, asRequest: true });
  });
});

describe('dm: squad chat', () => {
  it('sends, votes once per poll (changing a vote moves it), mutes and leaves', async () => {
    const a = await signedIn();
    let s = await a.dm.getSquad('sq-htc');
    expect(s.members).toHaveLength(4);
    expect(s.max).toBe(8);
    expect(s.poll?.options.map((o) => o.votes)).toEqual([2, 1]);
    await a.dm.voteSquadPoll('sq-htc', 'poll-1', 'b');
    await a.dm.voteSquadPoll('sq-htc', 'poll-1', 'a');
    s = await a.dm.getSquad('sq-htc');
    expect(s.poll?.options.map((o) => o.votes)).toEqual([3, 1]);
    await a.dm.sendSquadMessage('sq-htc', 'on it');
    expect((await a.dm.getSquad('sq-htc')).messages.at(-1)?.text).toBe('on it');
    expect((await a.dm.squadInvite('sq-htc')).expiresInHours).toBe(24);
    await a.dm.leaveSquad('sq-htc');
    expect((await a.dm.listChats('Squads')).rows).toEqual([]);
  });
});
