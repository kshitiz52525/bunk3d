'use client';
import { useState } from 'react';
import { useApi, useAsync, type CrewHqPostInput } from '@bunk3d/api';
import { Btn, Card, Empty, PageHead, Table } from '@/components/kit';
import { Async, Eyebrow, Kpis, useToast, useOnline } from '../../../_console/blocks';
import { useClub } from '../../_components/club';

// CH7 Announcements and club posts. Club posts are always named; there is no anonymous option.
export default function Page() {
  const api = useApi().console;
  const club = useClub();
  const online = useOnline();
  const state = useAsync(() => api.crewPosts(club.id), [club.id]);
  const [toast, say] = useToast();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<CrewHqPostInput>({ title: '', where: 'members_chat', schedule: 'now' });
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); say(ok); state.reload(); } catch { say('That did not save. Check the title and try again.', true); } finally { setBusy(false); }
  };
  return (
    <Async state={state}>
      {(v) => (
        <>
          <Eyebrow>CH7 · WAVE 1</Eyebrow>
          <PageHead title="Announcements & club posts" sub="Post as the club to members, to the club page, or as a campus notice." actions={<Btn onClick={() => setOpen((o) => !o)}>+ New post</Btn>} />
          {toast}
          {open ? (
            <Card title="New post"><form className="form" onSubmit={(e) => { e.preventDefault(); void run(() => api.crewCreatePost(club.id, f), 'Post saved.').then(() => setOpen(false)); }}>
              <label>Title<input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
              <label>Where<select value={f.where} onChange={(e) => setF({ ...f, where: e.target.value as CrewHqPostInput['where'] })}><option value="members_chat">Members chat</option><option value="club_page">Club page</option><option value="campus_notice">Campus notice</option></select></label>
              <label>When<select value={f.schedule} onChange={(e) => setF({ ...f, schedule: e.target.value as 'now' | 'later' })}><option value="now">Now</option><option value="later">Schedule for later</option></select></label>
              <div className="note">Posts go out under the club&apos;s name.</div>
              <div className="row"><Btn type="submit" disabled={busy || !online}>Post</Btn><Btn kind="ghost" onClick={() => setOpen(false)}>Cancel</Btn></div>
            </form></Card>
          ) : null}
          <Kpis items={[{ label: 'POSTS', value: String(v.posts.length), sub: '' }, { label: 'PINNED', value: String(v.pinned), sub: '' }, { label: 'SCHEDULED', value: String(v.scheduled), sub: '' }]} />
          {!v.posts.length ? <Empty title="No posts yet." body="Tell your members what is happening." action={{ label: '+ New post', onClick: () => setOpen(true) }} /> : (
            <Table head={['POST', 'WHERE', 'WHEN', 'AUDIENCE', 'ACTION']} rows={v.posts.map((p) => [
              <b key="t">{p.title}</b>, p.where, p.when + (p.needs ? ` · needs ${p.needs.toLowerCase()}` : ''), p.audience,
              <Btn key="a" kind="ghost" disabled={busy || !online} onClick={() => run(() => api.crewSetPinned(club.id, p.id, !p.pinned), p.pinned ? 'Unpinned.' : 'Pinned.')}>{p.pinned ? 'Unpin' : 'Pin'}</Btn>,
            ])} />
          )}
        </>
      )}
    </Async>
  );
}
